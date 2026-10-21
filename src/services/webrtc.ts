import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export type P2PConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface P2PStats {
  state: P2PConnectionState;
  rttMs: number | null;
  protocol: string;
  isP2P: boolean;
  iceCandidateType?: string;
}

export interface P2PMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'text' | 'image' | 'file' | 'audio';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  audioDuration?: number;
  replyTo?: { messageId: string; senderName: string; text: string };
  createdAt: string; // ISO string
  isP2P: true;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ]
};

export class P2PChatSession {
  private conversationId: string;
  private currentUserId: string;
  private remoteUserId: string;
  private isInitiator: boolean;

  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private unsubs: (() => void)[] = [];
  private pingInterval: any = null;

  public state: P2PConnectionState = 'disconnected';
  public rttMs: number | null = null;
  public onStateChange?: (stats: P2PStats) => void;
  public onDirectMessage?: (msg: P2PMessagePayload) => void;

  constructor(
    conversationId: string,
    currentUserId: string,
    remoteUserId: string
  ) {
    this.conversationId = conversationId;
    this.currentUserId = currentUserId;
    this.remoteUserId = remoteUserId;
    // Deterministic role assignment to avoid glare
    this.isInitiator = currentUserId < remoteUserId;
  }

  private notifyStats() {
    if (this.onStateChange) {
      this.onStateChange({
        state: this.state,
        rttMs: this.rttMs,
        protocol: 'WebRTC / SCTP over DTLS-UDP',
        isP2P: this.state === 'connected'
      });
    }
  }

  public async start() {
    this.cleanup();
    this.state = 'connecting';
    this.notifyStats();

    try {
      this.pc = new RTCPeerConnection(ICE_SERVERS);

      // Pre-negotiated data channel on channel id 0
      this.dataChannel = this.pc.createDataChannel('convora_p2p_chat', {
        negotiated: true,
        id: 0
      });

      this.setupDataChannel(this.dataChannel);

      // Collect ICE candidates and upload to Firestore signaling
      this.pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const candidateRef = doc(
            db,
            'conversations',
            this.conversationId,
            'p2p_signals',
            `${this.currentUserId}_candidates`
          );
          await setDoc(
            candidateRef,
            { candidates: arrayUnion(event.candidate.toJSON()) },
            { merge: true }
          ).catch(() => {});
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        const iceState = this.pc?.iceConnectionState;
        if (iceState === 'disconnected' || iceState === 'failed' || iceState === 'closed') {
          this.state = 'disconnected';
          this.notifyStats();
        }
      };

      const offerDocRef = doc(
        db,
        'conversations',
        this.conversationId,
        'p2p_signals',
        'offer'
      );
      const answerDocRef = doc(
        db,
        'conversations',
        this.conversationId,
        'p2p_signals',
        'answer'
      );

      if (this.isInitiator) {
        // Create SDP Offer
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        await setDoc(offerDocRef, {
          sdp: offer.sdp,
          type: offer.type,
          from: this.currentUserId,
          createdAt: Date.now()
        });

        // Listen for remote answer
        const unsubAnswer = onSnapshot(
          answerDocRef,
          async (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data?.from === this.remoteUserId && this.pc && !this.pc.currentRemoteDescription) {
                const remoteDesc = new RTCSessionDescription({
                  type: data.type,
                  sdp: data.sdp
                });
                await this.pc.setRemoteDescription(remoteDesc).catch(() => {});
              }
            }
          },
          (err) => {
            console.warn('[P2P WebRTC] Answer listener notice:', err);
          }
        );
        this.unsubs.push(unsubAnswer);

      } else {
        // Callee: listen for SDP Offer
        const unsubOffer = onSnapshot(
          offerDocRef,
          async (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data?.from === this.remoteUserId && this.pc && !this.pc.currentRemoteDescription) {
                const remoteDesc = new RTCSessionDescription({
                  type: data.type,
                  sdp: data.sdp
                });
                await this.pc.setRemoteDescription(remoteDesc).catch(() => {});

                const answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);

                await setDoc(answerDocRef, {
                  sdp: answer.sdp,
                  type: answer.type,
                  from: this.currentUserId,
                  createdAt: Date.now()
                });
              }
            }
          },
          (err) => {
            console.warn('[P2P WebRTC] Offer listener notice:', err);
          }
        );
        this.unsubs.push(unsubOffer);
      }

      // Listen for remote ICE candidates
      const remoteCandidateRef = doc(
        db,
        'conversations',
        this.conversationId,
        'p2p_signals',
        `${this.remoteUserId}_candidates`
      );

      const unsubCandidates = onSnapshot(
        remoteCandidateRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const candidates: any[] = data?.candidates || [];
            candidates.forEach((cand) => {
              if (this.pc && this.pc.remoteDescription) {
                this.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
            });
          }
        },
        (err) => {
          console.warn('[P2P WebRTC] Candidate listener notice:', err);
        }
      );
      this.unsubs.push(unsubCandidates);

    } catch (err) {
      console.warn('[P2P WebRTC] Initialization error:', err);
      this.state = 'disconnected';
      this.notifyStats();
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      this.state = 'connected';
      this.notifyStats();
      this.startPingPong();
    };

    channel.onclose = () => {
      this.state = 'disconnected';
      this.rttMs = null;
      this.notifyStats();
      if (this.pingInterval) clearInterval(this.pingInterval);
    };

    channel.onerror = (e) => {
      console.warn('[P2P DataChannel] Error:', e);
    };

    channel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'ping') {
          // Immediately respond to measure RTT
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({ type: 'pong', t: payload.t }));
          }
        } else if (payload.type === 'pong') {
          const rtt = Math.max(1, Date.now() - (payload.t || 0));
          this.rttMs = rtt;
          this.notifyStats();
        } else if (payload.type === 'chat_message') {
          if (this.onDirectMessage && payload.message) {
            this.onDirectMessage(payload.message);
          }
        }
      } catch (err) {
        console.error('[P2P DataChannel] Failed to parse message:', err);
      }
    };
  }

  private startPingPong() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({ type: 'ping', t: Date.now() }));
      }
    }, 3000);
  }

  public sendDirectMessage(msg: P2PMessagePayload): boolean {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(
          JSON.stringify({
            type: 'chat_message',
            message: msg
          })
        );
        return true;
      } catch (err) {
        console.warn('[P2P DataChannel] Direct send failed:', err);
        return false;
      }
    }
    return false;
  }

  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }

    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }

    this.state = 'disconnected';
    this.rttMs = null;
  }
}

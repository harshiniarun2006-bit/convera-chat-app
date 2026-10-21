import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, ShieldCheck } from 'lucide-react';
import { ParticipantData } from '../../types';

interface VoiceCallModalProps {
  partner: ParticipantData | null;
  callType?: 'voice' | 'video';
  onClose: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  partner,
  onClose
}) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let timer: any;
    let stream: MediaStream | null = null;

    async function initAudio() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setCallStatus('connected');

        timer = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.warn('Microphone permission not granted or device unavailable:', err);
        // Still allow connected demonstration with state
        setCallStatus('connected');
        timer = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      }
    }

    initAudio();

    return () => {
      if (timer) clearInterval(timer);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    setIsMuted(!isMuted);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#170C15]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#2D1222] to-[#170C15] rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Glow ambient background circles */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#C52B50]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[#8F1238]/30 rounded-full blur-3xl pointer-events-none" />

        {/* Security / Quality Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Voice Link</span>
        </div>

        {/* Avatar with Pulsing Waves */}
        <div className="relative mb-6">
          {callStatus === 'connected' && (
            <>
              <div className="absolute inset-0 rounded-full bg-[#C52B50]/30 animate-ping duration-1000" />
              <div className="absolute -inset-2 rounded-full border border-[#C52B50]/40 animate-pulse" />
            </>
          )}
          <img
            src={partner?.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
            alt={partner?.displayName || 'Caller'}
            className="w-28 h-28 rounded-full object-cover border-4 border-[#8F1238] shadow-lg relative z-10"
          />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {partner?.displayName || 'Convora Call'}
        </h3>
        <p className="text-xs text-[#F7DCE3]/70 font-medium mb-4">
          @{partner?.username || 'user'}
        </p>

        <div className="text-sm font-semibold text-[#E04D71] mb-8 tracking-wider">
          {callStatus === 'connecting' ? 'Connecting to peer...' : formatDuration(duration)}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-6 z-10">
          <button
            type="button"
            onClick={toggleMute}
            className={`p-4 rounded-full transition-transform active:scale-95 shadow-md ${
              isMuted
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setCallStatus('ended');
              setTimeout(onClose, 400);
            }}
            className="p-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-transform active:scale-95 shadow-xl hover:shadow-rose-600/30"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>

      </div>
    </div>
  );
};

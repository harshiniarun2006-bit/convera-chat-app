import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Smile,
  X,
  Loader2,
  Trash2,
  Square
} from 'lucide-react';
import { ReplyInfo, UserProfile } from '../../types';
import {
  sendMessage,
  uploadMediaFile,
  setTypingStatus
} from '../../services/firebase';

interface MessageInputProps {
  conversationId: string;
  currentUser: UserProfile;
  replyTo: ReplyInfo | null;
  onCancelReply: () => void;
}

const QUICK_EMOJIS = ['🍒', '❤️', '✨', '😊', '🔥', '👍', '🎉', '🌸'];

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  currentUser,
  replyTo,
  onCancelReply
}) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // File & Image attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Reset local states cleanly if conversation changes
  useEffect(() => {
    setText('');
    clearAttachment();
    setSendError(null);
    setSending(false);
    isSubmittingRef.current = false;
  }, [conversationId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Typing status trigger
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (sendError) setSendError(null);

    // Notify backend user is typing
    setTypingStatus(conversationId, currentUser.uid, currentUser.displayName, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(conversationId, currentUser.uid, currentUser.displayName, false);
      typingTimeoutRef.current = null;
    }, 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    if (isImage) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const clearAttachment = () => {
    setPendingFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = '';
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg'
      ];
      for (const t of candidateTypes) {
        if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const effectiveMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: effectiveMime });
        if (audioChunksRef.current.length > 0) {
          await sendVoiceMessage(audioBlob, effectiveMime);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access not available or denied:', err);
    }
  };

  const stopRecording = (discard = false) => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    if (discard) {
      audioChunksRef.current = [];
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
  };

  const sendVoiceMessage = async (blob: Blob, mimeType = 'audio/webm') => {
    if (sending || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSending(true);
    setSendError(null);

    const ext = mimeType.includes('mp4') || mimeType.includes('aac') ? 'm4a' : 'webm';
    try {
      const url = await uploadMediaFile(`conversations/${conversationId}/audio`, blob, `voice.${ext}`);
      await sendMessage(conversationId, currentUser, {
        type: 'audio',
        mediaUrl: url,
        audioDuration: recordingSeconds || 1,
        replyTo: replyTo || undefined
      });
      onCancelReply();
    } catch (err: any) {
      console.error('Failed to send voice message:', err);
      let msg = err?.message || 'Failed to send voice message.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = parsed.error;
      } catch {}
      setSendError(msg);
    } finally {
      isSubmittingRef.current = false;
      setSending(false);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingFile) || sending || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setSending(true);
    setSendError(null);

    // Cancel typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      let mediaUrl = '';
      let type: 'text' | 'image' | 'file' = 'text';

      if (pendingFile) {
        const isImg = pendingFile.type.startsWith('image/');
        type = isImg ? 'image' : 'file';
        mediaUrl = await uploadMediaFile(
          `conversations/${conversationId}/${type}s`,
          pendingFile,
          pendingFile.name
        );
      }

      await sendMessage(conversationId, currentUser, {
        type,
        text: trimmed,
        mediaUrl,
        fileName: pendingFile?.name,
        fileSize: pendingFile?.size,
        replyTo: replyTo || undefined
      });

      // Clear input states only upon successful delivery
      setText('');
      clearAttachment();
      onCancelReply();
      setTypingStatus(conversationId, currentUser.uid, currentUser.displayName, false);
      if (textareaRef.current) textareaRef.current.focus();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      let msg = err?.message || 'Failed to send message. Please check connection and try again.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) {
          msg = parsed.error;
        }
      } catch {}
      setSendError(msg);
    } finally {
      isSubmittingRef.current = false;
      setSending(false);
    }
  };

  const formatSeconds = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="p-3 bg-white dark:bg-[#20101E] border-t border-[#F7DCE3] dark:border-[#381B2D]">
      
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleFileChange(e, true)}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e, false)}
        className="hidden"
      />

      {/* Sending Error Banner */}
      {sendError && (
        <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
          <span>{sendError}</span>
          <button
            type="button"
            onClick={() => setSendError(null)}
            className="text-rose-400 hover:text-rose-600 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reply Banner */}
      {replyTo && (
        <div className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-xl bg-[#FCECF0] dark:bg-[#321727] border-l-4 border-[#8F1238] text-xs">
          <div className="truncate">
            <span className="font-bold text-[#8F1238] dark:text-[#F7DCE3]">
              Replying to {replyTo.senderName}:
            </span>{' '}
            <span className="text-zinc-600 dark:text-zinc-300 italic">{replyTo.text}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-zinc-400 hover:text-zinc-600 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending File Attachment Preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-2xl bg-[#FFF3F5] dark:bg-[#2A1624] border border-[#F7DCE3] dark:border-[#422137]">
          {filePreviewUrl ? (
            <img
              src={filePreviewUrl}
              alt="Preview"
              className="w-14 h-14 rounded-xl object-cover border"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#FCECF0] dark:bg-[#341828] flex items-center justify-center text-[#8F1238] dark:text-[#F7DCE3] font-bold text-xs">
              FILE
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {pendingFile.name}
            </div>
            <div className="text-[10px] text-zinc-500">
              {Math.round(pendingFile.size / 1024)} KB
            </div>
          </div>
          <button
            onClick={clearAttachment}
            className="p-1.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar */}
      {showEmojiBar && (
        <div className="flex items-center gap-2 mb-2 p-1.5 rounded-full bg-[#FFF9F7] dark:bg-[#281323] border border-[#F7DCE3] dark:border-[#452037] overflow-x-auto shadow-sm">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelectEmoji(emoji)}
              className="p-1 hover:scale-125 transition-transform text-base"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Controls or Active Recording Bar */}
      {isRecording ? (
        <div className="flex items-center justify-between p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Recording Voice... {formatSeconds(recordingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stopRecording(true)}
              className="p-2 rounded-full hover:bg-rose-200/60 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Discard recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="px-3 py-1.5 rounded-xl bg-cherry-gradient text-white text-xs font-bold shadow hover:opacity-95 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send Voice
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* Action buttons (Photo, Attachment, Emoji) */}
          <div className="flex items-center gap-0.5 pb-1">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2 rounded-full text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-[#FCECF0] dark:hover:bg-[#341828] transition-colors"
              title="Share photo"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-[#FCECF0] dark:hover:bg-[#341828] transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiBar(!showEmojiBar)}
              className={`p-2 rounded-full transition-colors ${
                showEmojiBar
                  ? 'text-[#8F1238] bg-[#FCECF0] dark:text-[#F7DCE3] dark:bg-[#341828]'
                  : 'text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-[#FCECF0] dark:hover:bg-[#341828]'
              }`}
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E8CBD3] dark:border-[#452037] bg-[#FFF9F7] dark:bg-[#281324] text-xs md:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238] max-h-32 resize-none leading-relaxed"
            />
          </div>

          {/* Voice Record or Send Button */}
          {text.trim() || pendingFile ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="p-2.5 rounded-full bg-cherry-gradient text-white shadow-md hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 shrink-0 mb-0.5"
              title="Send message"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 rounded-full bg-[#FCECF0] dark:bg-[#341828] text-[#8F1238] dark:text-[#F7DCE3] hover:bg-[#F7DCE3] hover:scale-105 active:scale-95 transition-all shrink-0 mb-0.5 shadow-sm"
              title="Hold to record voice message"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

    </div>
  );
};

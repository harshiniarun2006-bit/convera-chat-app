import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isOutgoing?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  duration: initialDuration = 0,
  isOutgoing = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  // Reset state if audio source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
  }, [src]);

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    setHasError(true);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        setHasError(false);
        // If track is at the end or finished, rewind to start
        if (audio.ended || (audio.currentTime >= audio.duration && audio.duration > 0)) {
          audio.currentTime = 0;
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      } catch (err: any) {
        setIsPlaying(false);
        // AbortError is normal when pause or seek interrupts playback
        if (err?.name === 'AbortError') {
          return;
        }
        // Graceful handling without throwing uncaught console.error
        console.warn('Audio playback could not be started:', err?.message || err);
        setHasError(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current && !isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-2xl min-w-[220px] max-w-[280px] ${
        isOutgoing
          ? 'bg-white/15 text-white'
          : 'bg-[#FCECF0] dark:bg-[#341828] text-[#5C102A] dark:text-[#F7DCE3]'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleAudioError}
      />

      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isOutgoing
            ? 'bg-white text-[#8F1238] hover:bg-white/90'
            : 'bg-[#8F1238] text-white hover:bg-[#A31640]'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1">
        {/* Scrubber bar */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all ${
            isOutgoing
              ? 'accent-white bg-white/30'
              : 'accent-[#8F1238] bg-[#E8CBD3] dark:bg-[#4E243D]'
          }`}
        />
        <div className="flex justify-between text-[11px] font-medium opacity-85">
          <span>{formatTime(currentTime)}</span>
          <span>{hasError ? 'Audio unavailable' : formatTime(duration)}</span>
        </div>
      </div>

      <Volume2 className={`w-4 h-4 shrink-0 opacity-60 ${isOutgoing ? 'text-white' : 'text-[#8F1238] dark:text-[#F7DCE3]'}`} />
    </div>
  );
};

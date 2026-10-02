import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, FastForward } from 'lucide-react';

interface AudioWaveformPlayerProps {
  audioUrl: string;
  isMe?: boolean;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({ audioUrl, isMe = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlaybackRate = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const seekTo = (fraction: number) => {
    if (!audioRef.current || !duration) return;
    const newTime = fraction * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 24 pseudo-random bars for waveform representation
  const BARS = [
    30, 60, 45, 80, 95, 60, 40, 75, 85, 100, 70, 45, 60, 80, 50, 65, 90, 40, 55, 75, 85, 45, 60, 35
  ];

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${isMe ? 'bg-black/20' : 'bg-white/5'} border border-white/10 min-w-[240px]`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all shadow-md ${
          isMe
            ? 'bg-white text-purple-900 hover:bg-slate-100'
            : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/30'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex flex-col justify-center">
        <div
          className="flex items-center gap-[2.5px] h-7 cursor-pointer py-1"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            seekTo(Math.max(0, Math.min(1, clickPos)));
          }}
        >
          {BARS.map((heightPercent, idx) => {
            const barFraction = idx / BARS.length;
            const isPlayed = barFraction <= progress;
            return (
              <span
                key={idx}
                className={`flex-1 rounded-full transition-all ${
                  isPlayed
                    ? isMe
                      ? 'bg-white'
                      : 'bg-purple-400'
                    : isMe
                    ? 'bg-white/30'
                    : 'bg-white/20'
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            );
          })}
        </div>

        {/* Time Labels */}
        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mt-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>

      {/* Speed multiplier pill */}
      <button
        onClick={togglePlaybackRate}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono transition-colors ${
          isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
        }`}
        title="Change speed"
      >
        {playbackRate}x
      </button>
    </div>
  );
};

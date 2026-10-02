import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Subtitles,
  RotateCcw,
  Sparkles,
  Layers,
  Gauge,
  Sliders,
} from 'lucide-react';

export interface VideoQualityOption {
  label: string;
  url: string;
}

export interface VideoCaptionItem {
  start: number;
  end: number;
  text: string;
}

export interface LiquidVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  qualitySources?: Record<string, string>;
  captions?: VideoCaptionItem[];
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export const LiquidVideoPlayer: React.FC<LiquidVideoPlayerProps> = ({
  src,
  poster,
  title,
  qualitySources,
  captions = [],
  autoPlay = false,
  loop = false,
  className = '',
  onTimeUpdate,
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('nixo_player_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekX, setHoverSeekX] = useState<number>(0);

  // Settings & Menus
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [currentVideoSrc, setCurrentVideoSrc] = useState(src);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [currentCaptionText, setCurrentCaptionText] = useState<string | null>(null);
  const [autoplayNextEnabled, setAutoplayNextEnabled] = useState<boolean>(() => {
    return localStorage.getItem('nixo_player_autoplay') !== 'false';
  });

  // Available qualities
  const qualityOptions: string[] = ['Auto', ...Object.keys(qualitySources || {})];
  const playbackRates: number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Sync src when prop changes
  useEffect(() => {
    if (selectedQuality === 'Auto' || !qualitySources || !qualitySources[selectedQuality]) {
      setCurrentVideoSrc(src);
    } else {
      setCurrentVideoSrc(qualitySources[selectedQuality]);
    }
  }, [src, selectedQuality, qualitySources]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  // Toggle Play/Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Update volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem('nixo_player_volume', newVol.toString());
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume > 0 ? volume : 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Seek bar interaction
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || !videoRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverSeekTime(pos * duration);
    setHoverSeekX(e.clientX - rect.left);
  };

  // Toggle Fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen request failed:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Controls auto-hide timer
  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSettingsMenu) {
          setControlsVisible(false);
        }
      }, 3200);
    }
  };

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  // Time & Buffer updater
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Update buffer progress
    if (videoRef.current.buffered.length > 0 && duration > 0) {
      try {
        const buff = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBuffered(Math.min(100, (buff / duration) * 100));
      } catch (e) {}
    }

    // Captions sync
    if (captionsEnabled && captions.length > 0) {
      const activeCaption = captions.find((c) => curr >= c.start && curr <= c.end);
      setCurrentCaptionText(activeCaption ? activeCaption.text : null);
    } else {
      setCurrentCaptionText(null);
    }

    if (onTimeUpdate) {
      onTimeUpdate(curr, duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    videoRef.current.volume = isMuted ? 0 : volume;
    videoRef.current.playbackRate = playbackRate;
  };

  // Change playback speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Change Quality
  const handleQualityChange = (q: string) => {
    setSelectedQuality(q);
    const prevTime = videoRef.current ? videoRef.current.currentTime : 0;
    const wasPlaying = isPlaying;

    let targetUrl = src;
    if (q !== 'Auto' && qualitySources && qualitySources[q]) {
      targetUrl = qualitySources[q];
    }
    setCurrentVideoSrc(targetUrl);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = prevTime;
        if (wasPlaying) videoRef.current.play().catch(() => {});
      }
    }, 50);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only react if active or inside video container
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      } else if (e.code === 'ArrowRight' && videoRef.current) {
        videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
      } else if (e.code === 'ArrowLeft' && videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, volume, duration]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      tabIndex={0}
      className={`relative group select-none overflow-hidden bg-black outline-none font-sans rounded-3xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : className
      }`}
    >
      {/* HTML5 Video Element with Lazy Loading */}
      <video
        ref={videoRef}
        src={currentVideoSrc}
        poster={poster}
        loop={loop}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleVideoTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Synchronized Captions Subtitle Overlay */}
      {captionsEnabled && currentCaptionText && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 max-w-[85%] text-center pointer-events-none transition-all duration-200">
          <span className="inline-block bg-black/80 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-xl border border-white/10 shadow-lg tracking-wide">
            {currentCaptionText}
          </span>
        </div>
      )}

      {/* Big Center Play/Pause Flash Overlay */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white flex items-center justify-center shadow-xl shadow-cyan-500/30 hover:scale-110 transition-transform cursor-pointer">
            <Play size={28} className="ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Top Bar (Title & Quality Indicator) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-20 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 max-w-[70%]">
          <span className="text-xs font-bold text-white truncate drop-shadow">{title || 'Video Stream'}</span>
        </div>

        <div className="flex items-center gap-2">
          {selectedQuality && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
              {selectedQuality}
            </span>
          )}
          {playbackRate !== 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-md">
              {playbackRate}x
            </span>
          )}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 z-20 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubbable Progress Bar */}
        <div
          ref={progressTrackRef}
          onClick={handleSeek}
          onMouseMove={handleSeekMouseMove}
          onMouseEnter={() => setIsHoveringSeek(true)}
          onMouseLeave={() => setIsHoveringSeek(false)}
          className="relative w-full h-2 hover:h-3 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all flex items-center"
        >
          {/* Buffer track */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full transition-all duration-300"
            style={{ width: `${buffered}%` }}
          />

          {/* Played track */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber thumb */}
          <div
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md shadow-cyan-500/50 hover:scale-125 transition-transform -translate-x-1/2"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Time Tooltip */}
          {isHoveringSeek && hoverSeekTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-black/90 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/20 pointer-events-none shadow-md"
              style={{ left: `${hoverSeekX}px` }}
            >
              {formatTime(hoverSeekTime)}
            </div>
          )}
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Actions (Play, Volume, Time) */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-1 hover:text-cyan-400 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} className="text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/20 rounded-full appearance-none accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] font-mono text-slate-300 select-none">
              <span className="text-white font-bold">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </div>
          </div>

          {/* Right Actions (Captions, Settings, Fullscreen) */}
          <div className="flex items-center gap-2 relative">
            {/* Captions Toggle */}
            <button
              onClick={() => setCaptionsEnabled(!captionsEnabled)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                captionsEnabled
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/50'
                  : 'bg-white/10 text-white hover:bg-white/20 border-transparent'
              }`}
              title="Toggle Subtitles (CC)"
            >
              <Subtitles size={16} />
            </button>

            {/* Settings Button */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  showSettingsMenu
                    ? 'bg-white/20 text-cyan-300 border-cyan-400/40'
                    : 'bg-white/10 text-white hover:bg-white/20 border-transparent'
                }`}
                title="Playback Settings"
              >
                <Settings size={16} />
              </button>

              {/* Settings Dropdown Popover */}
              {showSettingsMenu && (
                <div className="absolute right-0 bottom-9 w-60 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl z-30 text-xs space-y-3">
                  {/* Quality selector */}
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1.5 text-[11px]">
                      <Layers size={13} className="text-cyan-400" />
                      <span>Resolution Quality</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {qualityOptions.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQualityChange(q)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                            selectedQuality === q
                              ? 'bg-cyan-500 text-white border-cyan-400'
                              : 'bg-white/5 text-slate-300 hover:bg-white/15 border-white/10'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playback Speed selector */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1.5 text-[11px]">
                      <Gauge size={13} className="text-purple-400" />
                      <span>Playback Speed</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {playbackRates.map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleSpeedChange(rate)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-purple-500 text-white border-purple-400'
                              : 'bg-white/5 text-slate-300 hover:bg-white/15 border-white/10'
                          }`}
                        >
                          {rate === 1 ? 'Normal' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Autoplay Next Toggle */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Autoplay Next</span>
                    <button
                      onClick={() => {
                        const newVal = !autoplayNextEnabled;
                        setAutoplayNextEnabled(newVal);
                        localStorage.setItem('nixo_player_autoplay', newVal.toString());
                      }}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                        autoplayNextEnabled ? 'bg-cyan-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                          autoplayNextEnabled ? 'left-4.5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

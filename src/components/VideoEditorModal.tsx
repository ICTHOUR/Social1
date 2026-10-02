import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Check,
  Play,
  Pause,
  Scissors,
  Sliders,
  Palette,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Undo2,
  Film,
} from 'lucide-react';
import { GlassButton } from '../design-system/components/GlassButton';

export interface VideoEditorModalProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
  onSave: (editedVideoData: {
    videoUrl: string;
    trimStart: number;
    trimEnd: number;
    filterCss: string;
    speed: number;
    isMuted: boolean;
  }) => void;
}

type TabType = 'trim' | 'filters' | 'adjust' | 'speed';

const VIDEO_FILTERS = [
  { id: 'normal', name: 'Normal', nameBn: 'স্বাভাবিক', css: 'none' },
  { id: 'vivid', name: 'Vivid', nameBn: 'উজ্জ্বল', css: 'contrast(1.25) saturate(1.4)' },
  { id: 'cinema', name: 'Cinema', nameBn: 'সিনেমাটিক', css: 'contrast(1.2) saturate(1.15) sepia(0.12)' },
  { id: 'cyber', name: 'Cyberpunk', nameBn: 'সাইবারপাঙ্ক', css: 'contrast(1.3) saturate(1.4) hue-rotate(15deg)' },
  { id: 'golden', name: 'Golden Glow', nameBn: 'গোল্ডেন গ্লো', css: 'sepia(0.3) saturate(1.35) brightness(1.05)' },
  { id: 'noir', name: 'B&W Drama', nameBn: 'মনোক্রোম', css: 'grayscale(1) contrast(1.3)' },
];

export const VideoEditorModal: React.FC<VideoEditorModalProps> = ({
  isOpen,
  videoUrl,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('trim');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');

  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen || !videoUrl) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setPlaybackSpeed(1.0);
    setIsMuted(false);
    setSelectedFilter('none');
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0, warmth: 0 });
  }, [isOpen, videoUrl]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      setDuration(dur);
      setTrimEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);

      // Loop within trimmed boundaries
      if (trimEnd > 0 && curr >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setPlaybackSpeed(1.0);
    setIsMuted(false);
    setSelectedFilter('none');
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0, warmth: 0 });
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
      videoRef.current.currentTime = 0;
    }
  };

  const handleSaveAndExport = () => {
    const b = 1 + adjustments.brightness / 100;
    const c = 1 + adjustments.contrast / 100;
    const s = 1 + adjustments.saturation / 100;
    const sepiaVal = adjustments.warmth > 0 ? adjustments.warmth / 200 : 0;
    const hueVal = adjustments.warmth < 0 ? adjustments.warmth * 0.4 : 0;

    let filterCss = `brightness(${b}) contrast(${c}) saturate(${s}) sepia(${sepiaVal}) hue-rotate(${hueVal}deg)`;
    if (selectedFilter !== 'none') {
      filterCss += ` ${selectedFilter}`;
    }

    onSave({
      videoUrl,
      trimStart,
      trimEnd: trimEnd || duration,
      filterCss,
      speed: playbackSpeed,
      isMuted,
    });
    onClose();
  };

  if (!isOpen) return null;

  const b = 1 + adjustments.brightness / 100;
  const c = 1 + adjustments.contrast / 100;
  const s = 1 + adjustments.saturation / 100;
  const sepiaVal = adjustments.warmth > 0 ? adjustments.warmth / 200 : 0;
  const hueVal = adjustments.warmth < 0 ? adjustments.warmth * 0.4 : 0;

  let liveFilterStyle = `brightness(${b}) contrast(${c}) saturate(${s}) sepia(${sepiaVal}) hue-rotate(${hueVal}deg)`;
  if (selectedFilter !== 'none') {
    liveFilterStyle += ` ${selectedFilter}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-3xl h-[92vh] max-h-[820px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>ভিডিও এডিটর (Video Studio)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30">
                  লাইভ ফিল্টার
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ট্রিম, ফিল্টার ও সাউন্ড এডজাস্ট করে সেভ করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>রিসেট</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-3 sm:p-5 overflow-hidden min-h-[220px]">
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            muted={isMuted}
            style={{ filter: liveFilterStyle }}
            className="max-h-[38vh] sm:max-h-[420px] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
          />

          {/* Play/Pause Overlay Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xl"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>

          {/* Mute Badge */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {/* Editor Controls */}
        <div className="bg-slate-900 border-t border-slate-800 shrink-0 flex flex-col p-3 sm:p-4 space-y-3">
          
          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 p-1 bg-slate-950/80 rounded-2xl border border-white/10">
            {[
              { id: 'trim', label: 'ট্রিম (Trim)', icon: Scissors },
              { id: 'filters', label: 'ফিল্টার (Filters)', icon: Palette },
              { id: 'adjust', label: 'এডজাস্টমেন্ট', icon: Sliders },
              { id: 'speed', label: 'স্পিড (Speed)', icon: Gauge },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: TRIM CONTROLS */}
          {activeTab === 'trim' && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>✂️ ভিডিও ট্রিম সময় (Trim Duration)</span>
                <span className="font-mono text-cyan-400">
                  {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s / {duration.toFixed(1)}s
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">শুরু (Start Time)</label>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, trimEnd - 0.5)}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTrimStart(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">শেষ (End Time)</label>
                  <input
                    type="range"
                    min={trimStart + 0.5}
                    max={duration || 100}
                    step="0.1"
                    value={trimEnd || duration}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTrimEnd(val);
                    }}
                    className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILTERS */}
          {activeTab === 'filters' && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {VIDEO_FILTERS.map((f) => {
                const isSelected = selectedFilter === f.css;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilter(f.css)}
                    className={`px-3 py-2 rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-slate-950/60 border-white/10 hover:border-white/30 text-slate-300'
                    }`}
                  >
                    {f.nameBn}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: MANUAL ADJUSTMENTS */}
          {activeTab === 'adjust' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 font-semibold mb-1">
                  <span>☀️ ব্রাইটনেস</span>
                  <span className="font-mono text-cyan-400">{adjustments.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.brightness}
                  onChange={(e) => setAdjustments({ ...adjustments, brightness: Number(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-semibold mb-1">
                  <span>🌓 কনট্রাস্ট</span>
                  <span className="font-mono text-cyan-400">{adjustments.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.contrast}
                  onChange={(e) => setAdjustments({ ...adjustments, contrast: Number(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PLAYBACK SPEED */}
          {activeTab === 'speed' && (
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold mr-2">প্লেব্যাক স্পিড:</span>
              {[0.5, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                    playbackSpeed === s
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                      : 'bg-slate-950 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}

          {/* Save Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              এডিট সম্পন্ন হলে সেভ করুন বোতাম চাপুন
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <GlassButton
                variant="primary"
                onClick={handleSaveAndExport}
                className="px-5 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>এডিট সেভ করুন (Save Video Edit)</span>
              </GlassButton>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

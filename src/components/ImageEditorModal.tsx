import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Check,
  X,
  Undo2,
  Wand2,
  Sun,
  Contrast,
  Palette,
  Camera,
} from 'lucide-react';
import { GlassButton } from '../design-system/components/GlassButton';

export interface ImageEditorModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageUrl: string) => void;
}

type TabType = 'ai' | 'adjust' | 'crop' | 'filters';
type AspectRatio = 'original' | '1:1' | '4:5' | '16:9' | '9:16';

interface Adjustments {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  warmth: number;       // -100 to 100
  sharpness: number;    // 0 to 100
  vignette: number;     // 0 to 100
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  sharpness: 0,
  vignette: 0,
};

const AI_PRESETS = [
  {
    id: 'ai_auto',
    name: 'AI Auto Enhance',
    nameBn: 'AI অটো এডিট',
    desc: 'Optimal tone, exposure & color balance',
    adjustments: { brightness: 12, contrast: 24, saturation: 22, warmth: 6, sharpness: 28, vignette: 10 },
    filter: 'none',
  },
  {
    id: 'ai_golden',
    name: 'AI Golden Hour',
    nameBn: 'গোল্ডেন আওয়ার',
    desc: 'Warm sunset radiance & soft amber glow',
    adjustments: { brightness: 14, contrast: 18, saturation: 28, warmth: 35, sharpness: 20, vignette: 18 },
    filter: 'sepia(0.2) saturate(1.3) hue-rotate(-10deg)',
  },
  {
    id: 'ai_cyber',
    name: 'AI Cyberpunk',
    nameBn: 'সাইবারপাঙ্ক নিওন',
    desc: 'Electric cyan & vivid magenta accents',
    adjustments: { brightness: 8, contrast: 32, saturation: 40, warmth: -15, sharpness: 30, vignette: 22 },
    filter: 'contrast(1.25) saturate(1.4) hue-rotate(15deg)',
  },
  {
    id: 'ai_portrait',
    name: 'AI Portrait Glow',
    nameBn: 'পোর্ট্রেট গ্লো',
    desc: 'Soft luminescence & subject clarity',
    adjustments: { brightness: 16, contrast: 14, saturation: 16, warmth: 10, sharpness: 15, vignette: 12 },
    filter: 'brightness(1.05) contrast(1.08)',
  },
  {
    id: 'ai_cinema',
    name: 'AI Cinema 35mm',
    nameBn: 'সিনেমাটিক ৩৫মিমি',
    desc: 'Filmic dynamic range & teal-orange depth',
    adjustments: { brightness: 5, contrast: 28, saturation: 18, warmth: 12, sharpness: 24, vignette: 30 },
    filter: 'contrast(1.2) saturate(1.15) sepia(0.12)',
  },
  {
    id: 'ai_noir',
    name: 'AI Black & White',
    nameBn: 'মনোক্রোম ড্রামা',
    desc: 'Dramatic high-contrast monochrome',
    adjustments: { brightness: 6, contrast: 42, saturation: -100, warmth: 0, sharpness: 35, vignette: 28 },
    filter: 'grayscale(1) contrast(1.35)',
  },
];

const COLOR_FILTERS = [
  { id: 'normal', name: 'Normal', nameBn: 'স্বাভাবিক', css: 'none' },
  { id: 'vivid', name: 'Vivid', nameBn: 'উজ্জ্বল', css: 'contrast(1.2) saturate(1.35)' },
  { id: 'warm', name: 'Warm Amber', nameBn: 'ওয়ার্ম', css: 'sepia(0.25) saturate(1.2) brightness(1.05)' },
  { id: 'cool', name: 'Cool Breeze', nameBn: 'কূল', css: 'hue-rotate(20deg) saturate(1.1) brightness(1.02)' },
  { id: 'vintage', name: 'Vintage Gold', nameBn: 'ভিন্টেজ', css: 'sepia(0.4) contrast(1.1) brightness(0.95)' },
  { id: 'mono', name: 'B&W Film', nameBn: 'ব্ল্যাক এন্ড হোয়াইট', css: 'grayscale(1) contrast(1.2)' },
  { id: 'drama', name: 'Drama Film', nameBn: 'ড্রামা', css: 'contrast(1.4) brightness(0.92) saturate(1.1)' },
];

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [activeAiPreset, setActiveAiPreset] = useState<string | null>(null);

  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Load image element into memory
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setAdjustments(DEFAULT_ADJUSTMENTS);
    setSelectedFilter('none');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatio('original');
    setActiveAiPreset(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageElementRef.current = img;
    };
  }, [isOpen, imageUrl]);

  // AI Preset Application
  const handleApplyAiPreset = (preset: typeof AI_PRESETS[0]) => {
    setIsProcessingAi(true);
    setActiveAiPreset(preset.id);

    setTimeout(() => {
      setAdjustments(preset.adjustments);
      setSelectedFilter(preset.filter);
      setIsProcessingAi(false);
    }, 250);
  };

  // Reset all
  const handleReset = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setSelectedFilter('none');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatio('original');
    setActiveAiPreset(null);
  };

  // Export edited canvas
  const handleSaveAndExport = () => {
    if (!imageElementRef.current) {
      onClose();
      return;
    }

    const img = imageElementRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sw = img.naturalWidth || img.width;
    let sh = img.naturalHeight || img.height;

    let sx = 0;
    let sy = 0;
    if (aspectRatio === '1:1') {
      const minDim = Math.min(sw, sh);
      sx = (sw - minDim) / 2;
      sy = (sh - minDim) / 2;
      sw = minDim;
      sh = minDim;
    } else if (aspectRatio === '4:5') {
      const targetRatio = 4 / 5;
      if (sw / sh > targetRatio) {
        const newW = sh * targetRatio;
        sx = (sw - newW) / 2;
        sw = newW;
      } else {
        const newH = sw / targetRatio;
        sy = (sh - newH) / 2;
        sh = newH;
      }
    } else if (aspectRatio === '16:9') {
      const targetRatio = 16 / 9;
      if (sw / sh > targetRatio) {
        const newW = sh * targetRatio;
        sx = (sw - newW) / 2;
        sw = newW;
      } else {
        const newH = sw / targetRatio;
        sy = (sh - newH) / 2;
        sh = newH;
      }
    } else if (aspectRatio === '9:16') {
      const targetRatio = 9 / 16;
      if (sw / sh > targetRatio) {
        const newW = sh * targetRatio;
        sx = (sw - newW) / 2;
        sw = newW;
      } else {
        const newH = sw / targetRatio;
        sy = (sh - newH) / 2;
        sh = newH;
      }
    }

    const isRotated90or270 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90or270 ? sh : sw;
    canvas.height = isRotated90or270 ? sw : sh;

    const b = 1 + adjustments.brightness / 100;
    const c = 1 + adjustments.contrast / 100;
    const s = 1 + adjustments.saturation / 100;
    const sepiaVal = adjustments.warmth > 0 ? adjustments.warmth / 200 : 0;
    const hueVal = adjustments.warmth < 0 ? adjustments.warmth * 0.4 : 0;

    let filterStr = `brightness(${b}) contrast(${c}) saturate(${s}) sepia(${sepiaVal}) hue-rotate(${hueVal}deg)`;
    if (selectedFilter !== 'none') {
      filterStr += ` ${selectedFilter}`;
    }
    ctx.filter = filterStr;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();

    if (adjustments.vignette > 0) {
      const grad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        Math.min(canvas.width, canvas.height) * 0.25,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.7
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${adjustments.vignette / 120})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const exportedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSave(exportedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  // Build live CSS filter for top preview
  const b = 1 + adjustments.brightness / 100;
  const c = 1 + adjustments.contrast / 100;
  const s = 1 + adjustments.saturation / 100;
  const sepiaVal = adjustments.warmth > 0 ? adjustments.warmth / 200 : 0;
  const hueVal = adjustments.warmth < 0 ? adjustments.warmth * 0.4 : 0;
  const sharpnessBoost = adjustments.sharpness > 0 ? 1 + (adjustments.sharpness / 100) * 0.15 : 1;

  let liveFilterStyle = `brightness(${b}) contrast(${c * sharpnessBoost}) saturate(${s}) sepia(${sepiaVal}) hue-rotate(${hueVal}deg)`;
  if (selectedFilter !== 'none') {
    liveFilterStyle += ` ${selectedFilter}`;
  }

  const transformStyle = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[92vh] max-h-[820px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>ছবি এডিটর (Photo Studio)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30">
                  লাইভ প্রিভিউ
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                নিচে এডিট করলে সরাসরি উপরে ছবির পরিবর্তন দেখা যাবে
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
              <span>রিসেট (Reset)</span>
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

        {/* 1. TOP HALF: SINGLE MAIN IMAGE LIVE PREVIEW (No duplicates below!) */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-3 sm:p-5 overflow-hidden select-none min-h-[220px]">
          {/* Active adjustments badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              {adjustments.brightness !== 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900/90 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30 shadow-xs">
                  ☀️ {adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}% Light
                </span>
              )}
              {adjustments.contrast !== 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900/90 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/30 shadow-xs">
                  🌓 {adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}% Contrast
                </span>
              )}
              {adjustments.saturation !== 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900/90 text-[10px] font-mono font-bold text-pink-300 border border-pink-500/30 shadow-xs">
                  🎨 {adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}% Color
                </span>
              )}
              {activeAiPreset && (
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/30 to-teal-500/30 text-[10px] font-bold text-cyan-300 border border-cyan-400/40 flex items-center gap-1 shadow-xs animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI Active</span>
                </span>
              )}
            </div>
          </div>

          {/* SINGLE DIRECT IMAGE STAGE */}
          <div
            className={`relative max-w-full max-h-full flex items-center justify-center overflow-hidden transition-all duration-300 shadow-2xl rounded-2xl ${
              aspectRatio === '1:1'
                ? 'aspect-square max-h-[300px] sm:max-h-[360px] w-auto'
                : aspectRatio === '4:5'
                ? 'aspect-[4/5] max-h-[320px] sm:max-h-[380px] w-auto'
                : aspectRatio === '16:9'
                ? 'aspect-[16/9] w-full max-w-[460px]'
                : aspectRatio === '9:16'
                ? 'aspect-[9/16] max-h-[340px] sm:max-h-[400px] w-auto'
                : 'max-h-full'
            }`}
          >
            <img
              src={imageUrl}
              alt="Live Edited Preview"
              style={{
                filter: liveFilterStyle,
                transform: transformStyle,
                transition: 'filter 0.15s ease, transform 0.2s ease',
              }}
              className="max-h-[38vh] sm:max-h-[420px] w-auto object-contain rounded-xl"
            />
          </div>
        </div>

        {/* 2. BOTTOM HALF: EDITOR CONTROLS PANEL */}
        <div className="bg-slate-900 border-t border-slate-800 shrink-0 flex flex-col p-3 sm:p-4 space-y-3">
          
          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 p-1 bg-slate-950/80 rounded-2xl border border-white/10">
            {[
              { id: 'ai', label: 'AI অটো এডিট', icon: Wand2 },
              { id: 'adjust', label: 'এডজাস্টমেন্ট', icon: Sliders },
              { id: 'filters', label: 'ফিল্টার', icon: Palette },
              { id: 'crop', label: 'ক্রপ ও রোটেট', icon: Crop },
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

          {/* TAB 1: AI AUTO PRESETS */}
          {activeTab === 'ai' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
              {AI_PRESETS.map((preset) => {
                const isActive = activeAiPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyAiPreset(preset)}
                    disabled={isProcessingAi}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-white/10 hover:border-cyan-500/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-cyan-300">{preset.nameBn}</span>
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: MANUAL ADJUSTMENTS SLIDERS */}
          {activeTab === 'adjust' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-36 overflow-y-auto pr-1 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 font-semibold mb-1">
                  <span>☀️ ব্রাইটনেস (Light)</span>
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
                  <span>🌓 কনট্রাস্ট (Contrast)</span>
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

              <div>
                <div className="flex justify-between text-slate-300 font-semibold mb-1">
                  <span>🎨 কালার স্যাচুরেশন (Vibrancy)</span>
                  <span className="font-mono text-cyan-400">{adjustments.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.saturation}
                  onChange={(e) => setAdjustments({ ...adjustments, saturation: Number(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-semibold mb-1">
                  <span>🌡️ ওয়ার্মথ (Warmth)</span>
                  <span className="font-mono text-cyan-400">{adjustments.warmth}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.warmth}
                  onChange={(e) => setAdjustments({ ...adjustments, warmth: Number(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: COLOR FILTERS */}
          {activeTab === 'filters' && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {COLOR_FILTERS.map((filter) => {
                const isSelected = selectedFilter === filter.css;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedFilter(filter.css)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-slate-950/60 border-white/10 hover:border-white/30 text-slate-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                      <img
                        src={imageUrl}
                        alt={filter.name}
                        style={{ filter: filter.css }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-medium">{filter.nameBn}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 4: CROP RATIO & ROTATE */}
          {activeTab === 'crop' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 font-semibold mr-1">অনুপাত (Ratio):</span>
                {(['original', '1:1', '4:5', '16:9', '9:16'] as AspectRatio[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                      aspectRatio === r
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : 'bg-slate-950 border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-200 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ঘুরান (Rotate)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipH((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-200 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ফ্লিপ (Flip)</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Save Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              এডিট সম্পন্ন হলে সেভ বাটন প্রেস করুন
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
              <GlassButton
                variant="primary"
                onClick={handleSaveAndExport}
                className="px-5 py-2 text-xs font-black flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>এডিট সেভ করুন (Save Edit)</span>
              </GlassButton>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Sparkles, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FullscreenImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export const FullscreenImageModal: React.FC<FullscreenImageModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  title,
}) => {
  const { language } = useLanguage();
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset zoom & pan when image changes or opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setDownloadSuccess(false);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    setIsDownloading(true);
    try {
      if (imageUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `photo-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        a.download = `photo-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.warn('Download error, fallback direct link:', err);
      const a = document.createElement('a');
      a.href = imageUrl;
      a.target = '_blank';
      a.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between overflow-hidden select-none animate-fadeIn"
      onClick={(e) => {
        if (e.target === containerRef.current) onClose();
      }}
    >
      {/* Top Header Bar */}
      <div className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white drop-shadow-md">
            {title || (language === 'bn' ? 'ফুল স্ক্রিন ছবি' : 'Full Screen Image')}
          </span>
          {scale > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-mono">
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 p-1 rounded-full border border-white/10 backdrop-blur-md">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="p-1.5 rounded-full hover:bg-white/20 text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            <button
              onClick={handleResetZoom}
              disabled={scale === 1}
              className="p-1.5 rounded-full hover:bg-white/20 text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-1.5 rounded-full hover:bg-white/20 text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Download Save Button */}
          <button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border shadow-lg ${
              downloadSuccess
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold active:scale-95'
            }`}
            title="Download / Save Image"
          >
            {downloadSuccess ? (
              <>
                <Check size={14} />
                <span>{language === 'bn' ? 'সেভ হয়েছে!' : 'Saved!'}</span>
              </>
            ) : (
              <>
                <Download size={14} className={isDownloading ? 'animate-bounce' : ''} />
                <span>{language === 'bn' ? 'ইমেজ সেভ করুন' : 'Save Image'}</span>
              </>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/15"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Viewport Area */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={imageUrl}
          alt="Full screen preview"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-transform"
          draggable={false}
        />
      </div>

      {/* Bottom Hint Bar */}
      <div className="w-full py-2.5 px-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center text-[11px] text-slate-400 gap-4">
        <span>{language === 'bn' ? '💡 ডাবল ট্যাপ বা মাউস হুইল দিয়ে জুম করুন' : '💡 Double-click or scroll wheel to zoom'}</span>
        {scale > 1 && (
          <span className="text-cyan-300">
            {language === 'bn' ? 'ছবিটি ড্র্যাগ করে চারপাশে সরান' : 'Drag image to move around'}
          </span>
        )}
      </div>
    </div>
  );
};

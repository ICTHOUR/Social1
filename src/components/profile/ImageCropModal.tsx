import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'avatar' | 'cover';
  onCropComplete: (croppedDataUrl: string) => Promise<void> | void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  type,
  onCropComplete,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Aspect ratio configuration
  // avatar: 1:1 square
  // cover: 16:6 (~2.67:1) wide landscape banner
  const isAvatar = type === 'avatar';
  const cropWidth = isAvatar ? 280 : 380;
  const cropHeight = isAvatar ? 280 : 160;

  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Draw image on preview canvas
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageObjRef.current = img;
      renderCanvas();
    };
  }, [imageSrc, zoom, rotation, offset]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Center pivot
    ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate scale to cover canvas
    const scale = Math.max(cropWidth / img.width, cropHeight / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      // Export high-res
      const outputCanvas = document.createElement('canvas');
      const outWidth = isAvatar ? 500 : 1200;
      const outHeight = isAvatar ? 500 : 450;
      outputCanvas.width = outWidth;
      outputCanvas.height = outHeight;
      const outCtx = outputCanvas.getContext('2d');

      if (outCtx && imageObjRef.current) {
        const img = imageObjRef.current;
        outCtx.save();
        outCtx.translate(outWidth / 2 + (offset.x * outWidth) / cropWidth, outHeight / 2 + (offset.y * outHeight) / cropHeight);
        outCtx.rotate((rotation * Math.PI) / 180);
        outCtx.scale(zoom, zoom);

        const scale = Math.max(outWidth / img.width, outHeight / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;

        outCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        outCtx.restore();

        const croppedUrl = outputCanvas.toDataURL('image/jpeg', 0.92);
        await onCropComplete(croppedUrl);
        onClose();
      }
    } catch (e) {
      console.error('Error saving cropped image:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              {isAvatar
                ? isBn ? 'প্রোফাইল ছবি ক্রপ করুন' : 'Crop Profile Avatar'
                : isBn ? 'কভার ব্যানার ছবি ক্রপ করুন' : 'Crop Profile Cover Banner'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload or Canvas Area */}
        {!imageSrc ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-white/5 transition-all text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {isBn ? 'ডিভাইস থেকে ছবি আপলোড করুন' : 'Click to select or drop image'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {isAvatar
                  ? isBn ? 'বর্গাকার অনুপাত (1:1) প্রোফাইল পিকচার' : 'Supports JPG, PNG, WEBP (Square 1:1)'
                  : isBn ? 'ওয়াইড অনুপাত (16:6) কভার ব্যানার' : 'Wide landscape banner (16:6)'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Viewport Canvas with interactive drag */}
            <div className="flex justify-center items-center py-2 bg-black/40 rounded-2xl overflow-hidden relative select-none">
              <div
                style={{ width: cropWidth, height: cropHeight }}
                className={`relative overflow-hidden border-2 border-cyan-400/60 shadow-xl cursor-move ${
                  isAvatar ? 'rounded-full' : 'rounded-xl'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>
            </div>

            {/* Adjust Controls: Zoom & Rotate */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              {/* Zoom Slider */}
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <ZoomOut className="w-4 h-4 text-slate-400" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-[10px] w-8 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Action Buttons: Rotate & Select another file */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ঘোরান (Rotate)' : 'Rotate 90°'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{isBn ? 'অন্য ছবি বাছাই করুন' : 'Change Image'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          {imageSrc && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ক্রপ ও সংরক্ষণ করুন' : 'Crop & Save'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

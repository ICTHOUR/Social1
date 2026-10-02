import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  title?: string;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  title,
}) => {
  if (!isOpen || !mediaUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col justify-between p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between p-2 max-w-5xl mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-slate-300 truncate font-medium">{title || 'Media Preview'}</span>
        <div className="flex items-center gap-2">
          <a
            href={mediaUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center p-2 max-w-5xl mx-auto w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaType === 'image' ? (
          <img
            src={mediaUrl}
            alt={title || ''}
            className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
          />
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-6" />
    </div>
  );
};

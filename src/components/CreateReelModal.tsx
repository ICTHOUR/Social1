import React, { useState, useRef } from 'react';
import { GlassModal } from '../design-system/components/GlassModal';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassInput } from '../design-system/components/GlassInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../design-system/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Film,
  Upload,
  Music,
  Sparkles,
  Video,
  X,
  CheckCircle2,
  Tag,
  Type,
  Image as ImageIcon,
  Wand2,
} from 'lucide-react';

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReelCreated?: () => void;
}

export const CreateReelModal: React.FC<CreateReelModalProps> = ({
  isOpen,
  onClose,
  onReelCreated,
}) => {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [mediaType, setMediaType] = useState<'video' | 'photo'>('video');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [musicTitle, setMusicTitle] = useState<string>('Synth Wave Pulse');
  const [musicArtist, setMusicArtist] = useState<string>(user?.fullName || 'Nixo Beats');
  const [motionEffect, setMotionEffect] = useState<string>('ken_burns');
  const [hashtags, setHashtags] = useState<string>('feels, reels, viral');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const musicPresets = [
    { title: 'Synth Wave Pulse', artist: 'Nixo Beats' },
    { title: 'Lo-Fi Acoustic Chill', artist: 'Nixo Soundscapes' },
    { title: 'Cyberpunk Energy', artist: 'Neon Horizon' },
    { title: 'Bengali Folk Fusion', artist: 'Ektara Beats' },
    { title: 'Summer Breeze Vibe', artist: 'Tropical Waves' },
  ];

  const motionEffects = [
    { id: 'ken_burns', name: isBn ? 'কেন বার্নস স্লো জুম' : 'Ken Burns Slow Zoom', icon: '🔍' },
    { id: 'neon_glitch', name: isBn ? 'সাইবার গ্লিচ গ্লো' : 'Cyber Neon Glitch', icon: '⚡' },
    { id: 'vintage_film', name: isBn ? 'ভিন্টেজ ফিল্ম ইফেক্ট' : 'Vintage Film Grain', icon: '🎞️' },
    { id: 'sparkle_pulse', name: isBn ? 'স্পার্কল পালস' : 'Sparkle Shimmer Pulse', icon: '✨' },
  ];

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');

    if (!isVid && !isImg) {
      addToast(
        isBn ? 'অনুগ্রহ করে ভিডিও বা ছবি ফাইল সিলেক্ট করুন।' : 'Please select a valid image or video file.',
        'warning'
      );
      return;
    }

    setMediaType(isVid ? 'video' : 'photo');
    setSelectedFile(file);
    setUploadProgress(25);

    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setMediaUrl(evt.target.result as string);
        setUploadProgress(100);
        addToast(
          isBn
            ? `${isVid ? 'ভিডিও' : 'ছবি'} সফলভাবে সংযুক্ত হয়েছে!`
            : `${isVid ? 'Video' : 'Photo'} attached successfully!`,
          'success'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      addToast(isBn ? 'লগইন প্রয়োজন।' : 'Please sign in to post FEELS.', 'error');
      return;
    }

    if (!mediaUrl) {
      addToast(
        isBn ? 'অনুগ্রহ করে একটি ছবি বা ভিডিও আপলোড করুন।' : 'Please attach a photo or video for FEELS.',
        'warning'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let finalVideoUrl = mediaUrl;

      // Upload file directly to /api/upload for reliable permanent video URL
      if (selectedFile) {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
              finalVideoUrl = uploadData.url;
            }
          }
        } catch (upErr) {
          console.warn('File upload endpoint warning, using fallback URL:', upErr);
        }
      }

      const hashtagArray = hashtags
        .split(',')
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUrl: finalVideoUrl,
          caption,
          musicTitle: musicTitle || 'Original Sound',
          musicArtist: musicArtist || user?.fullName || 'Nixo Creator',
          hashtags: hashtagArray,
        }),
      });

      if (res.ok) {
        addToast(
          isBn ? 'রিলস / FEELS সফলভাবে পাবলিশ হয়েছে!' : 'FEELS video published successfully!',
          'success'
        );

        window.dispatchEvent(new CustomEvent('nixo-reel-created'));

        setMediaUrl('');
        setSelectedFile(null);
        setCaption('');

        if (onReelCreated) onReelCreated();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || (isBn ? 'পাবলিশ করতে ব্যর্থ হয়েছে।' : 'Failed to publish.'), 'error');
      }
    } catch (err) {
      console.error(err);
      addToast(isBn ? 'নেটওয়ার্ক এরর হয়েছে।' : 'Network error uploading.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'নতুন FEELS (রিলস) তৈরি করুন' : 'Create FEELS Stream'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Creator Info */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-cyan-400/40"
          />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{user?.fullName}</span>
              {user?.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
            </div>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">
              🎬 {isBn ? 'ছবি বা ভিডিও উভয় মাধ্যম দিয়ে রিলস তৈরি করুন' : 'Create FEELS with Photo Motion or Video'}
            </p>
          </div>
        </div>

        {/* Media Upload / Preview Area */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-cyan-500/40 bg-slate-950/90 p-3 min-h-[220px] flex flex-col items-center justify-center text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {mediaUrl ? (
            <div className="relative w-full aspect-[9/16] max-h-[300px] rounded-xl overflow-hidden bg-black flex items-center justify-center group">
              {mediaType === 'video' ? (
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="relative w-full h-full overflow-hidden">
                  <img
                    src={mediaUrl}
                    alt=""
                    className={`w-full h-full object-cover ${
                      motionEffect === 'ken_burns'
                        ? 'animate-pulse scale-105'
                        : motionEffect === 'neon_glitch'
                        ? 'brightness-110 contrast-125'
                        : motionEffect === 'vintage_film'
                        ? 'sepia-[0.3] contrast-110'
                        : 'hue-rotate-15'
                    }`}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
                    <Sparkles size={11} className="text-cyan-400" />
                    <span>{motionEffects.find((m) => m.id === motionEffect)?.name}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setMediaUrl('');
                  setSelectedFile(null);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                title="Remove media"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="space-y-3 cursor-pointer group py-6"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                  <Video size={24} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                  <ImageIcon size={24} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {isBn ? 'ছবি অথবা ভিডিও সিলেক্ট করতে এখানে ক্লিক করুন' : 'Click to Upload Photo or Video for FEELS'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports MP4, WEBM, JPG, PNG (9:16 Vertical format recommended)
                </p>
              </div>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mt-2 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Photo Motion Effects Selector (When image is selected) */}
        {mediaUrl && mediaType === 'photo' && (
          <div className="space-y-1.5 bg-black/10 dark:bg-white/5 p-2.5 rounded-2xl border border-black/5 dark:border-white/10">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Wand2 size={13} className="text-cyan-400" />
              <span>{isBn ? 'ছবি রিলস মোশন ইফেক্ট নির্বাচন করুন:' : 'Select Photo Motion Effect:'}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {motionEffects.map((eff) => (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => setMotionEffect(eff.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    motionEffect === eff.id
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-black/10 dark:bg-white/5 text-slate-300 hover:bg-black/20'
                  }`}
                >
                  <span>{eff.icon}</span>
                  <span className="truncate">{eff.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Music Selector Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Music size={13} className="text-purple-400" />
            <span>{isBn ? 'ব্যাকগ্রাউন্ড মিউজিক ট্র্যাক ট্রে:' : 'Select Music Track:'}</span>
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {musicPresets.map((m) => (
              <button
                key={m.title}
                type="button"
                onClick={() => {
                  setMusicTitle(m.title);
                  setMusicArtist(m.artist);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer border ${
                  musicTitle === m.title
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                    : 'bg-black/10 dark:bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                🎵 {m.title}
              </button>
            ))}
          </div>
        </div>

        {/* Caption & Hashtags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Type size={12} />
              <span>{isBn ? 'ক্যাপশন:' : 'Caption:'}</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder={isBn ? 'ভিডিও/ছবি সম্পর্কে লিখুন...' : 'Write something...'}
              className="w-full px-3 py-2 rounded-xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Tag size={12} />
              <span>{isBn ? 'হ্যাশট্যাগ:' : 'Hashtags:'}</span>
            </label>
            <GlassInput
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="feels, reels, viral"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
          <GlassButton type="button" variant="glass" onClick={onClose}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </GlassButton>
          <GlassButton
            type="submit"
            variant="primary"
            disabled={isSubmitting || !mediaUrl}
            leftIcon={<Sparkles size={16} />}
            className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:opacity-90"
          >
            {isSubmitting
              ? (isBn ? 'পাবলিশ হচ্ছে...' : 'Publishing...')
              : (isBn ? 'রিলসে পাবলিশ করুন' : 'Publish FEELS Stream')}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};

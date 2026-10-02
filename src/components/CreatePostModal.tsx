import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { isVideoUrl } from '../utils/mediaUtils';
import {
  MediaType,
  PrivacyLevel,
  CommentsControl,
  FeelingActivity,
  TaggedUser,
  LinkPreviewData,
  AudioPostData,
} from '../types';
import { GlassModal } from '../design-system/components/GlassModal';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassInput } from '../design-system/components/GlassInput';
import { useToast } from '../design-system/ToastContext';
import {
  IconSparkles,
} from '../design-system/icons/OriginalIcons';
import {
  Image as ImageIcon,
  Video,
  BarChart2,
  Music,
  Film,
  Users,
  Smile,
  MapPin,
  Link as LinkIcon,
  Clock,
  Palette,
  X,
  CheckCircle2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Upload,
  Sparkles,
  Wand2,
  Crop,
  Sliders,
  Sun,
  Contrast,
  Flame,
  RotateCcw,
  Eye,
  Edit3,
} from 'lucide-react';
import { ImageEditorModal } from './ImageEditorModal';
import { VideoEditorModal } from './VideoEditorModal';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

const POST_BACKGROUNDS = [
  { id: 'none', value: '', type: 'none' },
  // Solid luxury colors
  { id: 'solid_dark', value: '#0f172a', type: 'solid' },
  { id: 'solid_indigo', value: '#312e81', type: 'solid' },
  { id: 'solid_cyan', value: '#0e7490', type: 'solid' },
  { id: 'solid_emerald', value: '#065f46', type: 'solid' },
  { id: 'solid_rose', value: '#9f1239', type: 'solid' },
  { id: 'solid_amber', value: '#92400e', type: 'solid' },
  { id: 'solid_purple', value: '#581c87', type: 'solid' },
  { id: 'solid_crimson', value: '#4c0519', type: 'solid' },
  { id: 'solid_mocha', value: '#451a03', type: 'solid' },
  // Vibrant gradients
  { id: 'holo', value: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #8B5CF6 100%)', type: 'gradient' },
  { id: 'sunset', value: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 50%, #F59E0B 100%)', type: 'gradient' },
  { id: 'neon_sunset', value: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)', type: 'gradient' },
  { id: 'neon_violet', value: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', type: 'gradient' },
  { id: 'royal_ocean', value: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)', type: 'gradient' },
  { id: 'cyber_emerald', value: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)', type: 'gradient' },
  { id: 'coral_burst', value: 'linear-gradient(135deg, #ea580c 0%, #db2777 100%)', type: 'gradient' },
  { id: 'aqua_breeze', value: 'linear-gradient(135deg, #0891b2 0%, #0d9488 50%, #059669 100%)', type: 'gradient' },
  { id: 'obsidian', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)', type: 'gradient' },
  { id: 'cosmic_twilight', value: 'linear-gradient(135deg, #312e81 0%, #581c87 50%, #701a75 100%)', type: 'gradient' },
  { id: 'aurora', value: 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #3B82F6 100%)', type: 'gradient' },
  { id: 'cosmic', value: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #EC4899 100%)', type: 'gradient' },
  { id: 'cyberpunk', value: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #06b6d4 100%)', type: 'gradient' },
  { id: 'golden', value: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', type: 'gradient' },
  { id: 'ocean', value: 'linear-gradient(135deg, #0284c7 0%, #0d9488 50%, #10b981 100%)', type: 'gradient' },
  // Styled artistic textures
  { id: 'img_fluid', value: "url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80') center/cover", type: 'image' },
  { id: 'img_space', value: "url('https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80') center/cover", type: 'image' },
  { id: 'img_abstract', value: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80') center/cover", type: 'image' },
];

const CURATED_GIFS = [
  { id: 'gif1', title: 'Liquid Waves', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80' },
  { id: 'gif2', title: 'Neon Tunnel', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80' },
  { id: 'gif3', title: 'Cyber Pulse', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80' },
  { id: 'gif4', title: 'Prism Geometry', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80' },
];

const FEELING_ACTIVITIES: FeelingActivity[] = [
  { type: 'feeling', label: 'Euphoric' },
  { type: 'feeling', label: 'Inspired' },
  { type: 'feeling', label: 'Creative' },
  { type: 'feeling', label: 'Relaxed' },
  { type: 'celebrating', label: 'Major Milestone' },
  { type: 'celebrating', label: 'Release Day' },
  { type: 'listening', label: 'Ambient Wave' },
  { type: 'listening', label: 'Nixo Audio' },
  { type: 'watching', label: 'Live Keynote' },
  { type: 'traveling', label: 'Neo City Hub' },
];

const SUGGESTED_FRIENDS: TaggedUser[] = [
  { id: 'user_elena', username: 'elena_vibe', fullName: 'Elena Rostova', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80' },
  { id: 'user_marcus', username: 'marcus_tech', fullName: 'Marcus Vance', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'user_sophia', username: 'sophia_ai', fullName: 'Sophia Chen', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80' },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  // Basic Post Data
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [commentsControl, setCommentsControl] = useState<CommentsControl>('allow_all');
  const [backgroundGradient, setBackgroundGradient] = useState<string>('');
  const [fontStyle, setFontStyle] = useState<'sans' | 'serif' | 'mono' | 'handwriting' | 'bold'>('sans');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl' | '2xl'>('base');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const resetFormState = () => {
    setContent('');
    setMediaUrls([]);
    setMediaType('none');
    setBackgroundGradient('');
    setFontStyle('sans');
    setFontSize('base');
    setTextAlign('center');
    setFeeling(null);
    setLocation('');
    setSelectedGif(null);
    setLinkPreview(null);
    setAudioUrl('');
    setIsAudioActive(false);
    setIsPollActive(false);
    setPollQuestion('');
    setPollOptions(['Option 1', 'Option 2']);
    setTaggedUsers([]);
    setIsScheduled(false);
    setScheduledDate('');
    setActiveSubPanel('none');
  };

  // Media Collections
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<MediaType>('none');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cropRatio, setCropRatio] = useState<'1:1' | '4:3' | '16:9'>('1:1');
  const [simulateCompression, setSimulateCompression] = useState(true);

  // Poll
  const [isPollActive, setIsPollActive] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);

  // Audio Data
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioArtist, setAudioArtist] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState(90);

  // GIF Selection
  const [selectedGif, setSelectedGif] = useState<string | null>(null);

  // Link Preview
  const [linkInput, setLinkInput] = useState('');
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Tagging & Metadata
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [feeling, setFeeling] = useState<FeelingActivity | null>(null);
  const [location, setLocation] = useState('');

  // Scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  // AI Caption Generator State
  const [isAiCaptionOpen, setIsAiCaptionOpen] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [captionTone, setCaptionTone] = useState<'viral' | 'inspirational' | 'aesthetic' | 'funny' | 'poetic'>('viral');
  const [captionLang, setCaptionLang] = useState<'auto' | 'bn' | 'en'>('auto');
  const [aiCaptions, setAiCaptions] = useState<string[]>([]);

  // Photo & Video Editor States
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [activeFilterName, setActiveFilterName] = useState<string>('Original');
  const [isApplyingInstantAi, setIsApplyingInstantAi] = useState<number | null>(null);
  const [isBatchAiProcessing, setIsBatchAiProcessing] = useState(false);
  const [isManualSlidersOpen, setIsManualSlidersOpen] = useState(false);
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [manualAdjustments, setManualAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    sharpness: 0,
    vignette: 0,
  });
  const originalMediaMapRef = useRef<Map<number, string>>(new Map());

  // Apply manual slider adjustments in real-time onto the image
  const handleApplyManualSlider = async (newAdj: typeof manualAdjustments) => {
    setManualAdjustments(newAdj);
    const targetUrl = mediaUrls[selectedPreviewIndex];
    if (!targetUrl || targetUrl.startsWith('data:video')) return;

    if (!originalMediaMapRef.current.has(selectedPreviewIndex)) {
      originalMediaMapRef.current.set(selectedPreviewIndex, targetUrl);
    }
    const sourceUrl = originalMediaMapRef.current.get(selectedPreviewIndex) || targetUrl;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const b = 1 + newAdj.brightness / 100;
      const c = 1 + newAdj.contrast / 100;
      const s = 1 + newAdj.saturation / 100;
      const sepiaVal = newAdj.warmth > 0 ? newAdj.warmth / 200 : 0;
      const hueVal = newAdj.warmth < 0 ? newAdj.warmth * 0.4 : 0;
      const sharpnessBoost = newAdj.sharpness > 0 ? 1 + (newAdj.sharpness / 100) * 0.15 : 1;

      ctx.filter = `brightness(${b}) contrast(${c * sharpnessBoost}) saturate(${s}) sepia(${sepiaVal}) hue-rotate(${hueVal}deg)`;
      ctx.drawImage(img, 0, 0);

      if (newAdj.vignette > 0) {
        const grad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          Math.min(canvas.width, canvas.height) * 0.28,
          canvas.width / 2,
          canvas.height / 2,
          Math.max(canvas.width, canvas.height) * 0.72
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${newAdj.vignette / 120})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const enhanced = canvas.toDataURL('image/jpeg', 0.94);
      setMediaUrls((prev) => {
        const next = [...prev];
        next[selectedPreviewIndex] = enhanced;
        return next;
      });
      setActiveFilterName('Manual Tune');
    } catch (err) {
      console.warn('Manual tune render failed:', err);
    }
  };

  const handleResetManualSliders = () => {
    const zeroAdj = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpness: 0, vignette: 0 };
    setManualAdjustments(zeroAdj);
    handleApplyQuickPreset(selectedPreviewIndex, 'original');
  };

  // 1-Click AI Auto Edit function for a single photo
  const handleInstantAiAutoEdit = async (index: number) => {
    setManualAdjustments({
      brightness: 12,
      contrast: 24,
      saturation: 22,
      warmth: 6,
      sharpness: 28,
      vignette: 10,
    });
    await handleApplyQuickPreset(index, 'ai_auto');
  };

  // Real-time Quick Filter / AI Enhancer with pristine original backup
  const handleApplyQuickPreset = async (index: number, presetType: string) => {
    const targetUrl = mediaUrls[index];
    if (!targetUrl || isVideoUrl(targetUrl)) return;

    if (!originalMediaMapRef.current.has(index)) {
      originalMediaMapRef.current.set(index, targetUrl);
    }
    const sourceUrl = originalMediaMapRef.current.get(index) || targetUrl;

    if (presetType === 'original') {
      setMediaUrls((prev) => {
        const next = [...prev];
        next[index] = sourceUrl;
        return next;
      });
      setActiveFilterName('Original');
      addToast('Original unedited photo restored', 'info');
      return;
    }

    setIsApplyingInstantAi(index);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (presetType === 'ai_auto') {
          // Optimal AI Neural Balance formula: exposure lift +12%, contrast +24%, vibrancy +22%, warm touch +5%
          ctx.filter = 'brightness(1.12) contrast(1.24) saturate(1.22) sepia(0.04)';
          setActiveFilterName('AI Auto');
        } else if (presetType === 'golden') {
          ctx.filter = 'sepia(0.28) saturate(1.3) contrast(1.16) brightness(1.08)';
          setActiveFilterName('Golden Hour');
        } else if (presetType === 'hdr') {
          ctx.filter = 'contrast(1.28) saturate(1.35) brightness(1.06)';
          setActiveFilterName('Vibrant HDR');
        } else if (presetType === 'cinematic') {
          ctx.filter = 'contrast(1.22) saturate(1.15) sepia(0.12) brightness(1.04)';
          setActiveFilterName('Cinematic 35mm');
        } else if (presetType === 'noir') {
          ctx.filter = 'grayscale(1) contrast(1.35) brightness(1.04)';
          setActiveFilterName('Noir Drama');
        }

        ctx.drawImage(img, 0, 0);

        // Soft dynamic vignette for depth
        const grad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          Math.min(canvas.width, canvas.height) * 0.28,
          canvas.width / 2,
          canvas.height / 2,
          Math.max(canvas.width, canvas.height) * 0.72
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const enhanced = canvas.toDataURL('image/jpeg', 0.94);
        setMediaUrls((prev) => {
          const next = [...prev];
          next[index] = enhanced;
          return next;
        });
        addToast(`✨ ${activeFilterName || 'AI'} Edit applied! Live preview updated.`, 'success');
      }
    } catch (e) {
      console.error(e);
      addToast('Could not auto-enhance this image.', 'warning');
    } finally {
      setIsApplyingInstantAi(null);
    }
  };

  // Batch 1-Click AI Auto Edit for all attached photos
  const handleBatchAiAutoEditAll = async () => {
    const imageIndices = mediaUrls
      .map((url, i) => (!url.startsWith('data:video') && !url.endsWith('.mp4') && !url.endsWith('.webm') ? i : -1))
      .filter((i) => i !== -1);

    if (imageIndices.length === 0) {
      addToast('No images available to AI auto-edit.', 'info');
      return;
    }

    setIsBatchAiProcessing(true);
    try {
      for (const idx of imageIndices) {
        await handleInstantAiAutoEdit(idx);
      }
      addToast(`✨ All ${imageIndices.length} photo(s) enhanced with AI Auto Edit!`, 'success');
    } finally {
      setIsBatchAiProcessing(false);
    }
  };

  // Drawer Toggles
  const [activeSubPanel, setActiveSubPanel] = useState<
    'none' | 'background' | 'gif' | 'tags' | 'feeling' | 'location' | 'audio' | 'link' | 'schedule'
  >('none');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateAICaptions = async () => {
    setIsGeneratingCaption(true);
    try {
      const firstImg = mediaUrls.length > 0 ? mediaUrls[0] : null;
      const res = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: firstImg,
          tone: captionTone,
          language: captionLang,
          prompt: content.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.captions && data.captions.length > 0) {
          setAiCaptions(data.captions);
          addToast('✨ AI Captions generated successfully!', 'success');
        }
      } else {
        addToast('Could not generate AI captions', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to connect to AI engine', 'error');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleApplyCaption = (caption: string) => {
    setContent(caption);
    addToast('Caption applied to post!', 'info');
  };

  if (!isOpen || !user) return null;

  // Robust File Upload Handler with Fail-safe Fallback and Client-side Validation
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Client-side file validation
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        addToast(`File "${file.name}" exceeds maximum allowed size of 50MB`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(30 + Math.floor(((i + 1) / validFiles.length) * 60));

        let uploadedUrl = '';
        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            uploadedUrl = data.url || (data.files && data.files[0] ? data.files[0].url : '');
          } else {
            const errData = await res.json().catch(() => ({}));
            console.warn('Upload server error:', errData.error);
            addToast(`Upload failed for "${file.name}": ${errData.error || 'Server processing error'}`, 'error');
          }
        } catch (uploadErr: any) {
          console.warn('Network upload error:', uploadErr);
          addToast(`Network error uploading "${file.name}". Used local fail-safe reader.`, 'warning');
        }

        // High reliability fallback: FileReader data URL
        if (!uploadedUrl) {
          uploadedUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve((evt.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        }

        if (uploadedUrl) {
          newUrls.push(uploadedUrl);
        }
      }

      setUploadProgress(100);
      setMediaUrls((prev) => [...prev, ...newUrls]);

      // Determine media type
      if (validFiles[0].type.startsWith('video')) {
        setMediaType(content.trim() ? 'text_video' : 'video');
      } else if (validFiles[0].type.startsWith('audio')) {
        setMediaType(content.trim() ? 'text_audio' : 'audio');
      } else {
        const totalImages = mediaUrls.length + newUrls.length;
        if (totalImages > 1) {
          setMediaType('multiple_image');
        } else {
          setMediaType(content.trim() ? 'text_image' : 'image');
        }
      }

      addToast(`${validFiles.length} file(s) attached successfully!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Upload encountered an issue, used local fail-safe.', 'info');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFetchLinkPreview = async () => {
    if (!linkInput.trim()) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetch('/api/posts/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setLinkPreview(data);
        setActiveSubPanel('none');
        addToast('Link preview card generated!', 'info');
      } else {
        addToast('Could not fetch link metadata', 'warning');
      }
    } catch (e) {
      addToast('Failed to parse URL', 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReorderMedia = (index: number, direction: 'left' | 'right') => {
    setMediaUrls((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'left' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const toggleTagUser = (target: TaggedUser) => {
    setTaggedUsers((prev) =>
      prev.some((u) => u.id === target.id) ? prev.filter((u) => u.id !== target.id) : [...prev, target]
    );
  };

  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[a-zA-Z0-9_]+/g);
    return matches ? Array.from(new Set(matches.map((m) => m.slice(1)))) : [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !content.trim() &&
      mediaUrls.length === 0 &&
      !isPollActive &&
      !selectedGif &&
      !isAudioActive &&
      !linkPreview
    ) {
      addToast('Please enter text, attach media, or create a poll.', 'warning');
      return;
    }

    setIsSubmitting(true);

    // Compute final MediaType
    let finalMediaType: MediaType = 'none';
    if (isPollActive) finalMediaType = 'poll';
    else if (selectedGif) finalMediaType = 'gif';
    else if (isAudioActive) finalMediaType = content.trim() ? 'text_audio' : 'audio';
    else if (linkPreview) finalMediaType = 'link';
    else if (mediaUrls.length > 1) finalMediaType = 'multiple_image';
    else if (mediaUrls.length === 1) {
      const isVid = isVideoUrl(mediaUrls[0]);
      finalMediaType = isVid ? (content.trim() ? 'text_video' : 'video') : content.trim() ? 'text_image' : 'image';
    } else if (feeling && !content.trim()) finalMediaType = 'feeling';
    else if (location && !content.trim()) finalMediaType = 'location';

    const hashtags = extractHashtags(content);

    let pollData = undefined;
    if (isPollActive) {
      pollData = {
        question: pollQuestion.trim() || 'Community Poll',
        options: pollOptions.filter((o) => o.trim()).map((opt, idx) => ({
          id: `opt_${Date.now()}_${idx}`,
          text: opt.trim(),
          votes: 0,
        })),
        totalVotes: 0,
      };
    }

    let audioData: AudioPostData | undefined = undefined;
    if (isAudioActive && audioUrl.trim()) {
      audioData = {
        title: audioTitle.trim() || 'Audio Track',
        artist: audioArtist.trim() || user.fullName,
        audioUrl: audioUrl.trim(),
        durationSeconds: audioDuration || 120,
        waveform: [20, 35, 60, 85, 95, 70, 50, 40, 65, 80, 90, 100, 75, 45, 30, 55, 75, 90, 65, 40],
      };
    }

    try {
      // Process and save any base64 edited images to server before publishing
      const processedMediaUrls: string[] = [];
      for (let i = 0; i < mediaUrls.length; i++) {
        const url = mediaUrls[i];
        if (url && url.startsWith('data:image')) {
          try {
            const blobRes = await fetch(url);
            const blob = await blobRes.blob();
            const formData = new FormData();
            formData.append('file', blob, `edited_photo_${Date.now()}_${i}.jpg`);
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: formData,
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const savedUrl = uploadData.url || (uploadData.files && uploadData.files[0] ? uploadData.files[0].url : url);
              processedMediaUrls.push(savedUrl);
            } else {
              processedMediaUrls.push(url);
            }
          } catch (e) {
            console.warn('Failed to upload base64 edited photo, fallback to original url:', e);
            processedMediaUrls.push(url);
          }
        } else {
          processedMediaUrls.push(url);
        }
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content,
          mediaType: finalMediaType,
          mediaUrls: processedMediaUrls,
          pollData,
          privacy,
          commentsControl,
          backgroundGradient: backgroundGradient || undefined,
          fontStyle,
          fontSize,
          gifUrl: selectedGif || undefined,
          linkPreview: linkPreview || undefined,
          audioData,
          feeling: feeling || undefined,
          location: location.trim() || undefined,
          taggedUsers,
          hashtags,
          scheduledFor: isScheduled && scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        }),
      });

      if (res.ok) {
        const responseData = await res.json();
        addToast(
          isScheduled ? 'Transmission scheduled successfully!' : 'Post published successfully!',
          'success'
        );

        // Notify feed listeners to prepend new post immediately
        if (responseData.post) {
          window.dispatchEvent(new CustomEvent('nixo-post-created', { detail: responseData.post }));
        } else {
          window.dispatchEvent(new CustomEvent('nixo-post-created', { detail: null }));
        }

        // Reset form input fields so text is cleared
        resetFormState();

        onPostCreated();
        onClose();
      } else {
        const errData = await res.json();
        addToast(errData.error || 'Failed to publish post', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while publishing', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Post"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full liquid-glass-5 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-lg relative z-50">
          <GlassButton
            type="button"
            variant="glass"
            onClick={onClose}
            className="px-5 py-2 font-bold cursor-pointer"
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            form="create-post-form"
            variant="primary"
            disabled={isSubmitting || isUploading}
            leftIcon={<IconSparkles size={16} />}
            className="px-6 py-2 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Post'}
          </GlassButton>
        </div>
      }
    >
      <form id="create-post-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Author Header & Privacy Dropdowns */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-10 h-10 rounded-full object-cover border border-cyan-400/40"
            />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{user.fullName}</span>
                {user.isVerified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                @{user.username}
                {feeling && (
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold ml-1.5">
                    · {feeling.label}
                  </span>
                )}
                {location && (
                  <span className="text-violet-600 dark:text-violet-400 font-medium ml-1">
                    · 📍 {location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#101828]/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="followers">Followers Only</option>
              <option value="only_me">Only Me</option>
            </select>

            <select
              value={commentsControl}
              onChange={(e) => setCommentsControl(e.target.value as CommentsControl)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#101828]/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer hidden sm:block"
            >
              <option value="allow_all">Comments On</option>
              <option value="friends_only">Friends Comments</option>
              <option value="disabled">Comments Off</option>
            </select>
          </div>
        </div>

        {/* Tagged Friends Pills */}
        {taggedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 self-center mr-1">With:</span>
            {taggedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400"
              >
                @{u.username}
                <button
                  type="button"
                  onClick={() => toggleTagUser(u)}
                  className="hover:text-rose-500 cursor-pointer text-xs ml-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Text Input Area (Optionally Styled with Background Gradient) */}
        <div
          className={`rounded-2xl transition-all duration-300 p-4 relative overflow-hidden ${
            backgroundGradient
              ? ''
              : 'liquid-glass-surface border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-white/5'
          }`}
          style={{
            background: backgroundGradient || undefined,
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${user.fullName.split(' ')[0]}? Use #hashtags to categorize.`}
            rows={backgroundGradient ? 5 : 4}
            className={`w-full bg-transparent border-0 focus:outline-none resize-none leading-relaxed transition-all ${
              fontStyle === 'serif'
                ? 'font-serif'
                : fontStyle === 'mono'
                ? 'font-mono'
                : fontStyle === 'handwriting'
                ? 'italic font-serif'
                : fontStyle === 'bold'
                ? 'font-black tracking-tight'
                : 'font-sans'
            } ${
              fontSize === 'sm'
                ? 'text-xs'
                : fontSize === 'lg'
                ? 'text-base font-semibold'
                : fontSize === 'xl'
                ? 'text-lg font-bold'
                : fontSize === '2xl'
                ? 'text-xl sm:text-2xl font-black'
                : 'text-sm font-medium'
            } ${
              textAlign === 'left'
                ? 'text-left'
                : textAlign === 'right'
                ? 'text-right'
                : 'text-center'
            } ${
              backgroundGradient
                ? 'text-white font-extrabold placeholder:text-white/70 drop-shadow-md'
                : 'text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400'
            }`}
          />

          {/* Action Row: Background icon, Font styles, Font Sizes, Text alignments */}
          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Background Color Icon ONLY */}
              <button
                type="button"
                onClick={() => setActiveSubPanel(activeSubPanel === 'background' ? 'none' : 'background')}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  activeSubPanel === 'background' || backgroundGradient
                    ? 'border-cyan-400 bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/40 shadow-sm'
                    : 'border-white/15 bg-white/10 text-slate-400 hover:text-white hover:bg-white/20'
                }`}
                title="Choose Background Colors & Styles"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* Font Style Selectors */}
              <div className="flex items-center bg-black/20 dark:bg-white/5 rounded-xl p-0.5 border border-white/10 text-[10px]">
                {[
                  { id: 'sans', label: 'Aa' },
                  { id: 'serif', label: '𝒯' },
                  { id: 'mono', label: '</>' },
                  { id: 'handwriting', label: '𝓕' },
                  { id: 'bold', label: '𝗕' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontStyle(f.id as any)}
                    className={`px-1.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      fontStyle === f.id
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Font Style: ${f.id}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Font Size Selectors */}
              <div className="flex items-center bg-black/20 dark:bg-white/5 rounded-xl p-0.5 border border-white/10 text-[10px]">
                {[
                  { id: 'sm', label: 'A-', title: 'Small Font Size' },
                  { id: 'base', label: 'A', title: 'Normal Font Size' },
                  { id: 'lg', label: 'A+', title: 'Large Font Size' },
                  { id: 'xl', label: 'A++', title: 'Extra Large Font Size' },
                ].map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => setFontSize(sz.id as any)}
                    className={`px-1.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      fontSize === sz.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={sz.title}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>

              {/* Text Alignment */}
              <div className="flex items-center bg-black/20 dark:bg-white/5 rounded-xl p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setTextAlign('left')}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    textAlign === 'left' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign('center')}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    textAlign === 'center' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign('right')}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    textAlign === 'right' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
              {content.length} chars
            </span>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-cyan-500 font-semibold">
              <span>Optimizing and attaching media...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-cyan-900/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Image / Video Preview & AI Caption / Photo Edit Banner */}
        {mediaUrls.length > 0 && (
          <div className="space-y-3.5">
            {/* Prominent Live Photo Studio Workspace with Instant Live Preview */}
            {mediaUrls.some((u) => !u.startsWith('data:video') && !u.endsWith('.mp4') && !u.endsWith('.webm')) && (
              <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-900/90 border border-cyan-400/40 shadow-xl backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>লাইভ ফটো এডিটর ও AI স্টুডিও</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          লাইভ প্রিভিউ এক্টিভ
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        নিচের ফিল্টারে চাপ দিন অথবা ফুল ফটো স্টুডিওতে ক্রপ ও লাইটিং এডজাস্ট করুন।
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Instant AI Auto Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleInstantAiAutoEdit(selectedPreviewIndex)}
                      disabled={isApplyingInstantAi === selectedPreviewIndex}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isApplyingInstantAi === selectedPreviewIndex ? 'AI Processing...' : '✨ AI Auto Edit'}</span>
                    </button>

                    {/* Manual Adjustment Sliders Drawer Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsManualSlidersOpen((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                        isManualSlidersOpen
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-cyan-300 border-white/20'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isManualSlidersOpen ? 'Hide Sliders' : 'Manual Sliders'}</span>
                    </button>

                    {/* Full Studio / Crop Editor Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        const targetIdx = selectedPreviewIndex < mediaUrls.length ? selectedPreviewIndex : 0;
                        setEditingImageIndex(targetIdx);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Crop & Rotate</span>
                    </button>
                  </div>
                </div>

                {/* Main Large Real-Time Photo Preview Box with Editing Overlay */}
                {mediaUrls[selectedPreviewIndex] &&
                  !mediaUrls[selectedPreviewIndex].startsWith('data:video') &&
                  !mediaUrls[selectedPreviewIndex].endsWith('.mp4') &&
                  !mediaUrls[selectedPreviewIndex].endsWith('.webm') && (
                    <div className="relative w-full max-h-72 rounded-2xl overflow-hidden bg-black/70 border border-white/15 flex items-center justify-center group shadow-inner">
                      <img
                        src={
                          isComparingOriginal
                            ? originalMediaMapRef.current.get(selectedPreviewIndex) || mediaUrls[selectedPreviewIndex]
                            : mediaUrls[selectedPreviewIndex]
                        }
                        alt="Live Edited Preview Canvas"
                        className="w-full max-h-72 object-contain rounded-2xl transition-all duration-200"
                      />

                      {/* Loading spinner during instant AI processing */}
                      {isApplyingInstantAi === selectedPreviewIndex && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                          <Wand2 className="w-6 h-6 text-cyan-400 animate-spin" />
                          <span className="text-xs text-cyan-300 font-bold">
                            AI ব্যালেন্সিং ও লাইভ এনহ্যান্স হচ্ছে...
                          </span>
                        </div>
                      )}

                      {/* Floating overlay badges on the photo */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-full bg-slate-950/80 text-[10px] font-bold text-white border border-white/20 backdrop-blur-md shadow-md">
                          Photo #{selectedPreviewIndex + 1}
                        </span>
                        {activeFilterName && (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/90 text-[10px] font-black text-slate-950 backdrop-blur-md shadow-md">
                            {isComparingOriginal ? 'Original' : activeFilterName}
                          </span>
                        )}
                      </div>

                      {/* Quick Before/After Hold Compare on Preview Canvas */}
                      <div className="absolute bottom-2 left-2 pointer-events-auto">
                        <button
                          type="button"
                          onMouseDown={() => setIsComparingOriginal(true)}
                          onMouseUp={() => setIsComparingOriginal(false)}
                          onTouchStart={() => setIsComparingOriginal(true)}
                          onTouchEnd={() => setIsComparingOriginal(false)}
                          className="px-2.5 py-1 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-white text-[11px] font-bold border border-white/20 shadow-lg backdrop-blur-md flex items-center gap-1 cursor-pointer active:scale-95 select-none"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>{isComparingOriginal ? 'Showing Original' : 'Hold to Compare'}</span>
                        </button>
                      </div>

                      <div className="absolute bottom-2 right-2 pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => setEditingImageIndex(selectedPreviewIndex)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-cyan-300 text-xs font-bold border border-cyan-400/40 shadow-xl backdrop-blur-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>ডিটেইল এডিটিং</span>
                        </button>
                      </div>
                    </div>
                  )}

                {/* Real-Time Manual Adjustment Sliders Panel (Overlay Drawer) */}
                {isManualSlidersOpen && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-cyan-400/30 space-y-3 animate-slide-up">
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>রিয়েল-টাইম স্লাইডার এডজাস্টমেন্ট (Live Preview Sliders):</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleResetManualSliders}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {/* Brightness */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1 font-medium">
                            <Sun className="w-3 h-3 text-amber-400" /> Brightness
                          </span>
                          <span className="font-mono text-amber-300 font-bold">{manualAdjustments.brightness}</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={manualAdjustments.brightness}
                          onChange={(e) =>
                            handleApplyManualSlider({
                              ...manualAdjustments,
                              brightness: Number(e.target.value),
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                        />
                      </div>

                      {/* Contrast */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1 font-medium">
                            <Contrast className="w-3 h-3 text-cyan-400" /> Contrast
                          </span>
                          <span className="font-mono text-cyan-300 font-bold">{manualAdjustments.contrast}</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={manualAdjustments.contrast}
                          onChange={(e) =>
                            handleApplyManualSlider({
                              ...manualAdjustments,
                              contrast: Number(e.target.value),
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                        />
                      </div>

                      {/* Saturation */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1 font-medium">
                            <Palette className="w-3 h-3 text-pink-400" /> Saturation
                          </span>
                          <span className="font-mono text-pink-300 font-bold">{manualAdjustments.saturation}</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={manualAdjustments.saturation}
                          onChange={(e) =>
                            handleApplyManualSlider({
                              ...manualAdjustments,
                              saturation: Number(e.target.value),
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                        />
                      </div>

                      {/* Warmth */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1 font-medium">
                            <Flame className="w-3 h-3 text-orange-400" /> Warmth
                          </span>
                          <span className="font-mono text-orange-300 font-bold">{manualAdjustments.warmth}</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={manualAdjustments.warmth}
                          onChange={(e) =>
                            handleApplyManualSlider({
                              ...manualAdjustments,
                              warmth: Number(e.target.value),
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                        />
                      </div>

                      {/* Sharpness */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1 font-medium">
                            <Sparkles className="w-3 h-3 text-emerald-400" /> Sharpness
                          </span>
                          <span className="font-mono text-emerald-300 font-bold">{manualAdjustments.sharpness}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={manualAdjustments.sharpness}
                          onChange={(e) =>
                            handleApplyManualSlider({
                              ...manualAdjustments,
                              sharpness: Number(e.target.value),
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                        />
                      </div>

                      {/* Vignette */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1 font-medium">
                            <Crop className="w-3 h-3 text-purple-400" /> Vignette
                          </span>
                          <span className="font-mono text-purple-300 font-bold">{manualAdjustments.vignette}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={manualAdjustments.vignette}
                          onChange={(e) =>
                            handleApplyManualSlider({
                              ...manualAdjustments,
                              vignette: Number(e.target.value),
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Instant Real-Time Filter & AI Tune Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>কুইক এআই ফিল্টার চিপস (এক ক্লিকে লাইভ পরিবর্তন):</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleBatchAiAutoEditAll}
                      disabled={isBatchAiProcessing}
                      className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isBatchAiProcessing ? 'AI Enhancing All...' : '✨ সবগুলো একসাথে AI এডিট'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                      { id: 'original', label: '◻️ অরিজিনাল', desc: 'মূল ছবি' },
                      { id: 'ai_auto', label: '✨ AI অটো এডিট', desc: 'ব্যালেন্স লাইট ও কালার' },
                      { id: 'golden', label: '🌅 গোল্ডেন আওয়ার', desc: 'সানসেট উষ্ণ আলো' },
                      { id: 'hdr', label: '💎 ভাইব্র্যান্ট HDR', desc: 'হাই-কন্ট্রাস্ট শার্পনেস' },
                      { id: 'cinematic', label: '🎬 সিনেমাটিক', desc: 'টিল অ্যান্ড অরেঞ্জ' },
                      { id: 'noir', label: '🖤 নোয়ার ড্রামা', desc: 'ব্ল্যাক অ্যান্ড হোয়াইট' },
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleApplyQuickPreset(selectedPreviewIndex, chip.id)}
                        disabled={isApplyingInstantAi !== null}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 ${
                          activeFilterName.toLowerCase().includes(chip.id.replace('_', ' '))
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/40 font-black'
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                        }`}
                      >
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />
                <span>{mediaUrls.length} Media Attached</span>
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Batch AI Auto Edit Button for all photos */}
                {mediaUrls.some((u) => !u.startsWith('data:video') && !u.endsWith('.mp4') && !u.endsWith('.webm')) && (
                  <button
                    type="button"
                    onClick={handleBatchAiAutoEditAll}
                    disabled={isBatchAiProcessing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <Wand2 className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isBatchAiProcessing ? 'animate-spin' : ''}`} />
                    <span>{isBatchAiProcessing ? 'AI Enhancing All...' : '✨ AI Auto Edit All'}</span>
                  </button>
                )}

                {/* AI Caption Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsAiCaptionOpen(!isAiCaptionOpen)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 text-purple-700 dark:text-cyan-300 border border-purple-500/30 dark:border-cyan-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400 animate-pulse" />
                  <span>{isAiCaptionOpen ? 'Close AI Captions' : '✨ AI Caption'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {mediaUrls.map((url, idx) => {
                const isVideo = isVideoUrl(url);
                const isEnhancingThis = isApplyingInstantAi === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => !isVideo && setSelectedPreviewIndex(idx)}
                    className={`relative group rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                      selectedPreviewIndex === idx && !isVideo
                        ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg scale-[1.02]'
                        : 'border-black/10 dark:border-white/10 hover:border-cyan-400/40'
                    } bg-slate-900/60 shadow-md flex flex-col justify-between`}
                  >
                    <div className="relative w-full h-32 bg-black/40 overflow-hidden">
                      {isVideo ? (
                        <video src={url} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}

                      {/* Loading state for 1-click AI Edit */}
                      {isEnhancingThis && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-1 z-20">
                          <Wand2 className="w-5 h-5 text-cyan-400 animate-spin" />
                          <span className="text-[10px] text-cyan-300 font-bold">Auto Tuning...</span>
                        </div>
                      )}

                      {/* Top Action Pills: AI Auto Edit & Delete */}
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-auto">
                        {!isVideo ? (
                          <button
                            type="button"
                            onClick={() => handleInstantAiAutoEdit(idx)}
                            disabled={isEnhancingThis}
                            title="Instant 1-Click AI Auto Edit (Lighting, Tone & Color Balance)"
                            className="px-2 py-0.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] shadow-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI Edit</span>
                          </button>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white/80 font-mono">
                            VIDEO
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="p-1 rounded-full bg-slate-950/80 hover:bg-rose-600 text-white hover:text-white transition-colors cursor-pointer shadow-sm"
                          title="Remove media"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Toolbar for Media: Full Editor & Reorder */}
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-950/80 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (isVideo) setEditingVideoIndex(idx);
                          else setEditingImageIndex(idx);
                        }}
                        className="px-2 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                      >
                        <Crop className="w-3 h-3" />
                        <span>{isVideo ? 'ভিডিও এডিট করুন' : 'ছবি এডিট করুন'}</span>
                      </button>

                        <div className="flex items-center gap-0.5 text-slate-400">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleReorderMedia(idx, 'left')}
                              className="px-1.5 py-0.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              title="Move left"
                            >
                              ←
                            </button>
                          )}
                          {idx < mediaUrls.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleReorderMedia(idx, 'right')}
                              className="px-1.5 py-0.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              title="Move right"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>

            {/* AI Caption Generation Box */}
            {isAiCaptionOpen && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-900/10 via-slate-900/40 to-cyan-900/10 dark:from-purple-950/40 dark:via-slate-900/80 dark:to-cyan-950/40 border border-purple-500/30 dark:border-cyan-500/30 space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">AI Image Caption Generator</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Powered by multimodal Gemini 3.8 Flash</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Language selector */}
                    <select
                      value={captionLang}
                      onChange={(e) => setCaptionLang(e.target.value as any)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 outline-none cursor-pointer"
                    >
                      <option value="auto">Auto (En + বাংলা)</option>
                      <option value="bn">বাংলা (Bengali)</option>
                      <option value="en">English</option>
                    </select>

                    {/* Tone selector */}
                    <select
                      value={captionTone}
                      onChange={(e) => setCaptionTone(e.target.value as any)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 outline-none cursor-pointer"
                    >
                      <option value="viral">🔥 Viral & Trendy</option>
                      <option value="aesthetic">✨ Aesthetic & Chill</option>
                      <option value="inspirational">💫 Inspirational</option>
                      <option value="funny">😂 Humorous & Fun</option>
                      <option value="poetic">🌸 Poetic & Deep</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isGeneratingCaption}
                    onClick={handleGenerateAICaptions}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingCaption ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Analyzing image & crafting captions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate 3 AI Captions</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Generated Captions List */}
                {aiCaptions.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-purple-500/20 dark:border-cyan-500/20">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Select a caption to apply directly to your post:
                    </p>
                    <div className="space-y-1.5">
                      {aiCaptions.map((cap, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => handleApplyCaption(cap)}
                          className="p-2.5 rounded-xl bg-white/80 dark:bg-white/5 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/15 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer group flex items-start justify-between gap-2"
                        >
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                            {cap}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                            Apply
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interactive Poll Builder */}
        {isPollActive && (
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span>Create Interactive Poll</span>
              </span>
              <button
                type="button"
                onClick={() => setIsPollActive(false)}
                className="text-xs text-rose-500 hover:underline cursor-pointer"
              >
                Remove Poll
              </button>
            </div>

            <GlassInput
              placeholder="Poll Question / Topic..."
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />

            <div className="space-y-2">
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <GlassInput
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 text-xs px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, `Option ${prev.length + 1}`])}
                  className="text-xs font-bold text-cyan-400 hover:underline cursor-pointer pt-1"
                >
                  + Add Option
                </button>
              )}
            </div>
          </div>
        )}

        {/* Subpanel Drawers: Backgrounds, GIF, Tags, Feeling, Location, Link, Schedule */}
        {activeSubPanel === 'background' && (
          <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>Background Canvas Colors</span>
              </span>
              {backgroundGradient && (
                <button
                  type="button"
                  onClick={() => setBackgroundGradient('')}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  Clear Background
                </button>
              )}
            </div>

            {/* Circular Color Swatches (No text/names, only circles as requested) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-wrap">
                {/* 1. None / Reset Swatch */}
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundGradient('');
                    setActiveSubPanel('none');
                  }}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer hover:scale-110 shrink-0 ${
                    !backgroundGradient
                      ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-105'
                      : 'border-white/20 hover:border-white/50'
                  } bg-white/5 text-slate-400 text-xs font-bold`}
                  title="Default Transparent"
                >
                  ∅
                </button>

                {/* 2. Solid & Gradient & Image Circles */}
                {POST_BACKGROUNDS.filter((bg) => bg.id !== 'none').map((bg) => {
                  const isSelected = backgroundGradient === bg.value;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        setBackgroundGradient(bg.value);
                        setActiveSubPanel('none');
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer hover:scale-110 shrink-0 shadow-md ${
                        isSelected
                          ? 'border-white ring-2 ring-cyan-400 scale-110 shadow-cyan-500/40'
                          : 'border-white/20 hover:border-white/60'
                      }`}
                      style={{
                        background: bg.value,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  );
                })}

                {/* 3. Custom Background Import Button */}
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full border-2 border-dashed border-cyan-400/60 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 flex items-center justify-center transition-all cursor-pointer hover:scale-110 shrink-0"
                  title="Import Custom Background"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const res = reader.result as string;
                        setBackgroundGradient(`url('${res}') center/cover`);
                        addToast('Custom background applied!', 'success');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeSubPanel === 'gif' && (
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Select Animated GIF</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CURATED_GIFS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedGif(g.url);
                    setActiveSubPanel('none');
                  }}
                  className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 hover:border-cyan-400 group cursor-pointer"
                >
                  <img src={g.url} alt={g.title} className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                  <div className="text-[10px] p-1 font-semibold text-center text-slate-300 bg-black/60 truncate">
                    {g.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSubPanel === 'tags' && (
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tag Friends</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {SUGGESTED_FRIENDS.map((f) => {
                const isSelected = taggedUsers.some((x) => x.id === f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleTagUser(f)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/15'
                        : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <img src={f.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{f.fullName}</div>
                      <div className="text-[10px] text-slate-400 truncate">@{f.username}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeSubPanel === 'feeling' && (
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">How are you feeling?</span>
            <div className="flex flex-wrap gap-1.5">
              {FEELING_ACTIVITIES.map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFeeling(act);
                    setActiveSubPanel('none');
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border cursor-pointer ${
                    feeling?.label === act.label
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold'
                      : 'border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSubPanel === 'location' && (
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Add Location</span>
            <GlassInput
              placeholder="e.g. Dhaka, Bangladesh..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        )}

        {activeSubPanel === 'link' && (
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Attach Link</span>
            <div className="flex gap-2">
              <GlassInput
                placeholder="https://..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              />
              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFetchLinkPreview}
                disabled={isLoadingPreview}
              >
                {isLoadingPreview ? 'Fetching...' : 'Attach'}
              </GlassButton>
            </div>
          </div>
        )}

        {/* Attachment Toolbar Buttons */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden sm:inline mr-2">
            Add to post:
          </span>

          <div className="flex items-center gap-1">
            {/* File upload trigger (Photos & Videos) */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleUploadFile}
              className="hidden"
              id="composer-file-upload"
            />
            {/* Photo Button */}
            <label
              htmlFor="composer-file-upload"
              className="p-2 rounded-xl hover:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 cursor-pointer transition-colors flex items-center gap-1"
              title="Upload Photos"
            >
              <ImageIcon className="w-4 h-4" />
            </label>

            {/* Video Button */}
            <label
              htmlFor="composer-file-upload"
              className="p-2 rounded-xl hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1"
              title="Upload Videos"
            >
              <Video className="w-4 h-4" />
            </label>

            {/* Poll */}
            <button
              type="button"
              onClick={() => setIsPollActive((prev) => !prev)}
              className={`p-2 rounded-xl hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors ${
                isPollActive ? 'bg-emerald-500/20 ring-1 ring-emerald-400' : ''
              }`}
              title="Create Poll"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            {/* Audio snippet */}
            <button
              type="button"
              onClick={() => setIsAudioActive((prev) => !prev)}
              className={`p-2 rounded-xl hover:bg-violet-500/15 text-violet-600 dark:text-violet-400 cursor-pointer transition-colors ${
                isAudioActive ? 'bg-violet-500/20 ring-1 ring-violet-400' : ''
              }`}
              title="Attach Audio Track"
            >
              <Music className="w-4 h-4" />
            </button>

            {/* GIF Picker with distinct GIF Badge Icon */}
            <button
              type="button"
              onClick={() => setActiveSubPanel(activeSubPanel === 'gif' ? 'none' : 'gif')}
              className={`p-1.5 rounded-xl hover:bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 cursor-pointer transition-colors flex items-center justify-center ${
                activeSubPanel === 'gif' ? 'bg-fuchsia-500/20 ring-1 ring-fuchsia-400' : ''
              }`}
              title="Add Animated GIF"
            >
              <span className="text-[10px] font-black tracking-tight border-1.5 border-current px-1 py-0.5 rounded leading-none select-none">
                GIF
              </span>
            </button>

            {/* Tagging */}
            <button
              type="button"
              onClick={() => setActiveSubPanel(activeSubPanel === 'tags' ? 'none' : 'tags')}
              className={`p-2 rounded-xl hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors ${
                activeSubPanel === 'tags' ? 'bg-blue-500/20 ring-1 ring-blue-400' : ''
              }`}
              title="Tag Friends"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Feeling */}
            <button
              type="button"
              onClick={() => setActiveSubPanel(activeSubPanel === 'feeling' ? 'none' : 'feeling')}
              className={`p-2 rounded-xl hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 cursor-pointer transition-colors ${
                activeSubPanel === 'feeling' ? 'bg-amber-500/20 ring-1 ring-amber-400' : ''
              }`}
              title="Feeling / Activity"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Location */}
            <button
              type="button"
              onClick={() => setActiveSubPanel(activeSubPanel === 'location' ? 'none' : 'location')}
              className={`p-2 rounded-xl hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors ${
                activeSubPanel === 'location' ? 'bg-rose-500/20 ring-1 ring-rose-400' : ''
              }`}
              title="Check In / Location"
            >
              <MapPin className="w-4 h-4" />
            </button>

            {/* Link preview */}
            <button
              type="button"
              onClick={() => setActiveSubPanel(activeSubPanel === 'link' ? 'none' : 'link')}
              className={`p-2 rounded-xl hover:bg-teal-500/15 text-teal-600 dark:text-teal-400 cursor-pointer transition-colors ${
                activeSubPanel === 'link' ? 'bg-teal-500/20 ring-1 ring-teal-400' : ''
              }`}
              title="Attach Web Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* High-Fidelity Photo Studio & AI Auto Editor Modal */}
      {editingImageIndex !== null && mediaUrls[editingImageIndex] && (
        <ImageEditorModal
          isOpen={true}
          imageUrl={mediaUrls[editingImageIndex]}
          onClose={() => setEditingImageIndex(null)}
          onSave={async (editedUrl) => {
            let finalSavedUrl = editedUrl;
            if (editedUrl.startsWith('data:image')) {
              try {
                const res = await fetch(editedUrl);
                const blob = await res.blob();
                const formData = new FormData();
                formData.append('file', blob, `edited_photo_${Date.now()}.jpg`);
                const uploadRes = await fetch('/api/upload', {
                  method: 'POST',
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                  body: formData,
                });
                if (uploadRes.ok) {
                  const data = await uploadRes.json();
                  if (data.url) finalSavedUrl = data.url;
                }
              } catch (e) {
                console.warn('Edited photo upload fallback:', e);
              }
            }

            setMediaUrls((prev) => {
              const next = [...prev];
              next[editingImageIndex] = finalSavedUrl;
              return next;
            });
            setEditingImageIndex(null);
            addToast('✨ ছবি এডিটিং সফলভাবে সেভ হয়েছে! এখন ক্যাপশন লিখে পোস্ট করতে পারবেন।', 'success');
          }}
        />
      )}

      {/* High-Fidelity Video Editor Modal */}
      {editingVideoIndex !== null && mediaUrls[editingVideoIndex] && (
        <VideoEditorModal
          isOpen={true}
          videoUrl={mediaUrls[editingVideoIndex]}
          onClose={() => setEditingVideoIndex(null)}
          onSave={(editedVideoData) => {
            setMediaUrls((prev) => {
              const next = [...prev];
              next[editingVideoIndex] = editedVideoData.videoUrl;
              return next;
            });
            setEditingVideoIndex(null);
            addToast('✨ ভিডিও এডিটিং সফলভাবে সেভ হয়েছে! এখন ক্যাপশন লিখে পোস্ট করতে পারবেন।', 'success');
          }}
        />
      )}
    </GlassModal>
  );
};

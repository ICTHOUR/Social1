import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GlassModal } from '../design-system/components/GlassModal';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassInput } from '../design-system/components/GlassInput';
import {
  Camera,
  Video,
  Upload,
  Type,
  Music,
  Smile,
  AtSign,
  ExternalLink,
  HelpCircle,
  Lock,
  Globe,
  Users,
  Sparkles,
  RefreshCw,
  Plus,
  Check,
  Smartphone,
  Sliders,
  Wand2,
  Palette,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
  Image as ImageIcon,
} from 'lucide-react';
import { IconCameraStory } from '../design-system/icons/OriginalIcons';

interface CameraStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

export const CameraStoryModal: React.FC<CameraStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [storyMode, setStoryMode] = useState<'camera' | 'upload' | 'text'>('camera');
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Captured media preview state
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewMediaType, setPreviewMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrlInput, setFileUrlInput] = useState('');
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Text Story state
  const [textContent, setTextContent] = useState('');
  const [textGradient, setTextGradient] = useState('from-violet-600 via-indigo-600 to-cyan-500');

  // Interactive Add-ons
  const [activeAddon, setActiveAddon] = useState<'none' | 'poll' | 'music' | 'link' | 'mention' | 'stickers'>('none');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('Yes! 🔥');
  const [pollOption2, setPollOption2] = useState('Not yet ⏳');
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [mentionUsername, setMentionUsername] = useState('');
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'close_friends'>('public');

  // Rich Right-Side Story Editing Overlay State
  const [activeRightTool, setActiveRightTool] = useState<'none' | 'filters' | 'edit' | 'text' | 'stickers' | 'music'>('none');
  const [selectedFilterStyle, setSelectedFilterStyle] = useState<string>('none');
  const [storyAdjustments, setStoryAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [overlayInputText, setOverlayInputText] = useState('');
  const [overlayTextColor, setOverlayTextColor] = useState('#ffffff');
  const [overlayTextBg, setOverlayTextBg] = useState(true);
  const [placedElements, setPlacedElements] = useState<
    Array<{ id: string; type: 'text' | 'sticker'; content: string; color?: string; bg?: boolean; x: number; y: number; scale: number }>
  >([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const gradients = [
    { label: 'Neon Cyber', class: 'from-violet-600 via-indigo-600 to-cyan-500' },
    { label: 'Liquid Glass', class: 'from-cyan-500 via-teal-500 to-emerald-400' },
    { label: 'Sunset Blaze', class: 'from-rose-500 via-pink-500 to-amber-400' },
    { label: 'Midnight Space', class: 'from-slate-900 via-purple-950 to-indigo-900' },
    { label: 'Deep Ocean', class: 'from-blue-600 via-indigo-700 to-teal-500' },
  ];

  const defaultStickers = ['Liquid Glass 💎', 'Sound On 🔊', 'VIP Access ✨', '120 FPS ⚡', 'New Drop 🔥'];

  // Start device camera
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('WebRTC getUserMedia not available in this browser context');
      }
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: cameraMode === 'video',
        });
      } catch (e) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: cameraMode === 'video',
        });
      }
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        language === 'bn'
          ? 'সরাসরি ক্যামেরা অ্যাক্সেস সীমিত। নিচের বোতামে চাপ দিয়ে ফোনের ক্যামেরা খুলুন:'
          : 'Direct camera stream restricted. You can launch your mobile camera directly below:'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen && storyMode === 'camera' && !previewMediaUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, storyMode, cameraMode, facingMode, previewMediaUrl]);

  // Capture Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewMediaUrl(dataUrl);
      setPreviewMediaType('image');
      stopCamera();
    }
  };

  // Video Recording
  const startRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setPreviewMediaUrl(videoUrl);
        setPreviewMediaType('video');
        stopCamera();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 14) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('MediaRecorder error:', e);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isVid = file.type.startsWith('video');
      setPreviewMediaType(isVid ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setPreviewMediaUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const retakeMedia = () => {
    setPreviewMediaUrl(null);
    setSelectedFile(null);
    setFileUrlInput('');
    setRecordingSeconds(0);
    if (storyMode === 'camera') {
      startCamera();
    }
  };

  // Publish Story
  const handlePublishStory = async () => {
    if (!token) return;
    setIsSubmitting(true);

    try {
      let finalMediaUrl = previewMediaUrl || '';

      // If user uploaded a file or recorded a camera video blob, upload to /api/upload
      if (storyMode !== 'text') {
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
              if (uploadData.url) finalMediaUrl = uploadData.url;
            }
          } catch (e) {
            console.warn('Story file upload warning:', e);
          }
        } else if (previewMediaUrl && previewMediaUrl.startsWith('blob:') && recordedChunksRef.current.length > 0) {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const formData = new FormData();
            formData.append('file', blob, `recorded_story_${Date.now()}.webm`);
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              if (uploadData.url) finalMediaUrl = uploadData.url;
            }
          } catch (e) {
            console.warn('Recorded video blob upload warning:', e);
          }
        }
      }

      if (storyMode === 'text') {
        if (!textContent.trim()) {
          alert(language === 'bn' ? 'অনুগ্রহ করে স্টোরির লেখা লিখুন' : 'Please enter your text story content');
          setIsSubmitting(false);
          return;
        }
      }

      // Build payload
      const payload: any = {
        storyType: storyMode === 'text' ? 'text' : previewMediaType,
        mediaUrl: storyMode === 'text' ? '' : finalMediaUrl,
        mediaType: previewMediaType,
        caption,
        privacy,
      };

      if (storyMode === 'text') {
        payload.textContent = textContent.trim();
        payload.textStyle = {
          bgGradient: textGradient,
          font: 'sans',
          textColor: '#FFFFFF',
          textAlign: 'center',
        };
      }

      // Poll
      if (pollQuestion.trim()) {
        payload.poll = {
          question: pollQuestion.trim(),
          options: [
            { id: 'opt_1', text: pollOption1.trim() || 'Option 1', votes: 0 },
            { id: 'opt_2', text: pollOption2.trim() || 'Option 2', votes: 0 },
          ],
        };
      }

      // Music
      if (musicTitle.trim()) {
        payload.music = {
          title: musicTitle.trim(),
          artist: musicArtist.trim() || 'Featured Track',
        };
      }

      // Link
      if (linkUrl.trim()) {
        payload.link = {
          url: linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`,
          title: linkTitle.trim() || 'Visit Link',
        };
      }

      // Mentions
      if (mentionUsername.trim()) {
        payload.mentions = [
          {
            userId: 'user_mention',
            username: mentionUsername.replace(/^@/, '').trim(),
          },
        ];
      }

      // Stickers
      if (selectedStickers.length > 0) {
        payload.stickers = selectedStickers.map((stk, i) => ({
          id: `stk_${Date.now()}_${i}`,
          type: 'badge',
          content: stk,
          x: 20,
          y: 20 + i * 15,
        }));
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onClose();
        if (onStoryCreated) onStoryCreated();
      } else {
        const err = await res.json();
        alert(err.error || (language === 'bn' ? 'স্টোরি প্রকাশে সমস্যা হয়েছে' : 'Failed to post story'));
      }
    } catch (e) {
      console.error(e);
      alert(language === 'bn' ? 'স্টোরি প্রকাশের সময় ত্রুটি হয়েছে' : 'Error publishing story');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'bn' ? '২৪ ঘণ্টার স্টোরি তৈরি করুন' : 'Create 24-Hour Story'}
      subtitle={language === 'bn' ? 'ছবি, ভিডিও বা টেক্সট দিয়ে স্টোরি শেয়ার করুন' : 'Share ephemeral photos, videos, or styled thoughts'}
    >
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {/* Hidden Native Camera Input for Direct Device Capture */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Story Mode Selector */}
        <div className="flex p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10">
          <button
            onClick={() => {
              setStoryMode('camera');
              setPreviewMediaUrl(null);
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              storyMode === 'camera'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-white'
            }`}
          >
            <Camera size={14} />
            <span>{language === 'bn' ? 'ক্যামেরা' : 'Camera'}</span>
          </button>
          <button
            onClick={() => {
              setStoryMode('upload');
              stopCamera();
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              storyMode === 'upload'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-white'
            }`}
          >
            <Upload size={14} />
            <span>{language === 'bn' ? 'আপলোড' : 'Upload'}</span>
          </button>
          <button
            onClick={() => {
              setStoryMode('text');
              stopCamera();
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              storyMode === 'text'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-white'
            }`}
          >
            <Type size={14} />
            <span>{language === 'bn' ? 'টেক্সট স্টোরি' : 'Text Story'}</span>
          </button>
        </div>

        {/* --- 1. CAMERA MODE --- */}
        {storyMode === 'camera' && !previewMediaUrl && (
          <div className="space-y-3">
            <div className="relative w-full aspect-[9/13] max-h-[350px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/15">
              {cameraError ? (
                <div className="p-4 text-center space-y-3 max-w-xs">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                    <Camera size={24} />
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{cameraError}</p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer"
                    >
                      <Smartphone size={15} />
                      <span>{language === 'bn' ? '📸 মোবাইল ক্যামেরা খুলুন' : '📸 Open Mobile Camera'}</span>
                    </button>
                    <GlassButton size="sm" onClick={startCamera}>
                      {language === 'bn' ? 'পুনরায় লাইভ ভিউ চেষ্টা করুন' : 'Retry Live View'}
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isRecording && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-500/80 backdrop-blur-md text-white font-mono text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>REC 00:{recordingSeconds < 10 ? '0' + recordingSeconds : recordingSeconds}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick Native Camera Trigger Button */}
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Smartphone size={14} />
                <span>{language === 'bn' ? '📸 ফোন ক্যামেরা দিয়ে ছবি তুলুন' : '📸 Take Photo with Device Camera'}</span>
              </button>
            </div>

            {/* Camera Controls */}
            {!cameraError && (
              <div className="flex items-center justify-around py-1">
                <button
                  onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  title="Flip Camera"
                >
                  <RefreshCw size={18} />
                </button>

                {cameraMode === 'photo' ? (
                  <button
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full border-4 border-cyan-400 p-1 bg-white hover:scale-105 transition-transform cursor-pointer"
                  >
                    <div className="w-full h-full rounded-full bg-cyan-500" />
                  </button>
                ) : (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-14 h-14 rounded-full border-4 p-1 transition-all cursor-pointer ${
                      isRecording
                        ? 'border-rose-500 animate-pulse'
                        : 'border-white hover:border-rose-400'
                    }`}
                  >
                    <div
                      className={`w-full h-full rounded-full ${
                        isRecording ? 'bg-rose-500 rounded-lg scale-75' : 'bg-rose-500'
                      }`}
                    />
                  </button>
                )}

                <div className="flex p-1 rounded-xl bg-white/10">
                  <button
                    onClick={() => setCameraMode('photo')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                      cameraMode === 'photo' ? 'bg-cyan-500 text-white' : 'text-slate-300'
                    }`}
                  >
                    {language === 'bn' ? 'ছবি' : 'Photo'}
                  </button>
                  <button
                    onClick={() => setCameraMode('video')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                      cameraMode === 'video' ? 'bg-cyan-500 text-white' : 'text-slate-300'
                    }`}
                  >
                    {language === 'bn' ? 'ভিডিও' : 'Video'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 2. UPLOAD MODE --- */}
        {storyMode === 'upload' && !previewMediaUrl && (
          <div className="space-y-3">
            <label className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/5 transition-all">
              <Upload size={28} className="text-cyan-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-white">
                {language === 'bn' ? 'ছবি বা ভিডিও ফাইল বেছে নিন' : 'Choose Image or Video'}
              </span>
              <span className="text-[10px] text-slate-400">JPG, PNG, WebP, MP4, WebM (up to 50MB)</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#111728] px-2 text-[10px] text-slate-400 uppercase font-bold absolute">
                {language === 'bn' ? 'অথবা মিডিয়া লিঙ্ক' : 'Or Media URL'}
              </span>
            </div>

            <GlassInput
              placeholder={language === 'bn' ? 'সরাসরি ছবি বা ভিডিওর URL দিন...' : 'Paste direct image or video URL...'}
              value={fileUrlInput}
              onChange={(e) => {
                setFileUrlInput(e.target.value);
                setPreviewMediaUrl(e.target.value);
                setPreviewMediaType(e.target.value.includes('.mp4') ? 'video' : 'image');
              }}
            />
          </div>
        )}

        {/* --- 3. TEXT STORY MODE --- */}
        {storyMode === 'text' && (
          <div className="space-y-3">
            {/* Live Visual Canvas Preview */}
            <div
              className={`w-full aspect-[9/12] max-h-[300px] rounded-2xl bg-gradient-to-br ${textGradient} p-6 flex items-center justify-center text-center shadow-lg border border-white/20`}
            >
              <textarea
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={language === 'bn' ? 'আপনার ভাবনা বা আপডেট লিখুন...' : 'Type your ephemeral thought or update...'}
                className="w-full bg-transparent border-none text-center text-white font-extrabold text-base sm:text-lg placeholder-white/60 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Gradient Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {gradients.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setTextGradient(g.class)}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${g.class} shrink-0 border-2 transition-transform cursor-pointer ${
                    textGradient === g.class ? 'scale-110 border-white shadow-md' : 'border-transparent'
                  }`}
                  title={g.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Captured Media Preview (Photo/Video) with Right-Side Editing Tools */}
        {previewMediaUrl && storyMode !== 'text' && (
          <div className="space-y-3">
            <div className="relative w-full aspect-[9/14] max-h-[360px] rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl group">
              {/* Media with Filters & Adjustments */}
              {previewMediaType === 'video' ? (
                <video
                  src={previewMediaUrl}
                  autoPlay
                  loop
                  playsInline
                  style={{
                    filter:
                      selectedFilterStyle === 'vivid'
                        ? 'contrast(125%) brightness(105%) saturate(140%)'
                        : selectedFilterStyle === 'cyber'
                        ? 'hue-rotate(180deg) saturate(150%) contrast(120%)'
                        : selectedFilterStyle === 'vintage'
                        ? 'sepia(40%) contrast(110%)'
                        : selectedFilterStyle === 'warm'
                        ? 'sepia(25%) saturate(130%)'
                        : selectedFilterStyle === 'bw'
                        ? 'grayscale(100%) contrast(120%)'
                        : selectedFilterStyle === 'neon'
                        ? 'saturate(200%) contrast(130%)'
                        : `brightness(${storyAdjustments.brightness}%) contrast(${storyAdjustments.contrast}%) saturate(${storyAdjustments.saturation}%)`,
                  }}
                  className="w-full h-full object-cover transition-all"
                />
              ) : (
                <img
                  src={previewMediaUrl}
                  alt="Story preview"
                  style={{
                    filter:
                      selectedFilterStyle === 'vivid'
                        ? 'contrast(125%) brightness(105%) saturate(140%)'
                        : selectedFilterStyle === 'cyber'
                        ? 'hue-rotate(180deg) saturate(150%) contrast(120%)'
                        : selectedFilterStyle === 'vintage'
                        ? 'sepia(40%) contrast(110%)'
                        : selectedFilterStyle === 'warm'
                        ? 'sepia(25%) saturate(130%)'
                        : selectedFilterStyle === 'bw'
                        ? 'grayscale(100%) contrast(120%)'
                        : selectedFilterStyle === 'neon'
                        ? 'saturate(200%) contrast(130%)'
                        : `brightness(${storyAdjustments.brightness}%) contrast(${storyAdjustments.contrast}%) saturate(${storyAdjustments.saturation}%)`,
                  }}
                  className="w-full h-full object-cover transition-all"
                />
              )}

              {/* Retake Button (Top-Left) */}
              <button
                onClick={retakeMedia}
                className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 cursor-pointer shadow-md z-10"
              >
                {language === 'bn' ? '↺ আবার তুলুন' : '↺ Retake'}
              </button>

              {/* Placed Interactive Elements (Text & Stickers) */}
              {placedElements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElementId(selectedElementId === el.id ? null : el.id)}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    transform: `translate(-50%, -50%) scale(${el.scale})`,
                  }}
                  className={`absolute z-20 cursor-pointer select-none transition-transform ${
                    selectedElementId === el.id ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black/50 rounded-xl p-1 bg-black/40 backdrop-blur-xs' : ''
                  }`}
                >
                  {el.type === 'text' ? (
                    <span
                      style={{ color: el.color }}
                      className={`px-3 py-1.5 rounded-xl font-black text-sm sm:text-base drop-shadow-md ${
                        el.bg ? 'bg-black/70 border border-white/20' : ''
                      }`}
                    >
                      {el.content}
                    </span>
                  ) : (
                    <span className="text-3xl sm:text-4xl drop-shadow-lg">{el.content}</span>
                  )}

                  {/* Zoom / Scale & Delete Controls for Selected Element */}
                  {selectedElementId === el.id && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/90 border border-cyan-400/60 p-1 rounded-full backdrop-blur-md shadow-xl z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedElements((prev) =>
                            prev.map((item) => (item.id === el.id ? { ...item, scale: Math.max(0.5, item.scale - 0.2) } : item))
                          );
                        }}
                        className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedElements((prev) =>
                            prev.map((item) => (item.id === el.id ? { ...item, scale: Math.min(3, item.scale + 0.2) } : item))
                          );
                        }}
                        className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedElements((prev) => prev.filter((item) => item.id !== el.id));
                          setSelectedElementId(null);
                        }}
                        className="p-1 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Music Badge Overlay if music added */}
              {musicTitle && (
                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md border border-purple-500/40 px-3 py-1.5 rounded-full flex items-center gap-2 text-purple-300 text-xs font-bold shadow-lg z-10">
                  <Music className="w-3.5 h-3.5 animate-spin" />
                  <span>{musicTitle} {musicArtist ? `• ${musicArtist}` : ''}</span>
                </div>
              )}

              {/* --- RIGHT-SIDE FLOATING EDITING TOOLBAR --- */}
              <div className="absolute top-3 right-3 flex flex-col items-center gap-2.5 z-20">
                {/* 1. Music */}
                <button
                  type="button"
                  onClick={() => setActiveRightTool(activeRightTool === 'music' ? 'none' : 'music')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border shadow-lg ${
                    activeRightTool === 'music' || musicTitle
                      ? 'bg-purple-500 text-white border-purple-300 ring-2 ring-purple-400/40 scale-105'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title={language === 'bn' ? 'মিউজিক যোগ করুন' : 'Add Music'}
                >
                  <Music size={16} />
                </button>

                {/* 2. Filters / Effects */}
                <button
                  type="button"
                  onClick={() => setActiveRightTool(activeRightTool === 'filters' ? 'none' : 'filters')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border shadow-lg ${
                    activeRightTool === 'filters' || selectedFilterStyle !== 'none'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/40 scale-105 font-bold'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title={language === 'bn' ? 'ইফেক্ট ও ফিল্টার' : 'Effects & Filters'}
                >
                  <Wand2 size={16} />
                </button>

                {/* 3. Image Adjustments */}
                <button
                  type="button"
                  onClick={() => setActiveRightTool(activeRightTool === 'edit' ? 'none' : 'edit')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border shadow-lg ${
                    activeRightTool === 'edit'
                      ? 'bg-emerald-500 text-white border-emerald-300 ring-2 ring-emerald-400/40 scale-105'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title={language === 'bn' ? 'এডিট ও এডজাস্টমেন্ট' : 'Edit Adjustments'}
                >
                  <Sliders size={16} />
                </button>

                {/* 4. Text Overlay */}
                <button
                  type="button"
                  onClick={() => setActiveRightTool(activeRightTool === 'text' ? 'none' : 'text')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border shadow-lg ${
                    activeRightTool === 'text'
                      ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/40 scale-105'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title={language === 'bn' ? 'টেক্সট যোগ করুন' : 'Add Text'}
                >
                  <Type size={16} />
                </button>

                {/* 5. Stickers & Emojis */}
                <button
                  type="button"
                  onClick={() => setActiveRightTool(activeRightTool === 'stickers' ? 'none' : 'stickers')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border shadow-lg ${
                    activeRightTool === 'stickers' || placedElements.length > 0
                      ? 'bg-rose-500 text-white border-rose-300 ring-2 ring-rose-400/40 scale-105'
                      : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                  }`}
                  title={language === 'bn' ? 'স্টিকার ও ইমোজি' : 'Stickers & Emojis'}
                >
                  <Smile size={16} />
                </button>
              </div>
            </div>

            {/* --- RIGHT-SIDE TOOL ACTIVE PANELS --- */}

            {/* 1. Filters Panel */}
            {activeRightTool === 'filters' && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                  <span>🎨 {language === 'bn' ? 'লাইভ ফিল্টার ইফেক্ট' : 'Live Color Filters'}</span>
                  <button onClick={() => setSelectedFilterStyle('none')} className="text-[10px] text-slate-400 underline">Reset</button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'none', label: 'Original' },
                    { id: 'vivid', label: 'Vivid 🔥' },
                    { id: 'cyber', label: 'Cyber ⚡' },
                    { id: 'vintage', label: 'Vintage 🎞️' },
                    { id: 'warm', label: 'Warm Sunset 🌅' },
                    { id: 'bw', label: 'B&W Mono 🖤' },
                    { id: 'neon', label: 'Neon Glow 💖' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFilterStyle(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all cursor-pointer ${
                        selectedFilterStyle === f.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black scale-105'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Adjustments Panel */}
            {activeRightTool === 'edit' && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span>✏️ {language === 'bn' ? 'ইমেজ এডজাস্টমেন্ট' : 'Image Adjustments'}</span>
                  <button onClick={() => setStoryAdjustments({ brightness: 100, contrast: 100, saturation: 100 })} className="text-[10px] text-slate-400 underline">Reset</button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                  <div>
                    <label>Brightness ({storyAdjustments.brightness}%)</label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={storyAdjustments.brightness}
                      onChange={(e) => setStoryAdjustments((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label>Contrast ({storyAdjustments.contrast}%)</label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={storyAdjustments.contrast}
                      onChange={(e) => setStoryAdjustments((prev) => ({ ...prev, contrast: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label>Saturate ({storyAdjustments.saturation}%)</label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={storyAdjustments.saturation}
                      onChange={(e) => setStoryAdjustments((prev) => ({ ...prev, saturation: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Text Panel */}
            {activeRightTool === 'text' && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2.5 animate-fadeIn">
                <span className="text-xs font-bold text-amber-300 block">💬 {language === 'bn' ? 'স্টোরির উপরে টেক্সট লিখুন' : 'Text Overlay'}</span>
                <div className="flex gap-2">
                  <GlassInput
                    placeholder={language === 'bn' ? 'টেক্সট লিখুন...' : 'Type overlay text...'}
                    value={overlayInputText}
                    onChange={(e) => setOverlayInputText(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (!overlayInputText.trim()) return;
                      setPlacedElements((prev) => [
                        ...prev,
                        {
                          id: `text-${Date.now()}`,
                          type: 'text',
                          content: overlayInputText.trim(),
                          color: overlayTextColor,
                          bg: overlayTextBg,
                          x: 50,
                          y: 50,
                          scale: 1,
                        },
                      ]);
                      setOverlayInputText('');
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shrink-0 cursor-pointer"
                  >
                    {language === 'bn' ? 'যোগ করুন' : 'Add'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Color options */}
                  <div className="flex items-center gap-1.5">
                    {['#ffffff', '#facc15', '#06b6d4', '#ec4899', '#22c55e', '#ef4444', '#000000'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setOverlayTextColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full border border-white/40 cursor-pointer transition-transform ${
                          overlayTextColor === c ? 'scale-125 ring-2 ring-white' : ''
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setOverlayTextBg(!overlayTextBg)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      overlayTextBg ? 'bg-amber-500/20 text-amber-300 border-amber-400' : 'bg-white/5 text-slate-400 border-white/10'
                    }`}
                  >
                    Background Pill
                  </button>
                </div>
              </div>
            )}

            {/* 4. Stickers & Emojis Panel */}
            {activeRightTool === 'stickers' && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-rose-500/30 space-y-2 animate-fadeIn">
                <span className="text-xs font-bold text-rose-300 block">😊 {language === 'bn' ? 'স্টিকার বা ইমোজি পছন্দ করুন' : 'Pick Sticker / Emoji'}</span>
                <div className="grid grid-cols-6 gap-2 text-2xl text-center">
                  {['🔥', '💖', '✨', '🚀', '⚡', '🎉', '💯', '😎', '👑', '💎', '🌸', '🌈', '🥳', '😍', '📍', '🍿', '🏆', '🎶'].map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setPlacedElements((prev) => [
                          ...prev,
                          {
                            id: `sticker-${Date.now()}-${Math.random()}`,
                            type: 'sticker',
                            content: e,
                            x: 35 + Math.random() * 30,
                            y: 35 + Math.random() * 30,
                            scale: 1,
                          },
                        ]);
                      }}
                      className="p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-125 cursor-pointer"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Music Panel */}
            {activeRightTool === 'music' && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-2 animate-fadeIn">
                <span className="text-xs font-bold text-purple-300 block">🎵 {language === 'bn' ? 'স্টোরির গান যোগ করুন' : 'Background Music'}</span>
                <div className="grid grid-cols-2 gap-2">
                  <GlassInput
                    placeholder={language === 'bn' ? 'গানের নাম...' : 'Song name...'}
                    value={musicTitle}
                    onChange={(e) => setMusicTitle(e.target.value)}
                  />
                  <GlassInput
                    placeholder={language === 'bn' ? 'শিল্পী...' : 'Artist...'}
                    value={musicArtist}
                    onChange={(e) => setMusicArtist(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- INTERACTIVE STORY ADD-ONS TOOLBAR --- */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'ইন্টারেক্টিভ উপাদান যোগ করুন' : 'Add Interactive Elements'}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveAddon(activeAddon === 'poll' ? 'none' : 'poll')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                activeAddon === 'poll' || pollQuestion
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <HelpCircle size={13} />
              <span>{language === 'bn' ? 'পোল (ভোট)' : 'Poll'}</span>
            </button>

            <button
              onClick={() => setActiveAddon(activeAddon === 'music' ? 'none' : 'music')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                activeAddon === 'music' || musicTitle
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <Music size={13} />
              <span>{language === 'bn' ? 'গান' : 'Music'}</span>
            </button>

            <button
              onClick={() => setActiveAddon(activeAddon === 'link' ? 'none' : 'link')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                activeAddon === 'link' || linkUrl
                  ? 'bg-blue-500/20 text-blue-300 border-blue-400'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <ExternalLink size={13} />
              <span>{language === 'bn' ? 'লিঙ্ক' : 'Link'}</span>
            </button>

            <button
              onClick={() => setActiveAddon(activeAddon === 'mention' ? 'none' : 'mention')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                activeAddon === 'mention' || mentionUsername
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <AtSign size={13} />
              <span>{language === 'bn' ? 'মেনশন' : 'Mention'}</span>
            </button>

            <button
              onClick={() => setActiveAddon(activeAddon === 'stickers' ? 'none' : 'stickers')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                activeAddon === 'stickers' || selectedStickers.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <Sparkles size={13} />
              <span>{language === 'bn' ? 'স্টিকার' : 'Stickers'}</span>
            </button>
          </div>

          {/* Poll Config */}
          {activeAddon === 'poll' && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-cyan-300">
                {language === 'bn' ? 'পোল প্রশ্ন ও অপশন' : 'Poll Question & Options'}
              </span>
              <GlassInput
                placeholder={language === 'bn' ? 'প্রশ্ন লিখুন...' : 'Ask a question...'}
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <GlassInput
                  placeholder={language === 'bn' ? 'অপশন ১' : 'Option 1'}
                  value={pollOption1}
                  onChange={(e) => setPollOption1(e.target.value)}
                />
                <GlassInput
                  placeholder={language === 'bn' ? 'অপশন ২' : 'Option 2'}
                  value={pollOption2}
                  onChange={(e) => setPollOption2(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Music Config */}
          {activeAddon === 'music' && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-purple-300">
                {language === 'bn' ? 'গানের তথ্য' : 'Featured Track'}
              </span>
              <GlassInput
                placeholder={language === 'bn' ? 'গানের নাম...' : 'Song title...'}
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
              />
              <GlassInput
                placeholder={language === 'bn' ? 'শিল্পীর নাম...' : 'Artist name...'}
                value={musicArtist}
                onChange={(e) => setMusicArtist(e.target.value)}
              />
            </div>
          )}

          {/* Link Config */}
          {activeAddon === 'link' && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-blue-300">
                {language === 'bn' ? 'ওয়েব লিঙ্ক' : 'External Web Link'}
              </span>
              <GlassInput
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <GlassInput
                placeholder={language === 'bn' ? 'লিঙ্ক স্টিকার শিরোনাম...' : 'Link sticker title...'}
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />
            </div>
          )}

          {/* Mention Config */}
          {activeAddon === 'mention' && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-amber-300">
                {language === 'bn' ? 'বন্ধুকে মেনশন করুন' : 'Mention Friend'}
              </span>
              <GlassInput
                placeholder="@username"
                value={mentionUsername}
                onChange={(e) => setMentionUsername(e.target.value)}
              />
            </div>
          )}

          {/* Stickers Config */}
          {activeAddon === 'stickers' && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-rose-300">
                {language === 'bn' ? 'স্টিকার নির্বাচন করুন' : 'Tap to Add Stickers'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {defaultStickers.map((stk) => {
                  const isSelected = selectedStickers.includes(stk);
                  return (
                    <button
                      key={stk}
                      type="button"
                      onClick={() => {
                        setSelectedStickers((prev) =>
                          isSelected ? prev.filter((s) => s !== stk) : [...prev, stk]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500 text-white border-rose-400 scale-105'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {stk} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Caption & Privacy */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <GlassInput
            placeholder={language === 'bn' ? 'ক্যাপশন লিখুন (ঐচ্ছিক)...' : 'Add a caption (optional)...'}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          {/* Privacy Picker */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 font-semibold">{language === 'bn' ? 'প্রাইভেসি:' : 'Audience Privacy:'}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  privacy === 'public'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {language === 'bn' ? 'পাবলিক' : 'Public'}
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('friends')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  privacy === 'friends'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {language === 'bn' ? 'বন্ধুরা' : 'Friends'}
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('close_friends')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  privacy === 'close_friends'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {language === 'bn' ? 'ঘনিষ্ঠ বন্ধু' : 'Close Friends'}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <GlassButton variant="ghost" onClick={onClose}>
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handlePublishStory}
            disabled={isSubmitting || (storyMode === 'text' ? !textContent.trim() : !previewMediaUrl)}
          >
            {isSubmitting
              ? (language === 'bn' ? 'শেয়ার হচ্ছে...' : 'Sharing...')
              : (language === 'bn' ? '২৪ ঘণ্টার স্টোরিতে দিন' : 'Share to 24h Story')}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};

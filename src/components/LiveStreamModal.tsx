import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Video, 
  RotateCcw,
  Heart, 
  Share2, 
  Send, 
  Users, 
  CornerDownRight, 
  Check,
  Radio,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface CommentItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  text: string;
  isFollowing?: boolean;
  replyTo?: { id: string; name: string; text: string } | null;
  timestamp: string;
}

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHost?: { id: string; name: string; username: string; avatar: string; title: string };
}

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  onClose,
  initialHost,
}) => {
  const { user, token } = useAuth();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isLiveStarted, setIsLiveStarted] = useState(false);
  const [streamTitle, setStreamTitle] = useState(
    initialHost?.title || (isBn ? 'লাইভ সম্প্রচার' : 'Live Stream')
  );
  const [streamDescription, setStreamDescription] = useState(
    isBn ? 'লাইভ আড্ডা ও প্রশ্ন-উত্তর পর্ব' : 'Live Chat and Q&A session'
  );
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: 'c1',
      userId: 'u_101',
      name: 'Tanvir Ahmed',
      username: 'tanvir',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      text: isBn ? 'দারুণ লাইভ! অনেক শুভকামনা।' : 'Awesome live stream! Best wishes.',
      isFollowing: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'c2',
      userId: 'u_102',
      name: 'Nusrat Jahan',
      username: 'nusrat',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      text: isBn ? 'সবাইকে স্বাগতম!' : 'Welcome everyone!',
      isFollowing: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputComment, setInputComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null);
  const [likes, setLikes] = useState(142);
  const [viewers, setViewers] = useState(1);
  const [hasLiked, setHasLiked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showPostLiveSummary, setShowPostLiveSummary] = useState(false);
  const [useSimulatedCamera, setUseSimulatedCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const liveTimerRef = useRef<any>(null);

  const hostInfo = initialHost || {
    id: user?.id || 'host_1',
    name: user?.fullName || 'Nixo Host',
    username: user?.username || 'nixohost',
    avatar: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    title: streamTitle,
  };

  const isHost = hostInfo.id === user?.id;

  // Automatically start camera and microphone on open
  useEffect(() => {
    if (isOpen) {
      setIsLiveStarted(false);
      setElapsedSeconds(0);
      setViewers(1);
      startCamera();
    } else {
      stopCamera();
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    }
    return () => {
      stopCamera();
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, [isOpen]);

  // Live elapsed time counter & dynamic viewer simulator
  useEffect(() => {
    if (isLiveStarted) {
      liveTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        // Randomly simulate viewers joining
        if (Math.random() > 0.6) {
          setViewers((v) => v + Math.floor(Math.random() * 3) + 1);
        }
      }, 1000);
    } else {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    }
    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, [isLiveStarted]);

  const startCamera = async (overrideFacingMode?: 'user' | 'environment') => {
    stopCamera();
    setCameraError(null);
    const mode = overrideFacingMode || facingMode;
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera/Mic access fallback:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        console.warn('Failed to get camera/mic stream:', e);
        setCameraError(
          isBn
            ? 'ক্যামেরা বা মাইক্রোফোন পারমিশন পাওয়া যায়নি। ব্রাউজার সেটিংস থেকে পারমিশন দিন।'
            : 'Camera or microphone permission denied. Please allow permissions in browser settings.'
        );
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const flipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
    showToast(
      isBn
        ? nextMode === 'environment' ? '📷 ব্যাক ক্যামেরা সুইচ করা হয়েছে' : '🤳 ফ্রন্ট ক্যামেরা সুইচ করা হয়েছে'
        : nextMode === 'environment' ? '📷 Switched to Back Camera' : '🤳 Switched to Front Camera'
    );
  };

  const handleStartLive = () => {
    setIsLiveStarted(true);
    setViewers(5);
    showToast(isBn ? '🔴 লাইভ শুরু হয়েছে!' : '🔴 You are now Live!');
  };

  const handleEndLive = () => {
    setIsLiveStarted(false);
    stopCamera();
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    setShowPostLiveSummary(true);
  };

  // Auto scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputComment.trim()) return;

    const newComment: CommentItem = {
      id: 'c_' + Date.now(),
      userId: user?.id || 'me',
      name: user?.fullName || 'You',
      username: user?.username || 'you',
      avatar: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      text: inputComment.trim(),
      isFollowing: false,
      replyTo: replyingTo ? { id: replyingTo.id, name: replyingTo.name, text: replyingTo.text } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setComments((prev) => [...prev, newComment]);
    setInputComment('');
    setReplyingTo(null);
  };

  const handleToggleFollow = (userId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.userId === userId ? { ...c, isFollowing: !c.isFollowing } : c))
    );
    showToast(isBn ? 'ব্যবহারকারীকে ফলো করা হয়েছে!' : 'Followed user!');
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikes((p) => p + 1);
      setHasLiked(true);
    } else {
      setLikes((p) => Math.max(0, p - 1));
      setHasLiked(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: streamTitle,
          text: isBn ? 'Nixo লাইভ স্ট্রিম দেখুন!' : 'Check out this Nixo live stream!',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast(isBn ? 'লাইভ স্ট্রিম লিংক কপি করা হয়েছে!' : 'Live stream link copied!');
      }
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden animate-in fade-in duration-300 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-cyan-500/90 text-slate-950 px-4 py-2 rounded-2xl backdrop-blur-md shadow-2xl flex items-center space-x-2 text-xs font-black animate-in slide-in-from-top">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FULL SCREEN CAMERA VIDEO BACKGROUND */}
      <div className="absolute inset-0 w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
        {useSimulatedCamera ? (
          <video
            src="https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lights-42939-large.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isHost}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        )}

        {/* Camera Permission Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 z-10 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-3xl mb-4 shadow-xl">
              📷
            </div>
            <h3 className="text-white font-black text-base sm:text-lg mb-2">
              {isBn ? 'ক্যামেরা ও মাইক্রোফোন পারমিশন প্রয়োজন' : 'Camera & Microphone Permission Needed'}
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-sm mb-4 leading-relaxed">{cameraError}</p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-lg cursor-pointer active:scale-95"
              >
                {isBn ? 'অনুমতি দিয়ে পুনরায় চেষ্টা করুন' : 'Retry Camera Permission'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setUseSimulatedCamera(true);
                }}
                className="px-6 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-bold text-xs transition border border-purple-500/40 cursor-pointer active:scale-95"
              >
                {isBn ? 'সিমুলেটেড ক্যামেরা ব্যবহার করুন' : 'Use Simulated Camera'}
              </button>
            </div>
          </div>
        )}

        {/* Transparent Overlay Gradient for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <div className="relative z-20 flex items-center justify-between p-3 sm:p-5">
        {/* Live Status Badge & Viewer Count */}
        <div className="flex items-center space-x-2">
          {isLiveStarted ? (
            <div className="flex items-center space-x-2 bg-rose-600/90 backdrop-blur-md border border-rose-400/50 rounded-full px-3.5 py-1.5 shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-white font-black text-xs tracking-wider">LIVE</span>
              <span className="text-white/80 text-[11px] font-mono font-bold">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
          ) : (
            <div className="bg-cyan-500/90 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg">
              {isBn ? 'প্রাক-লাইভ প্রিভিউ' : 'Pre-Live Preview'}
            </div>
          )}

          {/* Viewer count */}
          <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-white text-xs font-bold shadow-md">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{viewers}</span>
          </div>
        </div>

        {/* Top Right Controls (Flip Camera, End Live & Close) */}
        <div className="flex items-center space-x-2">
          {/* Camera Flip Button (Front / Back) */}
          <button
            onClick={flipCamera}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/25 text-white transition-transform active:scale-95 cursor-pointer shadow-lg"
            title={isBn ? 'ক্যামেরা পরিবর্তন (Front/Back)' : 'Switch Camera'}
          >
            <RotateCcw className="w-4 h-4 text-cyan-300" />
          </button>

          {/* End Live Button */}
          {isLiveStarted && (
            <button
              onClick={handleEndLive}
              className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-transform active:scale-95 cursor-pointer shadow-lg flex items-center gap-1.5 border border-rose-400"
            >
              <span>{isBn ? 'এন্ড লাইভ (End)' : 'End Live'}</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/25 text-white transition-transform active:scale-95 cursor-pointer shadow-lg"
            title={isBn ? 'শেয়ার' : 'Share'}
          >
            <Share2 className="w-4 h-4 text-cyan-300" />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/50 hover:bg-rose-600/90 backdrop-blur-xl border border-white/25 text-white transition-transform active:scale-95 cursor-pointer shadow-lg"
            title={isBn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Active Live Title and Description Card */}
      {isLiveStarted && (
        <div className="absolute top-20 left-4 right-4 z-20 pointer-events-none animate-fadeIn">
          <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-3.5 rounded-2xl max-w-xs sm:max-w-md shadow-2xl space-y-1">
            <h4 className="text-white text-xs font-black truncate flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <span>{streamTitle}</span>
            </h4>
            {streamDescription && (
              <p className="text-cyan-200 text-[10px] sm:text-xs font-semibold leading-relaxed line-clamp-2">
                {streamDescription}
              </p>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM STREAM CHAT & ACTION AREA */}
      <div className="relative z-20 flex flex-col p-3 sm:p-5 max-w-2xl mx-auto w-full space-y-3">
        
        {/* START LIVE PRE-STREAM ACTION BUTTON (When Live is not started yet) */}
        {!isLiveStarted && (
          <div className="flex flex-col items-center justify-center py-4 space-y-4 animate-fadeIn w-full bg-slate-900/80 p-5 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
            {isHost && (
              <div className="w-full space-y-3.5 text-left">
                <div>
                  <label className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block mb-1">
                    {isBn ? 'લાઇভ শিরোনাম / নাম (Live Title)' : 'Live Title / Name'}
                  </label>
                  <input
                    type="text"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder={isBn ? 'লাইভ শিরোনাম লিখুন...' : 'Enter live stream title...'}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block mb-1">
                    {isBn ? 'লাইভ বিবরণ (Live Description)' : 'Live Description'}
                  </label>
                  <textarea
                    value={streamDescription}
                    onChange={(e) => setStreamDescription(e.target.value)}
                    placeholder={isBn ? 'লাইভের বিবরণ বা ডেসক্রিপশন লিখুন...' : 'Enter live stream description...'}
                    rows={2}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleStartLive}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 hover:from-rose-400 hover:to-pink-500 text-white font-black text-base shadow-2xl shadow-rose-600/50 border border-rose-300/40 flex items-center justify-center space-x-2 transform active:scale-95 transition-all cursor-pointer animate-pulse mt-2"
            >
              <Radio className="w-5 h-5 text-white animate-spin" />
              <span>{isBn ? 'স্টার্ট লাইভ (Start Live)' : 'Start Live Stream'}</span>
            </button>
            <p className="text-white/80 text-xs font-bold drop-shadow-md text-center">
              {isBn ? 'ক্যামেরা ও মাইক্রোফোন রেডি রয়েছে। স্টার্ট লাইভে ক্লিক করলেই লাইভ শুরু হবে।' : 'Camera and microphone are active. Click Start Live to broadcast.'}
            </p>
          </div>
        )}

        {/* BACKGROUNDLESS FLOATING LIVE COMMENTS (No container box or dark background!) */}
        {isLiveStarted && (
          <div className="max-h-40 sm:max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-none flex flex-col justify-end">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start space-x-2 max-w-[280px] sm:max-w-[380px] animate-in slide-in-from-bottom-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              >
                <img
                  src={comment.avatar}
                  alt={comment.name}
                  className="w-6 h-6 rounded-full object-cover border border-cyan-400/80 shrink-0 mt-0.5 shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-white text-[10px] font-black drop-shadow-md">{comment.name}</span>
                    <span className="text-white/60 text-[8px] font-mono">{comment.timestamp}</span>

                    {/* Special Host badge next to Streamer's Comment */}
                    {comment.userId === hostInfo.id && (
                      <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[8px] font-black px-1 rounded-md uppercase">
                        👑 Host
                      </span>
                    )}

                    {/* Follow Button directly next to commenter */}
                    {comment.userId !== user?.id && (
                      <button
                        onClick={() => handleToggleFollow(comment.userId)}
                        className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold transition-all shrink-0 cursor-pointer shadow-md ${
                          comment.isFollowing
                            ? 'bg-emerald-500/80 text-white border border-emerald-300/50'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
                        }`}
                      >
                        {comment.isFollowing ? (isBn ? '✓ ফলোয়িং' : 'Following') : (isBn ? '+ ফলো' : '+ Follow')}
                      </button>
                    )}
                  </div>

                  {comment.replyTo && (
                    <div className="border-l-2 border-cyan-400 pl-1.5 py-0.5 my-0.5 text-[9px] text-cyan-200 font-semibold drop-shadow-sm truncate">
                      @{comment.replyTo.name}: {comment.replyTo.text}
                    </div>
                  )}

                  {/* Comment Text directly on video with no background */}
                  <p className="text-white text-[10px] sm:text-xs font-semibold leading-snug break-words drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                    {comment.text}
                  </p>

                  {/* Reply Button */}
                  <button
                    onClick={() => setReplyingTo(comment)}
                    className="inline-flex items-center space-x-1 text-cyan-300 hover:text-cyan-100 text-[8px] font-extrabold mt-0.5 cursor-pointer drop-shadow-md"
                  >
                    <CornerDownRight className="w-2 h-2" />
                    <span>{isBn ? 'উত্তর দিন' : 'Reply'}</span>
                  </button>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        )}

        {/* REPLY TARGET BANNER IF ACTIVE */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-black/70 border border-cyan-400/60 rounded-xl px-3 py-1.5 text-[10px] text-cyan-200 shadow-xl backdrop-blur-md">
            <span className="truncate">
              {isBn ? 'উত্তর দিচ্ছেন' : 'Replying to'} <strong className="text-white">@{replyingTo.name}</strong>: "{replyingTo.text}"
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-white/80 hover:text-white font-bold ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {/* COMPACT HOST INFO (AT BOTTOM) + INPUT BAR */}
        <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-2xl border border-white/20 rounded-2xl p-2 shadow-2xl">
          {/* Small Host Badge at Bottom - Hidden on Mobile to prevent Send button overflow */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-white/10 px-2 py-1 rounded-xl shrink-0 border border-white/10">
            <img src={hostInfo.avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-cyan-400" />
            <div className="flex flex-col">
              <span className="text-white text-[10px] font-extrabold leading-tight truncate max-w-[65px] sm:max-w-[100px]">
                {hostInfo.name}
              </span>
              <span className="text-cyan-300 text-[8px] leading-tight font-mono">Host</span>
            </div>
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSendComment} className="flex-1 flex items-center space-x-1.5">
            <input
              type="text"
              value={inputComment}
              onChange={(e) => setInputComment(e.target.value)}
              placeholder={isBn ? 'কমেন্ট করুন...' : 'Write a comment...'}
              className="flex-1 bg-white/10 text-white placeholder-white/50 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-400 border border-white/15"
            />
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1 transition shadow-md cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? 'পাঠান' : 'Send'}</span>
            </button>
          </form>

          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`p-2 rounded-xl backdrop-blur-xl border transition flex items-center space-x-1 cursor-pointer active:scale-95 ${
              hasLiked
                ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title={isBn ? 'লাইক দিন' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-white' : 'text-rose-400'}`} />
            <span className="text-[11px] font-black">{likes}</span>
          </button>
        </div>
      </div>

      {/* Post-Live Summary & Action Modal (Delete vs Post) */}
      {showPostLiveSummary && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-rose-500 mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg">
              🔴
            </div>
            <div>
              <h3 className="text-white text-lg font-black">
                {isBn ? 'লাইভ সম্প্রচার শেষ হয়েছে!' : 'Live Stream Ended!'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {isBn ? `সময়: ${formatTimer(elapsedSeconds)} · মোট ভিউয়ার: ${viewers} · লাইক: ${likes}` : `Duration: ${formatTimer(elapsedSeconds)} · Viewers: ${viewers} · Likes: ${likes}`}
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 text-left text-xs text-slate-300 space-y-1">
              <div className="font-bold text-white mb-1">{streamTitle}</div>
              <div className="text-slate-400">
                {isBn ? 'এই লাইভ সেশনটি কি ডিলিট করতে চান নাকি আপনার ফিডে ভিডিও পোস্ট হিসেবে প্রকাশ করতে চান?' : 'Would you like to delete this recording or publish it as a video post in your feed?'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Delete Button */}
              <button
                onClick={() => {
                  setShowPostLiveSummary(false);
                  onClose();
                  showToast(isBn ? 'লাইভ সেশন ডিলিট করা হয়েছে' : 'Live recording deleted');
                }}
                className="px-4 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>🗑️ {isBn ? 'ডিলিট করুন' : 'Delete'}</span>
              </button>

              {/* Post Button */}
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/posts', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        content: `🔴 Live Stream Recording: ${streamTitle} (${formatTimer(elapsedSeconds)})`,
                        mediaType: 'video',
                        mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lights-42939-large.mp4'],
                        privacy: 'public',
                      }),
                    });
                    window.dispatchEvent(new CustomEvent('nixo-post-created', { detail: null }));
                    showToast(isBn ? 'সফলভাবে লাইভ ভিডিও পোস্ট করা হয়েছে!' : 'Live stream published as post!');
                  } catch (e) {
                    console.error('Failed to publish live post:', e);
                  }
                  setShowPostLiveSummary(false);
                  onClose();
                }}
                className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/30 active:scale-95"
              >
                <span>🚀 {isBn ? 'পোস্ট করুন' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

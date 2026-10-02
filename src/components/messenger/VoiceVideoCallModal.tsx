import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Clock 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface VoiceVideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: { id: string; name: string; username: string; avatar: string } | null;
  callType: 'audio' | 'video';
}

export const VoiceVideoCallModal: React.FC<VoiceVideoCallModalProps> = ({
  isOpen,
  onClose,
  partner,
  callType,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [callState, setCallState] = useState<'dialing' | 'connected' | 'ended'>('dialing');
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrimaryLocal, setIsPrimaryLocal] = useState(false); // PiP interactive swapping
  
  // Audio volume visualizer mock peaks
  const [audioPeak, setAudioPeak] = useState(30);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const visualizerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && partner) {
      setCallState('dialing');
      setCallDuration(0);
      setMicMuted(false);
      setVideoOff(callType === 'audio');
      setFacingMode('user');
      setSelectedFilter('none');
      setIsPrimaryLocal(false);

      // Simulate connection after 2.2 seconds
      const connectTimeout = setTimeout(() => {
        setCallState('connected');
      }, 2200);

      if (callType === 'video') {
        startLocalCamera();
      }

      // Voice level visualizer simulation
      visualizerIntervalRef.current = setInterval(() => {
        if (!micMuted) {
          setAudioPeak(15 + Math.floor(Math.random() * 65));
        } else {
          setAudioPeak(5);
        }
      }, 150);

      return () => {
        clearTimeout(connectTimeout);
        stopStream();
        if (timerRef.current) clearInterval(timerRef.current);
        if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
      };
    }
  }, [isOpen, partner, callType]);

  // Call duration counter once connected
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const startLocalCamera = async (overrideFacingMode?: 'user' | 'environment') => {
    stopStream();
    const mode = overrideFacingMode || facingMode;
    try {
      const constraints = {
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Could not launch caller video stream:', err);
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = fallback;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = fallback;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error('Camera fallback error:', e);
      }
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleToggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    } else {
      setMicMuted(!micMuted);
    }
  };

  const handleToggleVideo = () => {
    if (callType === 'audio') return;
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOff(!videoTrack.enabled);
      }
    } else {
      setVideoOff(!videoOff);
    }
  };

  const flipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startLocalCamera(nextMode);
  };

  const handleEndCall = () => {
    setCallState('ended');
    stopStream();
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours > 0 ? hours + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !partner) return null;

  return (
    <div className="fixed inset-0 z-[1000] h-[100dvh] bg-slate-950 backdrop-blur-xl flex flex-col justify-between overflow-hidden select-none">
      {/* Call Header */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2.5">
          <img src={partner.avatar} alt={partner.name} className="w-8 h-8 rounded-full object-cover border border-cyan-400 shadow-md" />
          <div className="text-left leading-tight">
            <h4 className="text-xs font-black text-white">{partner.name}</h4>
            <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
              {callState === 'dialing' && (isBn ? '🔔 রিং হচ্ছে...' : 'Ringing...')}
              {callState === 'connected' && (
                <>
                  <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-300">{formatTimer(callDuration)}</span>
                </>
              )}
              {callState === 'ended' && (isBn ? '🔴 কল শেষ হয়েছে' : 'Call Ended')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {callType === 'video' && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}

          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Calling Content Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative bg-[#070b16] overflow-hidden min-h-0">
        
        {/* Fullscreen Interactive Video Call Mode */}
        {callType === 'video' && !videoOff ? (
          <div className="absolute inset-0 w-full h-full bg-slate-950 flex items-center justify-center z-10">
            {/* Primary Full Screen View */}
            {!isPrimaryLocal ? (
              // Remote User Full Screen (Simulated with partner video feed or avatar backdrop)
              <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                <img src={partner.avatar} alt="" className="w-full h-full object-cover filter blur-sm opacity-50 absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                <div className="relative z-10 flex flex-col items-center space-y-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-cyan-400 shadow-2xl">
                    <img src={partner.avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-white font-black text-lg drop-shadow-lg">{partner.name}</h3>
                  <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-cyan-200 text-xs font-bold">
                    {isBn ? 'ভিডিও কল লাইভ' : 'Video Call Live'}
                  </span>
                </div>
              </div>
            ) : (
              // Local User Full Screen
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Interactive PiP Floating Thumbnail (Click to Swap) */}
            <div
              onClick={() => setIsPrimaryLocal(!isPrimaryLocal)}
              className="absolute top-20 right-4 z-30 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-2xl cursor-pointer group transition-transform active:scale-95 bg-slate-900"
              title={isBn ? 'স্ক্রিন পরিবর্তন করতে ক্লিক করুন' : 'Click to swap screens'}
            >
              {!isPrimaryLocal ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                  <img src={partner.avatar} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-end p-2">
                    <span className="text-white text-[10px] font-bold truncate">{partner.name}</span>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[9px] font-black px-2 py-1 rounded-full backdrop-blur-md">
                  {isBn ? 'বদল করুন 🔄' : 'Swap 🔄'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Audio Call or Video Off Backdrop
          <div className="flex flex-col items-center text-center p-6 space-y-4 z-20 animate-fadeIn">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping opacity-75" />
              <img src={partner.avatar} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-cyan-400 shadow-2xl relative z-10" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">{partner.name}</h2>
              <p className="text-slate-400 text-xs">@{partner.username}</p>
            </div>

            {/* Audio level meter animation */}
            {callState === 'connected' && (
              <div className="flex items-center gap-1 justify-center h-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
                  const barHeight = Math.max(15, (audioPeak * (bar % 3 === 0 ? 0.9 : bar % 2 === 0 ? 0.7 : 0.5)) % 40);
                  return (
                    <span
                      key={bar}
                      style={{ height: `${barHeight}px` }}
                      className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-blue-500 transition-all duration-150"
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Real-time Video Effect Filter Overlay Tray */}
        {callType === 'video' && !videoOff && callState === 'connected' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-sm w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto select-none">
            {[
              { id: 'none', label: 'Normal' },
              { id: 'vivid', label: 'Vivid 🔥' },
              { id: 'cyber', label: 'Cyber ⚡' },
              { id: 'vintage', label: 'Vintage 🎞️' },
              { id: 'warm', label: 'Warm 🌅' },
              { id: 'bw', label: 'B&W 🖤' },
              { id: 'neon', label: 'Neon 💖' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight shrink-0 transition cursor-pointer border ${
                  selectedFilter === f.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                    : 'bg-white/5 text-white/80 border-white/5 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Call Footer / Action Buttons (Pinned securely shrink-0, guaranteed never to go off-screen) */}
      <div className="shrink-0 z-50 py-4 px-4 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-center gap-4 shadow-2xl">
        {/* Toggle Audio */}
        <button
          onClick={handleToggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-lg ${
            micMuted
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
          }`}
          title="Mute Mic"
        >
          {micMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Red Disconnect Button */}
        <button
          onClick={handleEndCall}
          className="w-16 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer active:scale-90 border border-rose-400 shadow-xl shadow-rose-600/40 flex items-center justify-center"
          title="End Call"
        >
          <PhoneOff size={22} className="text-white" />
        </button>

        {/* Toggle Video */}
        {callType === 'video' && (
          <>
            <button
              onClick={handleToggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-lg ${
                videoOff
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
              title="Camera Switch"
            >
              {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            {/* Flip Camera */}
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
              title="Flip Camera"
            >
              <RefreshCw size={20} className="text-cyan-300" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

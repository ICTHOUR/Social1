import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  X,
  Search,
  Compass,
  ArrowRight,
  Sparkles,
  Volume2,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useVoiceRecognition, VoiceCommandResult } from '../../hooks/useVoiceRecognition';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../design-system/ThemeContext';

export interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onSearch: (query: string) => void;
  onOpenCreatePost?: () => void;
  onOpenCreateStory?: () => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSearch,
  onOpenCreatePost,
  onOpenCreateStory,
}) => {
  const { language, t } = useLanguage();
  const { toggleTheme } = useTheme();

  const [selectedLang, setSelectedLang] = useState<'en-US' | 'bn-BD'>(
    language === 'bn' ? 'bn-BD' : 'en-US'
  );
  const [detectedResult, setDetectedResult] = useState<VoiceCommandResult | null>(null);
  const [autoExecuteCountdown, setAutoExecuteCountdown] = useState<number | null>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    audioLevel,
    startListening,
    stopListening,
  } = useVoiceRecognition({
    language: selectedLang,
    onCommandDetected: (result) => {
      setDetectedResult(result);
      if (result.matchedCommand) {
        // Auto-execute after 800ms so the user sees the visual feedback
        setAutoExecuteCountdown(1);
      }
    },
  });

  // Start listening automatically when opened
  useEffect(() => {
    if (isOpen) {
      setDetectedResult(null);
      setAutoExecuteCountdown(null);
      startListening(selectedLang);
    } else {
      stopListening();
    }
  }, [isOpen, selectedLang]);

  // Handle countdown auto-execution
  useEffect(() => {
    if (autoExecuteCountdown === null) return;

    const timer = setTimeout(() => {
      if (!detectedResult?.matchedCommand) return;
      const cmd = detectedResult.matchedCommand;

      if (cmd.type === 'navigation' && cmd.target) {
        onNavigate(cmd.target);
        onClose();
      } else if (cmd.type === 'action') {
        if (cmd.action === 'create_post' && onOpenCreatePost) {
          onOpenCreatePost();
          onClose();
        } else if (cmd.action === 'create_story' && onOpenCreateStory) {
          onOpenCreateStory();
          onClose();
        } else if (cmd.action === 'toggle_theme') {
          toggleTheme();
          onClose();
        }
      } else if (cmd.type === 'search') {
        onSearch(detectedResult.rawTranscript);
        onClose();
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [autoExecuteCountdown, detectedResult, onNavigate, onSearch, onOpenCreatePost, onOpenCreateStory, toggleTheme, onClose]);

  if (!isOpen) return null;

  const currentDisplay = transcript || interimTranscript;

  const handleExecuteNow = () => {
    if (!detectedResult?.matchedCommand) {
      if (currentDisplay.trim()) {
        onSearch(currentDisplay.trim());
        onClose();
      }
      return;
    }

    const cmd = detectedResult.matchedCommand;
    if (cmd.type === 'navigation' && cmd.target) {
      onNavigate(cmd.target);
    } else if (cmd.type === 'action') {
      if (cmd.action === 'create_post') onOpenCreatePost?.();
      else if (cmd.action === 'create_story') onOpenCreateStory?.();
      else if (cmd.action === 'toggle_theme') toggleTheme();
    } else {
      onSearch(detectedResult.rawTranscript);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-white/15 p-6 sm:p-7 shadow-2xl z-10 text-slate-900 dark:text-white space-y-6 overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/25">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'ভয়েস কমান্ড ও সার্চ' : 'Voice Command & Search'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30">
                  Web Speech API
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'bn' ? 'কথা বলুন সার্চ বা যেকোনো পেজে যেতে' : 'Speak to search content or trigger navigation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setSelectedLang(selectedLang === 'en-US' ? 'bn-BD' : 'en-US')}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Toggle speech recognition language"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              <span>{selectedLang === 'bn-BD' ? 'বাংলা (BN)' : 'English (US)'}</span>
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

        {/* Central Glowing Microphone Visualizer */}
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Dynamic Pulsing Rings */}
            {isListening && (
              <>
                <div
                  className="absolute w-28 h-28 rounded-full bg-cyan-500/20 animate-ping opacity-75 pointer-events-none"
                  style={{ animationDuration: '2s' }}
                />
                <div
                  className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/30 to-blue-500/30 blur-md pointer-events-none transition-transform duration-100"
                  style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
                />
              </>
            )}

            {/* Interactive Mic Button */}
            <button
              type="button"
              onClick={() => {
                if (isListening) stopListening();
                else startListening(selectedLang);
              }}
              className={`relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-tr from-cyan-500 via-teal-400 to-blue-600 text-slate-950 ring-4 ring-cyan-400/40 shadow-cyan-500/50 scale-105'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:border-cyan-400 border border-slate-200 dark:border-white/15'
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 animate-pulse stroke-[2.5]" />
              ) : (
                <MicOff className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>

          {/* Soundwave Simulation Indicator */}
          <div className="flex items-center gap-1 h-6">
            {[40, 75, 100, 60, 90, 45, 80, 50, 70].map((h, idx) => (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isListening
                    ? 'bg-gradient-to-t from-cyan-500 to-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700 h-1'
                }`}
                style={{
                  height: isListening ? `${Math.max(4, h * (audioLevel || 0.3))}px` : '4px',
                }}
              />
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isListening
              ? language === 'bn'
                ? '🎙️ শুনছি... কথা বলুন'
                : '🎙️ Listening... Speak now'
              : language === 'bn'
              ? 'কথা বলতে মাইকে চাপ দিন'
              : 'Tap microphone to speak'}
          </p>
        </div>

        {/* Live Spoken Transcript Display */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 min-h-[76px] flex flex-col justify-center text-center space-y-1 relative">
          {currentDisplay ? (
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug animate-fadeIn">
              "{currentDisplay}"
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {language === 'bn'
                ? 'যেমন: "রিলস খোলো", "ওয়ালেটে যাও", "নতুন পোস্ট", বা কোনো সার্চ টপিক বলুন...'
                : 'Try saying: "Go to Reels", "Open Wallet", "Create Post", or any search topic...'}
            </p>
          )}

          {/* Matched Action Command Badge */}
          {detectedResult?.matchedCommand && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs animate-bounce">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{detectedResult.matchedCommand.label}</span>
                {autoExecuteCountdown !== null && (
                  <span className="text-[10px] font-mono text-emerald-500">...</span>
                )}
              </span>
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-500 dark:text-rose-400 font-semibold flex items-center justify-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Quick Voice Command Hints */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              {language === 'bn' ? 'দ্রুত ভয়েস প্রম্পটস' : 'Voice Command Shortcuts'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: '🏠 "Home Feed"', query: 'Home' },
              { label: '🎬 "Open Reels"', query: 'Reels' },
              { label: '💬 "Messenger"', query: 'Messenger' },
              { label: '💰 "Open Wallet"', query: 'Wallet' },
              { label: '✨ "Create Post"', query: 'Create Post' },
              { label: '🔍 "Search AI 2026"', query: 'Artificial Intelligence' },
              { label: '🌙 "Dark Mode"', query: 'Dark Mode' },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDetectedResult({
                    rawTranscript: chip.query,
                    isFinal: true,
                    matchedCommand: {
                      type: 'search',
                      label: chip.label,
                    },
                  });
                  // Trigger immediately
                  if (chip.query === 'Home') onNavigate('home');
                  else if (chip.query === 'Reels') onNavigate('reels');
                  else if (chip.query === 'Messenger') onNavigate('messenger');
                  else if (chip.query === 'Wallet') onNavigate('wallet');
                  else if (chip.query === 'Create Post') onOpenCreatePost?.();
                  else if (chip.query === 'Dark Mode') toggleTheme();
                  else onSearch(chip.query);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-cyan-500/15 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-cyan-400 transition-all cursor-pointer active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer transition-colors"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          {currentDisplay && (
            <button
              type="button"
              onClick={handleExecuteNow}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <span>{language === 'bn' ? 'সম্পন্ন করুন' : 'Execute Command'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceSearchModal;

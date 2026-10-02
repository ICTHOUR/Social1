import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  REACTION_DEFINITIONS,
  getReactionLabel,
} from '../icons/Reaction3DIcons';
import { playReactionSound, isSoundMuted, toggleSoundMuted } from '../../utils/reactionSounds';
import { useLanguage } from '../../context/LanguageContext';
import { ReactionType } from '../../types';

interface ReactionPickerProps {
  isOpen: boolean;
  onSelect: (type: ReactionType) => void;
  onClose?: () => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
  currentReaction?: string;
}

// Custom animated advanced emojis for long-press menu
const ADVANCED_REACTIONS = [
  { emoji: '🚀', labelEn: 'Rocket Blast', labelBn: 'রকেট ব্লাস্ট' },
  { emoji: '🔥', labelEn: 'Fire Storm', labelBn: 'ফায়ার স্টর্ম' },
  { emoji: '💎', labelEn: 'Diamond Gem', labelBn: 'ডায়মন্ড' },
  { emoji: '🤯', labelEn: 'Mind Blown', labelBn: 'মাইন্ড ব্লোন' },
  { emoji: '🎉', labelEn: 'Celebration', labelBn: 'সেলিব্রেশন' },
  { emoji: '💖', labelEn: 'Glowing Heart', labelBn: 'গ্লোয়িং হার্ট' },
  { emoji: '🌟', labelEn: 'Super Star', labelBn: 'সুপার স্টার' },
  { emoji: '👑', labelEn: 'Royal Crown', labelBn: 'রয়েল ক্রাউন' },
  { emoji: '⚡', labelEn: 'Lightning Bolt', labelBn: 'থান্ডার বোল্ট' },
  { emoji: '🎯', labelEn: 'Bullseye', labelBn: 'বুলস-আই' },
  { emoji: '🌈', labelEn: 'Cosmic Rainbow', labelBn: 'রেনবো' },
  { emoji: '🍕', labelEn: 'Pizza Party', labelBn: 'পিৎজা পার্টি' },
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  isOpen,
  onSelect,
  onClose,
  className = '',
  align = 'left',
  currentReaction,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [soundMuted, setSoundMutedState] = useState<boolean>(isSoundMuted());
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [isFlippedBelow, setIsFlippedBelow] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [justSelectedType, setJustSelectedType] = useState<string | null>(null);
  
  // Quick Undo Feature state
  const [undoableReaction, setUndoableReaction] = useState<string | null>(null);
  const undoTimerRef = useRef<any>(null);

  // Long-Press Advanced Reactions Menu state
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const longPressTimerRef = useRef<any>(null);

  // Guarantee single instance per reaction type (no duplicates in reaction picker list)
  const uniqueReactionDefinitions = React.useMemo(() => {
    const seen = new Set<string>();
    return REACTION_DEFINITIONS.filter((item) => {
      if (!item || !item.type || seen.has(item.type.toLowerCase())) return false;
      seen.add(item.type.toLowerCase());
      return true;
    });
  }, []);

  useEffect(() => {
    const handleSoundChange = (e: any) => {
      setSoundMutedState(e.detail.muted);
    };
    window.addEventListener('nixo-sound-setting-changed', handleSoundChange);
    return () => window.removeEventListener('nixo-sound-setting-changed', handleSoundChange);
  }, []);

  // Automatic Viewport Collision Detection & Flip Logic
  useEffect(() => {
    if (!isOpen) {
      setIsFlippedBelow(false);
      setIsConfirming(false);
      setJustSelectedType(null);
      setUndoableReaction(null);
      setShowAdvanced(false);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      return;
    }

    const checkViewportCollision = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null;

      const topSpace = parentRect ? parentRect.top : rect.top;
      if (topSpace < 160 || rect.top < 10) {
        setIsFlippedBelow(true);
      } else {
        setIsFlippedBelow(false);
      }
    };

    checkViewportCollision();
    const timer = setTimeout(checkViewportCollision, 15);
    window.addEventListener('scroll', checkViewportCollision, { passive: true });
    window.addEventListener('resize', checkViewportCollision, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', checkViewportCollision);
      window.removeEventListener('resize', checkViewportCollision);
    };
  }, [isOpen]);

  const handleSelect = (type: string) => {
    if (isConfirming) return;

    setJustSelectedType(type);
    setIsConfirming(true);
    playReactionSound(type);

    // Quick Undo feature: show temporary Undo pill before closing
    setUndoableReaction(type);

    onSelect(type as ReactionType);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoableReaction(null);
      if (onClose) onClose();
      setIsConfirming(false);
      setJustSelectedType(null);
    }, 3800);
  };

  const handleUndo = () => {
    if (!undoableReaction) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    // Revert selection by selecting it again (toggling off)
    onSelect(undoableReaction as ReactionType);
    playReactionSound(undoableReaction);

    setUndoableReaction(null);
    setIsConfirming(false);
    setJustSelectedType(null);
    if (onClose) onClose();
  };

  // Long-press detection helpers
  const handleTouchStartOrMouseDown = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setShowAdvanced(true);
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(25);
        }
      } catch (e) {}
    }, 450);
  };

  const handleTouchEndOrMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = toggleSoundMuted();
    setSoundMutedState(nextMuted);
  };

  const alignClasses = {
    left: 'left-0 origin-bottom-left',
    center: 'left-1/2 -translate-x-1/2 origin-bottom',
    right: 'right-0 origin-bottom-right',
  }[align];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{
            opacity: 0,
            scale: 0.72,
            y: isFlippedBelow ? -16 : 16,
            filter: 'blur(10px)',
          }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{
            opacity: 0,
            scale: 0.78,
            y: isFlippedBelow ? -10 : 10,
            filter: 'blur(8px)',
          }}
          whileHover={
            isConfirming
              ? {}
              : {
                  y: isFlippedBelow ? 6 : -8,
                  scale: 1.025,
                  transition: { ease: [0.2, 0.8, 0.2, 1], duration: 0.4 },
                }
          }
          transition={{ ease: [0.2, 0.8, 0.2, 1], duration: 0.35 }}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => {
            setIsInteracting(false);
            setHoveredReaction(null);
          }}
          className={`reaction-picker absolute z-50 ${
            isFlippedBelow ? 'top-full mt-3 is-flipped-below' : 'bottom-full mb-3'
          } ${alignClasses} ${isInteracting ? 'is-interacting' : ''} ${
            isConfirming ? 'reaction-picker-confirm-ripple' : ''
          } flex flex-col items-center p-1.5 rounded-3xl max-w-[calc(100vw-1rem)] shadow-2xl backdrop-blur-2xl ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Undo Floating Pill Bar */}
          {undoableReaction && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-black/95 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-xl flex items-center gap-2 border border-cyan-400/40 backdrop-blur-xl z-50 whitespace-nowrap"
            >
              <span>{isBn ? 'রিঅ্যাকশন যোগ করা হয়েছে' : 'Reaction added'}</span>
              <button
                type="button"
                onClick={handleUndo}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md"
              >
                {isBn ? '↩ আনডু (Undo)' : '↩ Undo'}
              </button>
            </motion.div>
          )}

          {/* Confirmation Ripple Wave Burst Effect */}
          {isConfirming && !undoableReaction && (
            <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400/40 dark:bg-cyan-300/50 pointer-events-none z-20 border border-cyan-300 shadow-[0_0_40px_rgba(6,182,212,0.8)]" />
          )}

          {/* Liquid Shimmer Sweep Background Layer */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-0">
            <div className="reaction-picker-shimmer w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 dark:via-cyan-400/25 to-transparent rounded-full pointer-events-none" />
          </div>

          {/* Main Reaction Row or Advanced Emojis Grid */}
          {!showAdvanced ? (
            <div className="flex items-center gap-1.5 relative z-10">
              <div className="flex items-center gap-1 sm:gap-2 px-1">
                {uniqueReactionDefinitions.map((item, index) => {
                  const IconComp = item.component;
                  const isSelected = currentReaction === item.type;
                  const isJustConfirmed = justSelectedType === item.type;
                  const isHovered = hoveredReaction === item.type;

                  return (
                    <div key={item.type} className="relative group shrink-0">
                      {/* Floating Tooltip Pill */}
                      <AnimatePresence>
                        {isHovered && !isConfirming && (
                          <motion.div
                            initial={{ opacity: 0, y: isFlippedBelow ? -4 : 4, scale: 0.85 }}
                            animate={{ opacity: 1, y: isFlippedBelow ? 2 : -2, scale: 1 }}
                            exit={{ opacity: 0, y: isFlippedBelow ? -2 : 2, scale: 0.9 }}
                            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                            className={`absolute ${
                              isFlippedBelow ? '-bottom-7' : '-top-7'
                            } left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900/90 dark:bg-black/90 backdrop-blur-md text-white text-[10px] font-bold tracking-wide shadow-md whitespace-nowrap pointer-events-none z-50 border border-white/10`}
                          >
                            {getReactionLabel(item.type, language)}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: isFlippedBelow ? -14 : 14, scale: 0.6 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: isJustConfirmed ? 1.55 : 1,
                        }}
                        transition={{
                          delay: index * 0.02,
                          ease: [0.2, 0.8, 0.2, 1],
                          duration: 0.35,
                        }}
                        whileHover={
                          isConfirming
                            ? {}
                            : {
                                scale: 1.42,
                                y: isFlippedBelow ? 8 : -8,
                                transition: { ease: [0.2, 0.8, 0.2, 1], duration: 0.25 },
                              }
                        }
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={() => {
                          setHoveredReaction(item.type);
                          setIsInteracting(true);
                        }}
                        onMouseLeave={() => setHoveredReaction(null)}
                        onMouseDown={handleTouchStartOrMouseDown}
                        onMouseUp={handleTouchEndOrMouseUp}
                        onTouchStart={handleTouchStartOrMouseDown}
                        onTouchEnd={handleTouchEndOrMouseUp}
                        onClick={() => handleSelect(item.type)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative shrink-0 ${
                          isJustConfirmed
                            ? 'ring-4 ring-cyan-400 bg-cyan-400/30 scale-125 shadow-lg shadow-cyan-500/50'
                            : isSelected
                            ? 'ring-2 ring-cyan-500 shadow-md scale-105 bg-cyan-500/15 dark:bg-cyan-950/40'
                            : 'hover:bg-slate-100/80 dark:hover:bg-white/10'
                        }`}
                        aria-label={item.label}
                      >
                        <IconComp size={30} className="drop-shadow-md transition-transform" />

                        {/* Active selection dot */}
                        {isSelected && (
                          <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-cyan-500 ring-1 ring-white" />
                        )}
                      </motion.button>
                    </div>
                  );
                })}
              </div>

              {/* Advanced Reactions Toggle Button (Sparkles / + Trigger) */}
              <button
                type="button"
                onClick={() => setShowAdvanced(true)}
                title={isBn ? 'উন্নত অ্যানিমেটেড রিঅ্যাকশন' : 'Advanced Animated Emojis'}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer active:scale-95 shrink-0 ml-1"
              >
                <span className="text-xs font-black">✨</span>
              </button>

              {/* Sound Mute / Unmute Quick Toggle Button */}
              <div className="pl-1.5 pr-0.5 border-l border-slate-300/60 dark:border-white/15 relative z-10 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleSound}
                  title={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    soundMuted
                      ? 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                      : 'text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/40'
                  }`}
                >
                  {soundMuted ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Secondary Advanced Reactions Grid Menu (Animated Emojis)
            <div className="flex flex-col p-2 w-64 sm:w-72 relative z-10 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>✨</span> {isBn ? 'অ্যাডভান্সড রিঅ্যাকশন' : 'Advanced Reactions'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(false)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 py-1">
                {ADVANCED_REACTIONS.map((adv) => (
                  <motion.button
                    key={adv.emoji}
                    whileHover={{ scale: 1.25, rotate: [0, -8, 8, 0] }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      handleSelect(adv.emoji as any);
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer group shadow-sm"
                    title={isBn ? adv.labelBn : adv.labelEn}
                  >
                    <span className="text-2xl transform group-hover:scale-125 transition-transform drop-shadow-md animate-bounce">
                      {adv.emoji}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300 mt-1 truncate max-w-[55px]">
                      {isBn ? adv.labelBn : adv.labelEn}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Coins, X } from 'lucide-react';
import { Gift3DPreview } from './Gift3DPreview';

export interface LiveGiftEvent {
  giftId: string;
  giftName: string;
  iconType: string;
  image3d: string;
  animation: string;
  senderName: string;
  senderId: string;
  receiverId: string;
  postId?: string;
  commentId?: string;
  coinPrice: number;
}

interface GiftCelebrationOverlayProps {
  event: LiveGiftEvent | null;
  onDismiss: () => void;
}

export const GiftCelebrationOverlay: React.FC<GiftCelebrationOverlayProps> = ({ event, onDismiss }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    if (!event) return;

    // Generate celebratory stardust particles
    const p = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.5) * 360,
      size: Math.random() * 8 + 4,
      delay: Math.random() * 0.4,
    }));
    setParticles(p);

    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);

    return () => clearTimeout(timer);
  }, [event]);

  if (!event) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
        {/* Backdrop Ambient Flash */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto"
          onClick={onDismiss}
        />

        {/* Celebration Container Card */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="relative pointer-events-auto max-w-sm w-full glass-card rounded-3xl p-6 text-center border border-amber-400/40 shadow-[0_0_50px_rgba(251,191,36,0.35)] bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Burst Particles */}
          {particles.map((pt) => (
            <motion.div
              key={pt.id}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.4], x: pt.x, y: pt.y }}
              transition={{ duration: 1.8, delay: pt.delay, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
              style={{
                width: pt.size,
                height: pt.size,
                backgroundColor: pt.id % 2 === 0 ? '#f59e0b' : '#38bdf8',
                boxShadow: pt.id % 2 === 0 ? '0 0 10px #f59e0b' : '0 0 10px #38bdf8',
              }}
            />
          ))}

          {/* 3D Model Display */}
          <div className="flex justify-center my-3">
            <Gift3DPreview image3d={event.image3d} animation={event.animation} size="hero" isInteractive={true} />
          </div>

          {/* Gift Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold font-mono shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>{event.giftName}</span>
          </div>

          <h3 className="text-lg font-display font-extrabold text-white mt-3">
            {event.senderName} sent a 3D Gift!
          </h3>

          <p className="text-xs text-slate-300 mt-1 flex items-center justify-center gap-1.5">
            <span>Valued at</span>
            <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              {event.coinPrice.toLocaleString()} Coins
            </span>
          </p>

          <div className="mt-4 pt-3 border-t border-white/10 flex justify-center">
            <button
              onClick={onDismiss}
              className="px-5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition-all cursor-pointer"
            >
              Magnificent ✨
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

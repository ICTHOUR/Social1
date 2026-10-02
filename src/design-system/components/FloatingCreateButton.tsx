import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconPlus, IconCameraStory } from '../icons/OriginalIcons';

interface FloatingCreateButtonProps {
  onCreatePost: () => void;
  onCreateStory: () => void;
}

export const FloatingCreateButton: React.FC<FloatingCreateButtonProps> = ({
  onCreatePost,
  onCreateStory,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-40">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col gap-2.5 mb-3 items-end">
            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.85 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350 }}
              onClick={() => {
                setIsOpen(false);
                onCreateStory();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-violet-600/90 text-white backdrop-blur-xl border border-violet-400/30 shadow-lg shadow-violet-500/30 text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
            >
              <IconCameraStory size={16} />
              <span>24h Story</span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.85 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350, delay: 0.04 }}
              onClick={() => {
                setIsOpen(false);
                onCreatePost();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-cyan-600/90 text-white backdrop-blur-xl border border-cyan-400/30 shadow-lg shadow-cyan-500/30 text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
            >
              <IconPlus size={16} />
              <span>New Post</span>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-violet-500 text-white shadow-xl shadow-cyan-500/35 border border-white/40 flex items-center justify-center cursor-pointer select-none"
        aria-label="Create new item"
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: 'spring', damping: 15 }}>
          <IconPlus size={26} />
        </motion.div>
      </motion.button>
    </div>
  );
};

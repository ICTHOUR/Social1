import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
}) => {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAX_PULL = 80;
  const THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || startY === 0) return;
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        // Logarithmic friction resistance
        const distance = Math.min(MAX_PULL, diff * 0.45);
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing || startY === 0) return;
    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setStartY(0);
      }
    } else {
      setPullDistance(0);
      setStartY(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <motion.div
          animate={{ height: pullDistance, opacity: pullDistance / THRESHOLD }}
          transition={{ type: 'spring', damping: 25 }}
          className="overflow-hidden flex items-center justify-center pointer-events-none"
        >
          <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-[#121829]/90 border border-white/40 dark:border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-center text-cyan-500">
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: !isRefreshing ? `rotate(${pullDistance * 4}deg)` : undefined }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
        </motion.div>
      )}

      {children}
    </div>
  );
};

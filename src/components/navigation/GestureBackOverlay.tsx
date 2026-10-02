import React, { useEffect, useRef } from 'react';

interface GestureBackOverlayProps {
  onGoBack: () => void;
  canGoBack: boolean;
}

const EDGE_TRIGGER_WIDTH = 50; // px from edge
const COMMIT_DISTANCE = 50; // px swipe distance

export const GestureBackOverlay: React.FC<GestureBackOverlayProps> = ({ onGoBack, canGoBack }) => {
  const touchRef = useRef<{ startX: number; startY: number; side: 'left' | 'right' | null }>({
    startX: 0,
    startY: 0,
    side: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const screenWidth = window.innerWidth;

      let side: 'left' | 'right' | null = null;
      if (x <= EDGE_TRIGGER_WIDTH) {
        side = 'left';
      } else if (x >= screenWidth - EDGE_TRIGGER_WIDTH) {
        side = 'right';
      }

      touchRef.current = { startX: x, startY: y, side };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const { startX, startY, side } = touchRef.current;
      if (!side || e.changedTouches.length !== 1) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const deltaX = endX - startX;
      const deltaY = Math.abs(endY - startY);

      // If swipe is mostly horizontal and meets distance threshold
      if (deltaY < 80 && Math.abs(deltaX) >= COMMIT_DISTANCE) {
        const isValidSwipe = (side === 'left' && deltaX > 0) || (side === 'right' && deltaX < 0);
        if (isValidSwipe && canGoBack) {
          onGoBack();
        }
      }

      touchRef.current = { startX: 0, startY: 0, side: null };
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onGoBack, canGoBack]);

  return null;
};

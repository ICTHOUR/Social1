import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const SkeletonLine: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
  <div className={`bg-black/5 dark:bg-white/5 animate-pulse rounded-xl relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`rounded-full bg-black/5 dark:bg-white/5 animate-pulse shrink-0 ${className}`}
  />
);

export const SkeletonPost: React.FC = () => (
  <div className="rounded-3xl p-5 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-[#0e1422]/60 backdrop-blur-xl shadow-sm space-y-4">
    <div className="flex items-center gap-3">
      <SkeletonAvatar size={42} />
      <div className="space-y-1.5 flex-1">
        <SkeletonLine className="h-4 w-1/3" />
        <SkeletonLine className="h-3 w-1/5" />
      </div>
    </div>
    <div className="space-y-2">
      <SkeletonLine className="h-3.5 w-full" />
      <SkeletonLine className="h-3.5 w-4/5" />
    </div>
    <div className="h-48 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
    <div className="flex justify-between pt-2">
      <SkeletonLine className="h-4 w-20" />
      <SkeletonLine className="h-4 w-20" />
      <SkeletonLine className="h-4 w-20" />
    </div>
  </div>
);

export const SkeletonStory: React.FC = () => (
  <div className="w-24 h-36 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse shrink-0 border border-black/5 dark:border-white/5" />
);

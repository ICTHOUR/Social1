import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Icon3DLike,
  Icon3DLove,
  Icon3DHaha,
  Icon3DWow,
  Icon3DSad,
  Icon3DAngry,
  Icon3DCelebrate,
  Icon3DSupport,
  getReactionIconComponent,
} from '../design-system/icons/Reaction3DIcons';
import { IconVerifiedBadge } from '../design-system/icons/OriginalIcons';

interface ReactionItem {
  id: string;
  type: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    badge?: string;
    isVerified?: boolean;
  };
}

interface ReactionsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

const TABS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'like', label: 'Like', icon: Icon3DLike },
  { id: 'love', label: 'Love', icon: Icon3DLove },
  { id: 'haha', label: 'Haha', icon: Icon3DHaha },
  { id: 'wow', label: 'Wow', icon: Icon3DWow },
  { id: 'sad', label: 'Sad', icon: Icon3DSad },
  { id: 'angry', label: 'Angry', icon: Icon3DAngry },
  { id: 'celebrate', label: 'Celebrate', icon: Icon3DCelebrate },
  { id: 'support', label: 'Support', icon: Icon3DSupport },
];

export const ReactionsListModal: React.FC<ReactionsListModalProps> = ({ isOpen, onClose, postId }) => {
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const fetchReactions = async () => {
      try {
        const token = localStorage.getItem('nixo_token');
        const res = await fetch(`/api/posts/${postId}/reactions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setReactions(data.reactions || []);
        }
      } catch (err) {
        console.error('Failed to load reactions list:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReactions();
  }, [isOpen, postId]);

  if (!isOpen) return null;

  const filteredReactions =
    activeTab === 'all'
      ? reactions
      : reactions.filter((r) => r.type.toLowerCase() === activeTab.toLowerCase());

  // Count per type
  const counts: Record<string, number> = { all: reactions.length };
  reactions.forEach((r) => {
    const t = r.type.toLowerCase();
    counts[t] = (counts[t] || 0) + 1;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 dark:bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
            <h3 className="font-bold text-slate-800 dark:text-white">Transmitted Reactions</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 dark:border-white/10 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const count = counts[tab.id] || 0;
              if (tab.id !== 'all' && count === 0) return null; // Only show active types
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {TabIcon && <TabIcon size={16} />}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Users List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading reactions...</div>
            ) : filteredReactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No reactions yet for this category.</div>
            ) : (
              filteredReactions.map((item) => {
                const IconComp = getReactionIconComponent(item.type);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={
                            item.user.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${item.user.username}`
                          }
                          alt={item.user.username}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow">
                          <IconComp size={16} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-white">
                            {item.user.fullName}
                          </span>
                          {item.user.isVerified && <IconVerifiedBadge size={14} className="text-cyan-400" />}
                        </div>
                        <div className="text-xs text-slate-400">@{item.user.username}</div>
                      </div>
                    </div>

                    <a
                      href={`/profile/${item.user.username}`}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                    >
                      View Node
                    </a>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

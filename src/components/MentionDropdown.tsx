import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconVerifiedBadge } from '../design-system/icons/OriginalIcons';

interface MentionUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  badge?: string;
  isVerified?: boolean;
}

interface MentionDropdownProps {
  query: string;
  isOpen: boolean;
  onSelectUser: (user: MentionUser) => void;
  onClose: () => void;
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  query,
  isOpen,
  onSelectUser,
  onClose,
}) => {
  const [candidates, setCandidates] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('nixo_token');
        const res = await fetch(`/api/users/mention-candidates?q=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setCandidates(data.users || []);
        }
      } catch (e) {
        console.error('Failed to search mention candidates:', e);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen || (candidates.length === 0 && !loading)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="absolute bottom-full left-0 mb-2 w-72 max-h-56 overflow-y-auto bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-1.5"
      >
        <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          Mention Nixo Citizen
        </div>

        {loading && candidates.length === 0 ? (
          <div className="p-3 text-xs text-center text-slate-400">Scanning network...</div>
        ) : (
          candidates.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelectUser(user)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer group"
            >
              <img
                src={
                  user.avatarUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`
                }
                alt={user.username}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {user.fullName}
                  </span>
                  {user.isVerified && <IconVerifiedBadge size={12} className="text-cyan-400 shrink-0" />}
                </div>
                <div className="text-[11px] text-slate-400 truncate">@{user.username}</div>
              </div>
            </button>
          ))
        )}
      </motion.div>
    </AnimatePresence>
  );
};

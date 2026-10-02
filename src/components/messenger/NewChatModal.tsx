import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquare, Sparkles } from 'lucide-react';
import { User } from '../../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  currentUserId: string;
  onSelectUser: (user: User) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUserId,
  onSelectUser,
}) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/explore/creators');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          setUsers((data.creators || []).filter((u: User) => u.id !== currentUserId));
        }
      } catch (err) {
        console.error('Failed to fetch creators for new chat:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-card bg-slate-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">New Message</h3>
              <p className="text-[11px] text-slate-400">Start a direct liquid glass conversation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative my-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or @username..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
            autoFocus
          />
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-64 pr-1">
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400">Loading contacts...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">No users found</div>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors border border-white/5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.avatarUrl}
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{u.fullName}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                  </div>
                </div>

                <button className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-medium transition-colors">
                  Chat
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

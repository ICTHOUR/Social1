import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check, Camera, Sparkles } from 'lucide-react';
import { User } from '../../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  currentUserId: string;
  onGroupCreated: (conversationId: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80',
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUserId,
  onGroupCreated,
}) => {
  const [title, setTitle] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/friends', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          const list = (data.friends || []).filter((u: User) => u.id !== currentUserId);
          setFriends(list);
        } else {
          // Fallback fetch all users if friends is empty
          const fallbackRes = await fetch('/api/explore/creators');
          if (fallbackRes.ok && fallbackRes.headers.get('content-type')?.includes('application/json')) {
            const fallbackData = await fallbackRes.json();
            setFriends((fallbackData.creators || []).filter((u: User) => u.id !== currentUserId));
          }
        }
      } catch (err) {
        console.error('Failed to load friends for group:', err);
      }
    };

    fetchUsers();
  }, [isOpen, token, currentUserId]);

  if (!isOpen) return null;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a group name');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least one member for the group');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/messages/conversations/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          avatarUrl: selectedAvatar,
          memberIds: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');

      onGroupCreated(data.conversationId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = friends.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-card bg-slate-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Liquid Group</h3>
              <p className="text-[11px] text-slate-400">Collaborate with real-time audio & glass messaging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
          {/* Group Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Group Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Liquid Glass Architects"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
              maxLength={60}
            />
          </div>

          {/* Group Avatar Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Group Icon Theme</label>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              {PRESET_AVATARS.map((avUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedAvatar(avUrl)}
                  className={`relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                    selectedAvatar === avUrl ? 'border-purple-400 scale-105 shadow-md shadow-purple-500/30' : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={avUrl} className="w-full h-full object-cover" alt="" />
                  {selectedAvatar === avUrl && (
                    <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Members Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Add Members</label>
              <span className="text-[11px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                {selectedUserIds.length} selected
              </span>
            </div>

            {/* Member search bar */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-white/10 rounded-2xl p-2 bg-black/20">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-4">No users found</p>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'bg-purple-500/20 border border-purple-500/30 text-white' : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={u.avatarUrl} className="w-8 h-8 rounded-full object-cover border border-white/10" alt="" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-white">{u.fullName}</p>
                          <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                          isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || selectedUserIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold hover:opacity-90 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

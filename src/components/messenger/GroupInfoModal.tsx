import React, { useState } from 'react';
import { X, Users, Shield, ShieldCheck, UserMinus, UserPlus, LogOut, Pin, Bell, BellOff, Check } from 'lucide-react';
import { Conversation, ConversationMember, User } from '../../types';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserId: string;
  token: string | null;
  onUpdated: () => void;
  onLeaveGroup: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  token,
  onUpdated,
  onLeaveGroup,
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState<User[]>([]);
  const [selectedNewUserIds, setSelectedNewUserIds] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const myMembership = conversation.members?.find((m) => m.userId === currentUserId);
  const isCreatorOrAdmin = myMembership?.role === 'creator' || myMembership?.role === 'admin';

  const handleOpenAddMembers = async () => {
    setShowAddMember(true);
    try {
      const res = await fetch('/api/friends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const existingIds = new Set((conversation.members || []).map((m) => m.userId));
        setCandidateUsers((data.friends || []).filter((u: User) => !existingIds.has(u.id)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmAddMembers = async () => {
    if (selectedNewUserIds.length === 0) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/messages/conversations/${conversation.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: selectedNewUserIds }),
      });
      if (res.ok) {
        setShowAddMember(false);
        setSelectedNewUserIds([]);
        onUpdated();
      }
    } catch (e: any) {
      setError(e.message || 'Error adding members');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: 'admin' | 'member') => {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/messages/conversations/${conversation.id}/members/${targetUserId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        onUpdated();
      }
    } catch (e: any) {
      setError(e.message || 'Error updating member role');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/messages/conversations/${conversation.id}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onUpdated();
      }
    } catch (e: any) {
      setError(e.message || 'Error removing member');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card bg-slate-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> Group Information
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Profile Info */}
        <div className="py-5 flex flex-col items-center border-b border-white/10">
          <div className="relative w-20 h-20 rounded-3xl overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20 mb-3">
            <img
              src={conversation.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'}
              alt={conversation.title}
              className="w-full h-full object-cover"
            />
          </div>
          <h4 className="text-lg font-bold text-white text-center">{conversation.title || 'Group Chat'}</h4>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>{conversation.members?.length || conversation.membersCount || 1} members</span>
          </p>
        </div>

        {/* Members List Section */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-slate-300">Group Members</span>
            {isCreatorOrAdmin && (
              <button
                onClick={handleOpenAddMembers}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Member
              </button>
            )}
          </div>

          {/* Add member sub-drawer */}
          {showAddMember && (
            <div className="p-3 bg-white/5 border border-purple-500/30 rounded-2xl mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Select Users to Add</span>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1">
                {candidateUsers.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-2">No other users available</p>
                ) : (
                  candidateUsers.map((u) => {
                    const isSelected = selectedNewUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() =>
                          setSelectedNewUserIds((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                        className={`flex items-center justify-between p-1.5 rounded-xl cursor-pointer text-xs ${
                          isSelected ? 'bg-purple-500/20 text-white' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img src={u.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                          <span>{u.fullName}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/20'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {candidateUsers.length > 0 && (
                <button
                  disabled={selectedNewUserIds.length === 0 || loadingAction}
                  onClick={handleConfirmAddMembers}
                  className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                >
                  Add {selectedNewUserIds.length} Members
                </button>
              )}
            </div>
          )}

          {/* Members list */}
          {(conversation.members || []).map((m: ConversationMember) => {
            const isMe = m.userId === currentUserId;
            const isTargetCreator = m.role === 'creator';
            const isTargetAdmin = m.role === 'admin';

            return (
              <div
                key={m.userId}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <img src={m.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                    {m.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-white truncate">
                        {m.fullName} {isMe && '(You)'}
                      </p>
                      {isTargetCreator ? (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Creator
                        </span>
                      ) : isTargetAdmin ? (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">@{m.username}</p>
                  </div>
                </div>

                {/* Admin controls for members */}
                {isCreatorOrAdmin && !isMe && !isTargetCreator && (
                  <div className="flex items-center gap-1">
                    {myMembership?.role === 'creator' && (
                      <button
                        onClick={() => handleUpdateRole(m.userId, isTargetAdmin ? 'member' : 'admin')}
                        title={isTargetAdmin ? 'Demote to Member' : 'Promote to Admin'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors text-[11px]"
                      >
                        {isTargetAdmin ? 'Demote' : 'Make Admin'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      title="Remove from group"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Leave Group */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">Liquid Glass Security</span>
          <button
            onClick={onLeaveGroup}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-xs font-semibold text-red-300 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Leave Group
          </button>
        </div>
      </div>
    </div>
  );
};

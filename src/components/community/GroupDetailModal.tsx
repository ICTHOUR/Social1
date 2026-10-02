import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  Lock,
  Globe,
  Bell,
  Megaphone,
  FileText,
  Paperclip,
  Send,
  MoreVertical,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Trash2,
  Pin,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  UploadCloud,
  File,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Group, GroupPost, GroupMember, GroupJoinRequest, GroupFile, GroupRule, GroupComment } from '../../types';

interface GroupDetailModalProps {
  groupId: string;
  onClose: () => void;
  onGroupUpdated?: () => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({ groupId, onClose, onGroupUpdated }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'requests' | 'files' | 'rules'>('feed');
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [rules, setRules] = useState<GroupRule[]>([]);
  const [userAccess, setUserAccess] = useState<{
    role: string;
    status: string;
    mutedUntil?: string | null;
    canManage: boolean;
    canModerate: boolean;
    canPost: boolean;
  }>({ role: 'guest', status: 'none', canManage: false, canModerate: false, canPost: false });
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Feed / Posts
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isAnnouncementPost, setIsAnnouncementPost] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Post comments state
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, GroupComment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Members & Join Requests
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);

  // Files
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadType, setUploadType] = useState('document');

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteeUsername, setInviteeUsername] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Error/Success messages
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setUserAccess(data.userAccess);
        setRules(data.rules || []);
        setIsAuthorized(data.isAuthorized);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setPosts((await res.json()).posts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setMembers((await res.json()).members || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchJoinRequests = async () => {
    if (!token || !userAccess.canModerate) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/join-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRequests((await res.json()).requests || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/files`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setFiles((await res.json()).files || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId, token]);

  useEffect(() => {
    if (group && isAuthorized) {
      fetchPosts();
      fetchMembers();
      fetchFiles();
      if (userAccess.canModerate) {
        fetchJoinRequests();
      }
    }
  }, [group, isAuthorized, userAccess]);

  const handleJoinOrLeave = async () => {
    if (!token) {
      showToast('Please sign in to join groups');
      return;
    }
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: 'Requesting entry' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === 'joined') {
          showToast('Welcome to the group!');
        } else if (data.status === 'pending_approval') {
          showToast('Join request submitted to group administrators.');
        }
        fetchGroupDetails();
        if (onGroupUpdated) onGroupUpdated();
      } else {
        showToast(data.error || 'Failed to join group');
      }
    } catch (e: any) {
      showToast(e.message || 'Error joining group');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPostContent.trim()) return;
    setSubmittingPost(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newPostContent,
          isAnnouncement: isAnnouncementPost,
        }),
      });
      if (res.ok) {
        setNewPostContent('');
        setIsAnnouncementPost(false);
        fetchPosts();
        showToast('Post shared with community!');
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to post in group');
      }
    } catch (e: any) {
      showToast(e.message || 'Posting failed');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleModeratePost = async (postId: string, action: 'delete' | 'pin_announcement' | 'unpin') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchPosts();
        showToast(`Post updated: ${action}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleComments = async (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      return;
    }
    setOpenCommentsPostId(postId);
    try {
      const res = await fetch(`/api/groups/posts/${postId}/comments`);
      if (res.ok) {
        const d = await res.json();
        setCommentsMap((prev) => ({ ...prev, [postId]: d.comments || [] }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!token || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/groups/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        setCommentText('');
        // Refresh comments
        const cRes = await fetch(`/api/groups/posts/${postId}/comments`);
        if (cRes.ok) {
          const d = await cRes.json();
          setCommentsMap((prev) => ({ ...prev, [postId]: d.comments || [] }));
        }
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleModerateRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/join-requests/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchJoinRequests();
        fetchMembers();
        fetchGroupDetails();
        showToast(`Request ${action}d`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: 'admin' | 'moderator' | 'member') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${targetUserId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchMembers();
        fetchGroupDetails();
        showToast(`Role updated to ${newRole}`);
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to update role');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleBanMember = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${targetUserId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Rule violation' }),
      });
      if (res.ok) {
        fetchMembers();
        fetchGroupDetails();
        showToast('Member banned from group');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnbanMember = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${targetUserId}/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchMembers();
        fetchGroupDetails();
        showToast('Member unbanned');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMuteMember = async (targetUserId: string, durationMinutes: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${targetUserId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ durationMinutes }),
      });
      if (res.ok) {
        fetchMembers();
        showToast(`Member muted for ${durationMinutes}m`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnmuteMember = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${targetUserId}/unmute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchMembers();
        showToast('Member unmuted');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !uploadName || !uploadUrl) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: uploadName,
          fileUrl: uploadUrl,
          fileType: uploadType,
          fileSize: 1024 * 512,
        }),
      });
      if (res.ok) {
        setUploadName('');
        setUploadUrl('');
        setShowUploadModal(false);
        fetchFiles();
        showToast('File attached to community library');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendInvite = async () => {
    if (!token || !inviteeUsername) return;
    try {
      // Find user id by username
      const sRes = await fetch(`/api/search?q=${encodeURIComponent(inviteeUsername)}&category=users`);
      const sData = await sRes.json();
      const target = (sData.users || [])[0];
      if (!target) {
        setInviteStatus('User not found');
        return;
      }
      const res = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteeId: target.id }),
      });
      if (res.ok) {
        setInviteStatus('Invitation sent!');
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteStatus(null);
          setInviteeUsername('');
        }, 1500);
      } else {
        const d = await res.json();
        setInviteStatus(d.error || 'Invite failed');
      }
    } catch (e: any) {
      setInviteStatus(e.message || 'Invite error');
    }
  };

  if (loading || !group) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="glass-card p-8 rounded-3xl text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Loading Community Realm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-cyan-500 text-slate-950 text-xs font-black shadow-xl shadow-cyan-500/30 flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Cover Banner */}
        <div className="relative h-44 sm:h-56 w-full shrink-0">
          <img src={group.coverUrl} alt={group.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-black/30" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border border-white/10 transition-all cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Group Header Info */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={group.avatarUrl}
                alt={group.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-cyan-400 shadow-xl bg-slate-800"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{group.name}</h1>
                  {group.privacy === 'private' ? (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Public
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" /> {group.membersCount} members
                  </span>
                  <span>•</span>
                  <span>Created by {group.creatorName}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {userAccess.status === 'active' ? (
                <>
                  <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> {userAccess.role.toUpperCase()}
                  </span>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite
                  </button>
                </>
              ) : userAccess.status === 'pending' ? (
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Request Pending
                </span>
              ) : userAccess.status === 'banned' ? (
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5">
                  <UserX className="w-4 h-4" /> Banned
                </span>
              ) : (
                <button
                  onClick={handleJoinOrLeave}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" /> {group.privacy === 'private' ? 'Request to Join' : 'Join Group'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 bg-slate-900/90 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'feed' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Community Feed
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'members' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Members ({members.length})
            </button>
            {userAccess.canModerate && group.privacy === 'private' && (
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'requests'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                Join Requests {requests.length > 0 && `(${requests.length})`}
              </button>
            )}
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'files' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Files ({files.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rules' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rules & Safety
            </button>
          </div>
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: COMMUNITY FEED */}
          {activeTab === 'feed' && (
            <div className="space-y-6">
              {/* Group Description & Muted Banner */}
              <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
                <p className="text-xs text-slate-300">{group.description}</p>
                {userAccess.status === 'muted' && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>You are currently muted from posting until {userAccess.mutedUntil ? new Date(userAccess.mutedUntil).toLocaleTimeString() : 'further review'}.</span>
                  </div>
                )}
              </div>

              {/* Publisher Box */}
              {userAccess.canPost && (
                <form onSubmit={handleCreatePost} className="glass-card p-4 rounded-2xl border border-cyan-500/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <input
                      type="text"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`Share an update or question in ${group.name}...`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {userAccess.canModerate && (
                        <label className="flex items-center gap-1.5 text-xs text-amber-300 font-bold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAnnouncementPost}
                            onChange={(e) => setIsAnnouncementPost(e.target.checked)}
                            className="rounded border-white/20 text-amber-500 focus:ring-amber-400"
                          />
                          <Megaphone className="w-3.5 h-3.5" /> Pin as Announcement
                        </label>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={submittingPost || !newPostContent.trim()}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-black cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Post
                    </button>
                  </div>
                </form>
              )}

              {/* Posts Feed */}
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="text-center py-12 glass-card rounded-2xl border border-white/10">
                    <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">No community posts yet</p>
                    <p className="text-xs text-slate-500">Be the first to spark a conversation in this realm!</p>
                  </div>
                ) : (
                  posts.map((p) => (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        p.isAnnouncement
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                          : 'glass-card border-white/10'
                      }`}
                    >
                      {/* Announcement Pin Banner */}
                      {p.isAnnouncement && (
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-400 mb-2.5">
                          <Megaphone className="w-3.5 h-3.5" /> OFFICIAL ANNOUNCEMENT
                        </div>
                      )}

                      {/* Author Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={p.authorAvatar} alt="" className="w-8 h-8 rounded-xl object-cover" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{p.authorName}</span>
                              <span className="text-[10px] text-slate-400">@{p.authorUsername}</span>
                              {p.authorRole && p.authorRole !== 'member' && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase">
                                  {p.authorRole}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(p.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Moderation Controls */}
                        {userAccess.canModerate && (
                          <div className="flex items-center gap-1">
                            {p.isAnnouncement ? (
                              <button
                                onClick={() => handleModeratePost(p.id, 'unpin')}
                                title="Unpin Announcement"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-300 cursor-pointer"
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleModeratePost(p.id, 'pin_announcement')}
                                title="Pin as Announcement"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-300 cursor-pointer"
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleModeratePost(p.id, 'delete')}
                              title="Delete Post"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-xs text-slate-200 mt-3 whitespace-pre-wrap">{p.content}</p>

                      {/* Actions: Comments */}
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <button
                          onClick={() => toggleComments(p.id)}
                          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{p.commentsCount} Comments</span>
                        </button>
                      </div>

                      {/* Comments Drawer */}
                      {openCommentsPostId === p.id && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {(commentsMap[p.id] || []).length === 0 ? (
                              <p className="text-[11px] text-slate-500">No comments yet.</p>
                            ) : (
                              commentsMap[p.id].map((c) => (
                                <div key={c.id} className="p-2 rounded-xl bg-white/5 text-xs flex items-start gap-2.5">
                                  <img src={c.avatarUrl} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-white text-[11px]">{c.fullName}</span>
                                      <span className="text-[10px] text-slate-500">
                                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 mt-0.5">{c.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add Comment Input */}
                          {userAccess.canPost && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddComment(p.id);
                                }}
                              />
                              <button
                                onClick={() => handleAddComment(p.id)}
                                disabled={submittingComment || !commentText.trim()}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                              >
                                Send
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS & MODERATION */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Community Members & Roles</h3>
                <span className="text-xs text-slate-400">{members.length} registered</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={m.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">{m.fullName}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              m.role === 'creator'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : m.role === 'admin'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : m.role === 'moderator'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/10 text-slate-400'
                            }`}
                          >
                            {m.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">@{m.username}</p>
                        {m.status === 'muted' && (
                          <span className="text-[9px] text-amber-400 font-bold">Muted</span>
                        )}
                        {m.status === 'banned' && (
                          <span className="text-[9px] text-rose-400 font-bold">Banned</span>
                        )}
                      </div>
                    </div>

                    {/* Member Controls (Creator / Admin / Mod) */}
                    {userAccess.canModerate && m.role !== 'creator' && m.id !== user?.id && (
                      <div className="flex items-center gap-1">
                        {/* Promote/Demote (Creator & Admin only) */}
                        {userAccess.canManage && (
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.id, e.target.value as any)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                          >
                            <option value="member" className="bg-slate-900">Member</option>
                            <option value="moderator" className="bg-slate-900">Moderator</option>
                            <option value="admin" className="bg-slate-900">Admin</option>
                          </select>
                        )}

                        {/* Mute/Unmute */}
                        {m.status === 'muted' ? (
                          <button
                            onClick={() => handleUnmuteMember(m.id)}
                            title="Unmute"
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-300 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMuteMember(m.id, 60)}
                            title="Mute for 1h"
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Ban/Unban */}
                        {m.status === 'banned' ? (
                          <button
                            onClick={() => handleUnbanMember(m.id)}
                            title="Unban"
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanMember(m.id)}
                            title="Ban Member"
                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: JOIN REQUESTS (Private Groups) */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Pending Membership Requests</h3>
                <span className="text-xs text-amber-400 font-bold">{requests.length} pending</span>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-10 glass-card rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-bold">No pending join requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={r.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-xs text-white">{r.fullName}</p>
                          <p className="text-[10px] text-slate-400">@{r.username}</p>
                          {r.message && <p className="text-[11px] text-slate-300 mt-1 italic">"{r.message}"</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleModerateRequest(r.id, 'approve')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-400 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleModerateRequest(r.id, 'reject')}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs cursor-pointer hover:bg-rose-500/30 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SHARED FILES */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Community Files & Repository</h3>
                  <p className="text-xs text-slate-400">Documents, project assets, and guides</p>
                </div>
                {userAccess.canPost && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-cyan-400 flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Attach File
                  </button>
                )}
              </div>

              {files.length === 0 ? (
                <div className="text-center py-10 glass-card rounded-2xl border border-white/10">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold">No shared files yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map((f) => (
                    <div key={f.id} className="p-3 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                          <File className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Shared by {f.fullName} • {(f.fileSize / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <a
                        href={f.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 text-xs font-bold"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RULES & SAFETY */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Community Code of Conduct</h3>
                <p className="text-xs text-slate-400">Enforced by group administrators & moderators</p>
              </div>

              <div className="space-y-3">
                {rules.map((r, idx) => (
                  <div key={r.id || idx} className="p-4 rounded-2xl glass-card border border-white/10 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-xs flex items-center justify-center shrink-0">
                      {r.ruleOrder || idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{r.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload File Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <form
              onSubmit={handleUploadFile}
              className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-cyan-400" /> Share Community File
                </h3>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300">File Name / Title</label>
                  <input
                    type="text"
                    required
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Community Brand Guidelines v2.pdf"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300">File URL / Asset Link</label>
                  <input
                    type="url"
                    required
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300">File Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="document">Document (PDF/DOC)</option>
                    <option value="archive">Asset Pack (ZIP/TAR)</option>
                    <option value="image">Design Graphic (PNG/SVG)</option>
                    <option value="code">Source File / Script</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black cursor-pointer hover:bg-cyan-400"
                >
                  Publish File
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Send Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-cyan-400" /> Invite Creator to Group
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300">Enter Username to Invite</label>
                <input
                  type="text"
                  value={inviteeUsername}
                  onChange={(e) => setInviteeUsername(e.target.value)}
                  placeholder="e.g. elena_vibe"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                {inviteStatus && (
                  <p className="text-[11px] text-cyan-300 font-bold mt-2">{inviteStatus}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={!inviteeUsername.trim()}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black cursor-pointer disabled:opacity-50 hover:bg-cyan-400"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

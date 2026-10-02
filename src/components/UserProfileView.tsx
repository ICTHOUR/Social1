import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowLeft,
  MapPin,
  Globe,
  Gift,
  Grid,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  MessageCircle,
  Ban,
  Shield,
  Clock,
  MoreVertical,
  Film,
  Zap,
  Trash2,
} from 'lucide-react';
import {
  Camera,
  Edit2,
  Briefcase,
  GraduationCap,
  Heart,
  Activity,
  Smile,
  Calendar,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { User, Post, SocialRelationship, MutualFriend } from '../types';
import { DashboardPro } from './DashboardPro';
import { ImageCropModal } from './profile/ImageCropModal';
import { ProfileDetailsModal } from './profile/ProfileDetailsModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../design-system/ToastContext';
import { PostCard } from './PostCard';
import { GlassCard } from '../design-system/components/GlassCard';
import { ReportModal } from './ReportModal';
import { AdMobBanner } from './ads/AdMobBanner';
import { Flag } from 'lucide-react';

interface UserProfileViewProps {
  userId?: string;
  onOpenGiftModal: (postId: string, receiverId: string) => void;
  onNavigateToProfile?: (id: string) => void;
  onNavigateToChat?: (userId: string) => void;
  onNavigateToFeels?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onGoBack?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userId,
  onOpenGiftModal,
  onNavigateToProfile,
  onNavigateToChat,
  onNavigateToFeels,
  onNavigateToTab,
  onGoBack,
}) => {
  const { user: currentUser, token, refreshUser } = useAuth();
  const { language } = useLanguage();
  const { addToast } = useToast();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [relationship, setRelationship] = useState<SocialRelationship | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'friends' | 'followers' | 'following' | 'dashboardPro'>('posts');

  // Modals for editing profile and cropping images
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cropModalState, setCropModalState] = useState<{
    isOpen: boolean;
    type: 'avatar' | 'cover';
  }>({ isOpen: false, type: 'avatar' });

  // Sub tab data
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [mediaItems, setMediaItems] = useState<any[]>([]);

  // Action states
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFriendMenu, setShowFriendMenu] = useState(false);
  const [isBlockedByViewer, setIsBlockedByViewer] = useState(false);
  const [isBlockedByTarget, setIsBlockedByTarget] = useState(false);

  const targetId = userId || currentUser?.id;
  const isSelf = currentUser?.id === targetId;

  const fetchProfile = async () => {
    if (!targetId) return;
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/users/${targetId}`, { headers });
      if (res.status === 403) {
        setIsBlockedByTarget(true);
        setIsLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProfileUser(data.user);
        if (data.relationship) {
          setRelationship(data.relationship);
          setIsBlockedByViewer(data.relationship.isBlocked || false);
          setIsBlockedByTarget(data.relationship.isBlockedBy || false);
        }
        setIsBlockedByTarget(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTabContent = async (tab: 'posts' | 'media' | 'friends' | 'followers' | 'following') => {
    if (!targetId) return;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      if (tab === 'posts') {
        const res = await fetch(`/api/users/${targetId}/posts`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUserPosts(data.posts || []);
        }
      } else if (tab === 'media') {
        const res = await fetch(`/api/users/${targetId}/media`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMediaItems(data.media || []);
        }
      } else if (tab === 'friends') {
        const res = await fetch(`/api/users/${targetId}/friends`, { headers });
        if (res.ok) {
          const data = await res.json();
          setFriendsList(data.friends || []);
        }
      } else if (tab === 'followers') {
        const res = await fetch(`/api/users/${targetId}/followers`, { headers });
        if (res.ok) {
          const data = await res.json();
          setFollowersList(data.followers || []);
        }
      } else if (tab === 'following') {
        const res = await fetch(`/api/users/${targetId}/following`, { headers });
        if (res.ok) {
          const data = await res.json();
          setFollowingList(data.following || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchTabContent('posts');
  }, [targetId, token]);

  const handleTabChange = (tab: 'posts' | 'media' | 'friends' | 'followers' | 'following' | 'dashboardPro') => {
    setActiveTab(tab);
    if (tab !== 'dashboardPro') {
      fetchTabContent(tab);
    }
  };

  // Follow / Unfollow
  const handleToggleFollow = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const endpoint = relationship?.isFollowing
        ? `/api/users/${targetId}/unfollow`
        : `/api/users/${targetId}/follow`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRelationship((prev) => prev ? { ...prev, isFollowing: data.isFollowing } : null);
        setProfileUser((prev) => {
          if (!prev) return null;
          const diff = data.isFollowing ? 1 : -1;
          return { ...prev, followersCount: Math.max(0, prev.followersCount + diff) };
        });
        refreshUser();
        addToast(data.isFollowing ? `Now following ${profileUser?.fullName}` : `Unfollowed ${profileUser?.fullName}`, 'info');
      } else {
        addToast(data.error || 'Failed to update follow status', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error while following', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Friend Request Actions
  const handleSendFriendRequest = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      const data = await res.json();
      if (res.ok) {
        setRelationship((prev) =>
          prev
            ? {
                ...prev,
                friendStatus: data.friendStatus || 'pending_sent',
                friendRequestId: data.requestId,
                isFriend: Boolean(data.isFriend),
              }
            : null
        );
        addToast(data.message || 'Friend request sent', 'success');
      } else {
        addToast(data.error || 'Could not send friend request', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: targetId,
          requestId: relationship?.friendRequestId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRelationship((prev) =>
          prev ? { ...prev, friendStatus: 'friends', isFriend: true } : null
        );
        addToast(`You are now friends with ${profileUser?.fullName}!`, 'success');
        refreshUser();
      } else {
        addToast(data.error || 'Could not accept friend request', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: targetId,
          requestId: relationship?.friendRequestId,
        }),
      });
      if (res.ok) {
        setRelationship((prev) =>
          prev ? { ...prev, friendStatus: 'none', friendRequestId: null } : null
        );
        addToast('Friend request declined', 'info');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/friends/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: targetId,
          requestId: relationship?.friendRequestId,
        }),
      });
      if (res.ok) {
        setRelationship((prev) =>
          prev ? { ...prev, friendStatus: 'none', friendRequestId: null } : null
        );
        addToast('Friend request cancelled', 'info');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/friends/remove/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRelationship((prev) =>
          prev ? { ...prev, friendStatus: 'none', isFriend: false } : null
        );
        setShowFriendMenu(false);
        addToast(`Removed ${profileUser?.fullName} from friends`, 'info');
        refreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Block / Unblock User
  const handleBlockUser = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetId, reason: 'Blocked by user' }),
      });
      if (res.ok) {
        setIsBlockedByViewer(true);
        setShowBlockModal(false);
        setRelationship((prev) =>
          prev
            ? {
                ...prev,
                isBlocked: true,
                isFriend: false,
                isFollowing: false,
                friendStatus: 'none',
              }
            : null
        );
        addToast(`Blocked ${profileUser?.fullName}. All connections severed.`, 'info');
        refreshUser();
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to block user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!token || !targetId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/users/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      if (res.ok) {
        setIsBlockedByViewer(false);
        setRelationship((prev) => (prev ? { ...prev, isBlocked: false } : null));
        addToast(`Unblocked ${profileUser?.fullName}`, 'success');
        fetchProfile();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    if (!token) return;
    try {
      const isAvatar = cropModalState.type === 'avatar';
      const endpoint = isAvatar ? '/api/users/profile/avatar' : '/api/users/profile/cover';
      const body = isAvatar ? { avatarUrl: croppedDataUrl } : { coverUrl: croppedDataUrl };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfileUser(data.user);
        }
        refreshUser();
        addToast(
          isAvatar
            ? 'Profile photo updated and cropped successfully!'
            : 'Cover banner updated and cropped successfully!',
          'success'
        );
        setCropModalState({ isOpen: false, type: 'avatar' });
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast(errData.error || 'Failed to update photo', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while saving photo', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading spatial profile...</p>
      </div>
    );
  }

  // Handle Blocked Profile Boundary
  if (isBlockedByTarget) {
    return (
      <GlassCard variant="surface" className="p-12 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <Ban size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          You cannot view this profile or interact with this account due to privacy restrictions.
        </p>
      </GlassCard>
    );
  }

  if (!profileUser) {
    return (
      <GlassCard variant="surface" className="p-12 text-center max-w-lg mx-auto my-12">
        <p className="text-xs text-slate-400">User profile not found or has been deactivated.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto my-4">
      {/* Blocked Notice Banner if viewer blocked target */}
      {isBlockedByViewer && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2">
            <Shield size={16} /> You have blocked this user. They cannot message you or see your content.
          </span>
          <button
            onClick={handleUnblockUser}
            disabled={actionLoading}
            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold cursor-pointer"
          >
            Unblock
          </button>
        </div>
      )}

      {/* Cover Banner & Profile Header */}
      <div className="glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-slate-900 group">
          <img
            src={profileUser.coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />

          {/* Quick Step-by-Step Back Navigation Button removed */}

          {isSelf && (
            <button
              type="button"
              onClick={() => setCropModalState({ isOpen: true, type: 'cover' })}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all"
              title="Upload and crop cover banner"
            >
              <Camera size={14} />
              <span>Change Cover</span>
            </button>
          )}
        </div>

        <div className="p-5 pt-0 relative">
          {/* Avatar & Action Button Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 mb-4 gap-4">
            <div className="relative inline-block group">
              <img
                src={profileUser.avatarUrl}
                alt=""
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-slate-900 shadow-2xl bg-slate-800"
              />
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setCropModalState({ isOpen: true, type: 'avatar' })}
                  className="absolute inset-0 rounded-3xl bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer border-4 border-cyan-400/50 backdrop-blur-xs"
                  title="Upload and crop profile photo"
                >
                  <Camera size={20} className="mb-0.5" />
                  <span className="text-[10px] font-bold">Crop Photo</span>
                </button>
              )}
              {relationship?.isFriend && (
                <div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 text-white flex items-center justify-center shadow-lg"
                  title="Confirmed Friend"
                >
                  <UserCheck size={14} />
                </div>
              )}
            </div>

            {/* Profile Relationship Actions */}
            {!isSelf && (
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. FRIEND BUTTON */}
                {relationship?.friendStatus === 'friends' ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowFriendMenu(!showFriendMenu)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <UserCheck size={15} /> Friends
                      <MoreVertical size={13} className="opacity-70" />
                    </button>
                    {showFriendMenu && (
                      <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl glass-card border border-white/15 p-1.5 shadow-2xl z-20 space-y-1">
                        <button
                          onClick={handleRemoveFriend}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <UserMinus size={14} /> Unfriend / Remove
                        </button>
                      </div>
                    )}
                  </div>
                ) : relationship?.friendStatus === 'pending_sent' ? (
                  <button
                    onClick={handleCancelFriendRequest}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl bg-slate-500/15 hover:bg-slate-500/25 border border-slate-500/30 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Click to cancel outgoing friend request"
                  >
                    <Clock size={15} className="animate-spin" /> Requested (Cancel)
                  </button>
                ) : relationship?.friendStatus === 'pending_received' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleAcceptFriendRequest}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                    >
                      <UserPlus size={15} /> Accept Request
                    </button>
                    <button
                      onClick={handleDeclineFriendRequest}
                      disabled={actionLoading}
                      className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 text-xs cursor-pointer transition-colors"
                      title="Decline request"
                    >
                      <UserX size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={actionLoading || !relationship?.canSendFriendRequest}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      relationship?.canSendFriendRequest
                        ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}
                  >
                    <UserPlus size={15} /> Add Friend
                  </button>
                )}

                {/* 2. FOLLOW BUTTON */}
                <button
                  onClick={handleToggleFollow}
                  disabled={actionLoading || (!relationship?.canFollow && !relationship?.isFollowing)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    relationship?.isFollowing
                      ? 'bg-white/10 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-white/20'
                      : 'glass-button-primary text-white shadow-lg'
                  }`}
                >
                  {relationship?.isFollowing ? 'Following' : '+ Follow'}
                </button>

                {/* 3. MESSAGE BUTTON */}
                <button
                  onClick={() => onNavigateToChat && onNavigateToChat(profileUser.id)}
                  className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-cyan-500/20 text-slate-700 dark:text-slate-200 hover:text-cyan-400 border border-black/10 dark:border-white/15 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <MessageCircle size={15} /> Message
                </button>

                {/* 4. GIFT BUTTON */}
                <button
                  onClick={() => onOpenGiftModal('', profileUser.id)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Gift size={15} /> Gift
                </button>

                {/* 5. BLOCK BUTTON */}
                {isBlockedByViewer ? (
                  <button
                    onClick={handleUnblockUser}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Shield size={14} /> Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBlockModal(true)}
                    className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-black/10 dark:border-white/10 cursor-pointer transition-colors"
                    title="Block User"
                  >
                    <Ban size={15} />
                  </button>
                )}

                {/* 6. REPORT USER BUTTON */}
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-black/10 dark:border-white/10 cursor-pointer transition-colors"
                  title="Report User Profile"
                >
                  <Flag size={15} />
                </button>
              </div>
            )}

            {/* Self Profile Actions */}
            {isSelf && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(true)}
                  className="px-3.5 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit Profile Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('dashboardPro')}
                  className={`px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98 ${
                    activeTab === 'dashboardPro'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 ring-2 ring-amber-400/50'
                      : 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <Zap size={15} className="fill-amber-500/20" />
                  <span>Dashboard Pro</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                    PRO HUB
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                  {profileUser.fullName}
                </h1>
                {profileUser.isVerified && (
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                )}
                {profileUser.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                    {profileUser.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">@{profileUser.username}</p>
            </div>

            {profileUser.bio && (
              <p className="text-xs text-slate-700 dark:text-slate-200 max-w-2xl leading-relaxed">
                {profileUser.bio}
              </p>
            )}

            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              {profileUser.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-purple-400" /> {profileUser.location}
                </span>
              )}
              {profileUser.websiteUrl && (
                <a
                  href={profileUser.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-cyan-500 hover:underline"
                >
                  <Globe size={14} /> {profileUser.websiteUrl}
                </a>
              )}
            </div>

            {/* Extended User Profile Details (Interests, Activities, Hobbies, Education, Work, Bio, DOB, Gender) */}
            <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2 text-xs">
              {/* Work and Education */}
              {(profileUser.occupation || (profileUser as any).workplace || profileUser.education) && (
                <div className="flex flex-wrap gap-4 text-slate-600 dark:text-slate-300">
                  {(profileUser.occupation || (profileUser as any).workplace) && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={14} className="text-cyan-400" />
                      <span>Works at <strong className="text-slate-800 dark:text-white">{(profileUser as any).workplace || profileUser.occupation}</strong></span>
                    </span>
                  )}
                  {profileUser.education && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-purple-400" />
                      <span>Studied at <strong className="text-slate-800 dark:text-white">{profileUser.education}</strong></span>
                    </span>
                  )}
                </div>
              )}

              {/* DOB & Gender (respecting privacy: if 'only_me', only visible to profile owner) */}
              {((profileUser.birthdate && (profileUser.dobPrivacy !== 'only_me' || isSelf)) ||
                (profileUser.gender && profileUser.gender !== 'unspecified' && (profileUser.genderPrivacy !== 'only_me' || isSelf))) && (
                <div className="flex flex-wrap gap-4 text-slate-500 dark:text-slate-400">
                  {profileUser.birthdate && (profileUser.dobPrivacy !== 'only_me' || isSelf) && (
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-amber-400" />
                      <span>Born {new Date(profileUser.birthdate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      {profileUser.dobPrivacy === 'only_me' && (
                        <span title="Only visible to you" className="text-amber-500"><Lock size={11} /></span>
                      )}
                    </span>
                  )}
                  {profileUser.gender && profileUser.gender !== 'unspecified' && (profileUser.genderPrivacy !== 'only_me' || isSelf) && (
                    <span className="flex items-center gap-1 capitalize">
                      <span>Gender: <strong className="text-slate-700 dark:text-slate-300">{profileUser.gender}</strong></span>
                      {profileUser.genderPrivacy === 'only_me' && (
                        <span title="Only visible to you" className="text-amber-500"><Lock size={11} /></span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Interests Tags */}
              {profileUser.interests && profileUser.interests.length > 0 && (profileUser.interestsPrivacy !== 'only_me' || isSelf) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Heart size={12} className="text-rose-400" /> Interests:
                  </span>
                  {profileUser.interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-500 dark:text-rose-300 border border-rose-500/20"
                    >
                      {interest}
                    </span>
                  ))}
                  {profileUser.interestsPrivacy === 'only_me' && (
                    <span title="Only visible to you" className="text-amber-500"><Lock size={11} /></span>
                  )}
                </div>
              )}

              {/* Activities Tags */}
              {profileUser.activities && profileUser.activities.length > 0 && (profileUser.activitiesPrivacy !== 'only_me' || isSelf) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Activity size={12} className="text-emerald-400" /> Activities:
                  </span>
                  {profileUser.activities.map((act, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500 dark:text-emerald-300 border border-emerald-500/20"
                    >
                      {act}
                    </span>
                  ))}
                  {profileUser.activitiesPrivacy === 'only_me' && (
                    <span title="Only visible to you" className="text-amber-500"><Lock size={11} /></span>
                  )}
                </div>
              )}

              {/* Hobbies Tags */}
              {profileUser.hobbies && profileUser.hobbies.length > 0 && (profileUser.hobbiesPrivacy !== 'only_me' || isSelf) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Smile size={12} className="text-amber-400" /> Hobbies:
                  </span>
                  {profileUser.hobbies.map((hob, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 dark:text-amber-300 border border-amber-500/20"
                    >
                      {hob}
                    </span>
                  ))}
                  {profileUser.hobbiesPrivacy === 'only_me' && (
                    <span title="Only visible to you" className="text-amber-500"><Lock size={11} /></span>
                  )}
                </div>
              )}

              {isSelf && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(true)}
                    className="text-[11px] text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit2 size={12} /> Edit bio, education, work, interests & hobbies
                  </button>
                </div>
              )}
            </div>

            {/* Mutual Friends Banner (if viewing someone else) */}
            {!isSelf && relationship && relationship.mutualCount > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex -space-x-2">
                  {relationship.mutualFriendsSample.map((mf) => (
                    <img
                      key={mf.id}
                      src={mf.avatarUrl}
                      alt={mf.fullName}
                      title={mf.fullName}
                      className="w-6 h-6 rounded-full object-cover border-2 border-slate-900"
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">
                    {relationship.mutualCount} mutual friend{relationship.mutualCount > 1 ? 's' : ''}
                  </strong>{' '}
                  including {relationship.mutualFriendsSample.map((m) => m.fullName).join(', ')}
                </span>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-6 pt-3 border-t border-black/5 dark:border-white/10 text-xs">
              <button
                onClick={() => handleTabChange('followers')}
                className="hover:underline cursor-pointer text-left"
              >
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {profileUser.followersCount}
                </span>{' '}
                <span className="text-slate-400">Followers</span>
              </button>
              <button
                onClick={() => handleTabChange('following')}
                className="hover:underline cursor-pointer text-left"
              >
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {profileUser.followingCount}
                </span>{' '}
                <span className="text-slate-400">Following</span>
              </button>
              <button
                onClick={() => handleTabChange('friends')}
                className="hover:underline cursor-pointer text-left"
              >
                <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                  {relationship?.isFriend ? 'Connected' : 'Friends'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google AdMob Sponsored Banner */}
      <AdMobBanner placement="profile_header_banner" variant="compact" className="my-2" />

      {/* ---------------- PROMINENT DASHBOARD PRO HUB BAR (PLACED DIRECTLY ABOVE TABS FOR PROFILES) ---------------- */}
      {isSelf && (
        <div className="glass-card p-4 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Dashboard Pro Hub</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                    PRO ACCESS
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Coin treasury, creator monetization, engagement analytics & receipts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTabChange('dashboardPro')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                  activeTab === 'dashboardPro'
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/50'
                    : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{activeTab === 'dashboardPro' ? 'Active in Dashboard' : 'Open Pro Hub'}</span>
              </button>
            </div>
          </div>

          {/* Quick Pro Stats Pill Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/10 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium">Coin Balance</div>
              <div className="text-sm font-black text-amber-400 flex items-center gap-1 mt-0.5">
                <span>{profileUser.coinsBalance ?? currentUser?.coinsBalance ?? 0}</span>
                <span className="text-[10px] font-normal text-amber-500/80">Coins</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium">Creator Tier</div>
              <div className="text-sm font-black text-purple-400 mt-0.5">
                {profileUser.badge || 'Level 1 Pro'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium">Earned Coins</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">
                {(currentUser as any)?.earnedCoins ?? 0}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium">Total Reach</div>
              <div className="text-sm font-black text-cyan-400 mt-0.5">
                {((profileUser.followersCount || 0) * 12 + (userPosts.length || 0) * 45).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub Tabs - Mobile Screen Contained with touch-scrolling */}
      <div className="w-full max-w-full overflow-x-auto no-scrollbar scrollbar-none py-1">
        <div className="flex items-center gap-1.5 p-1.5 glass-card rounded-2xl border border-white/10 w-max sm:w-full min-w-full">
          {[
            ...(isSelf ? [{ id: 'dashboardPro' as const, label: 'Dashboard Pro', icon: Zap, isPro: true }] : []),
            { id: 'posts' as const, label: `Posts (${userPosts.length})`, icon: Grid, isPro: false },
            { id: 'media' as const, label: 'Media', icon: Film, isPro: false },
            { id: 'friends' as const, label: 'Friends', icon: Users, isPro: false },
            { id: 'followers' as const, label: `Followers (${profileUser.followersCount})`, icon: UserPlus, isPro: false },
            { id: 'following' as const, label: `Following (${profileUser.followingCount})`, icon: UserCheck, isPro: false },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  tab.isPro
                    ? isActive
                      ? 'bg-gradient-to-r from-amber-500/30 to-amber-600/25 text-amber-600 dark:text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
                    : isActive
                    ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <IconComp size={15} className={tab.isPro ? 'text-amber-500 fill-amber-500/20' : ''} />
                <span>{tab.label}</span>
                {tab.isPro && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black">
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'dashboardPro' && (
        <DashboardPro onOpenGiftModal={onOpenGiftModal} />
      )}

      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Creator Pro Coin & Earnings Quick Hub above Posts for self profile */}
          {isSelf && (
            <GlassCard level={2} variant="glow" className="p-4 border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Creator Dashboard Pro Hub
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                        LIVE COINS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Balance: <strong className="text-amber-500 font-mono">{(currentUser?.coinsBalance || 0).toLocaleString()} Coins</strong> (≈ ৳{((currentUser?.coinsBalance || 0) * 0.05).toFixed(2)} BDT)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleTabChange('dashboardPro')}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap size={13} />
                    <span>Open Dashboard Pro</span>
                  </button>
                </div>
              </div>

              {/* Quick Post Earning Rate Badges */}
              <div className="pt-2 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Earned automatically per publication:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold">
                    📝 Text Post: +5 Coins
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    📷 Photo Post: +10 Coins
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold">
                    🎬 Video Post: +15 Coins
                  </span>
                </div>
              </div>
            </GlassCard>
          )}

          {userPosts.length === 0 ? (
            <GlassCard variant="surface" className="p-12 text-center text-xs text-slate-400">
              No posts published by this creator yet.
            </GlassCard>
          ) : (
            userPosts.map((post, idx) => (
              <React.Fragment key={post.id}>
                <PostCard
                  post={post}
                  onOpenGiftModal={onOpenGiftModal}
                  onPostUpdated={fetchProfile}
                />
                {(idx + 1) % 3 === 0 && (
                  <div className="my-4 animate-in fade-in duration-300">
                    <AdMobBanner placement={`profile_inline_admob_${idx}`} variant="banner" />
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {activeTab === 'media' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mediaItems.length === 0 ? (
            <div className="col-span-full glass-card p-12 text-center text-xs text-slate-400 rounded-3xl">
              No photo or video media shared yet.
            </div>
          ) : (
            mediaItems.map((item) => {
              let urls: string[] = [];
              try {
                urls = JSON.parse(item.media_urls || '[]');
              } catch (e) {
                urls = [];
              }
              const firstMedia = urls[0] || '';
              const isVideo =
                item.media_type === 'video' ||
                firstMedia.endsWith('.mp4') ||
                firstMedia.endsWith('.webm') ||
                firstMedia.endsWith('.mov') ||
                firstMedia.includes('/video/');

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isVideo && onNavigateToFeels) {
                      onNavigateToFeels();
                    }
                  }}
                  className={`group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-sm ${
                    isVideo ? 'cursor-pointer' : ''
                  }`}
                  title={isVideo ? 'Click to open in FEELS viewer' : ''}
                >
                  {isVideo ? (
                    <video
                      src={firstMedia}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      muted
                      playsInline
                    />
                  ) : firstMedia ? (
                    <img
                      src={firstMedia}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}

                  {isVideo && (
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/80 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Film className="w-5 h-5 fill-current" />
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-cyan-300">
                        FEELS
                      </span>
                    </div>
                  )}

                  {isSelf && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(isBn ? 'আপনি কি এই মিডিয়া পোস্টটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this media post?')) return;
                        try {
                          const res = await fetch(`/api/posts/${item.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (res.ok) {
                            addToast(isBn ? 'মিডিয়া পোস্ট মুছে ফেলা হয়েছে' : 'Media post deleted', 'info');
                            fetchTabContent('media');
                            fetchProfile();
                          } else {
                            throw new Error('Failed to delete');
                          }
                        } catch (err: any) {
                          addToast(err.message || 'Failed to delete', 'error');
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/70 hover:bg-rose-600 text-white transition opacity-0 group-hover:opacity-100 shadow-lg cursor-pointer z-20"
                      title={isBn ? 'ডিলিট করুন' : 'Delete post'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {friendsList.length === 0 ? (
            <div className="col-span-full glass-card p-12 text-center text-xs text-slate-400 rounded-3xl">
              No friends to display.
            </div>
          ) : (
            friendsList.map((f) => (
              <div
                key={f.id}
                className="p-3.5 glass-card rounded-2xl border border-white/10 flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <img
                    src={f.avatarUrl}
                    alt=""
                    className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {f.fullName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">@{f.username}</p>
                    {f.mutualCount > 0 && (
                      <span className="text-[10px] text-cyan-500 font-medium">
                        {f.mutualCount} mutual
                      </span>
                    )}
                  </div>
                </div>
                {currentUser?.id !== f.id && (
                  <button
                    onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    View
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'followers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {followersList.length === 0 ? (
            <div className="col-span-full glass-card p-12 text-center text-xs text-slate-400 rounded-3xl">
              No followers yet.
            </div>
          ) : (
            followersList.map((f) => (
              <div
                key={f.id}
                className="p-3.5 glass-card rounded-2xl border border-white/10 flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <img
                    src={f.avatarUrl}
                    alt=""
                    className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {f.fullName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">@{f.username}</p>
                  </div>
                </div>
                {currentUser?.id !== f.id && (
                  <button
                    onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 font-bold text-xs cursor-pointer shrink-0"
                  >
                    View
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {followingList.length === 0 ? (
            <div className="col-span-full glass-card p-12 text-center text-xs text-slate-400 rounded-3xl">
              Not following any accounts yet.
            </div>
          ) : (
            followingList.map((f) => (
              <div
                key={f.id}
                className="p-3.5 glass-card rounded-2xl border border-white/10 flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <img
                    src={f.avatarUrl}
                    alt=""
                    className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {f.fullName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">@{f.username}</p>
                  </div>
                </div>
                {currentUser?.id !== f.id && (
                  <button
                    onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 font-bold text-xs cursor-pointer shrink-0"
                  >
                    View
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Block Confirmation Dialog */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl glass-card border border-rose-500/30 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Ban size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Block {profileUser.fullName}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                They will no longer be able to message you, see your posts, or send friend requests.
                Any existing friendship and follows will be severed immediately.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg"
              >
                {actionLoading ? 'Blocking...' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && profileUser && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="user"
          targetId={profileUser.id}
          targetTitle={`@${profileUser.username} (${profileUser.fullName})`}
          targetAuthorName={profileUser.fullName}
        />
      )}

      {/* Image Crop Modal for Profile Photo and Cover Banner */}
      <ImageCropModal
        isOpen={cropModalState.isOpen}
        onClose={() => setCropModalState({ isOpen: false, type: 'avatar' })}
        type={cropModalState.type}
        onCropComplete={handleCropComplete}
      />

      {/* Profile Details Edit Modal */}
      {isSelf && currentUser && (
        <ProfileDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          currentUser={{ ...currentUser, ...profileUser }}
          token={token}
          onProfileUpdated={(updated) => {
            setProfileUser(updated);
            refreshUser();
            addToast('Profile details updated successfully!', 'success');
          }}
        />
      )}
    </div>
  );
};

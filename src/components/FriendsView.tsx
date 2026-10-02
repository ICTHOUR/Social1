import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../design-system/ToastContext';
import { GlassCard } from '../design-system/components/GlassCard';
import {
  IconFriends,
  IconSearch,
} from '../design-system/icons/OriginalIcons';
import {
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  Users,
  Clock,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Compass,
  Check,
} from 'lucide-react';
import { FriendRequestItem, SocialSuggestion, MutualFriend } from '../types';
import { AdMobBanner } from './ads/AdMobBanner';

interface FriendsViewProps {
  onNavigateToProfile?: (id: string) => void;
  onNavigateToChat?: (userId: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  onNavigateToProfile,
  onNavigateToChat,
}) => {
  const { user, token, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'friends' | 'requests' | 'suggestions' | 'people' | 'following'
  >('friends');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Data states
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [suggestions, setSuggestions] = useState<SocialSuggestion[]>([]);
  const [peopleYouMayKnow, setPeopleYouMayKnow] = useState<SocialSuggestion[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followSubTab, setFollowSubTab] = useState<'following' | 'followers'>('following');

  // Load friends
  const fetchFriends = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriendsList(data.friends || []);
      }
    } catch (e) {
      console.error('Failed to fetch friends', e);
    }
  };

  // Load requests
  const fetchRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIncomingRequests(data.incoming || []);
        setOutgoingRequests(data.outgoing || []);
      }
    } catch (e) {
      console.error('Failed to fetch requests', e);
    }
  };

  // Load suggestions
  const fetchSuggestions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/suggestions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (e) {
      console.error('Failed to fetch suggestions', e);
    }
  };

  // Load people you may know
  const fetchPeopleYouMayKnow = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/people-you-may-know', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPeopleYouMayKnow(data.suggestions || []);
      }
    } catch (e) {
      console.error('Failed to fetch people you may know', e);
    }
  };

  // Load follow lists
  const fetchFollows = async () => {
    if (!token || !user) return;
    try {
      const [follRes, fwingRes] = await Promise.all([
        fetch(`/api/users/${user.id}/followers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/users/${user.id}/following`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (follRes.ok) {
        const follData = await follRes.json();
        setFollowersList(follData.followers || []);
      }
      if (fwingRes.ok) {
        const fwingData = await fwingRes.json();
        setFollowingList(fwingData.following || []);
      }
    } catch (e) {
      console.error('Failed to fetch follow lists', e);
    }
  };

  // Initial load
  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([fetchFriends(), fetchRequests(), fetchSuggestions(), fetchPeopleYouMayKnow(), fetchFollows()]).finally(
      () => setIsLoading(false)
    );
  }, [token, user]);

  // Friend Actions
  const handleAcceptRequest = async (item: FriendRequestItem) => {
    if (!token) return;
    setActionLoadingId(item.id);
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: item.id, targetUserId: item.user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== item.id));
        setFriendsList((prev) => [
          {
            id: item.user.id,
            username: item.user.username,
            fullName: item.user.fullName,
            avatarUrl: item.user.avatarUrl,
            bio: item.user.bio,
            badge: item.user.badge,
            mutualCount: item.mutualCount,
          },
          ...prev,
        ]);
        addToast(`You and ${item.user.fullName} are now friends!`, 'success');
        refreshUser();
      } else {
        addToast(data.error || 'Failed to accept request', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (item: FriendRequestItem) => {
    if (!token) return;
    setActionLoadingId(item.id);
    try {
      const res = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: item.id, targetUserId: item.user.id }),
      });
      if (res.ok) {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== item.id));
        addToast(`Friend request dismissed`, 'info');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (item: FriendRequestItem) => {
    if (!token) return;
    setActionLoadingId(item.id);
    try {
      const res = await fetch('/api/friends/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: item.id, targetUserId: item.user.id }),
      });
      if (res.ok) {
        setOutgoingRequests((prev) => prev.filter((r) => r.id !== item.id));
        addToast(`Friend request cancelled`, 'info');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendRequest = async (targetUserId: string, targetUserName: string) => {
    if (!token) return;
    setActionLoadingId(targetUserId);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || `Friend request sent to ${targetUserName}`, 'success');
        // Update suggestion status
        setSuggestions((prev) =>
          prev.map((s) => (s.id === targetUserId ? { ...s, status: 'pending_sent' } : s))
        );
        setPeopleYouMayKnow((prev) =>
          prev.map((s) => (s.id === targetUserId ? { ...s, status: 'pending_sent' } : s))
        );
        fetchRequests();
      } else {
        addToast(data.error || 'Could not send request', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) return;
    setActionLoadingId(friendId);
    try {
      const res = await fetch(`/api/friends/remove/${friendId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFriendsList((prev) => prev.filter((f) => f.id !== friendId));
        addToast(`Removed ${friendName} from friends`, 'info');
        refreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Follow / Unfollow from lists
  const handleToggleFollowUser = async (targetUserId: string, currentFollowing: boolean) => {
    if (!token) return;
    setActionLoadingId(targetUserId);
    try {
      const endpoint = currentFollowing
        ? `/api/users/${targetUserId}/unfollow`
        : `/api/users/${targetUserId}/follow`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.isFollowing ? 'Followed user' : 'Unfollowed user', 'info');
        setFollowingList((prev) => {
          if (data.isFollowing) {
            return prev;
          } else {
            return prev.filter((u) => u.id !== targetUserId);
          }
        });
        setSuggestions((prev) =>
          prev.map((s) => (s.id === targetUserId ? { ...s, isFollowing: data.isFollowing } : s))
        );
        fetchFollows();
        refreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredFriends = friendsList.filter(
    (f) =>
      f.fullName.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <GlassCard variant="surface" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <IconFriends size={24} className="text-cyan-500" />
              Social Graph & Friends Network
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Privacy-aware connection matrix, algorithmic suggestions, and live request management
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'friends'
                  ? 'bg-white dark:bg-[#121829] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Friends ({friendsList.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-[#121829] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Requests
              {incomingRequests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-cyan-500 text-white text-[10px] font-bold">
                  {incomingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'suggestions'
                  ? 'bg-white dark:bg-[#121829] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Suggestions
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'people'
                  ? 'bg-white dark:bg-[#121829] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'following'
                  ? 'bg-white dark:bg-[#121829] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Follows
            </button>
          </div>
        </div>

        {/* Search Field (Only for friends list) */}
        {activeTab === 'friends' && (
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <IconSearch size={16} />
            </div>
            <input
              type="text"
              placeholder="Search in your friends by name or handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        )}
      </GlassCard>

      {/* Google AdMob Sponsored Banner */}
      <AdMobBanner placement="friends_network_banner" variant="compact" className="my-2" />

      {/* 1. FRIENDS LIST TAB */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {filteredFriends.length === 0 ? (
            <GlassCard variant="surface" className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center mx-auto">
                <IconFriends size={24} />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {search ? 'No friends found matching your search' : 'No friends connected yet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Explore the Suggestions or Discover tabs to expand your circle of friends!
              </p>
              <button
                onClick={() => setActiveTab('suggestions')}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer hover:bg-cyan-400 transition-colors"
              >
                Find People to Connect With
              </button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredFriends.map((f) => (
                <div
                  key={f.id}
                  className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3 group transition-all hover:border-cyan-500/30"
                >
                  <div
                    onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                  >
                    <img
                      src={f.avatarUrl}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border border-cyan-400/20 shadow-sm shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-cyan-400 transition-colors">
                          {f.fullName}
                        </h3>
                        {f.badge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-purple-500/20 text-purple-400">
                            {f.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">@{f.username}</p>
                      {f.mutualCount !== undefined && f.mutualCount > 0 && (
                        <p className="text-[10px] text-cyan-500 font-medium mt-0.5">
                          {f.mutualCount} mutual friend{f.mutualCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onNavigateToChat && onNavigateToChat(f.id)}
                      className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-cyan-500/20 text-slate-500 hover:text-cyan-400 cursor-pointer transition-colors"
                      title="Direct Message"
                    >
                      <MessageCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(f.id, f.fullName)}
                      disabled={actionLoadingId === f.id}
                      className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                      title="Remove Friend"
                    >
                      <UserMinus size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. FRIEND REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus size={16} className="text-cyan-500" />
              Incoming Friend Requests ({incomingRequests.length})
            </h2>

            {incomingRequests.length === 0 ? (
              <GlassCard variant="surface" className="p-8 text-center text-xs text-slate-400">
                No pending incoming friend requests at this time.
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="glass-card rounded-2xl p-4 border border-cyan-500/30 flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div
                      onClick={() => onNavigateToProfile && onNavigateToProfile(req.user.id)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <img
                        src={req.user.avatarUrl}
                        alt=""
                        className="w-12 h-12 rounded-2xl object-cover border border-cyan-400/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {req.user.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">@{req.user.username}</p>
                        {req.mutualCount > 0 && (
                          <span className="text-[10px] text-cyan-500 font-medium">
                            {req.mutualCount} mutual friends
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        disabled={actionLoadingId === req.id}
                        className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <UserCheck size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req)}
                        disabled={actionLoadingId === req.id}
                        className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-400 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <UserX size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Sent Requests */}
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-purple-400" />
              Outgoing Sent Requests ({outgoingRequests.length})
            </h2>

            {outgoingRequests.length === 0 ? (
              <GlassCard variant="surface" className="p-8 text-center text-xs text-slate-400">
                You have no pending outgoing requests.
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => onNavigateToProfile && onNavigateToProfile(req.user.id)}
                      className="flex items-center gap-3 cursor-pointer min-w-0"
                    >
                      <img
                        src={req.user.avatarUrl}
                        alt=""
                        className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {req.user.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">@{req.user.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelRequest(req)}
                      disabled={actionLoadingId === req.id}
                      className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 text-xs font-semibold cursor-pointer transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUGGESTIONS TAB */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ranked by mutual friends and connection strength
            </p>
          </div>

          {suggestions.length === 0 ? (
            <GlassCard variant="surface" className="p-12 text-center text-xs text-slate-400">
              No friend suggestions currently available.
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between gap-3 hover:border-cyan-500/30 transition-all"
                >
                  <div
                    onClick={() => onNavigateToProfile && onNavigateToProfile(sug.id)}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <img
                      src={sug.avatarUrl}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border border-cyan-400/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {sug.fullName}
                        </h4>
                        {sug.badge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-cyan-500/20 text-cyan-400">
                            {sug.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">@{sug.username}</p>
                      {sug.bio && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-1 mt-0.5">
                          {sug.bio}
                        </p>
                      )}
                      {sug.mutualCount > 0 ? (
                        <p className="text-[10px] text-cyan-500 font-medium mt-1">
                          {sug.mutualCount} mutual friend{sug.mutualCount > 1 ? 's' : ''}
                        </p>
                      ) : sug.reason ? (
                        <p className="text-[10px] text-purple-400 font-medium mt-1">
                          {sug.reason}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                    {sug.status === 'pending_sent' ? (
                      <button
                        disabled
                        className="flex-1 py-1.5 rounded-xl bg-slate-500/15 border border-slate-500/25 text-slate-400 font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Clock size={13} /> Request Sent
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(sug.id, sug.fullName)}
                        disabled={actionLoadingId === sug.id}
                        className="flex-1 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <UserPlus size={13} /> Add Friend
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleFollowUser(sug.id, Boolean(sug.isFollowing))}
                      disabled={actionLoadingId === sug.id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        sug.isFollowing
                          ? 'bg-white/10 text-slate-300 border border-white/15'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-white/15 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {sug.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. DISCOVER (PEOPLE YOU MAY KNOW) TAB */}
      {activeTab === 'people' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Expanded 2nd-degree network and active community creators
            </p>
          </div>

          {peopleYouMayKnow.length === 0 ? (
            <GlassCard variant="surface" className="p-12 text-center text-xs text-slate-400">
              No new community profiles to discover at this moment.
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {peopleYouMayKnow.map((item) => (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between gap-3 hover:border-cyan-500/30 transition-all"
                >
                  <div
                    onClick={() => onNavigateToProfile && onNavigateToProfile(item.id)}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <img
                      src={item.avatarUrl}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border border-cyan-400/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">@{item.username}</p>
                      {item.bio && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-1 mt-0.5">
                          {item.bio}
                        </p>
                      )}
                      <p className="text-[10px] text-purple-400 font-medium mt-1">
                        {item.reason || 'Active on Nixo'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                    {item.status === 'pending_sent' ? (
                      <button
                        disabled
                        className="flex-1 py-1.5 rounded-xl bg-slate-500/15 border border-slate-500/25 text-slate-400 font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Clock size={13} /> Requested
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(item.id, item.fullName)}
                        disabled={actionLoadingId === item.id}
                        className="flex-1 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <UserPlus size={13} /> Add Friend
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleFollowUser(item.id, Boolean(item.isFollowing))}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      {item.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. FOLLOWING & FOLLOWERS TAB */}
      {activeTab === 'following' && (
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl w-fit">
            <button
              onClick={() => setFollowSubTab('following')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                followSubTab === 'following'
                  ? 'bg-white dark:bg-[#121829] text-cyan-500 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Following ({followingList.length})
            </button>
            <button
              onClick={() => setFollowSubTab('followers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                followSubTab === 'followers'
                  ? 'bg-white dark:bg-[#121829] text-cyan-500 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Followers ({followersList.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {followSubTab === 'following' ? (
              followingList.length === 0 ? (
                <div className="col-span-full glass-card p-12 text-center text-xs text-slate-400 rounded-2xl">
                  You are not following any creators yet.
                </div>
              ) : (
                followingList.map((f) => (
                  <div
                    key={f.id}
                    className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                      className="flex items-center gap-3 cursor-pointer min-w-0"
                    >
                      <img
                        src={f.avatarUrl}
                        alt=""
                        className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {f.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">@{f.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFollowUser(f.id, true)}
                      disabled={actionLoadingId === f.id}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-bold cursor-pointer transition-colors shrink-0"
                    >
                      Unfollow
                    </button>
                  </div>
                ))
              )
            ) : followersList.length === 0 ? (
              <div className="col-span-full glass-card p-12 text-center text-xs text-slate-400 rounded-2xl">
                No followers yet.
              </div>
            ) : (
              followersList.map((f) => (
                <div
                  key={f.id}
                  className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div
                    onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <img
                      src={f.avatarUrl}
                      alt=""
                      className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {f.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">@{f.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToProfile && onNavigateToProfile(f.id)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 text-xs font-bold cursor-pointer shrink-0"
                  >
                    Profile
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

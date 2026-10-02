import React, { useState, useEffect } from 'react';
import {
  X,
  Flag,
  Users,
  Video,
  FileText,
  BarChart3,
  MessageSquare,
  Shield,
  Heart,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  Eye,
  Calendar,
  Share2,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Page, PagePost, PageRole, PageAnalyticsData, PageMessage } from '../../types';

interface PageDetailModalProps {
  pageId: string;
  onClose: () => void;
  onPageUpdated?: () => void;
}

export const PageDetailModal: React.FC<PageDetailModalProps> = ({ pageId, onClose, onPageUpdated }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'about' | 'roles' | 'analytics' | 'messages'>('posts');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page | null>(null);
  const [roles, setRoles] = useState<PageRole[]>([]);
  const [userRole, setUserRole] = useState<{
    role: string;
    isFollowing: boolean;
    canManage: boolean;
    canPost: boolean;
    canMessage: boolean;
  }>({ role: 'guest', isFollowing: false, canManage: false, canPost: false, canMessage: false });

  // Posts & Videos
  const [posts, setPosts] = useState<PagePost[]>([]);
  const [videos, setVideos] = useState<PagePost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVideoUrl, setNewPostVideoUrl] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<PageAnalyticsData | null>(null);

  // Messaging
  const [messages, setMessages] = useState<PageMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [submittingMessage, setSubmittingMessage] = useState(false);

  // Add role state
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');
  const [targetRole, setTargetRole] = useState<'admin' | 'moderator' | 'editor'>('moderator');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchPageDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pages/${pageId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPage(data.page);
        setUserRole(data.userRole);
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}/posts`);
      if (res.ok) {
        setPosts((await res.json()).posts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVideos = async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}/videos`);
      if (res.ok) {
        setVideos((await res.json()).videos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async () => {
    if (!token || !userRole.canManage) return;
    try {
      const res = await fetch(`/api/pages/${pageId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAnalytics((await res.json()).analytics || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/pages/${pageId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages((await res.json()).messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPageDetails();
  }, [pageId, token]);

  useEffect(() => {
    if (page) {
      fetchPosts();
      fetchVideos();
      if (userRole.canManage) {
        fetchAnalytics();
      }
      if (token) {
        fetchMessages();
      }
    }
  }, [page, userRole]);

  const handleToggleFollow = async () => {
    if (!token) {
      showToast('Please sign in to follow pages');
      return;
    }
    try {
      const res = await fetch(`/api/pages/${pageId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const d = await res.json();
        setUserRole((prev) => ({ ...prev, isFollowing: d.isFollowing }));
        fetchPageDetails();
        showToast(d.isFollowing ? 'Following page!' : 'Unfollowed page');
        if (onPageUpdated) onPageUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPostContent.trim()) return;
    setSubmittingPost(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newPostContent,
          videoUrl: newPostVideoUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNewPostContent('');
        setNewPostVideoUrl('');
        fetchPosts();
        fetchVideos();
        showToast('Page post published!');
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to publish');
      }
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newMessage.trim()) return;
    setSubmittingMessage(true);
    try {
      const senderType = userRole.canManage ? 'page' : 'user';
      const res = await fetch(`/api/pages/${pageId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage, senderType }),
      });
      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingMessage(false);
    }
  };

  const handleAssignRole = async () => {
    if (!token || !targetUsername) return;
    try {
      const sRes = await fetch(`/api/search?q=${encodeURIComponent(targetUsername)}&category=users`);
      const sData = await sRes.json();
      const targetUser = (sData.users || [])[0];
      if (!targetUser) {
        showToast('User not found');
        return;
      }

      const res = await fetch(`/api/pages/${pageId}/members/${targetUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: targetRole }),
      });

      if (res.ok) {
        setShowAddRoleModal(false);
        setTargetUsername('');
        fetchPageDetails();
        showToast(`Assigned ${targetRole} to ${targetUser.fullName}`);
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to assign role');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleRemoveRole = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/pages/${pageId}/members/${targetUserId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: 'remove' }),
      });
      if (res.ok) {
        fetchPageDetails();
        showToast('Role removed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !page) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="glass-card p-8 rounded-3xl text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Opening Page Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Toast */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-cyan-500 text-slate-950 text-xs font-black shadow-xl flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Cover Banner */}
        <div className="relative h-44 sm:h-56 w-full shrink-0">
          <img src={page.coverUrl} alt={page.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-black/30" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border border-white/10 transition-all cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Page Identity Header */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={page.avatarUrl}
                alt={page.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-cyan-400 shadow-xl bg-slate-800"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{page.name}</h1>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                    {page.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 font-bold text-cyan-400">
                    <Heart className="w-3.5 h-3.5" /> {page.followersCount} followers
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Eye className="w-3.5 h-3.5" /> {page.viewsCount || 0} views
                  </span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFollow}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  userRole.isFollowing
                    ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 font-black'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${userRole.isFollowing ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                <span>{userRole.isFollowing ? 'Following' : 'Follow Page'}</span>
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </button>

              {userRole.canManage && (
                <span className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wide">
                  {userRole.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 bg-slate-900/90 shrink-0 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'posts' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'videos' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Videos ({videos.length})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'about' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'roles' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Page Roles ({roles.length})
            </button>
            {userRole.canManage && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'analytics'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
              </button>
            )}
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'messages' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Messaging
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: POSTS */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {/* Creator Publishing Box */}
              {userRole.canPost && (
                <form onSubmit={handleCreatePost} className="glass-card p-4 rounded-2xl border border-cyan-500/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={page.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                    <input
                      type="text"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`Publish an update as ${page.name}...`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <input
                      type="url"
                      value={newPostVideoUrl}
                      onChange={(e) => setNewPostVideoUrl(e.target.value)}
                      placeholder="Optional video URL (.mp4 or stream)..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingPost || !newPostContent.trim()}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 justify-center"
                    >
                      <Send className="w-3.5 h-3.5" /> Publish
                    </button>
                  </div>
                </form>
              )}

              {/* Feed */}
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="text-center py-12 glass-card rounded-2xl border border-white/10">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">No page posts yet</p>
                    <p className="text-xs text-slate-500">Stay tuned for official updates from {page.name}.</p>
                  </div>
                ) : (
                  posts.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl glass-card border border-white/10 space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={p.pageAvatar} alt="" className="w-9 h-9 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-xs text-white">{p.pageName}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • Published by {p.authorName}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 whitespace-pre-wrap">{p.content}</p>

                      {p.videoUrl && (
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
                          <video src={p.videoUrl} controls className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VIDEOS */}
          {activeTab === 'videos' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Dedicated Video Gallery</h3>
              {videos.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-2xl border border-white/10">
                  <Video className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold">No videos uploaded to this page yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videos.map((v) => (
                    <div key={v.id} className="glass-card rounded-2xl border border-white/10 overflow-hidden space-y-2">
                      <div className="aspect-video bg-black relative">
                        {v.videoUrl ? (
                          <video src={v.videoUrl} controls className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <Play className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-bold text-white line-clamp-2">{v.content}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ABOUT */}
          {activeTab === 'about' && (
            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">About {page.name}</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{page.about || page.description}</p>
              </div>
              <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Category</span>
                  <p className="font-bold text-white mt-0.5">{page.category}</p>
                </div>
                <div>
                  <span className="text-slate-400">Founded</span>
                  <p className="font-bold text-white mt-0.5">{new Date(page.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAGE ROLES & TEAM */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Page Management Roles</h3>
                  <p className="text-xs text-slate-400">Admins, Moderators, and Editors</p>
                </div>
                {userRole.canManage && (
                  <button
                    onClick={() => setShowAddRoleModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-cyan-400 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Assign Role
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {roles.map((r) => (
                  <div key={r.userId} className="p-3.5 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={r.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{r.fullName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase">
                            {r.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">@{r.username}</p>
                      </div>
                    </div>

                    {userRole.canManage && r.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveRole(r.userId)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> Executive Page Analytics
                </h3>
                <span className="text-xs text-slate-400">Real-time engagement telemetry</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total Followers</p>
                  <p className="text-xl font-black text-white mt-1">{analytics.followersCount}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Page Views</p>
                  <p className="text-xl font-black text-cyan-400 mt-1">{analytics.viewsCount}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Posts Published</p>
                  <p className="text-xl font-black text-purple-400 mt-1">{analytics.postsCount}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Estimated Reach</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{analytics.reachRate}</p>
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Engagement Score</p>
                  <p className="text-xs text-slate-400 mt-0.5">Calculated from visitor traffic, follows, and interactions</p>
                </div>
                <span className="text-2xl font-black text-amber-400">{analytics.engagementScore} pts</span>
              </div>
            </div>
          )}

          {/* TAB 6: MESSAGING INBOX */}
          {activeTab === 'messages' && (
            <div className="glass-card rounded-2xl border border-white/10 p-4 flex flex-col h-96">
              <div className="pb-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Direct Messenger with {page.name}</span>
                <span className="text-[10px] text-slate-400">Encrypted & Instant</span>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    No messages in this thread yet. Send a note to start communicating!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isPageSender = m.senderType === 'page';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isPageSender ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                            isPageSender
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                              : 'bg-white/10 text-white border border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mb-1">
                            <span className="font-bold">{isPageSender ? page.name : m.fullName || 'User'}</span>
                            <span>•</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p>{m.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="pt-2 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Send message as ${userRole.canManage ? page.name : 'yourself'}...`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={submittingMessage || !newMessage.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50 hover:bg-cyan-400"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Add Role Modal */}
        {showAddRoleModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-400" /> Assign Page Role
                </h3>
                <button onClick={() => setShowAddRoleModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300">Username</label>
                  <input
                    type="text"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    placeholder="e.g. sophia_ai"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300">Role Designation</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="admin">Admin (Full management)</option>
                    <option value="moderator">Moderator (Comments & Messaging)</option>
                    <option value="editor">Editor (Publishing & Videos)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={!targetUsername.trim()}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black cursor-pointer disabled:opacity-50 hover:bg-cyan-400"
                >
                  Save Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

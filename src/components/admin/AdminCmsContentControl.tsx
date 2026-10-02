import React, { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  Heart,
  Search,
  Trash2,
  Filter,
  RefreshCw,
  XCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PostItem {
  id: string;
  userId: string;
  username: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  type: string;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
}

interface CommentItem {
  id: string;
  postId: string;
  userId: string;
  username: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  reactionsCount: number;
  createdAt: string;
}

interface ReactionBreakdown {
  type: string;
  count: number;
}

interface RecentReaction {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userName: string;
  type: string;
  createdAt: string;
}

export const AdminCmsContentControl: React.FC = () => {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'comments' | 'reactions'>('posts');

  // Posts state with pagination
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postSearch, setPostSearch] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsLimit] = useState(25);

  // Comments state with pagination
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentSearch, setCommentSearch] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsLimit] = useState(25);

  // Reactions state
  const [breakdown, setBreakdown] = useState<ReactionBreakdown[]>([]);
  const [recentReactions, setRecentReactions] = useState<RecentReaction[]>([]);
  const [reactionsLoading, setReactionsLoading] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    type: 'post' | 'comment';
    id: string;
    preview: string;
  } | null>(null);

  const fetchPosts = async () => {
    if (!token) return;
    setPostsLoading(true);
    try {
      const q = new URLSearchParams();
      if (postSearch) q.set('search', postSearch);
      if (postTypeFilter) q.set('type', postTypeFilter);
      q.set('page', postsPage.toString());
      q.set('limit', postsLimit.toString());

      const res = await fetch(`/api/admin/content/posts?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setPostsTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!token) return;
    setCommentsLoading(true);
    try {
      const q = new URLSearchParams();
      if (commentSearch) q.set('search', commentSearch);
      q.set('page', commentsPage.toString());
      q.set('limit', commentsLimit.toString());

      const res = await fetch(`/api/admin/content/comments?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setCommentsTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchReactions = async () => {
    if (!token) return;
    setReactionsLoading(true);
    try {
      const res = await fetch('/api/admin/content/reactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBreakdown(data.breakdown || []);
        setRecentReactions(data.recent || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReactionsLoading(false);
    }
  };

  // Reset page index on filters
  useEffect(() => {
    setPostsPage(1);
  }, [postSearch, postTypeFilter]);

  useEffect(() => {
    setCommentsPage(1);
  }, [commentSearch]);

  // Fetch triggers
  useEffect(() => {
    if (activeSubTab === 'posts') fetchPosts();
  }, [token, activeSubTab, postsPage, postSearch, postTypeFilter]);

  useEffect(() => {
    if (activeSubTab === 'comments') fetchComments();
  }, [token, activeSubTab, commentsPage, commentSearch]);

  useEffect(() => {
    if (activeSubTab === 'reactions') fetchReactions();
  }, [token, activeSubTab]);

  const confirmDeletePost = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/content/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteModal(null);
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteComment = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/content/comments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteModal(null);
        fetchComments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReaction = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/content/reactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchReactions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between glass-card p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('posts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'posts'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-black'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Posts CMS</span>
          </button>

          <button
            onClick={() => setActiveSubTab('comments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'comments'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 font-black'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments CMS</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'reactions'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 font-black'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Reactions Analytics</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (activeSubTab === 'posts') fetchPosts();
            else if (activeSubTab === 'comments') fetchComments();
            else fetchReactions();
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* POSTS CMS VIEW */}
      {activeSubTab === 'posts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 glass-card p-3 rounded-2xl border border-white/10">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search post content or author..."
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
              />
            </div>
            <select
              value={postTypeFilter}
              onChange={(e) => setPostTypeFilter(e.target.value)}
              className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 w-full sm:w-auto"
            >
              <option value="">All Types</option>
              <option value="text">Text Posts</option>
              <option value="image">Image Posts</option>
              <option value="video">Video Posts</option>
              <option value="poll">Polls</option>
            </select>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white/10 overflow-x-auto">
            {postsLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Loading posts...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No posts found.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-bold">
                    <th className="pb-3 px-3">Author</th>
                    <th className="pb-3 px-3">Type</th>
                    <th className="pb-3 px-3">Content Preview</th>
                    <th className="pb-3 px-3">Engagement</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {posts.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 flex items-center gap-2">
                        <img src={p.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} className="w-7 h-7 rounded-full object-cover" alt="" />
                        <div>
                          <p className="font-bold text-white">{p.authorName}</p>
                          <p className="text-[10px] text-slate-400">@{p.username}</p>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase">
                          {p.type}
                        </span>
                      </td>

                      <td className="py-3 px-3 max-w-xs truncate text-slate-300">
                        {p.content || '(Media / Poll content)'}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        ❤️ {p.likesCount} • 💬 {p.commentsCount} • 🔁 {p.sharesCount}
                      </td>

                      <td className="py-3 px-3 text-[10px] text-slate-400 font-mono">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setDeleteModal({ type: 'post', id: p.id, preview: p.content || p.id })}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                          title="Purge Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Posts Pagination Footer */}
            {!postsLoading && postsTotal > postsLimit && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <div className="text-xs text-slate-400">
                  Showing <span className="font-semibold text-white">{Math.min(postsTotal, (postsPage - 1) * postsLimit + 1)}</span> to{' '}
                  <span className="font-semibold text-white">{Math.min(postsTotal, postsPage * postsLimit)}</span> of{' '}
                  <span className="font-semibold text-white">{postsTotal}</span> posts
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPostsPage((p) => Math.max(1, p - 1))}
                    disabled={postsPage === 1}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none ${
                      postsPage === 1
                        ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/25 border-white/10 text-white hover:shadow-lg hover:shadow-cyan-500/10 active:scale-95 cursor-pointer'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="text-xs text-slate-300 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-white/5 font-medium font-mono">
                    Page {postsPage} of {Math.ceil(postsTotal / postsLimit)}
                  </div>
                  <button
                    onClick={() => setPostsPage((p) => Math.min(Math.ceil(postsTotal / postsLimit), p + 1))}
                    disabled={postsPage >= Math.ceil(postsTotal / postsLimit)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none ${
                      postsPage >= Math.ceil(postsTotal / postsLimit)
                        ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/25 border-white/10 text-white hover:shadow-lg hover:shadow-cyan-500/10 active:scale-95 cursor-pointer'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMENTS CMS VIEW */}
      {activeSubTab === 'comments' && (
        <div className="space-y-4">
          <div className="glass-card p-3 rounded-2xl border border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search comments or author..."
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white/10 overflow-x-auto">
            {commentsLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                <span>Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No comments found.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-bold">
                    <th className="pb-3 px-3">Comment Author</th>
                    <th className="pb-3 px-3">Content</th>
                    <th className="pb-3 px-3">Target Post</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {comments.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 flex items-center gap-2">
                        <img src={c.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} className="w-7 h-7 rounded-full object-cover" alt="" />
                        <div>
                          <p className="font-bold text-white">{c.authorName}</p>
                          <p className="text-[10px] text-slate-400">@{c.username}</p>
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-sm font-semibold text-slate-200">
                        {c.content}
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-cyan-300">
                        {c.postId}
                      </td>

                      <td className="py-3 px-3 text-[10px] text-slate-400 font-mono">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setDeleteModal({ type: 'comment', id: c.id, preview: c.content })}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Comments Pagination Footer */}
            {!commentsLoading && commentsTotal > commentsLimit && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <div className="text-xs text-slate-400">
                  Showing <span className="font-semibold text-white">{Math.min(commentsTotal, (commentsPage - 1) * commentsLimit + 1)}</span> to{' '}
                  <span className="font-semibold text-white">{Math.min(commentsTotal, commentsPage * commentsLimit)}</span> of{' '}
                  <span className="font-semibold text-white">{commentsTotal}</span> comments
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCommentsPage((p) => Math.max(1, p - 1))}
                    disabled={commentsPage === 1}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none ${
                      commentsPage === 1
                        ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/25 border-white/10 text-white hover:shadow-lg hover:shadow-purple-500/10 active:scale-95 cursor-pointer'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="text-xs text-slate-300 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-white/5 font-medium font-mono">
                    Page {commentsPage} of {Math.ceil(commentsTotal / commentsLimit)}
                  </div>
                  <button
                    onClick={() => setCommentsPage((p) => Math.min(Math.ceil(commentsTotal / commentsLimit), p + 1))}
                    disabled={commentsPage >= Math.ceil(commentsTotal / commentsLimit)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none ${
                      commentsPage >= Math.ceil(commentsTotal / commentsLimit)
                        ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/25 border-white/10 text-white hover:shadow-lg hover:shadow-purple-500/10 active:scale-95 cursor-pointer'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REACTIONS ANALYTICS VIEW */}
      {activeSubTab === 'reactions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {breakdown.map((b) => (
              <div key={b.type} className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 capitalize">{b.type} Reactions</p>
                  <p className="font-display font-extrabold text-xl text-amber-300 mt-1">{b.count.toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                  <Heart className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white/10 overflow-x-auto">
            <h3 className="font-display font-extrabold text-white text-sm mb-3">Recent 3D Reaction Audit Trail</h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold">
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Reaction Type</th>
                  <th className="pb-3 px-3">Target Post</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {recentReactions.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {r.userName} <span className="text-[10px] text-slate-400 font-normal">(@{r.username})</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300 capitalize flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{r.type}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-cyan-300">{r.postId}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteReaction(r.id)}
                        className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                        title="Remove Reaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-rose-500/30 bg-slate-900/90 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-extrabold text-white text-base text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>Confirm Content Removal</span>
              </h3>
              <button onClick={() => setDeleteModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete this {deleteModal.type}?
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 italic max-h-24 overflow-y-auto">
              "{deleteModal.preview}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteModal.type === 'post') confirmDeletePost(deleteModal.id);
                  else confirmDeleteComment(deleteModal.id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs cursor-pointer shadow-lg shadow-rose-500/20"
              >
                Purge Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

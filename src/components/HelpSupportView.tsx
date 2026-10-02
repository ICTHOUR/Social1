import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../design-system/ToastContext';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassInput } from '../design-system/components/GlassInput';
import { UserReportStatusCenter } from './UserReportStatusCenter';
import { LiveSupportChatModal } from './LiveSupportChatModal';
import {
  HelpCircle,
  MessageSquare,
  Send,
  LifeBuoy,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  PlusCircle,
  Flag,
  Search,
  Headphones,
  Paperclip,
  Eye,
  Shield,
  CreditCard,
  Coins,
  ArrowUpRight,
  UserCheck,
  Tag
} from 'lucide-react';

interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords?: string;
  views: number;
}

interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  type?: string;
  subject: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'waiting' | 'resolved' | 'closed';
  assigned_to?: string | null;
  assigned_agent_name?: string | null;
  attachment?: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin' | 'support_agent';
  message: string;
  attachment?: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  all: { label: 'All Topics', icon: HelpCircle, color: 'text-cyan-400' },
  account: { label: 'Account Help', icon: UserCheck, color: 'text-blue-400' },
  payment: { label: 'Payment Help', icon: CreditCard, color: 'text-emerald-400' },
  coin: { label: 'Coin Help', icon: Coins, color: 'text-amber-400' },
  withdrawal: { label: 'Withdrawal Help', icon: ArrowUpRight, color: 'text-purple-400' },
  report: { label: 'Report Help', icon: Flag, color: 'text-rose-400' },
  security: { label: 'Security Help', icon: Shield, color: 'text-indigo-400' },
};

export const HelpSupportView: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'articles' | 'tickets' | 'create'>('articles');
  const [showReportsCenter, setShowReportsCenter] = useState(false);
  const [showLiveChatModal, setShowLiveChatModal] = useState(false);

  // Searchable Articles State
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [showReplyAttachment, setShowReplyAttachment] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Create Ticket Form state
  const [category, setCategory] = useState<string>('account');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [attachment, setAttachment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchArticles = async () => {
    setIsLoadingArticles(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') queryParams.append('category', selectedCategory);
      if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());

      const res = await fetch(`/api/help/articles?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  const fetchTickets = async () => {
    if (!token) return;
    setIsLoadingTickets(true);
    try {
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setTicketMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'articles') {
      fetchArticles();
    }
  }, [activeTab, selectedCategory, searchQuery]);

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetails(selectedTicketId);
    }
  }, [selectedTicketId, token]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          attachment: attachment.trim() || null,
        }),
      });

      if (res.ok) {
        addToast('Support ticket created successfully!', 'success');
        setSubject('');
        setDescription('');
        setAttachment('');
        setActiveTab('tickets');
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to submit ticket', 'error');
      }
    } catch (e) {
      addToast('Network error submitting support request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedTicketId || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: replyText.trim(),
          attachment: replyAttachment.trim() || null,
        }),
      });

      if (res.ok) {
        setReplyText('');
        setReplyAttachment('');
        setShowReplyAttachment(false);
        fetchTicketDetails(selectedTicketId);
        addToast('Message sent to support team', 'info');
      }
    } catch (e) {
      addToast('Failed to send reply', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <GlassCard variant="surface" className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-cyan-400" />
              <span>Nixo Knowledge Base & Support Center</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Search help articles, launch live support chat, submit tickets, or check moderation reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLiveChatModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <Headphones className="w-4 h-4 animate-bounce" />
              <span>Live Support Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('articles')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'articles'
                  ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-black/5 dark:bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Help Articles
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tickets'
                  ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-black/5 dark:bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              My Tickets
            </button>
            <button
              onClick={() => setShowReportsCenter(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>My Reports Status</span>
            </button>
            <GlassButton
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle size={15} />}
              onClick={() => setActiveTab('create')}
            >
              New Ticket
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      <UserReportStatusCenter
        isOpen={showReportsCenter}
        onClose={() => setShowReportsCenter(false)}
      />

      <LiveSupportChatModal
        isOpen={showLiveChatModal}
        onClose={() => setShowLiveChatModal(false)}
      />

      {/* SEARCHABLE HELP ARTICLES TAB */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          {/* Search Bar & Category Pills */}
          <GlassCard variant="surface" className="p-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search help articles (e.g. bKash, withdraw coins, password, 2FA, reports)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* Category selector pills */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_MAP).map(([catKey, catMeta]) => {
                const Icon = catMeta.icon;
                const isSelected = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-black/5 dark:bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : catMeta.color}`} />
                    <span>{catMeta.label}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Articles list */}
          <GlassCard variant="surface" className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Frequently Asked Knowledge Base Articles ({articles.length})</span>
              </span>
            </h2>

            {isLoadingArticles ? (
              <p className="text-xs text-slate-400 py-8 text-center">Loading help articles...</p>
            ) : articles.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">No articles found matching your query.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((art) => {
                  const isOpen = expandedArticleId === art.id;
                  const catMeta = CATEGORY_MAP[art.category] || CATEGORY_MAP.all;
                  const Icon = catMeta.icon;

                  return (
                    <div
                      key={art.id}
                      className="rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setExpandedArticleId(isOpen ? null : art.id)}
                        className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-cyan-400 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-black/10 dark:bg-white/10 shrink-0">
                            <Icon className={`w-4 h-4 ${catMeta.color}`} />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{art.title}</p>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {catMeta.label} • {art.views} views
                            </span>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-black/5 dark:border-white/5 pt-4 bg-black/5 dark:bg-black/20 space-y-3">
                          <p className="whitespace-pre-wrap">{art.content}</p>
                          {art.keywords && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                              <Tag size={12} className="text-cyan-400" />
                              <span>Keywords: {art.keywords}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* CREATE TICKET TAB */}
      {activeTab === 'create' && (
        <GlassCard variant="surface" className="p-6">
          <form onSubmit={handleCreateTicket} className="space-y-4 max-w-xl">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-black/5 dark:border-white/10 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Submit Support Ticket / Ban Appeal</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ticket Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="account">Account & Login Help</option>
                  <option value="payment">Payment & Deposit Inquiry</option>
                  <option value="coin">Nixo Coins & 3D Gifts</option>
                  <option value="withdrawal">Withdrawal / Cashout Request</option>
                  <option value="report">Report Help & Ban Appeals</option>
                  <option value="security">Security & Privacy Help</option>
                  <option value="general">General Support</option>
                  <option value="bug">Bug / Technical Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <GlassInput
              label="Subject / Short Summary"
              placeholder="e.g. bKash cashout transaction delay / restriction appeal"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Explanation
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
                placeholder="Describe your issue or appeal rationale with relevant context..."
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-800 dark:text-white outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <GlassInput
              label="Attachment URL (Image Screenshot / Receipt Link)"
              placeholder="https://... URL link to screenshot or transaction statement"
              value={attachment}
              onChange={(e) => setAttachment(e.target.value)}
            />

            <GlassButton variant="primary" size="md" type="submit" loading={isSubmitting}>
              Submit Ticket to Support Team
            </GlassButton>
          </form>
        </GlassCard>
      )}

      {/* TICKETS LIST & CHAT TAB */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ticket list */}
          <GlassCard variant="surface" className="p-4 md:col-span-1 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Support Tickets</h3>

            {isLoadingTickets ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No support tickets submitted yet</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/10'
                          : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-slate-300">
                          {t.category || t.type || 'general'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            t.status === 'open'
                              ? 'bg-amber-500/20 text-amber-400'
                              : t.status === 'assigned'
                              ? 'bg-blue-500/20 text-blue-400'
                              : t.status === 'waiting'
                              ? 'bg-purple-500/20 text-purple-400'
                              : t.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Updated {new Date(t.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Ticket Detail / Thread */}
          <GlassCard variant="surface" className="p-4 md:col-span-2 space-y-4 flex flex-col justify-between min-h-[420px]">
            {selectedTicket ? (
              <>
                <div className="space-y-3 pb-3 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400">{selectedTicket.category || selectedTicket.type} Ticket</span>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h2>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl uppercase ${
                        selectedTicket.status === 'open'
                          ? 'bg-amber-500/20 text-amber-400'
                          : selectedTicket.status === 'assigned'
                          ? 'bg-blue-500/20 text-blue-400'
                          : selectedTicket.status === 'waiting'
                          ? 'bg-purple-500/20 text-purple-400'
                          : selectedTicket.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      Status: {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto space-y-3 my-2 max-h-80 pr-1">
                  {ticketMessages.map((m) => {
                    const isAdmin = m.sender_role === 'admin' || m.sender_role === 'support_agent';
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 ${isAdmin ? 'justify-start' : 'justify-end'}`}
                      >
                        {isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-[10px] text-slate-950 shrink-0">
                            SUP
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                            isAdmin
                              ? 'bg-cyan-500/15 border border-cyan-500/30 text-slate-100'
                              : 'bg-purple-600/20 border border-purple-500/30 text-slate-100'
                          }`}
                        >
                          <div className="text-[10px] text-slate-400 mb-1 font-semibold flex justify-between gap-4">
                            <span>{isAdmin ? (m.sender_name || 'Support Agent') : 'You'}</span>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>

                          {m.attachment && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <a
                                href={m.attachment}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-cyan-300 hover:underline flex items-center gap-1"
                              >
                                <Paperclip size={12} />
                                <span>Attachment link</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10">
                  {showReplyAttachment && (
                    <GlassInput
                      placeholder="Paste attachment URL..."
                      value={replyAttachment}
                      onChange={(e) => setReplyAttachment(e.target.value)}
                    />
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReplyAttachment(!showReplyAttachment)}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Paperclip size={15} />
                    </button>
                    <GlassInput
                      placeholder="Type reply to support team..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <GlassButton type="submit" variant="primary" size="sm" loading={isSendingReply}>
                      Send
                    </GlassButton>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-12">
                <MessageSquare className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-xs font-semibold">Select a support ticket on the left to view response thread</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../design-system/ToastContext';
import { GlassCard } from '../../design-system/components/GlassCard';
import { GlassButton } from '../../design-system/components/GlassButton';
import { GlassInput } from '../../design-system/components/GlassInput';
import { getSocket } from '../../services/socket';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
  Headphones,
  Search,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  RotateCcw,
  Bot,
  Sparkles,
  ShieldAlert,
  BarChart2,
  Tag,
  HelpCircle,
  FileText
} from 'lucide-react';

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
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  attachment?: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportChat {
  id: string;
  user_id: string;
  assigned_agent_id?: string | null;
  assigned_agent_name?: string | null;
  user_name?: string;
  user_username?: string;
  user_avatar?: string;
  subject?: string | null;
  category: string;
  status: 'waiting' | 'active' | 'closed';
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  created_at: string;
}

interface SupportChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: 'user' | 'agent' | 'system';
  message: string;
  attachment?: string | null;
  is_read: number;
  created_at: string;
  sender_name?: string;
}

interface SupportAgent {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords?: string;
  views: number;
}

export const AdminSupportCenter: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'live_chats' | 'tickets' | 'articles'>('live_chats');

  // Metrics
  const [metrics, setMetrics] = useState<{
    tickets: { open: number; assigned: number; waiting: number; resolved: number; closed: number; total: number };
    chats: { waiting: number; active: number; closed: number; total: number };
    avgResponseTimeSec: number;
  } | null>(null);

  // Live Support Chat Console State
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [chatMessages, setChatMessages] = useState<SupportChatMessage[]>([]);
  const [chatInputMessage, setChatInputMessage] = useState('');
  const [chatAttachment, setChatAttachment] = useState('');
  const [showChatAttachment, setShowChatAttachment] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [chatStatusFilter, setChatStatusFilter] = useState<string>('all');
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [transferTargetAgent, setTransferTargetAgent] = useState<string>('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [ticketReplyAttachment, setTicketReplyAttachment] = useState('');

  // Articles State
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [articleCategory, setArticleCategory] = useState<string>('all');
  const [showCreateArticleModal, setShowCreateArticleModal] = useState(false);
  const [newArtCategory, setNewArtCategory] = useState('account');
  const [newArtTitle, setNewArtTitle] = useState('');
  const [newArtContent, setNewArtContent] = useState('');
  const [newArtKeywords, setNewArtKeywords] = useState('');

  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMetrics = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/support/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMetrics((await res.json()).metrics);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/support/chats?status=${chatStatusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setChats((await res.json()).chats || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChatMessages = async (chatId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/support/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedChat(data.chat);
        setChatMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTickets = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/support/tickets?status=${ticketStatusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTickets((await res.json()).tickets || []);
    } catch (e) {
      console.error(e);
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

  const fetchAgents = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/support/agents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAgents((await res.json()).agents || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchArticles = async () => {
    try {
      const res = await fetch(`/api/help/articles?category=${articleCategory}`);
      if (res.ok) setArticles((await res.json()).articles || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchAgents();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'live_chats') fetchChats();
    if (activeTab === 'tickets') fetchTickets();
    if (activeTab === 'articles') fetchArticles();
  }, [activeTab, chatStatusFilter, ticketStatusFilter, articleCategory, token]);

  useEffect(() => {
    if (selectedChatId) fetchChatMessages(selectedChatId);
  }, [selectedChatId, token]);

  useEffect(() => {
    if (selectedTicketId) fetchTicketDetails(selectedTicketId);
  }, [selectedTicketId, token]);

  // Socket setup for real-time support chat stream
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket(token, user.id);

    // Listen to all new waiting chats
    socket.on('new_waiting_chat', (data: any) => {
      addToast(`🚨 New Live Support Chat Request: ${data.userName} - ${data.subject}`, 'info');
      fetchChats();
      fetchMetrics();
    });

    if (selectedChatId) {
      socket.emit('support_join_chat', selectedChatId);

      const handleMsg = (msg: any) => {
        if (msg.chatId === selectedChatId) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [
              ...prev,
              {
                id: msg.id,
                chat_id: msg.chatId,
                sender_id: msg.senderId,
                sender_role: msg.senderRole,
                message: msg.message,
                attachment: msg.attachment,
                is_read: msg.isRead || 0,
                created_at: msg.createdAt,
              },
            ];
          });
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      };

      const handleUserTyping = (data: any) => {
        if (data.chatId === selectedChatId && data.userId !== user.id) {
          setIsUserTyping(true);
        }
      };

      const handleUserStopTyping = (data: any) => {
        if (data.chatId === selectedChatId) {
          setIsUserTyping(false);
        }
      };

      socket.on('support_message_received', handleMsg);
      socket.on('support_user_typing', handleUserTyping);
      socket.on('support_user_stop_typing', handleUserStopTyping);

      return () => {
        socket.emit('support_leave_chat', selectedChatId);
        socket.off('support_message_received', handleMsg);
        socket.off('support_user_typing', handleUserTyping);
        socket.off('support_user_stop_typing', handleUserStopTyping);
      };
    }

    return () => {
      socket.off('new_waiting_chat');
    };
  }, [selectedChatId, token, user]);

  const handleAcceptChat = async (chatId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/support/chat/${chatId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('Accepted live chat session!', 'success');
        setSelectedChatId(chatId);
        fetchChats();
        fetchMetrics();
      }
    } catch (e) {
      addToast('Failed to accept chat', 'error');
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedChatId || !chatInputMessage.trim()) return;

    const msgText = chatInputMessage.trim();
    const attach = chatAttachment.trim() || null;
    setChatInputMessage('');
    setChatAttachment('');
    setShowChatAttachment(false);

    try {
      const res = await fetch(`/api/support/chat/${selectedChatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msgText, attachment: attach }),
      });

      if (!res.ok) {
        addToast('Failed to send message', 'error');
      }
    } catch (e) {
      addToast('Error sending chat message', 'error');
    }
  };

  const handleTransferChat = async () => {
    if (!token || !selectedChatId || !transferTargetAgent) return;
    try {
      const res = await fetch(`/api/admin/support/chat/${selectedChatId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetAgentId: transferTargetAgent }),
      });

      if (res.ok) {
        addToast('Chat session transferred', 'success');
        setShowTransferModal(false);
        fetchChats();
        fetchChatMessages(selectedChatId);
      }
    } catch (e) {
      addToast('Failed to transfer chat', 'error');
    }
  };

  const handleToggleChatStatus = async (chatId: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/support/chat/${chatId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        addToast(`Chat status set to ${status}`, 'info');
        fetchChats();
        fetchChatMessages(chatId);
        fetchMetrics();
      }
    } catch (e) {
      addToast('Failed to update status', 'error');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string, assignedTo?: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, assignedTo }),
      });

      if (res.ok) {
        addToast('Support ticket updated', 'success');
        fetchTickets();
        fetchTicketDetails(ticketId);
        fetchMetrics();
      }
    } catch (e) {
      addToast('Failed to update ticket', 'error');
    }
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedTicketId || !ticketReplyText.trim()) return;

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: ticketReplyText.trim(),
          attachment: ticketReplyAttachment.trim() || null,
        }),
      });

      if (res.ok) {
        setTicketReplyText('');
        setTicketReplyAttachment('');
        fetchTicketDetails(selectedTicketId);
        fetchTickets();
        addToast('Reply sent to user', 'success');
      }
    } catch (e) {
      addToast('Error sending ticket reply', 'error');
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newArtTitle.trim() || !newArtContent.trim()) return;

    try {
      const res = await fetch('/api/admin/help/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: newArtCategory,
          title: newArtTitle.trim(),
          content: newArtContent.trim(),
          keywords: newArtKeywords.trim(),
        }),
      });

      if (res.ok) {
        addToast('Help article created successfully!', 'success');
        setShowCreateArticleModal(false);
        setNewArtTitle('');
        setNewArtContent('');
        setNewArtKeywords('');
        fetchArticles();
      }
    } catch (e) {
      addToast('Failed to create article', 'error');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!token || !confirm('Are you sure you want to delete this help article?')) return;
    try {
      const res = await fetch(`/api/admin/help/articles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('Article deleted', 'info');
        fetchArticles();
      }
    } catch (e) {
      addToast('Failed to delete article', 'error');
    }
  };

  const formatRespTime = (sec: number) => {
    if (!sec || sec <= 0) return 'Immediate (< 5s)';
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard variant="surface" className="p-4 border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Waiting Live Chats</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </div>
          <p className="text-2xl font-black text-amber-300 mt-1">{metrics?.chats?.waiting || 0}</p>
          <span className="text-[10px] text-slate-400">Queue time: {formatRespTime(metrics?.avgResponseTimeSec || 0)}</span>
        </GlassCard>

        <GlassCard variant="surface" className="p-4 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Active Live Sessions</span>
            <Headphones className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300 mt-1">{metrics?.chats?.active || 0}</p>
          <span className="text-[10px] text-slate-400">Total served: {metrics?.chats?.total || 0}</span>
        </GlassCard>

        <GlassCard variant="surface" className="p-4 border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Open Tickets</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-300 mt-1">{metrics?.tickets?.open || 0}</p>
          <span className="text-[10px] text-slate-400">Assigned: {metrics?.tickets?.assigned || 0}</span>
        </GlassCard>

        <GlassCard variant="surface" className="p-4 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Resolved Tickets</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 mt-1">{metrics?.tickets?.resolved || 0}</p>
          <span className="text-[10px] text-slate-400">Avg response: {formatRespTime(metrics?.avgResponseTimeSec || 0)}</span>
        </GlassCard>
      </div>

      {/* Main Support Header & Navigation Tabs */}
      <GlassCard variant="surface" className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Help Center & Live Agent Console</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Support Role Access
              </span>
            </h2>
            <p className="text-xs text-slate-400">Manage live support chat streams, support tickets, and knowledge base articles.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('live_chats')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'live_chats'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Live Support Chats ({chats.length})
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Support Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'articles'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Help Articles ({articles.length})
          </button>
        </div>
      </GlassCard>

      {/* 1. LIVE SUPPORT CHATS TAB */}
      {activeTab === 'live_chats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chats Queue */}
          <GlassCard variant="surface" className="p-4 space-y-3 md:col-span-1">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-bold uppercase text-slate-400">Live Chat Sessions</h3>
              <select
                value={chatStatusFilter}
                onChange={(e) => setChatStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-[11px] text-white outline-none"
              >
                <option value="all">All Chats</option>
                <option value="waiting">Waiting Queue</option>
                <option value="active">Active Sessions</option>
                <option value="closed">Closed Sessions</option>
              </select>
            </div>

            {chats.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No live chats found</p>
            ) : (
              <div className="space-y-2">
                {chats.map((c) => {
                  const isSelected = selectedChatId === c.id;
                  const isWaiting = c.status === 'waiting';

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedChatId(c.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/10'
                          : isWaiting
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : 'border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{c.user_name || c.user_username || 'User'}</span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isWaiting
                              ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                              : c.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-300 truncate">{c.subject}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.last_message || 'Inquiry started'}</p>

                      {isWaiting && (
                        <GlassButton
                          variant="primary"
                          size="sm"
                          className="w-full mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptChat(c.id);
                          }}
                        >
                          Accept Chat
                        </GlassButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Active Chat Conversation Console */}
          <GlassCard variant="surface" className="p-4 md:col-span-2 flex flex-col justify-between min-h-[480px]">
            {selectedChat ? (
              <>
                {/* Chat Top Bar */}
                <div className="pb-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedChat.user_name || 'User Session'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({selectedChat.category})</span>
                    </h3>
                    <p className="text-xs text-cyan-300 font-semibold">{selectedChat.subject}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={13} />
                      <span>Transfer Agent</span>
                    </button>

                    {selectedChat.status !== 'closed' ? (
                      <button
                        onClick={() => handleToggleChatStatus(selectedChat.id, 'closed')}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                      >
                        Close Chat
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleChatStatus(selectedChat.id, 'active')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                      >
                        Reopen Chat
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto space-y-3 my-3 max-h-80 pr-1">
                  {chatMessages.map((m) => {
                    if (m.sender_role === 'system') {
                      return (
                        <div key={m.id} className="text-center my-2">
                          <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10 inline-block">
                            {m.message}
                          </span>
                        </div>
                      );
                    }

                    const isAgent = m.sender_role === 'agent';

                    return (
                      <div key={m.id} className={`flex gap-2.5 ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        {!isAgent && (
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                            USR
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                            isAgent
                              ? 'bg-cyan-500/20 border border-cyan-500/30 text-white rounded-br-none'
                              : 'bg-slate-800 border border-white/10 text-slate-100 rounded-bl-none'
                          }`}
                        >
                          <div className="text-[9px] text-slate-400 mb-1 flex justify-between gap-3 font-semibold">
                            <span>{isAgent ? 'You (Support Agent)' : m.sender_name || 'User'}</span>
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

                  {isUserTyping && (
                    <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-500/10 p-2 rounded-xl w-fit">
                      <Bot className="w-3.5 h-3.5 animate-bounce" />
                      <span className="text-[10px] font-semibold">User is typing...</span>
                    </div>
                  )}

                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Reply Form */}
                {selectedChat.status !== 'closed' ? (
                  <form onSubmit={handleSendChatMessage} className="space-y-2 pt-2 border-t border-white/10">
                    {showChatAttachment && (
                      <GlassInput
                        placeholder="Paste image/file URL attachment..."
                        value={chatAttachment}
                        onChange={(e) => setChatAttachment(e.target.value)}
                      />
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowChatAttachment(!showChatAttachment)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <Paperclip size={15} />
                      </button>

                      <GlassInput
                        placeholder="Type reply to user..."
                        value={chatInputMessage}
                        onChange={(e) => setChatInputMessage(e.target.value)}
                      />

                      <GlassButton type="submit" variant="primary" size="sm">
                        <Send size={14} />
                      </GlassButton>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-slate-900 border-t border-white/10 text-center text-xs text-slate-400">
                    This live chat session is closed.
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 space-y-2">
                <Headphones className="w-8 h-8 text-slate-500" />
                <p className="text-xs font-semibold">Select a live chat session from the left queue</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* 2. SUPPORT TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard variant="surface" className="p-4 space-y-3 md:col-span-1">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-bold uppercase text-slate-400">Support Tickets</h3>
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-[11px] text-white outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="waiting">Waiting User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {tickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No support tickets found</p>
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
                          : 'border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                          {t.category || t.type}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            t.status === 'open'
                              ? 'bg-amber-500/20 text-amber-300'
                              : t.status === 'assigned'
                              ? 'bg-blue-500/20 text-blue-300'
                              : t.status === 'waiting'
                              ? 'bg-purple-500/20 text-purple-300'
                              : t.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{t.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{t.user_name || t.user_email}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Ticket Detail Console */}
          <GlassCard variant="surface" className="p-4 md:col-span-2 flex flex-col justify-between min-h-[480px]">
            {selectedTicket ? (
              <>
                <div className="pb-3 border-b border-white/10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-cyan-400">{selectedTicket.category || selectedTicket.type} Ticket</span>
                      <h3 className="text-sm font-bold text-white">{selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-400">Submitted by: {selectedTicket.user_name} ({selectedTicket.user_email})</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                        className="bg-black/40 border border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 outline-none font-bold"
                      >
                        <option value="open">Status: Open</option>
                        <option value="assigned">Status: Assigned</option>
                        <option value="waiting">Status: Waiting User</option>
                        <option value="resolved">Status: Resolved</option>
                        <option value="closed">Status: Closed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto space-y-3 my-3 max-h-80 pr-1">
                  {ticketMessages.map((m) => {
                    const isAgent = m.sender_role === 'admin' || m.sender_role === 'support_agent';
                    return (
                      <div key={m.id} className={`flex gap-2.5 ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        {!isAgent && (
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                            USR
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                            isAgent
                              ? 'bg-cyan-500/20 border border-cyan-500/30 text-white rounded-br-none'
                              : 'bg-slate-800 border border-white/10 text-slate-100 rounded-bl-none'
                          }`}
                        >
                          <div className="text-[9px] text-slate-400 mb-1 flex justify-between gap-3 font-semibold">
                            <span>{isAgent ? (m.sender_name || 'Support Agent') : 'User'}</span>
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

                {/* Ticket reply form */}
                <form onSubmit={handleSendTicketReply} className="space-y-2 pt-2 border-t border-white/10">
                  <GlassInput
                    placeholder="Optional attachment URL..."
                    value={ticketReplyAttachment}
                    onChange={(e) => setTicketReplyAttachment(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <GlassInput
                      placeholder="Type reply to ticket..."
                      value={ticketReplyText}
                      onChange={(e) => setTicketReplyText(e.target.value)}
                    />
                    <GlassButton type="submit" variant="primary" size="sm">
                      Send Reply
                    </GlassButton>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 space-y-2">
                <FileText className="w-8 h-8 text-slate-500" />
                <p className="text-xs font-semibold">Select a support ticket from the left list</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* 3. HELP CENTER ARTICLES MANAGER TAB */}
      {activeTab === 'articles' && (
        <GlassCard variant="surface" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Knowledge Base Help Articles Manager</span>
            </h3>

            <GlassButton
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setShowCreateArticleModal(true)}
            >
              Add New Article
            </GlassButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((art) => (
              <div key={art.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {art.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{art.views} views</span>
                    <button
                      onClick={() => handleDeleteArticle(art.id)}
                      className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white">{art.title}</h4>
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{art.content}</p>

                {art.keywords && (
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-white/5">
                    Keywords: {art.keywords}
                  </p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Transfer Chat Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <GlassCard variant="surface" className="p-6 max-w-sm w-full space-y-4 border-purple-500/30">
            <h3 className="text-sm font-bold text-white">Transfer Chat to Support Agent</h3>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Select Support Agent</label>
              <select
                value={transferTargetAgent}
                onChange={(e) => setTransferTargetAgent(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value="">-- Choose Agent --</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.full_name || ag.username} ({ag.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <GlassButton variant="secondary" size="sm" onClick={() => setShowTransferModal(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="primary" size="sm" onClick={handleTransferChat}>
                Confirm Transfer
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Create Article Modal */}
      {showCreateArticleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <GlassCard variant="surface" className="p-6 max-w-lg w-full space-y-4 border-cyan-500/30">
            <h3 className="text-sm font-bold text-white">Create Knowledge Base Article</h3>

            <form onSubmit={handleCreateArticle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newArtCategory}
                  onChange={(e) => setNewArtCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white outline-none"
                >
                  <option value="account">Account Help</option>
                  <option value="payment">Payment Help</option>
                  <option value="coin">Coin Help</option>
                  <option value="withdrawal">Withdrawal Help</option>
                  <option value="report">Report Help</option>
                  <option value="security">Security Help</option>
                  <option value="general">General Help</option>
                </select>
              </div>

              <GlassInput
                label="Article Title"
                placeholder="e.g. How to resolve deposit delays"
                value={newArtTitle}
                onChange={(e) => setNewArtTitle(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Article Content</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Full article explanation..."
                  value={newArtContent}
                  onChange={(e) => setNewArtContent(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <GlassInput
                label="Keywords (comma separated)"
                placeholder="bkash, deposit, delay, payment"
                value={newArtKeywords}
                onChange={(e) => setNewArtKeywords(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <GlassButton variant="secondary" size="sm" type="button" onClick={() => setShowCreateArticleModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton variant="primary" size="sm" type="submit">
                  Publish Article
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

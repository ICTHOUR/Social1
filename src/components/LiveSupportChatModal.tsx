import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../design-system/ToastContext';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassInput } from '../design-system/components/GlassInput';
import { getSocket } from '../services/socket';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  Headphones,
  CheckCheck,
  Clock,
  Shield,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface SupportChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: 'user' | 'agent' | 'system';
  message: string;
  attachment?: string | null;
  is_read: number;
  read_at?: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

interface SupportChat {
  id: string;
  user_id: string;
  assigned_agent_id?: string | null;
  assigned_agent_name?: string | null;
  assigned_agent_avatar?: string | null;
  subject?: string | null;
  category: string;
  status: 'waiting' | 'active' | 'closed';
  created_at: string;
}

interface LiveSupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveSupportChatModal: React.FC<LiveSupportChatModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Form to start a new chat
  const [category, setCategory] = useState<string>('general');
  const [subject, setSubject] = useState<string>('');
  const [initialMessage, setInitialMessage] = useState<string>('');
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Live chat input
  const [inputMessage, setInputMessage] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Socket state
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchActiveChat = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/support/chat/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveChat(data.chat || null);
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActiveChat();
    }
  }, [isOpen, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAgentTyping]);

  // Socket listeners setup
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket(token, user.id);

    if (activeChat?.id) {
      socket.emit('support_join_chat', activeChat.id);

      const handleMessage = (msg: any) => {
        if (msg.chatId === activeChat.id) {
          setMessages((prev) => {
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
          scrollToBottom();
        }
      };

      const handleTyping = (data: any) => {
        if (data.chatId === activeChat.id && data.userId !== user.id) {
          setIsAgentTyping(true);
        }
      };

      const handleStopTyping = (data: any) => {
        if (data.chatId === activeChat.id) {
          setIsAgentTyping(false);
        }
      };

      const handleAccepted = (data: any) => {
        if (data.chatId === activeChat.id) {
          setActiveChat((prev) =>
            prev ? { ...prev, status: 'active', assigned_agent_name: data.assignedAgentName } : null
          );
          addToast(`Agent ${data.assignedAgentName} connected to your live chat!`, 'success');
        }
      };

      const handleStatusChange = (data: any) => {
        if (data.chatId === activeChat.id) {
          setActiveChat((prev) => (prev ? { ...prev, status: data.status } : null));
        }
      };

      const handleReadReceipt = (data: any) => {
        if (data.chatId === activeChat.id) {
          setMessages((prev) =>
            prev.map((m) => (m.sender_role === 'user' ? { ...m, is_read: 1, read_at: data.readAt } : m))
          );
        }
      };

      socket.on('support_message_received', handleMessage);
      socket.on('support_user_typing', handleTyping);
      socket.on('support_user_stop_typing', handleStopTyping);
      socket.on('chat_accepted', handleAccepted);
      socket.on('chat_status_changed', handleStatusChange);
      socket.on('support_messages_read', handleReadReceipt);

      return () => {
        socket.emit('support_leave_chat', activeChat.id);
        socket.off('support_message_received', handleMessage);
        socket.off('support_user_typing', handleTyping);
        socket.off('support_user_stop_typing', handleStopTyping);
        socket.off('chat_accepted', handleAccepted);
        socket.off('chat_status_changed', handleStatusChange);
        socket.off('support_messages_read', handleReadReceipt);
      };
    }
  }, [activeChat?.id, token, user]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !initialMessage.trim()) return;

    setIsStartingChat(true);
    try {
      const res = await fetch('/api/support/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          subject: subject.trim() || `${category.toUpperCase()} Inquiry`,
          initialMessage: initialMessage.trim(),
          attachment: attachmentUrl.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addToast('Connected to Live Support Queue', 'success');
        setInitialMessage('');
        setSubject('');
        setAttachmentUrl('');
        setShowAttachmentInput(false);
        fetchActiveChat();
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to start support session', 'error');
      }
    } catch (e) {
      addToast('Network error starting chat', 'error');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeChat || !inputMessage.trim() || isSending) return;

    setIsSending(true);
    const text = inputMessage.trim();
    const attach = attachmentUrl.trim() || null;
    setInputMessage('');
    setAttachmentUrl('');
    setShowAttachmentInput(false);

    try {
      const res = await fetch(`/api/support/chat/${activeChat.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          attachment: attach,
        }),
      });

      if (!res.ok) {
        addToast('Failed to deliver message', 'error');
      }
    } catch (e) {
      addToast('Error sending message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleTypingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (!activeChat || !token || !user) return;

    const socket = getSocket(token, user.id);
    socket.emit('support_typing_start', { chatId: activeChat.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('support_typing_stop', { chatId: activeChat.id });
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md shadow-2xl transition-all">
      <GlassCard variant="surface" className="overflow-hidden border-cyan-500/30 flex flex-col h-[520px]">
        {/* Header Bar */}
        <div className="p-3.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 flex items-center justify-center">
              <Headphones className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Nixo Support Live Chat</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {activeChat?.status === 'active'
                  ? `Agent ${activeChat.assigned_agent_name || 'Online'}`
                  : activeChat?.status === 'waiting'
                  ? 'Connecting to Support Agent...'
                  : 'Instant Agent Assistance'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50 dark:bg-slate-950/90">
            {/* If no active chat, show Start Live Chat form */}
            {!activeChat ? (
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Start Live Support Session</h4>
                  <p className="text-xs text-slate-400">
                    Speak directly with an online Nixo Support Agent for instant resolutions.
                  </p>
                </div>

                <form onSubmit={handleStartChat} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Inquiry Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="account">Account & Security Help</option>
                      <option value="payment">Payment & Deposit Issue</option>
                      <option value="coin">Nixo Coins & 3D Gifts</option>
                      <option value="withdrawal">Withdrawal / Cashout Status</option>
                      <option value="report">Content Report & Moderation</option>
                    </select>
                  </div>

                  <GlassInput
                    label="Subject Summary"
                    placeholder="e.g. bKash payment verification delay"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Your Message</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe what you need help with..."
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  {showAttachmentInput ? (
                    <div>
                      <GlassInput
                        label="Attachment Link / URL"
                        placeholder="https://... image or document link"
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAttachmentInput(true)}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Paperclip size={12} />
                      <span>Attach image screenshot or document link</span>
                    </button>
                  )}

                  <GlassButton type="submit" variant="primary" size="md" className="w-full" loading={isStartingChat}>
                    Connect to Agent
                  </GlassButton>
                </form>
              </div>
            ) : (
              <>
                {/* Status Header Banner */}
                <div className="p-2.5 px-4 bg-slate-900/80 border-b border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[200px]">Subject: {activeChat.subject}</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                      activeChat.status === 'waiting'
                        ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                        : activeChat.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {activeChat.status === 'waiting' ? 'In Queue' : activeChat.status}
                  </span>
                </div>

                {/* Messages feed */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {messages.map((m) => {
                    if (m.sender_role === 'system') {
                      return (
                        <div key={m.id} className="text-center my-2">
                          <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 inline-block">
                            {m.message}
                          </span>
                        </div>
                      );
                    }

                    const isUser = m.sender_role === 'user';

                    return (
                      <div key={m.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                          <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-[9px] text-slate-950 shrink-0">
                            SUP
                          </div>
                        )}
                        <div
                          className={`max-w-[82%] p-3 rounded-2xl text-xs ${
                            isUser
                              ? 'bg-purple-600/30 border border-purple-500/30 text-white rounded-br-none'
                              : 'bg-cyan-500/20 border border-cyan-500/30 text-slate-100 rounded-bl-none'
                          }`}
                        >
                          <div className="text-[9px] text-slate-400 mb-1 flex justify-between gap-3 font-semibold">
                            <span>{isUser ? 'You' : m.sender_name || 'Support Agent'}</span>
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
                                <Paperclip size={10} />
                                <span>View Attachment</span>
                              </a>
                            </div>
                          )}

                          {isUser && m.is_read === 1 && (
                            <div className="text-[8px] text-cyan-300 text-right mt-0.5 flex items-center justify-end gap-0.5">
                              <CheckCheck size={10} />
                              <span>Read</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isAgentTyping && (
                    <div className="flex gap-2 items-center text-xs text-cyan-400 bg-cyan-500/10 p-2 rounded-xl w-fit">
                      <Bot className="w-3.5 h-3.5 animate-bounce" />
                      <span className="text-[10px] font-semibold">Support agent is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input & Reply Area */}
                {activeChat.status !== 'closed' ? (
                  <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-white/10 space-y-2">
                    {showAttachmentInput && (
                      <div className="flex items-center gap-2">
                        <GlassInput
                          placeholder="Paste image/file URL attachment..."
                          value={attachmentUrl}
                          onChange={(e) => setAttachmentUrl(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAttachmentInput(false)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          showAttachmentInput
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                        }`}
                      >
                        <Paperclip size={15} />
                      </button>

                      <GlassInput
                        placeholder="Type message to agent..."
                        value={inputMessage}
                        onChange={handleTypingInputChange}
                      />

                      <GlassButton type="submit" variant="primary" size="sm" loading={isSending}>
                        <Send size={14} />
                      </GlassButton>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-slate-900 border-t border-white/10 text-center">
                    <p className="text-xs text-slate-400 mb-2">This live support session has ended.</p>
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveChat(null)}
                    >
                      Start New Inquiry
                    </GlassButton>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

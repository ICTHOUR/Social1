import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Coins,
  Mic,
  Paperclip,
  MessageSquare,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Search,
  Users,
  MoreVertical,
  Pin,
  Bell,
  BellOff,
  Archive,
  Ban,
  UserPlus,
  Smile,
  Film,
  Layers,
  CornerUpLeft,
  CornerUpRight,
  Edit2,
  Trash2,
  X,
  FileText,
  Download,
  Info,
  ChevronDown,
  Circle,
  ArrowLeft,
  Video,
  Phone,
} from 'lucide-react';
import { Conversation, Message, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { EmojiPicker } from './messenger/EmojiPicker';
import { StickerPicker } from './messenger/StickerPicker';
import { GifPicker } from './messenger/GifPicker';
import { VoiceRecorder } from './messenger/VoiceRecorder';
import { AudioWaveformPlayer } from './messenger/AudioWaveformPlayer';
import { CreateGroupModal } from './messenger/CreateGroupModal';
import { GroupInfoModal } from './messenger/GroupInfoModal';
import { ForwardMessageModal } from './messenger/ForwardMessageModal';
import { MediaLightbox } from './messenger/MediaLightbox';
import { NewChatModal } from './messenger/NewChatModal';
import { VoiceVideoCallModal } from './messenger/VoiceVideoCallModal';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '😢', '💎'];

export interface MessengerViewProps {
  initialPartnerId?: string;
  onGoBack?: () => void;
}

export const MessengerView: React.FC<MessengerViewProps> = ({ initialPartnerId, onGoBack }) => {
  const { user, token, refreshUser } = useAuth();
  const currentUserId = user?.id || 'user_elena';

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'archived'>('all');

  // Search inside active chat
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // userId -> name
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Presence map (userId -> { isOnline, lastSeen })
  const [presenceMap, setPresenceMap] = useState<Record<string, { isOnline: boolean; lastSeen: string | null }>>({});

  // Composer attachments & popovers
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    previewUrl: string;
    type: 'image' | 'video' | 'audio' | 'file';
  } | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [activePopover, setActivePopover] = useState<'emoji' | 'sticker' | 'gif' | null>(null);

  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [lightboxData, setLightboxData] = useState<{ url: string; type: 'image' | 'video'; title?: string } | null>(null);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState(100);

  // Quick reaction popup for a specific message
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [reactionMenuMessageId, setReactionMenuMessageId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize and register socket listeners
  useEffect(() => {
    const socket = getSocket(token, currentUserId);

    socket.on('new_message', (data: { conversationId: string; message: Message }) => {
      // If message is for current active conversation, add it
      if (data.conversationId === activeConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        // Acknowledge read if window is focused and sender isn't me
        if (data.message.senderId !== currentUserId) {
          socket.emit('mark_read', { conversationId: data.conversationId });
        }
      }

      // Update conversation list item lastMessage and unread count
      setConversations((prev) => {
        return prev.map((c) => {
          if (c.id === data.conversationId) {
            const isCurrentActive = data.conversationId === activeConversationId;
            return {
              ...c,
              lastMessage: data.message,
              unreadCount: isCurrentActive ? 0 : (c.unreadCount || 0) + (data.message.senderId !== currentUserId ? 1 : 0),
              updatedAt: data.message.createdAt,
            };
          }
          return c;
        });
      });
    });

    socket.on('message_edited', (data: { messageId: string; conversationId: string; content: string; isEdited: boolean; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, content: data.content, isEdited: true, editedAt: data.editedAt } : m))
      );
    });

    socket.on('message_unsent', (data: { messageId: string; conversationId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isUnsent: true, content: 'This message was unsent' } : m
        )
      );
    });

    socket.on('message_reaction_updated', (data: { messageId: string; conversationId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    });

    socket.on('messages_read', (data: { conversationId: string; readerId: string; readAt: string }) => {
      if (data.conversationId === activeConversationId && data.readerId !== currentUserId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentUserId ? { ...m, isRead: true, status: 'read' } : m))
        );
      }
    });

    socket.on('message_status_update', (data: { messageId: string; conversationId: string; status: 'sent' | 'delivered' | 'read' }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, status: data.status } : m))
      );
    });

    socket.on('user_typing', (data: { conversationId: string; userId: string; fullName: string }) => {
      if (data.conversationId === activeConversationId && data.userId !== currentUserId) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: data.fullName }));
      }
    });

    socket.on('user_stop_typing', (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    });

    socket.on('user_presence_change', (data: { userId: string; isOnline: boolean; lastSeen: string | null }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [data.userId]: { isOnline: data.isOnline, lastSeen: data.lastSeen },
      }));
    });

    socket.on('conversation_updated', () => {
      fetchConversations();
    });

    return () => {
      socket.off('new_message');
      socket.off('message_edited');
      socket.off('message_unsent');
      socket.off('message_reaction_updated');
      socket.off('messages_read');
      socket.off('message_status_update');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('user_presence_change');
      socket.off('conversation_updated');
    };
  }, [token, currentUserId, activeConversationId]);

  // Fetch all conversations
  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const convs: Conversation[] = data.conversations || [];
        setConversations(convs);

        // If initialPartnerId is passed, select or open that partner's conversation
        if (initialPartnerId) {
          const targetConv = convs.find((c) => c.partner?.id === initialPartnerId);
          if (targetConv) {
            setActiveConversationId(targetConv.id);
          } else if (convs.length > 0) {
            setActiveConversationId(convs[0].id);
          }
        } else if (!activeConversationId && convs.length > 0) {
          const firstNonArchived = convs.find((c) => !c.isArchived) || convs[0];
          setActiveConversationId(firstNonArchived.id);
        }

        // Query presence for all direct partners
        const directUserIds = convs
          .filter((c) => c.type === 'direct' && c.partner?.id)
          .map((c) => c.partner!.id);
        if (directUserIds.length > 0) {
          const socket = getSocket(token, currentUserId);
          socket.emit('get_presence', directUserIds, (presenceRes: any) => {
            if (presenceRes) setPresenceMap((prev) => ({ ...prev, ...presenceRes }));
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  // Fetch messages for active conversation
  const fetchActiveMessages = async (convId: string) => {
    if (!token || !convId) return;
    try {
      const res = await fetch(`/api/messages/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);

        // Mark read
        const socket = getSocket(token, currentUserId);
        socket.emit('join_conversation', convId);
        socket.emit('mark_read', { conversationId: convId });

        // Update local unread counter
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    if (activeConversationId) {
      fetchActiveMessages(activeConversationId);
      setTypingUsers({});
      setInChatSearchOpen(false);
      setInChatSearchQuery('');
      setReplyingTo(null);
      setEditingMessage(null);
      setSelectedAttachment(null);
    }
  }, [activeConversationId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Typing indicator trigger
  const handleInputChange = (text: string) => {
    setMessageInput(text);
    if (!activeConversationId) return;

    const socket = getSocket(token, currentUserId);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { conversationId: activeConversationId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing_stop', { conversationId: activeConversationId });
    }, 2000);
  };

  // Send message handler
  const handleSendMessage = async (customPayload?: Partial<any>) => {
    if (!token || !activeConversationId) return;

    // Check if editing existing message
    if (editingMessage) {
      try {
        const res = await fetch(`/api/messages/${editingMessage.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: messageInput.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === editingMessage.id ? data.message : m))
          );
          setEditingMessage(null);
          setMessageInput('');
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // Normal or attachment send
    let mediaUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let fileSize: number | undefined = undefined;
    let fileType: string | undefined = undefined;
    let messageType: any = 'text';

    if (selectedAttachment) {
      const formData = new FormData();
      formData.append('file', selectedAttachment.file);

      try {
        const uploadRes = await fetch('/api/messages/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const upData = await uploadRes.json();
          mediaUrl = upData.fileUrl;
          fileName = upData.fileName;
          fileSize = upData.fileSize;
          fileType = upData.fileType;
          messageType = selectedAttachment.type;
        }
      } catch (err) {
        console.error('File upload failed:', err);
        return;
      }
    }

    if (customPayload?.messageType) {
      messageType = customPayload.messageType;
      mediaUrl = customPayload.mediaUrl || mediaUrl;
    }

    const isImageAttachment = selectedAttachment?.type === 'image' || messageType === 'image';
    const payload = {
      conversationId: activeConversationId,
      content: messageInput.trim() || (isImageAttachment ? '' : (selectedAttachment ? fileName || 'Attachment' : '')),
      messageType,
      mediaUrl,
      fileName: isImageAttachment ? undefined : fileName,
      fileSize,
      fileType,
      coinAmount: customPayload?.coinAmount || 0,
      replyToId: replyingTo?.id || undefined,
      ...customPayload,
    };

    if (!payload.content && !payload.mediaUrl && !payload.coinAmount) return;

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setMessageInput('');
        setReplyingTo(null);
        setSelectedAttachment(null);
        setActivePopover(null);

        // Clear typing
        if (isTypingRef.current) {
          isTypingRef.current = false;
          getSocket(token, currentUserId).emit('typing_stop', { conversationId: activeConversationId });
        }

        if (customPayload?.coinAmount) {
          refreshUser();
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Handle voice note send
  const handleSendVoiceNote = async (audioBlob: Blob, durationSec: number) => {
    if (!token || !activeConversationId) return;

    const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioFile);

    try {
      const uploadRes = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (uploadRes.ok) {
        const upData = await uploadRes.json();
        await handleSendMessage({
          messageType: 'voice',
          mediaUrl: upData.fileUrl,
          content: `Voice message (${durationSec}s)`,
        });
        setShowVoiceRecorder(false);
      }
    } catch (err) {
      console.error('Failed to send voice message:', err);
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reaction: emoji }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
        setReactionMenuMessageId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Unsend message
  const handleUnsendMessage = async (messageId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/unsend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isUnsent: true, content: 'This message was unsent' } : m))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message (for me or everyone)
  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${messageId}?forEveryone=${forEveryone ? 'true' : 'false'}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (forEveryone) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, isUnsent: true, content: 'This message was deleted' } : m))
          );
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Pin / Mute / Archive
  const handleTogglePin = async (convId: string, currentVal: boolean) => {
    if (!token) return;
    await fetch(`/api/messages/conversations/${convId}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isPinned: !currentVal }),
    });
    fetchConversations();
  };

  const handleToggleMute = async (convId: string, currentVal: boolean) => {
    if (!token) return;
    await fetch(`/api/messages/conversations/${convId}/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isMuted: !currentVal }),
    });
    fetchConversations();
  };

  const handleToggleArchive = async (convId: string, currentVal: boolean) => {
    if (!token) return;
    await fetch(`/api/messages/conversations/${convId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isArchived: !currentVal }),
    });
    fetchConversations();
  };

  // Block / Unblock direct partner
  const handleToggleBlock = async (partnerId: string, currentlyBlocked: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${partnerId}/block`, {
        method: currentlyBlocked ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Leave active group
  const handleLeaveGroup = async () => {
    if (!activeConversationId || !token) return;
    try {
      await fetch(`/api/messages/conversations/${activeConversationId}/members/${currentUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowGroupInfoModal(false);
      fetchConversations();
      setActiveConversationId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Attachment handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'video' | 'audio' | 'file' = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    const previewUrl = URL.createObjectURL(file);
    setSelectedAttachment({ file, previewUrl, type });
    e.target.value = '';
  };

  // Active conversation helper
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const isGroup = activeConversation?.type === 'group';
  const partnerUser = activeConversation?.partner;
  const partnerPresence = partnerUser ? presenceMap[partnerUser.id] : null;
  const isPartnerOnline = partnerPresence?.isOnline ?? partnerUser?.isOnline ?? false;
  const partnerLastSeen = partnerPresence?.lastSeen ?? partnerUser?.lastSeen;

  // Filter conversations based on tab and search
  const filteredConversations = conversations
    .filter((c) => {
      if (activeTab === 'direct') return c.type === 'direct' && !c.isArchived;
      if (activeTab === 'groups') return c.type === 'group' && !c.isArchived;
      if (activeTab === 'archived') return c.isArchived;
      return !c.isArchived;
    })
    .filter((c) => {
      if (!searchFilter.trim()) return true;
      const title = isGroup ? c.title || '' : c.partner?.fullName || '';
      return title.toLowerCase().includes(searchFilter.toLowerCase());
    })
    .sort((a, b) => {
      // Pinned on top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  // Filter messages in chat search
  const filteredMessages = inChatSearchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(inChatSearchQuery.toLowerCase()) ||
        (m.fileName && m.fileName.toLowerCase().includes(inChatSearchQuery.toLowerCase()))
      )
    : messages;

  // Start direct chat with selected contact
  const handleStartDirectChat = async (targetUser: User) => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages/conversations/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetUser.id, partnerId: targetUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        setActiveConversationId(data.conversationId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Push history state when opening a chat so hardware/system Back button returns to chat list first
  useEffect(() => {
    if (!activeConversationId) return;

    try {
      const step = (window.history.state?.step || 0) + 1;
      window.history.pushState(
        { nixNav: true, tab: 'messenger', conversationId: activeConversationId, step },
        ''
      );
    } catch (e) {}

    const handlePopState = () => {
      setActiveConversationId(null);
    };

    window.addEventListener('popstate', handlePopState, { once: true });
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeConversationId]);

  const handleBackFromChat = () => {
    setActiveConversationId(null);
    if (window.history.state?.conversationId) {
      window.history.back();
    }
  };

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl border border-black/10 dark:border-white/10 overflow-hidden h-[calc(100dvh-120px)] sm:h-[calc(100dvh-130px)] flex mt-2.5 sm:mt-3.5 mb-1.5 sm:mb-2 shadow-2xl relative">
      {/* ---------------- LEFT CONVERSATIONS SIDEBAR ---------------- */}
      <div className={`w-full md:w-80 sm:md:w-88 border-r border-white/10 flex flex-col bg-slate-950/60 backdrop-blur-2xl shrink-0 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {/* Top Header */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="p-1.5 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                Nixo Chat
              </h3>
              <span className="text-[10px] text-purple-300 font-mono">Realtime WebSockets</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreateGroupModal(true)}
              title="Create Group Chat"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              title="New Direct Message"
              className="p-2 rounded-xl bg-purple-600/30 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/30 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Conversations Input */}
        <div className="px-3 pt-2.5 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 text-[11px] overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'direct', label: 'Direct' },
            { id: 'groups', label: 'Groups' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-slate-400 font-medium">No conversations found</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-3 text-xs text-purple-400 hover:underline font-semibold"
              >
                Start a new conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isGrp = conv.type === 'group';
              const name = isGrp ? conv.title : conv.partner?.fullName;
              const avatar = isGrp ? conv.avatarUrl : conv.partner?.avatarUrl;
              const isPartnerOnlineLive = isGrp ? false : (presenceMap[conv.partner?.id || '']?.isOnline ?? conv.partner?.isOnline);

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`group relative p-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-500/20 border border-purple-500/30 text-white shadow-lg'
                      : 'hover:bg-white/5 text-slate-300 border border-transparent'
                  }`}
                >
                  {/* Avatar with Online Glow Badge */}
                  <div className="relative shrink-0">
                    <img
                      src={avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'}
                      className="w-11 h-11 rounded-2xl object-cover border border-white/10 shadow-sm"
                      alt=""
                    />
                    {isPartnerOnlineLive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full ring-1 ring-emerald-400/50" />
                    )}
                    {isGrp && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 border-2 border-slate-900 rounded-full flex items-center justify-center text-[9px] text-white">
                        👥
                      </span>
                    )}
                  </div>

                  {/* Conv Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <p className="font-semibold text-xs text-white truncate">{name}</p>
                        {conv.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                        {conv.isMuted && <BellOff className="w-3 h-3 text-slate-500 shrink-0" />}
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0">
                        {conv.lastMessage?.createdAt
                          ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] text-slate-400 truncate pr-2">
                        {conv.lastMessage?.isUnsent ? (
                          <span className="italic opacity-60">Message unsent</span>
                        ) : conv.lastMessage?.messageType === 'voice' ? (
                          '🎤 Voice message'
                        ) : conv.lastMessage?.messageType === 'image' ? (
                          '📷 Photo'
                        ) : conv.lastMessage?.messageType === 'video' ? (
                          '🎥 Video'
                        ) : conv.lastMessage?.messageType === 'coins' ? (
                          `💎 Sent ${conv.lastMessage.coinAmount} Coins`
                        ) : (
                          conv.lastMessage?.content || 'Start liquid chatting...'
                        )}
                      </p>

                      {/* Unread Pill */}
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-md shadow-purple-500/40 animate-pulse">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Dropdown on Hover */}
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      const act = prompt(
                        `Options for ${name}:\n1: ${conv.isPinned ? 'Unpin' : 'Pin'}\n2: ${conv.isMuted ? 'Unmute' : 'Mute'}\n3: ${conv.isArchived ? 'Unarchive' : 'Archive'}\nEnter 1, 2, or 3:`
                      );
                      if (act === '1') handleTogglePin(conv.id, Boolean(conv.isPinned));
                      else if (act === '2') handleToggleMute(conv.id, Boolean(conv.isMuted));
                      else if (act === '3') handleToggleArchive(conv.id, Boolean(conv.isArchived));
                    }}
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------- MAIN ACTIVE CONVERSATION AREA ---------------- */}
      {activeConversation ? (
        <div className={`flex-1 flex flex-col justify-between bg-slate-900/40 relative min-w-0 ${activeConversationId ? 'flex' : 'hidden md:flex'}`}>
          {/* Header */}
          <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shrink-0 z-20 sticky top-0 shadow-xs">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={handleBackFromChat}
                className="p-1.5 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 md:hidden cursor-pointer shrink-0 transition-colors"
                title="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <img
                  src={
                    isGroup
                      ? activeConversation.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'
                      : partnerUser?.avatarUrl
                  }
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover border border-purple-400/40 shadow-md"
                  alt=""
                />
                {!isGroup && isPartnerOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                )}
              </div>

              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-white truncate flex items-center gap-2">
                  <span>{isGroup ? activeConversation.title : partnerUser?.fullName}</span>
                  {isGroup && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.2 rounded-full border border-purple-500/30">
                      Group
                    </span>
                  )}
                </h4>

                {/* Status / Typing label */}
                <p className="text-[11px] truncate">
                  {Object.keys(typingUsers).length > 0 ? (
                    <span className="text-purple-400 font-medium animate-pulse flex items-center gap-1">
                      <span>{Object.values(typingUsers).join(', ')} is typing</span>
                      <span className="inline-flex gap-0.5">
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                    </span>
                  ) : isGroup ? (
                    <span className="text-slate-400">
                      {activeConversation.membersCount || activeConversation.members?.length || 2} members
                    </span>
                  ) : isPartnerOnline ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Active now
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {partnerLastSeen ? `Active ${new Date(partnerLastSeen).toLocaleDateString()}` : 'Offline'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1.5">
              {/* Audio & Video Call buttons (Direct chats only) */}
              {!isGroup && partnerUser && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCallType('audio');
                      setIsCallModalOpen(true);
                    }}
                    title="Start Audio Call"
                    className="p-2 rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCallType('video');
                      setIsCallModalOpen(true);
                    }}
                    title="Start Video Call"
                    className="p-2 rounded-xl text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* In-chat search button */}
              <button
                onClick={() => setInChatSearchOpen(!inChatSearchOpen)}
                title="Search in conversation"
                className={`p-2 rounded-xl transition-colors ${
                  inChatSearchOpen ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Coin Transfer shortcut */}
              <button
                onClick={() => setShowCoinModal(true)}
                title="Send Nixo Coins"
                className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Gift Coins</span>
              </button>

              {/* Group info / Direct profile info button */}
              {isGroup ? (
                <button
                  onClick={() => setShowGroupInfoModal(true)}
                  title="Group Info & Members"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (partnerUser) {
                      const isBlk = partnerUser.isBlocked;
                      handleToggleBlock(partnerUser.id, Boolean(isBlk));
                    }
                  }}
                  title={partnerUser?.isBlocked ? 'Unblock User' : 'Block User'}
                  className={`p-2 rounded-xl transition-colors ${
                    partnerUser?.isBlocked ? 'text-red-400 bg-red-500/20' : 'text-slate-400 hover:text-red-400 hover:bg-white/10'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* In-Chat Search Bar Drawer */}
          {inChatSearchOpen && (
            <div className="p-2.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-150">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  placeholder="Search in this conversation..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
                  autoFocus
                />
              </div>
              <span className="text-[11px] text-purple-300 font-mono">
                {filteredMessages.length} {filteredMessages.length === 1 ? 'match' : 'matches'}
              </span>
              <button
                onClick={() => {
                  setInChatSearchOpen(false);
                  setInChatSearchQuery('');
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Blocked banner if partner is blocked */}
          {partnerUser?.isBlocked && (
            <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 text-xs text-red-200 flex items-center justify-between">
              <span>You have blocked this contact. Messages from them are restricted.</span>
              <button
                onClick={() => handleToggleBlock(partnerUser.id, true)}
                className="text-white underline font-semibold hover:text-red-300 ml-2"
              >
                Unblock
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3 text-purple-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h5 className="text-sm font-semibold text-white">No messages yet</h5>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Say hello with liquid glass aesthetics, send emojis, share audio notes, or gift coins!
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, index) => {
                const isMe = msg.senderId === currentUserId;
                const isHovered = hoveredMessageId === msg.id;
                const isShowingReactionMenu = reactionMenuMessageId === msg.id;
                const isImageOnly = msg.messageType === 'image' && msg.mediaUrl && (!msg.content || msg.content === msg.fileName || msg.content === 'Attachment');

                return (
                  <div
                    key={msg.id}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => {
                      setHoveredMessageId(null);
                      setReactionMenuMessageId(null);
                    }}
                    className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Sender Name in group chat */}
                    {isGroup && !isMe && msg.sender && (
                      <span className="text-[10px] text-purple-300 font-semibold mb-1 ml-2">
                        {msg.sender.fullName}
                      </span>
                    )}

                    <div className="relative flex items-end gap-2 max-w-[80%] sm:max-w-[70%]">
                      {/* Avatar for other user */}
                      {!isMe && (
                        <img
                          src={msg.sender?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          className="w-7 h-7 rounded-xl object-cover border border-white/10 shrink-0 mb-1"
                          alt=""
                        />
                      )}

                      {/* Main Message Bubble */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setReactionMenuMessageId(reactionMenuMessageId === msg.id ? null : msg.id);
                        }}
                        className={`relative shadow-sm transition-all cursor-pointer ${
                          isImageOnly
                            ? `rounded-xl p-1 ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`
                            : `rounded-2xl p-3 ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`
                        } ${
                          isMe
                            ? 'bg-gradient-to-r from-purple-600/60 to-pink-600/60 border border-purple-400/20 text-white backdrop-blur-md'
                            : 'bg-slate-800/60 border border-white/10 text-slate-100 backdrop-blur-md'
                        }`}
                      >
                        {/* Forwarded Header */}
                        {msg.forwardedFromId && (
                          <div className="flex items-center gap-1 text-[10px] text-purple-300 font-medium mb-1">
                            <CornerUpRight className="w-3 h-3" />
                            <span>Forwarded</span>
                          </div>
                        )}

                        {/* Replied Context Header */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 rounded-xl bg-black/20 border-l-2 border-purple-400 text-xs text-slate-300">
                            <p className="text-[10px] font-semibold text-purple-300">
                              {msg.replyTo.senderName || 'Original message'}
                            </p>
                            <p className="line-clamp-1 italic text-[11px] opacity-90">{msg.replyTo.content}</p>
                          </div>
                        )}

                        {/* Unsent state */}
                        {msg.isUnsent ? (
                          <p className="italic text-xs text-slate-400 flex items-center gap-1.5 py-0.5">
                            <Trash2 className="w-3.5 h-3.5 opacity-50" />
                            <span>{msg.content}</span>
                          </p>
                        ) : (
                          <>
                            {/* Content based on messageType */}
                            {msg.messageType === 'image' && msg.mediaUrl && (
                              <div className={`${isImageOnly ? 'rounded-lg' : 'mb-2 rounded-xl'} overflow-hidden border border-white/5 max-h-72`}>
                                <img
                                  src={msg.mediaUrl}
                                  alt="attachment"
                                  onClick={() =>
                                    setLightboxData({
                                      url: msg.mediaUrl!,
                                      type: 'image',
                                      title: isImageOnly ? '' : msg.content,
                                    })
                                  }
                                  className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                              </div>
                            )}

                            {msg.messageType === 'video' && msg.mediaUrl && (
                              <div className="mb-2 rounded-xl overflow-hidden border border-white/10">
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  className="max-h-72 w-full rounded-xl"
                                />
                              </div>
                            )}

                            {msg.messageType === 'voice' && msg.mediaUrl && (
                              <div className="mb-1">
                                <AudioWaveformPlayer audioUrl={msg.mediaUrl} isMe={isMe} />
                              </div>
                            )}

                            {msg.messageType === 'sticker' && msg.mediaUrl && (
                              <div className="mb-1 p-1">
                                <img
                                  src={msg.mediaUrl}
                                  alt="sticker"
                                  className="w-32 h-32 object-contain hover:scale-105 transition-transform drop-shadow-xl"
                                />
                              </div>
                            )}

                            {msg.messageType === 'gif' && msg.mediaUrl && (
                              <div className="mb-2 rounded-xl overflow-hidden border border-white/10">
                                <img
                                  src={msg.mediaUrl}
                                  alt="gif"
                                  className="max-h-60 w-full object-cover rounded-xl"
                                />
                              </div>
                            )}

                            {msg.messageType === 'coins' && (
                              <div className="mb-2 p-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-300">
                                  <Coins className="w-6 h-6 animate-pulse" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-amber-200">
                                    {msg.coinAmount} Nixo Coins Gifted!
                                  </p>
                                  <p className="text-[10px] text-amber-300/80">Transferred in real-time</p>
                                </div>
                              </div>
                            )}

                            {msg.messageType === 'file' && (
                              <a
                                href={msg.mediaUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="mb-2 p-2.5 bg-black/20 hover:bg-black/30 border border-white/10 rounded-xl flex items-center gap-3 transition-colors group/file"
                              >
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {msg.fileName || 'Attachment Document'}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : 'File'}
                                  </p>
                                </div>
                                <Download className="w-4 h-4 text-slate-400 group-hover/file:text-white" />
                              </a>
                            )}

                            {/* Message text content */}
                            {msg.content && msg.messageType !== 'voice' && !isImageOnly && (
                              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}

                            {/* Edited badge */}
                            {msg.isEdited && (
                              <span className="text-[9px] text-slate-400 ml-1.5 italic">(edited)</span>
                            )}
                          </>
                        )}

                        {/* Timestamp & Delivery status checkmarks */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                            isMe ? 'text-purple-200/80' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && !msg.isUnsent && (
                            <span>
                              {msg.status === 'read' || msg.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-purple-200" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-purple-200" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Toolbar on Hover / Touch */}
                      {(isHovered || isShowingReactionMenu) && !msg.isUnsent && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute -top-11 z-30 flex items-center gap-1 bg-slate-950/95 backdrop-blur-2xl border border-white/20 rounded-full px-2 py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-w-[calc(100vw-36px)] overflow-x-auto no-scrollbar ${
                            isMe ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'
                          }`}
                        >
                          {/* Quick Emoji Reaction Pill Buttons */}
                          <div className="flex items-center gap-0.5 pr-1 border-r border-white/10">
                            {QUICK_REACTIONS.map((em) => (
                              <button
                                key={em}
                                onClick={() => handleToggleReaction(msg.id, em)}
                                className="hover:scale-125 transition-transform text-sm px-1 py-0.5 rounded-lg hover:bg-white/10 cursor-pointer"
                              >
                                {em}
                              </button>
                            ))}
                          </div>

                          {/* Reply Button */}
                          <button
                            onClick={() => {
                              setReplyingTo(msg);
                              composerInputRef.current?.focus();
                            }}
                            title="Reply"
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Forward Button */}
                          <button
                            onClick={() => setForwardingMessage(msg)}
                            title="Forward"
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                          >
                            <CornerUpRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button (if sent by me) */}
                          {isMe && msg.messageType === 'text' && (
                            <button
                              onClick={() => {
                                setEditingMessage(msg);
                                setMessageInput(msg.content);
                                composerInputRef.current?.focus();
                              }}
                              title="Edit message"
                              className="p-1 text-slate-400 hover:text-purple-300 rounded-lg hover:bg-white/10 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Unsend Button (if sent by me) */}
                          {isMe && (
                            <button
                              onClick={() => handleUnsendMessage(msg.id)}
                              title="Unsend for everyone"
                              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reactions Pill Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                        {msg.reactions.map((rx) => (
                          <button
                            key={rx.reaction}
                            onClick={() => handleToggleReaction(msg.id, rx.reaction)}
                            title={rx.users.map((u) => u.fullName).join(', ')}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                              rx.userReacted
                                ? 'bg-purple-500/25 border-purple-500/50 text-white'
                                : 'bg-slate-800/80 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span>{rx.reaction}</span>
                            <span className="font-mono text-[10px] font-semibold">{rx.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ---------------- COMPOSER AREA ---------------- */}
          <div className="p-2 sm:p-2.5 pb-20 lg:pb-3 border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shrink-0 z-30 relative">
            {/* Replying Banner */}
            {replyingTo && (
              <div className="mb-2 p-2 bg-purple-900/30 border border-purple-500/30 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <CornerUpLeft className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-purple-300">
                      Replying to {replyingTo.sender?.fullName || 'User'}
                    </p>
                    <p className="text-slate-300 truncate text-[11px]">{replyingTo.content}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editing Banner */}
            {editingMessage && (
              <div className="mb-2 p-2 bg-amber-900/30 border border-amber-500/30 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">Editing message</span>
                </div>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageInput('');
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Attachment Preview Banner */}
            {selectedAttachment && (
              <div className="mb-2 p-2 bg-slate-900/80 border border-white/10 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedAttachment.type === 'image' ? (
                    <img
                      src={selectedAttachment.previewUrl}
                      className="w-12 h-12 rounded-xl object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {selectedAttachment.file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(selectedAttachment.file.size / 1024).toFixed(1)} KB • {selectedAttachment.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAttachment(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Popovers for Emojis, Stickers, GIFs */}
            {activePopover && (
              <div className="absolute bottom-32 lg:bottom-16 left-2 sm:left-4 z-50">
                {activePopover === 'emoji' && (
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setMessageInput((prev) => prev + emoji);
                      composerInputRef.current?.focus();
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                )}
                {activePopover === 'sticker' && (
                  <StickerPicker
                    onSelect={(stickerUrl) => {
                      handleSendMessage({ messageType: 'sticker', mediaUrl: stickerUrl, content: 'Sticker' });
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                )}
                {activePopover === 'gif' && (
                  <GifPicker
                    onSelect={(gifUrl) => {
                      handleSendMessage({ messageType: 'gif', mediaUrl: gifUrl, content: 'GIF' });
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                )}
              </div>
            )}

            {/* Voice Recorder Overlay */}
            {showVoiceRecorder ? (
              <VoiceRecorder
                onSendVoice={handleSendVoiceNote}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-1 sm:gap-2 w-full max-w-full overflow-hidden"
              >
                {/* File Attachment Input (hidden) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
                />

                {/* Direct Video File Upload Input (hidden) */}
                <input
                  ref={videoFileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="video/*"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file or photo"
                  className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Video Import Shortcut */}
                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  title="Import and send video file"
                  className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors shrink-0 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>

                {/* Popover triggers: Emoji, Sticker, GIF */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'emoji' ? null : 'emoji')}
                    title="Insert Emoji"
                    className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
                      activePopover === 'emoji'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'sticker' ? null : 'sticker')}
                    title="Liquid Stickers"
                    className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex ${
                      activePopover === 'sticker'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'gif' ? null : 'gif')}
                    title="Send GIF"
                    className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex ${
                      activePopover === 'gif'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                  </button>
                </div>

                {/* Text input with min-w-0 to prevent layout blow-out */}
                <input
                  ref={composerInputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={
                    editingMessage
                      ? 'Edit your message...'
                      : replyingTo
                      ? `Reply to ${replyingTo.sender?.fullName || 'message'}...`
                      : 'Type a liquid glass message...'
                  }
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 transition-colors"
                />

                {/* Mic / Voice Note button */}
                {!messageInput.trim() && !selectedAttachment && !editingMessage && (
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(true)}
                    title="Record voice note"
                    className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors shrink-0 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!messageInput.trim() && !selectedAttachment && !editingMessage}
                  className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Empty state when no conversation is selected (hidden on mobile so list takes full width) */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-900/20 p-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">Select a Conversation</h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Connect with friends or start a group chat with real-time Socket.IO synchronization.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 shadow-lg shadow-purple-500/25 transition-all"
            >
              New Message
            </button>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-colors border border-white/10"
            >
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* ---------------- MODALS ---------------- */}
      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        token={token}
        currentUserId={currentUserId}
        onGroupCreated={async (newId) => {
          await fetchConversations();
          setActiveConversationId(newId);
        }}
      />

      {/* Group Info Modal */}
      {activeConversation && isGroup && (
        <GroupInfoModal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          conversation={activeConversation}
          currentUserId={currentUserId}
          token={token}
          onUpdated={async () => {
            await fetchConversations();
            if (activeConversationId) fetchActiveMessages(activeConversationId);
          }}
          onLeaveGroup={handleLeaveGroup}
        />
      )}

      {/* New Direct Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        token={token}
        currentUserId={currentUserId}
        onSelectUser={handleStartDirectChat}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={Boolean(forwardingMessage)}
        onClose={() => setForwardingMessage(null)}
        message={forwardingMessage}
        conversations={conversations}
        token={token}
        onForwardSuccess={() => {
          if (activeConversationId) fetchActiveMessages(activeConversationId);
        }}
      />

      {/* Media Lightbox */}
      {lightboxData && (
        <MediaLightbox
          isOpen={Boolean(lightboxData)}
          onClose={() => setLightboxData(null)}
          mediaUrl={lightboxData.url}
          mediaType={lightboxData.type}
          title={lightboxData.title}
        />
      )}

      {/* Gift Coins in Chat Modal */}
      {showCoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm glass-card bg-slate-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400">
                <Coins className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Gift Nixo Coins</h4>
              </div>
              <button
                onClick={() => setShowCoinModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 my-3">
              Transfer coins instantly in this liquid glass chat to reward great ideas or send appreciation.
            </p>

            {/* Quick preset amounts */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCoinAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                    coinAmount === amt
                      ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={coinAmount}
              onChange={(e) => setCoinAmount(Math.max(1, parseInt(e.target.value) || 0))}
              min={1}
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm font-mono text-white mb-4 focus:outline-none focus:border-amber-400"
            />

            <button
              onClick={async () => {
                if (coinAmount <= 0) return;
                await handleSendMessage({
                  coinAmount,
                  messageType: 'coins',
                  content: `Sent ${coinAmount} Nixo Coins`,
                });
                setShowCoinModal(false);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
            >
              <Coins className="w-4 h-4 fill-current" />
              <span>Send {coinAmount} Coins</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice and Video Call Modal */}
      <VoiceVideoCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        partner={partnerUser ? {
          id: partnerUser.id,
          name: partnerUser.fullName,
          username: partnerUser.username,
          avatar: partnerUser.avatarUrl,
        } : null}
        callType={callType}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { X, CornerUpRight, Search, Check, Send } from 'lucide-react';
import { Conversation, Message } from '../../types';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  conversations: Conversation[];
  token: string | null;
  onForwardSuccess: () => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  conversations,
  token,
  onForwardSuccess,
}) => {
  const [search, setSearch] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !message) return null;

  const toggleSelect = (id: string) => {
    setSelectedConvIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredConversations = conversations.filter((c) => {
    const title = c.type === 'group' ? c.title || 'Group' : c.partner?.fullName || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = async () => {
    if (selectedConvIds.length === 0) return;
    setIsSubmitting(true);
    setError('');

    try {
      // Forward sequentially to selected conversations
      for (const targetConvId of selectedConvIds) {
        const res = await fetch('/api/messages/forward', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messageId: message.id,
            targetConversationId: targetConvId,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to forward to one or more conversations');
        }
      }

      onForwardSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error forwarding message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-card bg-slate-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CornerUpRight className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Forward Message</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="my-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[11px] text-purple-300 font-semibold mb-1">
            Original from {message.sender?.fullName || 'User'}
          </p>
          <p className="text-xs text-slate-200 line-clamp-2 italic">
            "{message.content || (message.messageType ? `[${message.messageType}]` : '[Attachment]')}"
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats to forward to..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[160px] max-h-60 pr-1">
          {filteredConversations.map((conv) => {
            const isGroup = conv.type === 'group';
            const name = isGroup ? conv.title : conv.partner?.fullName;
            const avatar = isGroup ? conv.avatarUrl : conv.partner?.avatarUrl;
            const isSelected = selectedConvIds.includes(conv.id);

            return (
              <div
                key={conv.id}
                onClick={() => toggleSelect(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-purple-500/25 border border-purple-500/40 text-white'
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'}
                    className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{name}</p>
                    <p className="text-[10px] text-slate-400">
                      {isGroup ? `${conv.membersCount || 2} members` : 'Direct message'}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/20'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {selectedConvIds.length} {selectedConvIds.length === 1 ? 'chat' : 'chats'} selected
          </span>
          <button
            onClick={handleForward}
            disabled={selectedConvIds.length === 0 || isSubmitting}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg shadow-purple-500/25"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Forwarding...' : 'Send Forward'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

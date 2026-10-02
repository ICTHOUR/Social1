import React, { useState } from 'react';
import { Search, Sparkles, Smile, Heart, Hand, Cpu, Layers } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: Hand,
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈',
      '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '✍️', '💅'
    ],
  },
  {
    id: 'hearts',
    name: 'Love & Magic',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '✨', '⭐', '🌟', '💫', '💥', '🔥', '💎', '🔮', '🎉', '🎊'
    ],
  },
  {
    id: 'tech',
    name: 'Tech & Spatial',
    icon: Cpu,
    emojis: [
      '💻', '🖥️', '📱', '🕹️', '🕶️', '🥽', '⚡', '🔋', '📡', '🛰️',
      '🤖', '👾', '🚀', '🌌', '🪐', '🧬', '🔬', '🔭', '💡', '🎵'
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: Layers,
    emojis: [
      '💯', '✅', '✔️', '❌', '⭕', '🔴', '🟢', '🔵', '🟣', '🟡',
      '🔔', '🔕', '💬', '💭', '🗯️', '📌', '📍', '🏷️', '🔒', '🔑'
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  const [activeTab, setActiveTab] = useState('smileys');
  const [search, setSearch] = useState('');

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : currentCategory.emojis;

  return (
    <div className="w-80 glass-card bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
      {/* Search Header */}
      <div className="p-2.5 border-b border-white/10 flex items-center gap-2 bg-white/5">
        <Search className="w-4 h-4 text-purple-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded-full hover:bg-white/10"
          >
            Clear
          </button>
        )}
      </div>

      {/* Categories Tabs */}
      {!search.trim() && (
        <div className="flex items-center justify-around px-2 py-1.5 border-b border-white/10 bg-slate-950/40">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                title={cat.name}
                className={`p-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="p-2.5 max-h-56 overflow-y-auto grid grid-cols-7 gap-1 scrollbar-thin scrollbar-thumb-white/10">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            onClick={() => onSelect(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-white/15 hover:scale-125 active:scale-95 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

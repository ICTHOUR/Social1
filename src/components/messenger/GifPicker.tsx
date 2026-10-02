import React, { useState } from 'react';
import { Search, Film, Flame } from 'lucide-react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose?: () => void;
}

const CURATED_GIFS = [
  {
    id: 'gif_cheers',
    title: 'Cheers Celebration',
    category: 'celebration',
    url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
  },
  {
    id: 'gif_mindblown',
    title: 'Mind Blown',
    category: 'reaction',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  },
  {
    id: 'gif_thumbsup',
    title: 'Thumbs Up Approval',
    category: 'reaction',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  },
  {
    id: 'gif_applause',
    title: 'Standing Ovation',
    category: 'celebration',
    url: 'https://media.giphy.com/media/l4q8cJzGdR9J8w3hS/giphy.gif',
  },
  {
    id: 'gif_matrix',
    title: 'Matrix Code Flow',
    category: 'tech',
    url: 'https://media.giphy.com/media/eIm6245501hXMAbZ39/giphy.gif',
  },
  {
    id: 'gif_dance',
    title: 'Vibe Dance',
    category: 'fun',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
  },
  {
    id: 'gif_fire',
    title: 'This Is Fire',
    category: 'reaction',
    url: 'https://media.giphy.com/media/nrXif9YjgW9EI/giphy.gif',
  },
  {
    id: 'gif_space',
    title: 'Cosmic Trip',
    category: 'tech',
    url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
  },
];

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect }) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? CURATED_GIFS.filter(
        (g) =>
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.category.toLowerCase().includes(search.toLowerCase())
      )
    : CURATED_GIFS;

  return (
    <div className="w-80 glass-card bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
      <div className="p-2.5 border-b border-white/10 flex items-center gap-2 bg-white/5">
        <Film className="w-4 h-4 text-pink-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GIFs (e.g. fire, cheers, tech)..."
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

      <div className="p-2.5 max-h-64 overflow-y-auto grid grid-cols-2 gap-2 scrollbar-thin scrollbar-thumb-white/10">
        {filtered.map((gif) => (
          <button
            key={gif.id}
            onClick={() => onSelect(gif.url)}
            className="group relative rounded-xl overflow-hidden aspect-video bg-black/40 border border-white/10 hover:border-pink-400 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center shadow-md"
            title={gif.title}
          >
            <img
              src={gif.url}
              alt={gif.title}
              className="w-full h-full object-cover group-hover:opacity-90"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-white truncate text-center">{gif.title}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { Sparkles, Layers } from 'lucide-react';

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void;
  onClose?: () => void;
}

const STICKERS = [
  {
    id: 'st_crystal_heart',
    name: 'Liquid Crystal Heart',
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=250&q=80',
  },
  {
    id: 'st_neon_fire',
    name: 'Neon Cyber Fire',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=250&q=80',
  },
  {
    id: 'st_spatial_orb',
    name: 'Spatial Glass Orb',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80',
  },
  {
    id: 'st_prismatic_gem',
    name: 'Prismatic Diamond',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=250&q=80',
  },
  {
    id: 'st_cyber_spark',
    name: 'Electric Pulse',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=250&q=80',
  },
  {
    id: 'st_fluid_wave',
    name: 'Liquid Caustic Wave',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=250&q=80',
  },
  {
    id: 'st_neon_cat',
    name: 'Hologram Cat',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=250&q=80',
  },
  {
    id: 'st_space_voyage',
    name: 'Cosmic Nebula',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=250&q=80',
  },
];

export const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect }) => {
  return (
    <div className="w-80 glass-card bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
      <div className="p-2.5 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-white">Liquid Glass Stickers</span>
        </div>
        <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
          8 Packs
        </span>
      </div>

      <div className="p-3 max-h-64 overflow-y-auto grid grid-cols-4 gap-2 scrollbar-thin scrollbar-thumb-white/10">
        {STICKERS.map((st) => (
          <button
            key={st.id}
            onClick={() => onSelect(st.url)}
            className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-purple-400 hover:scale-105 active:scale-95 transition-all p-1 bg-white/5 flex items-center justify-center shadow-md hover:shadow-purple-500/20"
            title={st.name}
          >
            <img
              src={st.url}
              alt={st.name}
              className="w-full h-full object-cover rounded-lg group-hover:brightness-110 transition-transform"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

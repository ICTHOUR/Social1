import React, { useState, useEffect } from 'react';
import {
  Gift as GiftIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Coins,
  AlertCircle,
  Save,
  X,
} from 'lucide-react';
import { Gift } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Gift3DPreview } from '../Gift3DPreview';

export const AdminGiftCatalog: React.FC = () => {
  const { token } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [coinPrice, setCoinPrice] = useState(100);
  const [image3d, setImage3d] = useState('crystal_prism');
  const [animation, setAnimation] = useState('orbital_float');
  const [category, setCategory] = useState('popular');
  const [sortOrder, setSortOrder] = useState(1);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const available3DModels = [
    { id: 'crystal_prism', label: 'Nixo Crystal Prism' },
    { id: 'cyber_lotus', label: 'Neon Cyber Lotus' },
    { id: 'gold_chalice', label: 'Liquid Gold Chalice' },
    { id: 'nova_orb', label: 'Celestial Nova Orb' },
    { id: 'phoenix_crown', label: 'Quantum Phoenix Crown' },
    { id: 'hypercube_relic', label: 'Hypercube Chrono Relic' },
    { id: 'astral_dragon', label: 'Imperial Astral Dragon' },
    { id: 'cosmic_stardust', label: 'Cosmic Stardust Fragment' },
  ];

  const availableAnimations = [
    { id: 'orbital_float', label: 'Orbital Float (Gentle Levitation)' },
    { id: 'crystal_burst', label: 'Crystal Burst (Facet Flashing)' },
    { id: 'cosmic_pulse', label: 'Cosmic Pulse (Pulsing Orbit)' },
    { id: 'golden_rain', label: 'Golden Rain (Cascading Shimmer)' },
    { id: 'quantum_flare', label: 'Quantum Flare (Rotating Vortex)' },
    { id: 'astral_surge', label: 'Astral Surge (High Velocity Surge)' },
  ];

  const fetchGifts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gifts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGifts(data.gifts || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch gifts catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, [token]);

  const openCreateModal = () => {
    setEditingGift(null);
    setName('');
    setCoinPrice(100);
    setImage3d('crystal_prism');
    setAnimation('orbital_float');
    setCategory('popular');
    setSortOrder(gifts.length + 1);
    setDescription('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (gift: Gift) => {
    setEditingGift(gift);
    setName(gift.name);
    setCoinPrice(gift.coinPrice);
    setImage3d(gift.image3d || 'crystal_prism');
    setAnimation(gift.animation || 'orbital_float');
    setCategory(gift.category || 'popular');
    setSortOrder(gift.sortOrder || 1);
    setDescription(gift.description || '');
    setStatus(gift.status || 'active');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);

    const payload = {
      name,
      coinPrice: Number(coinPrice),
      image3d,
      animation,
      category,
      sortOrder: Number(sortOrder),
      description,
      status,
    };

    try {
      const url = editingGift ? `/api/admin/gifts/${editingGift.id}` : '/api/admin/gifts';
      const method = editingGift ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save gift');
      }

      setSuccessMsg(editingGift ? 'Gift package updated!' : 'New gift artifact minted!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsModalOpen(false);
      fetchGifts();
    } catch (err: any) {
      setError(err.message || 'Error saving gift');
    }
  };

  const toggleStatus = async (giftId: string, currentStatus: string) => {
    if (!token) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/gifts/${giftId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchGifts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-2">
            <GiftIcon className="w-4 h-4 text-amber-400" />
            3D Virtual Gift Catalog Management
          </h3>
          <p className="text-xs text-slate-300">
            Admins can mint original 3D gift packages, calibrate coin prices, animations, and categories.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Mint New Gift Artifact</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Catalog Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {gifts.map((g) => (
          <div
            key={g.id}
            className={`glass-card rounded-2xl p-4 border flex flex-col justify-between transition-all ${
              g.status === 'active'
                ? 'border-white/10 hover:border-amber-500/50'
                : 'border-white/5 opacity-50 bg-black/40'
            }`}
          >
            <div>
              {/* Header tags */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                  {g.category || 'popular'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    g.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {g.status}
                </span>
              </div>

              {/* 3D Model Display */}
              <div className="my-3 flex justify-center h-28 items-center">
                <Gift3DPreview image3d={g.image3d} animation={g.animation} size="md" isInteractive={true} />
              </div>

              <h4 className="font-display font-extrabold text-sm text-white text-center">{g.name}</h4>
              <p className="text-[11px] text-slate-300 text-center line-clamp-2 mt-1 min-h-[32px]">
                {g.description || 'Spatial platform reward artifact.'}
              </p>

              <div className="my-2 text-center">
                <span className="inline-flex items-center gap-1 font-mono font-extrabold text-amber-400 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                  <Coins className="w-3.5 h-3.5" />
                  {g.coinPrice.toLocaleString()} Coins
                </span>
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 mt-2">
              <button
                onClick={() => toggleStatus(g.id, g.status || 'active')}
                className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {g.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>

              <button
                onClick={() => openEditModal(g)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Edit Gift Package"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 border border-amber-500/40 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display font-bold text-base text-white">
                {editingGift ? 'Edit Gift Package' : 'Mint New 3D Gift Artifact'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Gift Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Celestial Nova Orb"
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Coin Price</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100000"
                    value={coinPrice}
                    onChange={(e) => setCoinPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">3D Vector Model</label>
                  <select
                    value={image3d}
                    onChange={(e) => setImage3d(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    {available3DModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Animation Style</label>
                  <select
                    value={animation}
                    onChange={(e) => setAnimation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    {availableAnimations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3D Live Sandbox Preview in Modal */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">
                <Gift3DPreview image3d={image3d} animation={animation} size="md" isInteractive={true} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="popular">Popular</option>
                    <option value="luxury">Luxury</option>
                    <option value="cosmic">Cosmic</option>
                    <option value="legendary">Legendary</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Artifact significance and lore..."
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Gift Artifact</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

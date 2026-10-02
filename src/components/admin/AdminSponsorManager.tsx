import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointer,
  Save,
  X,
  Layers,
  ArrowUpDown,
  Search,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export interface SponsorPartner {
  id: string;
  name: string;
  tagline?: string;
  logoUrl: string;
  bannerUrl?: string;
  destinationUrl: string;
  description?: string;
  tier: 'platinum' | 'gold' | 'silver' | 'partner';
  status: 'active' | 'inactive';
  displayOrder: number;
  clicksCount: number;
  impressionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const AdminSponsorManager: React.FC = () => {
  const { token } = useAuth();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [sponsors, setSponsors] = useState<SponsorPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [editingSponsor, setEditingSponsor] = useState<Partial<SponsorPartner> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const fetchSponsors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/sponsors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSponsors(data.sponsors || []);
      }
    } catch (err) {
      console.error('Failed to load sponsors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, [token]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      if (result) {
        setEditingSponsor((prev) => ({
          ...(prev || {}),
          [field]: result,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSponsor?.name || !editingSponsor?.destinationUrl) {
      setErrorMessage(isBn ? 'স্পন্সরের নাম এবং গন্তব্য লিংক আবশ্যক।' : 'Sponsor name and destination URL are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isNew = !editingSponsor.id;
      const endpoint = isNew ? '/api/admin/sponsors' : `/api/admin/sponsors/${editingSponsor.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingSponsor),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save sponsor');
      }

      setSuccessMessage(
        isNew
          ? isBn ? 'নতুন স্পন্সর পার্টনার সফলভাবে যুক্ত হয়েছে!' : 'New sponsor partner added successfully!'
          : isBn ? 'স্পন্সর পার্টনারের তথ্য আপডেট করা হয়েছে!' : 'Sponsor partner updated successfully!'
      );
      setEditingSponsor(null);
      setIsCreating(false);
      fetchSponsors();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving sponsor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmPrompt = isBn
      ? `আপনি কি নিশ্চিত যে "${name}" স্পন্সর পার্টনারটি মুছে ফেলতে চান?`
      : `Are you sure you want to permanently delete sponsor "${name}"?`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await fetch(`/api/admin/sponsors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccessMessage(isBn ? 'স্পন্সর সফলভাবে মুছে ফেলা হয়েছে।' : 'Sponsor deleted successfully.');
        fetchSponsors();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete sponsor');
    }
  };

  const handleToggleStatus = async (sponsor: SponsorPartner) => {
    const nextStatus = sponsor.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/sponsors/${sponsor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...sponsor, status: nextStatus }),
      });
      if (res.ok) {
        fetchSponsors();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const filteredSponsors = sponsors.filter((sp) => {
    const matchesSearch =
      sp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sp.tagline && sp.tagline.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sp.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || sp.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-gradient-to-r from-slate-200 to-cyan-300 text-slate-900 font-bold border-cyan-400';
      case 'gold':
        return 'bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 font-bold border-amber-400';
      case 'silver':
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 font-bold border-slate-300';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-slate-900/40 border border-purple-500/20">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span>{isBn ? 'স্পন্সর ও পার্টনার ম্যানেজমেন্ট' : 'Sponsor & Partner Management'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isBn
              ? 'ওয়েবসাইটের স্পন্সর পার্টনারসমূহ যোগ, সম্পাদনা, ব্যানার/লোগো আপলোড, লিংক পরিবর্তন ও পারফরম্যান্স পর্যবেক্ষণ করুন।'
              : 'Add, update, delete, manage logos/banners, URLs, and view live click analytics for sponsors.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingSponsor({
              name: '',
              tagline: '',
              logoUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=200&q=80',
              bannerUrl: '',
              destinationUrl: 'https://',
              description: '',
              tier: 'gold',
              status: 'active',
              displayOrder: sponsors.length + 1,
            });
            setIsCreating(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? '+ নতুন স্পন্সর যোগ করুন' : '+ Add New Sponsor'}</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? 'স্পন্সরের নাম বা লিংক অনুসন্ধান করুন...' : 'Search sponsors by name or URL...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">{isBn ? 'সকল টিয়ার (All Tiers)' : 'All Tiers'}</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="partner">Official Partner</option>
          </select>
        </div>
      </div>

      {/* Editor Modal / Drawer */}
      {(isCreating || editingSponsor) && (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl space-y-5 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-purple-400" />
              <span>
                {editingSponsor?.id
                  ? isBn ? 'স্পন্সর পার্টনার সম্পাদনা' : 'Edit Sponsor Partner'
                  : isBn ? 'নতুন স্পন্সর পার্টনার তৈরি' : 'Create New Sponsor Partner'}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingSponsor(null);
                setIsCreating(false);
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isBn ? 'কোম্পানি / ব্র্যান্ডের নাম *' : 'Company / Brand Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingSponsor?.name || ''}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), name: e.target.value }))}
                  placeholder="e.g. Google Cloud, Stripe, Samsung"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isBn ? 'ট্যাগলাইন / স্লোগান' : 'Tagline / Short Hook'}
                </label>
                <input
                  type="text"
                  value={editingSponsor?.tagline || ''}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), tagline: e.target.value }))}
                  placeholder="e.g. Enterprise AI & Infrastructure"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Destination URL */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  {isBn ? 'গন্তব্য লিংক (Destination URL) *' : 'Destination URL *'}
                </label>
                <input
                  type="url"
                  required
                  value={editingSponsor?.destinationUrl || ''}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), destinationUrl: e.target.value }))}
                  placeholder="https://yourpartnerlink.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Tier & Status & Display Order */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isBn ? 'পার্টনারশিপ টিয়ার' : 'Partnership Tier'}
                </label>
                <select
                  value={editingSponsor?.tier || 'gold'}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), tier: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="platinum">Platinum Partner</option>
                  <option value="gold">Gold Partner</option>
                  <option value="silver">Silver Partner</option>
                  <option value="partner">Standard Partner</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isBn ? 'স্ট্যাটাস' : 'Status'}
                  </label>
                  <select
                    value={editingSponsor?.status || 'active'}
                    onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="active">{isBn ? 'সক্রিয় (Active)' : 'Active'}</option>
                    <option value="inactive">{isBn ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isBn ? 'প্রদর্শন ক্রম (Order)' : 'Display Order'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingSponsor?.displayOrder || 1}
                    onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), displayOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Logo Upload & URL */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{isBn ? 'লোগো ইমেজ (Logo Upload / URL)' : 'Logo Image (Upload / URL)'}</span>
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    className="text-[11px] text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{isBn ? 'ফাইল আপলোড' : 'Upload File'}</span>
                  </button>
                </label>
                <input
                  type="file"
                  ref={logoFileRef}
                  onChange={(e) => handleFileUpload(e, 'logoUrl')}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="text"
                  value={editingSponsor?.logoUrl || ''}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), logoUrl: e.target.value }))}
                  placeholder="https://... logo image URL"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                {editingSponsor?.logoUrl && (
                  <div className="w-14 h-14 rounded-xl border border-white/20 p-1 bg-white/5 overflow-hidden flex items-center justify-center">
                    <img src={editingSponsor.logoUrl} alt="Logo preview" className="w-full h-full object-contain rounded-lg" />
                  </div>
                )}
              </div>

              {/* Banner Upload & URL */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{isBn ? 'ব্যানার ইমেজ (Banner Upload / URL)' : 'Banner Image (Upload / URL)'}</span>
                  <button
                    type="button"
                    onClick={() => bannerFileRef.current?.click()}
                    className="text-[11px] text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{isBn ? 'ফাইল আপলোড' : 'Upload File'}</span>
                  </button>
                </label>
                <input
                  type="file"
                  ref={bannerFileRef}
                  onChange={(e) => handleFileUpload(e, 'bannerUrl')}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="text"
                  value={editingSponsor?.bannerUrl || ''}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), bannerUrl: e.target.value }))}
                  placeholder="https://... banner cover URL (optional)"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                {editingSponsor?.bannerUrl && (
                  <div className="h-14 w-full rounded-xl border border-white/20 overflow-hidden">
                    <img src={editingSponsor.bannerUrl} alt="Banner preview" className="w-full h-full object-cover rounded-lg" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  {isBn ? 'বিবরণ (Description / Details)' : 'Description / Details'}
                </label>
                <textarea
                  rows={2}
                  value={editingSponsor?.description || ''}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...(prev || {}), description: e.target.value }))}
                  placeholder="Short description of the partner program or sponsor offering..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setEditingSponsor(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'সংরক্ষণ করুন' : 'Save Sponsor')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sponsors Table / Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSponsors.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-3xl bg-white/5 border border-white/10">
            <Sparkles className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-white mb-1">
              {isBn ? 'কোনো স্পন্সর পার্টনার পাওয়া যায়নি' : 'No Sponsor Partners Found'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isBn
                ? 'নতুন পার্টনার যুক্ত করতে উপরের "+ নতুন স্পন্সর যোগ করুন" বাটনে ক্লিক করুন।'
                : 'Click "+ Add New Sponsor" above to create your first partner.'}
            </p>
          </div>
        ) : (
          filteredSponsors.map((sp) => (
            <div
              key={sp.id}
              className="rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 transition-all p-4.5 flex flex-col justify-between space-y-3 relative group shadow-xl"
            >
              {/* Header with Logo & Tier */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={sp.logoUrl}
                      alt={sp.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-white/20 bg-slate-800 shrink-0 shadow-md"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{sp.name}</h4>
                      {sp.tagline && <p className="text-[11px] text-purple-300 truncate">{sp.tagline}</p>}
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${getTierBadge(sp.tier)}`}>
                    {sp.tier}
                  </span>
                </div>

                {/* Banner preview if available */}
                {sp.bannerUrl && (
                  <div className="w-full h-20 rounded-2xl overflow-hidden mb-2 border border-white/10 relative">
                    <img src={sp.bannerUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                {sp.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-2">
                    {sp.description}
                  </p>
                )}

                {/* Destination Link */}
                <a
                  href={sp.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 truncate mb-3"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{sp.destinationUrl}</span>
                </a>

                {/* Analytics Counters */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-white/5 border border-white/5 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isBn ? 'ভিউ (Views)' : 'Impressions'}</span>
                    <span className="font-bold text-white font-mono">{sp.impressionsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isBn ? 'ক্লিক (Clicks)' : 'Clicks'}</span>
                    <span className="font-bold text-emerald-400 font-mono">{sp.clicksCount}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(sp)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    sp.status === 'active'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {sp.status === 'active' ? (isBn ? '● সক্রিয়' : '● Active') : (isBn ? '○ নিষ্ক্রিয়' : '○ Inactive')}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSponsor(sp);
                      setIsCreating(false);
                    }}
                    title="Edit sponsor"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(sp.id, sp.name)}
                    title="Delete sponsor"
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

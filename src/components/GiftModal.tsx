import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Gift as GiftIcon,
  Coins,
  Sparkles,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { Gift } from '../types';
import { useAuth } from '../context/AuthContext';
import { Gift3DPreview } from './Gift3DPreview';

interface GiftModalProps {
  isOpen: boolean;
  postId?: string;
  commentId?: string;
  receiverId?: string;
  receiverName?: string;
  onClose: () => void;
  onGiftSent?: (gift?: Gift) => void;
  onOpenRecharge?: () => void;
}

export const GiftModal: React.FC<GiftModalProps> = ({
  isOpen,
  postId,
  commentId,
  receiverId,
  receiverName,
  onClose,
  onGiftSent,
  onOpenRecharge,
}) => {
  const { user, token, refreshUser } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRechargeInline, setShowRechargeInline] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(1000);
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);

  const fetchGifts = async () => {
    try {
      const res = await fetch('/api/gifts');
      if (res.ok) {
        const data = await res.json();
        const catalog = data.gifts || [];
        setGifts(catalog);
        if (catalog.length > 0 && !selectedGift) {
          setSelectedGift(catalog[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load gifts catalog:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setShowRechargeInline(false);
      fetchGifts();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const userBalance = user.coinsBalance ?? 0;
  const isInsufficient = selectedGift ? userBalance < selectedGift.coinPrice : false;

  const categories = [
    { id: 'all', label: 'All Artifacts' },
    { id: 'popular', label: 'Popular' },
    { id: 'luxury', label: 'Luxury' },
    { id: 'cosmic', label: 'Cosmic' },
    { id: 'legendary', label: 'Legendary' },
    { id: 'vip', label: 'VIP' },
  ];

  const filteredGifts = selectedCategory === 'all'
    ? gifts
    : gifts.filter((g) => g.category?.toLowerCase() === selectedCategory);

  const handleSendGift = async () => {
    if (!selectedGift || !token || !receiverId || isSending) return;
    setError(null);

    // Client-side sufficiency validation
    if (isInsufficient) {
      setError('আপনার পর্যাপ্ত কয়েন নেই');
      return;
    }

    setIsSending(true);

    // Generate unique idempotency key to prevent double-click duplicate gifts
    const idempotencyKey = `idem_${user.id}_${selectedGift.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          giftId: selectedGift.id,
          receiverId,
          postId: postId || null,
          commentId: commentId || null,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If server returns error, show the exact message (including "আপনার পর্যাপ্ত কয়েন নেই")
        throw new Error(data.error || 'Gift transmission failed');
      }

      await refreshUser();
      if (onGiftSent) onGiftSent(selectedGift);
      onClose();
    } catch (err: any) {
      console.error('Error sending gift:', err);
      // Map insufficient balance message if English or fallback to user specified exact Bengali text
      const msg = err.message || '';
      if (msg.includes('Insufficient') || msg.includes('পর্যাপ্ত')) {
        setError('আপনার পর্যাপ্ত কয়েন নেই');
      } else {
        setError(msg || 'Failed to complete gift transmission');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleInlineRecharge = async () => {
    if (!token || isRecharging) return;
    setIsRecharging(true);
    try {
      const res = await fetch('/api/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountCoins: rechargeAmount }),
      });
      if (res.ok) {
        await refreshUser();
        setRechargeSuccess(true);
        setError(null);
        setTimeout(() => {
          setShowRechargeInline(false);
          setRechargeSuccess(false);
        }, 1200);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecharging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-400">
              <GiftIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Send 3D Virtual Gift
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                {receiverName ? `Reward ${receiverName} with holographic artifacts` : 'Support creators with platform artifacts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Insufficient Coins Notification / Error Banner */}
        {error && (
          <div className="mt-3 p-3 bg-rose-950/60 border border-rose-500/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-200 animate-in shake duration-300 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>

            {/* Prompt exact button: 'কয়েন কিনুন' */}
            {(error === 'আপনার পর্যাপ্ত কয়েন নেই' || isInsufficient) && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenRecharge) {
                    onClose();
                    onOpenRecharge();
                  } else {
                    setShowRechargeInline(true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>কয়েন কিনুন</span>
              </button>
            )}
          </div>
        )}

        {/* Inline Quick Recharge Panel if toggled */}
        {showRechargeInline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" /> Instant Coin Recharge
              </span>
              <button
                onClick={() => setShowRechargeInline(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="flex items-center gap-2">
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setRechargeAmount(amt)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ${
                    rechargeAmount === amt
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>
            <button
              onClick={handleInlineRecharge}
              disabled={isRecharging}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50"
            >
              {isRecharging ? (
                <span>Recharging Wallet...</span>
              ) : rechargeSuccess ? (
                <span className="flex items-center gap-1 text-emerald-950 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Recharged Successfully!
                </span>
              ) : (
                <span>Confirm Recharge (+{rechargeAmount} Coins)</span>
              )}
            </button>
          </motion.div>
        )}

        {/* Main Content Area */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3.5 overflow-y-auto pr-1">
          {/* Left Column: Interactive 3D Showcase */}
          <div className="sm:col-span-5 flex flex-col items-center justify-between p-4 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 relative overflow-hidden">
            <div className="absolute top-2 left-2.5 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 text-[10px] font-bold tracking-wider uppercase">
              3D Hologram
            </div>

            <div className="py-2 w-full flex items-center justify-center">
              {selectedGift && (
                <Gift3DPreview
                  image3d={selectedGift.image3d}
                  animation={selectedGift.animation}
                  size="lg"
                  isInteractive={true}
                />
              )}
            </div>

            <div className="w-full text-center mt-1">
              <h4 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
                {selectedGift?.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                {selectedGift?.description || 'Exclusive spatial transmission artifact.'}
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-300 font-mono font-bold text-xs">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>{selectedGift?.coinPrice.toLocaleString()} Coins</span>
              </div>
            </div>
          </div>

          {/* Right Column: Category Filters & Catalog Grid */}
          <div className="sm:col-span-7 flex flex-col gap-2">
            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Gift Tiles */}
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {filteredGifts.map((g) => {
                const isSelected = selectedGift?.id === g.id;
                const canAfford = userBalance >= g.coinPrice;

                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGift(g);
                      setError(null);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 relative group ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/70 shadow-lg scale-102 ring-1 ring-amber-400/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-black/30 border border-white/5">
                      <Gift3DPreview image3d={g.image3d} size="sm" isInteractive={false} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-white truncate group-hover:text-amber-300 transition-colors">
                        {g.name}
                      </p>
                      <p className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                        <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{g.coinPrice}</span>
                      </p>
                    </div>

                    {!canAfford && (
                      <div className="absolute top-1.5 right-1.5 text-slate-500 group-hover:text-rose-400">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: User Coin Balance & Send CTA */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Live Balance pill */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-300">Your Coin Balance:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-amber-300 flex items-center gap-1 text-sm">
                <Coins className="w-4 h-4 text-amber-400" />
                {userBalance.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setShowRechargeInline(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
              >
                + Top Up
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isInsufficient ? (
              <button
                type="button"
                onClick={() => {
                  if (onOpenRecharge) {
                    onClose();
                    onOpenRecharge();
                  } else {
                    setShowRechargeInline(true);
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>কয়েন কিনুন</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendGift}
                disabled={isSending || !selectedGift}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-extrabold text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSending ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Transmitting Gift...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Send Gift ({selectedGift?.coinPrice.toLocaleString()} Coins)
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

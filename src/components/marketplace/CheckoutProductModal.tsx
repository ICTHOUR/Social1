import React, { useState } from 'react';
import {
  ShoppingBag,
  Coins,
  CreditCard,
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { GlassModal } from '../../design-system/components/GlassModal';
import { GlassButton } from '../../design-system/components/GlassButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../design-system/ToastContext';
import { MarketplaceProduct } from './ProductDetailModal';

interface CheckoutProductModalProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: () => void;
  onOpenRecharge?: () => void;
}

export const CheckoutProductModal: React.FC<CheckoutProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onOrderCompleted,
  onOpenRecharge,
}) => {
  const { language } = useLanguage();
  const { user, token, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<'coins' | 'paystation' | 'bkash' | 'cod'>('coins');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product || !user) return null;

  const isBn = language === 'bn';
  const userCoins = user.coinsBalance ?? 0;
  const hasEnoughCoins = userCoins >= product.priceCoins;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim() || !buyerPhone.trim()) {
      addToast(isBn ? 'ডেলিভারি ঠিকানা ও ফোন নম্বর প্রদান করুন' : 'Please provide delivery address and contact phone', 'warning');
      return;
    }

    if (paymentMethod === 'coins' && !hasEnoughCoins) {
      addToast(isBn ? 'আপনার পর্যাপ্ত কয়েন নেই! দয়া করে কয়েন রিচার্জ করুন।' : 'Insufficient coin balance! Please recharge.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          paymentMethod,
          deliveryAddress: deliveryAddress.trim(),
          buyerPhone: buyerPhone.trim(),
          orderNotes: orderNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      addToast(
        isBn ? '🎉 অর্ডারটি সফল হয়েছে! বিক্রেতাকে নোটিফিকেশন পাঠানো হয়েছে।' : '🎉 Order placed successfully! Seller has been notified.',
        'success'
      );
      await refreshUser();
      onOrderCompleted();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Error processing checkout', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'অর্ডার ও পেমেন্ট কনফার্মেশন' : 'Checkout & Order Confirmation'}
      subtitle={product.title}
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <GlassButton type="button" variant="secondary" size="md" onClick={onClose}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </GlassButton>
          <GlassButton
            type="submit"
            form="checkout-order-form"
            variant="primary"
            size="md"
            disabled={isSubmitting || (paymentMethod === 'coins' && !hasEnoughCoins)}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
            className="px-6 py-2 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            {isSubmitting
              ? (isBn ? 'প্রসেসিং হচ্ছে...' : 'Processing...')
              : paymentMethod === 'coins'
              ? (isBn ? `কয়েন দিয়ে কনফার্ম করুন (${product.priceCoins} কয়েন)` : `Confirm with Coins (${product.priceCoins})`)
              : (isBn ? `অর্ডার কনফার্ম করুন (৳${product.priceBdt})` : `Confirm Order (৳${product.priceBdt})`)}
          </GlassButton>
        </div>
      }
    >
      <form id="checkout-order-form" onSubmit={handleSubmitOrder} className="space-y-4 pt-1">
        {/* Order Summary Item Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
              alt={product.title}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {product.title}
              </h4>
              <p className="text-[11px] text-slate-400">Seller: @{product.seller.username}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">৳{product.priceBdt.toLocaleString()}</p>
            <p className="text-xs font-bold text-amber-500 font-mono">{product.priceCoins} Coins</p>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-white">
            {isBn ? 'পেমেন্ট মেথড নির্বাচন করুন' : 'Choose Payment Method'}
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Coins Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod('coins')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                paymentMethod === 'coins'
                  ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-400'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-amber-400/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Instant</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{isBn ? 'কয়েন ওয়ালেট' : 'Coins'}</p>
                <p className="text-[10px] text-slate-400 font-mono">{userCoins} bal</p>
              </div>
            </button>

            {/* PayStation Gateway Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod('paystation')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                paymentMethod === 'paystation'
                  ? 'bg-cyan-500/20 border-cyan-500 shadow-md ring-1 ring-cyan-400'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-cyan-400/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <CreditCard className="w-4 h-4 text-cyan-500" />
                <span className="text-[10px] font-bold uppercase text-cyan-600 dark:text-cyan-400">Gateway</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">PayStation</p>
                <p className="text-[10px] text-slate-400">Card / Banking</p>
              </div>
            </button>

            {/* bKash / Nagad Direct Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod('bkash')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                paymentMethod === 'bkash'
                  ? 'bg-pink-500/20 border-pink-500 shadow-md ring-1 ring-pink-400'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-pink-400/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Zap className="w-4 h-4 text-pink-500" />
                <span className="text-[10px] font-bold uppercase text-pink-600 dark:text-pink-400">MFS</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">bKash / Nagad</p>
                <p className="text-[10px] text-slate-400">Direct Pay</p>
              </div>
            </button>

            {/* Cash on Delivery (COD) Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod('cod')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                paymentMethod === 'cod'
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-md ring-1 ring-emerald-400'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-emerald-400/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Truck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">COD</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{isBn ? 'হাতে পেয়ে' : 'Cash On Delivery'}</p>
                <p className="text-[10px] text-slate-400">Pay on Hand</p>
              </div>
            </button>
          </div>
        </div>

        {/* Insufficient coins notice & Recharge button */}
        {paymentMethod === 'coins' && !hasEnoughCoins && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {isBn
                  ? `আপনার পর্যাপ্ত কয়েন নেই (ঘাটতি: ${product.priceCoins - userCoins} কয়েন)`
                  : `Insufficient coin balance (${product.priceCoins - userCoins} coins short)`}
              </span>
            </div>
            {onOpenRecharge && (
              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenRecharge();
                }}
                className="shrink-0 text-xs font-bold"
              >
                {isBn ? '+ কয়েন রিচার্জ করুন' : '+ Recharge Coins'}
              </GlassButton>
            )}
          </div>
        )}

        {/* Delivery Address & Phone Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isBn ? 'পূর্ণাঙ্গ ডেলিভারি ঠিকানা' : 'Full Delivery Address'}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={isBn ? 'বাসা নং, রোড নং, এলাকা, থানা, জেলা' : 'House #, Road #, Area, City, District'}
              className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isBn ? 'যোগাযোগের ফোন নম্বর' : 'Recipient Phone Number'}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="017xxxxxxxx"
              className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'বিশেষ কোনো নির্দেশনা (ঐচ্ছিক)' : 'Special Delivery Note (Optional)'}
            </label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={isBn ? 'উদা: বিকাল ৫টার পর ডেলিভারি দিন' : 'e.g. Call before delivery'}
              className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
        </div>
      </form>
    </GlassModal>
  );
};

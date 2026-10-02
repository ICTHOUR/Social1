import React, { useState } from 'react';
import {
  ShoppingBag,
  Coins,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Share2,
  MessageSquare,
  Phone,
  Tag,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { GlassModal } from '../../design-system/components/GlassModal';
import { GlassButton } from '../../design-system/components/GlassButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../design-system/ToastContext';

export interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  priceBdt: number;
  priceCoins: number;
  category: string;
  condition: string;
  location: string;
  images: string[];
  phone?: string;
  isNegotiable: boolean;
  status: string;
  viewsCount: number;
  createdAt: string;
  seller: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
    isVerified?: boolean;
    badge?: string;
    email?: string;
    joinedAt?: string;
  };
}

interface ProductDetailModalProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: (product: MarketplaceProduct) => void;
  onChatWithSeller?: (sellerId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onBuyNow,
  onChatWithSeller,
}) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showPhone, setShowPhone] = useState(false);

  if (!isOpen || !product) return null;

  const isBn = language === 'bn';
  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast(isBn ? 'প্রোডাক্টের লিংক কপি করা হয়েছে!' : 'Product link copied to clipboard!', 'success');
  };

  const isOwnProduct = user && user.id === product.seller.id;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={product.title}
      subtitle={`${product.category} · 📍 ${product.location}`}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {isBn ? 'মূল্য' : 'Price'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  ৳{product.priceBdt.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-0.5 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Coins className="w-3.5 h-3.5" />
                  {product.priceCoins.toLocaleString()} {isBn ? 'কয়েন' : 'Coins'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <GlassButton
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCopyLink}
              className="p-2.5"
              title={isBn ? 'শেয়ার করুন' : 'Share'}
            >
              <Share2 className="w-4 h-4" />
            </GlassButton>

            {!isOwnProduct && (
              <GlassButton
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  onClose();
                  onBuyNow(product);
                }}
                leftIcon={<ShoppingBag className="w-4 h-4" />}
                className="flex-1 sm:flex-none px-6 py-2.5 font-bold shadow-lg shadow-cyan-500/25"
              >
                {isBn ? 'অর্ডার করুন (Buy Now)' : 'Buy Now / Checkout'}
              </GlassButton>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Gallery Preview Box */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-200/90 dark:border-white/10 aspect-video flex items-center justify-center group">
          <img
            src={images[activeImageIndex]}
            alt={product.title}
            className="w-full h-full object-cover max-h-80"
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/90 text-slate-950 backdrop-blur-md border border-emerald-300 shadow-lg flex items-center gap-1 animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isBn ? '✅ ১০০% অথেন্টিক ও রিয়েল পিক' : '✅ Authentic & Real Photo'}</span>
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-md border border-white/20">
              {product.condition.replace('_', ' ')}
            </span>
            {product.isNegotiable && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500 text-slate-950 backdrop-blur-md shadow-md">
                {isBn ? 'দরদাম যোগ্য' : 'Negotiable'}
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Selector */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  activeImageIndex === idx
                    ? 'border-cyan-500 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Description Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'বিবরণ' : 'Description & Specifications'}
          </h4>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>

        {/* Seller Info Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={
                product.seller.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
              }
              alt={product.seller.fullName}
              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500/40"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {product.seller.fullName}
                </span>
                {product.seller.isVerified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
                {product.seller.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-cyan-500/10 text-cyan-500 font-semibold border border-cyan-500/20">
                    {product.seller.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">@{product.seller.username} · {isBn ? 'ভেরিফাইড বিক্রেতা' : 'Verified Seller'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {product.phone && (
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowPhone(!showPhone)}
                leftIcon={<Phone className="w-3.5 h-3.5 text-cyan-500" />}
                className="flex-1 sm:flex-none text-xs font-semibold"
              >
                {showPhone ? product.phone : (isBn ? 'ফোন নম্বর দেখুন' : 'Show Phone')}
              </GlassButton>
            )}

            {onChatWithSeller && (
              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onChatWithSeller(product.seller.id)}
                leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                className="flex-1 sm:flex-none text-xs font-semibold shadow-md"
              >
                {isBn ? 'মেসেজ দিন' : 'Chat'}
              </GlassButton>
            )}
          </div>
        </div>

        {/* Security / Buyer Protection Badge */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-[11px] leading-snug">
            {isBn
              ? 'নিরাপদ লেনদেন গ্যারান্টি: কয়েন অথবা পেস্টেশনের মাধ্যমে পেমেন্ট করলে পণ্য বুঝে না পাওয়া পর্যন্ত প্ল্যাটফর্ম এসক্রো প্রোটেকশন কার্যকর থাকে।'
              : 'Buyer Protection Guaranteed: Coin and PayStation escrow ensure 100% safe transaction until you receive and verify the item.'}
          </p>
        </div>
      </div>
    </GlassModal>
  );
};

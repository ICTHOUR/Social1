import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Coins,
  MapPin,
  Tag,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Package,
  Layers,
  ArrowUpDown,
  Phone,
  MessageSquare,
  DollarSign,
  TrendingUp,
  X,
} from 'lucide-react';
import { GlassCard } from '../../design-system/components/GlassCard';
import { GlassButton } from '../../design-system/components/GlassButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../design-system/ToastContext';
import { ProductDetailModal, MarketplaceProduct } from './ProductDetailModal';
import { CreateListingModal } from './CreateListingModal';
import { CheckoutProductModal } from './CheckoutProductModal';

interface MarketplaceViewProps {
  onOpenRecharge?: () => void;
  onNavigateToChat?: (userId: string) => void;
  onNavigateToProfile?: (userId: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Items', bnLabel: 'সকল পণ্য', icon: '🛍️' },
  { id: 'Electronics', label: 'Electronics', bnLabel: 'ইলেকট্রনিক্স', icon: '💻' },
  { id: 'Fashion', label: 'Fashion', bnLabel: 'ফ্যাশন ও পোশাক', icon: '👟' },
  { id: 'Digital Assets', label: 'Digital Assets', bnLabel: 'ডিজিটাল অ্যাসেট', icon: '💎' },
  { id: 'Gaming', label: 'Gaming', bnLabel: 'গেমিং ও কনসোল', icon: '🎮' },
  { id: 'Vehicles', label: 'Vehicles', bnLabel: 'গাড়ি ও বাইক', icon: '🚗' },
  { id: 'Home & Living', label: 'Home & Living', bnLabel: 'হোম ও লিভিং', icon: '🏠' },
  { id: 'Books', label: 'Books', bnLabel: 'বই ও স্টাডি', icon: '📚' },
  { id: 'Services', label: 'Services', bnLabel: 'সার্ভিস ও কাজ', icon: '⚡' },
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  onOpenRecharge,
  onNavigateToChat,
  onNavigateToProfile,
}) => {
  const { language } = useLanguage();
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const isBn = language === 'bn';

  // Navigation tabs inside Marketplace
  const [activeTab, setActiveTab] = useState<'browse' | 'my_listings' | 'my_orders'>('browse');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [displayCurrency, setDisplayCurrency] = useState<'bdt' | 'coins'>('bdt');

  // Data states
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceProduct[]>([]);
  const [myOrders, setMyOrders] = useState<{ purchases: any[]; sales: any[] }>({ purchases: [], sales: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<MarketplaceProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedCondition !== 'all') params.append('condition', selectedCondition);
      if (selectedLocation !== 'all') params.append('location', selectedLocation);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/marketplace/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load marketplace products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyListings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/marketplace/my-listings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyListings(data.listings || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/marketplace/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyOrders({
          purchases: data.purchases || [],
          sales: data.sales || [],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'browse') fetchProducts();
    if (activeTab === 'my_listings') fetchMyListings();
    if (activeTab === 'my_orders') fetchMyOrders();
  }, [activeTab, selectedCategory, selectedCondition, selectedLocation, sortOption, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenDetail = (prod: MarketplaceProduct) => {
    setSelectedProduct(prod);
    setIsDetailOpen(true);
  };

  const handleOpenBuy = (prod: MarketplaceProduct) => {
    setCheckoutProduct(prod);
    setIsCheckoutOpen(true);
  };

  const handleDeleteListing = async (productId: string) => {
    if (!token) return;
    if (!window.confirm(isBn ? 'আপনি কি নিশ্চিত যে এই লিস্টিংটি ডিলিট করতে চান?' : 'Are you sure you want to delete this listing?')) {
      return;
    }
    try {
      const res = await fetch(`/api/marketplace/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast(isBn ? 'লিস্টিং মুছে ফেলা হয়েছে' : 'Listing deleted', 'info');
        fetchMyListings();
        fetchProducts();
      }
    } catch (e) {
      addToast('Failed to delete listing', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* 1. HERO HEADER & QUICK ACTION BAR */}
      <GlassCard variant="surface" className="p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/25">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
                  <ShoppingBag className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isBn ? 'নিক্সো মার্কেটপ্লেস' : 'Nixo Marketplace'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {isBn ? 'কয়েন ও টাকা' : 'Coins & Cash'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'কয়েন অথবা টাকার মাধ্যমে পণ্য কেনাবেচা করুন · ১০০% রিয়েল পিক ও অথেন্টিক গ্যারান্টি সিস্টেম'
                    : 'Buy and sell physical & digital goods seamlessly · 100% Real Photo & Authentic Verification System'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Currency Mode Switcher */}
            <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDisplayCurrency('bdt')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  displayCurrency === 'bdt'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ৳ BDT
              </button>
              <button
                type="button"
                onClick={() => setDisplayCurrency('coins')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  displayCurrency === 'coins'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Coins className="w-3 h-3" />
                <span>Coins</span>
              </button>
            </div>

            {/* Sell Item CTA */}
            <GlassButton
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                if (!token) {
                  addToast(isBn ? 'পণ্য বিক্রি করতে লগইন করুন' : 'Please log in to sell items', 'info');
                  return;
                }
                setIsCreateOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
              className="px-5 py-2 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              {isBn ? '+ বিক্রি করুন' : '+ Sell Item'}
            </GlassButton>
          </div>
        </div>

        {/* Search Bar & Primary Navigation Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-white dark:bg-[#0c1428] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? '🛍️ সকল পণ্য' : '🛍️ Browse All'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my_listings')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'my_listings'
                  ? 'bg-white dark:bg-[#0c1428] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? '📦 আমার লিস্টিং' : '📦 My Listings'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my_orders')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'my_orders'
                  ? 'bg-white dark:bg-[#0c1428] text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? '📑 আমার অর্ডার' : '📑 My Orders'}
            </button>
          </div>

          {/* Search Form */}
          {activeTab === 'browse' && (
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? 'মার্কেটপ্লেসে খুঁজুন...' : 'Search items, brands, tags...'}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchProducts();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </form>
          )}
        </div>
      </GlassCard>

      {/* 2. CATEGORY PILLS BAR (BROWSE TAB) */}
      {activeTab === 'browse' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 scale-105'
                    : 'liquid-glass-surface bg-white/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{isBn ? cat.bnLabel : cat.label}</span>
              </button>
            ))}
          </div>

          {/* Secondary Sorting & Filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Condition Filter */}
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="bg-white dark:bg-[#0c1428] border border-slate-200 dark:border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold outline-none cursor-pointer"
              >
                <option value="all">{isBn ? 'সকল অবস্থা' : 'All Conditions'}</option>
                <option value="new">{isBn ? 'নতুন (New)' : 'Brand New'}</option>
                <option value="like_new">{isBn ? 'নতুনের মতো (Like New)' : 'Like New'}</option>
                <option value="used_good">{isBn ? 'ব্যবহৃত (Used)' : 'Used'}</option>
              </select>

              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-white dark:bg-[#0c1428] border border-slate-200 dark:border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold outline-none cursor-pointer"
              >
                <option value="all">{isBn ? 'সকল এলাকা' : 'All Locations'}</option>
                <option value="Dhaka">Dhaka</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-white dark:bg-[#0c1428] border border-slate-200 dark:border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold outline-none cursor-pointer"
              >
                <option value="newest">{isBn ? 'সর্বশেষ পণ্য' : 'Newest Arrivals'}</option>
                <option value="popular">{isBn ? 'জনপ্রিয়' : 'Most Popular'}</option>
                <option value="price_asc">{isBn ? 'দাম: কম থেকে বেশি' : 'Price: Low to High'}</option>
                <option value="price_desc">{isBn ? 'দাম: বেশি থেকে কম' : 'Price: High to Low'}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT: BROWSE GRID */}
      {activeTab === 'browse' && (
        <div>
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Loading marketplace goods...</p>
            </div>
          ) : products.length === 0 ? (
            <GlassCard variant="surface" className="p-12 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isBn ? 'কোনো পণ্য পাওয়া যায়নি' : 'No Items Found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isBn
                  ? 'আপনার ফিল্টার অথবা সার্চ কুয়েরি পরিবর্তন করে আবার চেষ্টা করুন।'
                  : 'Try selecting a different category or clearing search filters.'}
              </p>
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedCondition('all');
                  setSelectedLocation('all');
                  setSearchQuery('');
                  fetchProducts();
                }}
              >
                {isBn ? 'সব ফিল্টার রিসেট করুন' : 'Reset All Filters'}
              </GlassButton>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const img = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
                return (
                  <div
                    key={product.id}
                    onClick={() => handleOpenDetail(product)}
                    className="group rounded-3xl p-3.5 liquid-glass-2 bg-white/80 dark:bg-[#0c1428]/80 hover:bg-white dark:hover:bg-[#101a35] transition-all duration-300 shadow-md hover:shadow-2xl flex flex-col justify-between space-y-3 cursor-pointer relative overflow-hidden"
                  >
                    {/* Media Preview Box */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950/40 border border-slate-200/60 dark:border-white/10">
                      <img
                        src={img}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                        {product.condition.replace('_', ' ')}
                      </div>
                      {product.isNegotiable && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold backdrop-blur-md">
                          {isBn ? 'দরদাম' : 'Negotiable'}
                        </div>
                      )}
                    </div>

                    {/* Information Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400 truncate">{product.category}</span>
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {product.location}
                        </span>
                      </div>

                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-cyan-500 transition-colors">
                        {product.title}
                      </h3>

                      {/* Price Section */}
                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          {displayCurrency === 'bdt' ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-black text-slate-900 dark:text-white">
                                ৳{product.priceBdt.toLocaleString()}
                              </span>
                              <span className="text-[11px] font-mono text-amber-500 font-bold">
                                ({product.priceCoins} Coins)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-black text-amber-500 flex items-center gap-1 font-mono">
                                <Coins className="w-4 h-4 text-amber-500" />
                                {product.priceCoins.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-400 font-semibold">
                                (৳{product.priceBdt.toLocaleString()})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Seller & Buy Action */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={product.seller.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt={product.seller.fullName}
                          className="w-6 h-6 rounded-full object-cover border border-cyan-400/40 shrink-0"
                        />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {product.seller.fullName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBuy(product);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-sm shadow-cyan-500/20 active:scale-95 transition-transform cursor-pointer shrink-0"
                      >
                        {isBn ? 'কিনুন' : 'Buy Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MY LISTINGS TAB */}
      {activeTab === 'my_listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {isBn ? 'আমার বিক্রির জন্য দেওয়া পণ্যসমূহ' : 'My Active Marketplace Listings'}
            </h2>
            <GlassButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {isBn ? '+ নতুন পণ্য যোগ করুন' : '+ List New Item'}
            </GlassButton>
          </div>

          {myListings.length === 0 ? (
            <GlassCard variant="surface" className="p-8 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
              <p className="text-xs text-slate-400">
                {isBn ? 'আপনি এখনো কোনো পণ্য লিস্টিং করেননি।' : 'You have not listed any products for sale yet.'}
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myListings.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 rounded-2xl liquid-glass-surface border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                      alt={prod.title}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {prod.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">৳{prod.priceBdt}</span>
                        <span>·</span>
                        <span className="text-amber-500 font-mono font-bold">{prod.priceCoins} Coins</span>
                        <span>·</span>
                        <span>👁️ {prod.viewsCount || 0} views</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteListing(prod.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Listing"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MY ORDERS TAB */}
      {activeTab === 'my_orders' && (
        <div className="space-y-6">
          {/* Purchases */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isBn ? 'আমার ক্রয়সমূহ (My Purchases)' : 'My Purchases'}
            </h3>
            {myOrders.purchases.length === 0 ? (
              <GlassCard variant="surface" className="p-6 text-center text-xs text-slate-400">
                {isBn ? 'আপনার কোনো কেনাকাটার ইতিহাস নেই।' : 'No purchase records found.'}
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {myOrders.purchases.map((ord: any) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl liquid-glass-surface border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={ord.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{ord.product_title}</p>
                        <p className="text-[11px] text-slate-400">Seller: {ord.seller_name} · {ord.payment_method.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]">
                        {ord.status}
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">৳{ord.amount_paid}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isBn ? 'আমার বিক্রয়সমূহ (My Sales / Customer Orders)' : 'My Sales / Customer Orders'}
            </h3>
            {myOrders.sales.length === 0 ? (
              <GlassCard variant="surface" className="p-6 text-center text-xs text-slate-400">
                {isBn ? 'আপনার কোনো বিক্রয়ের রেকর্ড নেই।' : 'No sales records found.'}
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {myOrders.sales.map((ord: any) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl liquid-glass-surface border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={ord.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{ord.product_title}</p>
                        <p className="text-[11px] text-slate-400">Buyer: {ord.buyer_name} ({ord.buyer_phone})</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold uppercase text-[10px]">
                        {ord.status}
                      </span>
                      <p className="text-xs font-bold text-emerald-500 font-mono mt-1">+৳{ord.amount_paid}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODALS */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onBuyNow={(prod) => {
          setIsDetailOpen(false);
          handleOpenBuy(prod);
        }}
        onChatWithSeller={onNavigateToChat}
      />

      <CreateListingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onListingCreated={() => {
          fetchProducts();
          fetchMyListings();
        }}
      />

      <CheckoutProductModal
        product={checkoutProduct}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderCompleted={() => {
          fetchProducts();
          fetchMyOrders();
        }}
        onOpenRecharge={onOpenRecharge}
      />
    </div>
  );
};

export default MarketplaceView;

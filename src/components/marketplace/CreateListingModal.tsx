import React, { useState } from 'react';
import {
  PlusCircle,
  Coins,
  MapPin,
  Tag,
  Image as ImageIcon,
  Phone,
  Sparkles,
  AlertCircle,
  X,
  Upload,
} from 'lucide-react';
import { GlassModal } from '../../design-system/components/GlassModal';
import { GlassButton } from '../../design-system/components/GlassButton';
import { GlassInput } from '../../design-system/components/GlassInput';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../design-system/ToastContext';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: () => void;
}

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Digital Assets',
  'Gaming',
  'Vehicles',
  'Home & Living',
  'Books',
  'Services',
  'Other',
];

const LOCATIONS = [
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Instant / Online Delivery',
];

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onListingCreated,
}) => {
  const { language } = useLanguage();
  const { user, token, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceBdt, setPriceBdt] = useState<number | ''>('');
  const [priceCoins, setPriceCoins] = useState<number | ''>('');
  const [category, setCategory] = useState('Electronics');
  const [condition, setCondition] = useState('new');
  const [location, setLocation] = useState('Dhaka');
  const [phone, setPhone] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBn = language === 'bn';

  const handlePriceChange = (val: string) => {
    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
      setPriceBdt(num);
      setPriceCoins(Math.round(num / 10)); // Default 10 BDT = 1 coin
    } else {
      setPriceBdt('');
      setPriceCoins('');
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim() && !imageUrls.includes(newImageUrl.trim())) {
      setImageUrls([...imageUrls, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setImageUrls((prev) => [...prev, evt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (idx: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title.trim() || !description.trim() || !priceBdt) {
      addToast(isBn ? 'অনুগ্রহ করে সকল তথ্য পূরণ করুন' : 'Please complete all required fields', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priceBdt: Number(priceBdt),
          priceCoins: priceCoins ? Number(priceCoins) : Math.round(Number(priceBdt) / 10),
          category,
          condition,
          location,
          images: imageUrls.length > 0 ? imageUrls : [
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
          ],
          phone: phone.trim(),
          isNegotiable,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to list product');
      }

      addToast(
        isBn ? '✨ আপনার প্রোডাক্ট মার্কেটপ্লেসে সফলভাবে যুক্ত হয়েছে! (+৫ কয়েন বোনাস)' : '✨ Product listed successfully! (+5 coins reward)',
        'success'
      );
      await refreshUser();
      onListingCreated();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Error listing product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'মার্কেটপ্লেসে পণ্য বিক্রি করুন' : 'Sell an Item on Marketplace'}
      subtitle={isBn ? 'আপনার নতুন বা ব্যবহৃত পণ্য সরাসরি কয়েন ও টাকায় বিক্রি করুন' : 'List your physical goods or digital creations to earn coins and cash'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <GlassButton type="button" variant="secondary" size="md" onClick={onClose}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </GlassButton>
          <GlassButton
            type="submit"
            form="create-listing-form"
            variant="primary"
            size="md"
            disabled={isSubmitting || !title.trim() || !priceBdt}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="px-6 py-2 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            {isSubmitting ? (isBn ? 'পোস্ট হচ্ছে...' : 'Publishing...') : (isBn ? 'লিস্টিং পোস্ট করুন (+৫ কয়েন)' : 'Publish Listing (+5 Coins)')}
          </GlassButton>
        </div>
      }
    >
      <form id="create-listing-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Title */}
        <GlassInput
          label={isBn ? 'পণ্য বা সার্ভিসের নাম (Title)' : 'Item Title'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isBn ? 'উদা: আইফোন ১৫ প্রো ম্যাক্স (২৫৬ জিবি)' : 'e.g. Sony Alpha A7 IV Camera or Custom Keycaps'}
          required
        />

        {/* Categories & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'ক্যাটাগরি' : 'Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'অবস্থা (Condition)' : 'Condition'}
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
            >
              <option value="new">{isBn ? 'সম্পূর্ণ নতুন (Brand New)' : 'Brand New'}</option>
              <option value="like_new">{isBn ? 'নতুনের মতো (Like New)' : 'Like New'}</option>
              <option value="used_good">{isBn ? 'ব্যবহৃত - ভালো অবস্থা (Used - Good)' : 'Used - Good'}</option>
              <option value="refurbished">{isBn ? 'রিফার্বিশড (Refurbished)' : 'Refurbished'}</option>
            </select>
          </div>
        </div>

        {/* Pricing in BDT and Coins */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>{isBn ? 'মূল্য (টাকা / BDT)' : 'Price (BDT ৳)'}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={priceBdt}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="e.g. 15000"
              min="1"
              className="w-full bg-white dark:bg-[#0c1428] border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white outline-none mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              <span>{isBn ? 'কয়েন মূল্য (Coins Price)' : 'Coins Price'}</span>
            </label>
            <input
              type="number"
              value={priceCoins}
              onChange={(e) => setPriceCoins(Number(e.target.value))}
              placeholder="e.g. 1500"
              min="1"
              className="w-full bg-white dark:bg-[#0c1428] border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold font-mono text-amber-600 dark:text-amber-400 outline-none mt-1"
            />
          </div>
        </div>

        {/* Location & Contact Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isBn ? 'লোকেশন / জেলা' : 'Location'}</span>
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isBn ? 'যোগাযোগের মোবাইল নম্বর' : 'Contact Phone'}</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017xxxxxxxx"
              className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isBn ? 'পণ্যের বিস্তারিত বিবরণ' : 'Description'}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={isBn ? 'পণ্যটির ওয়ারেন্টি, বর্তমান অবস্থা ও বিশেষ বৈশিষ্ট্য লিখুন...' : 'Describe the item, warranty, usage history, and key features...'}
            className="w-full bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl p-3 text-xs leading-relaxed text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none"
            required
          />
        </div>

        {/* Image Upload / URLs Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>{isBn ? 'পণ্যের ছবি (গ্যালারি থেকে বা লিংক)' : 'Product Photos (Upload or URL)'}</span>
            <span className="text-[11px] text-slate-400">({imageUrls.length} added)</span>
          </label>
          
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="flex-1 min-w-[200px] bg-white dark:bg-[#080d1a] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
            <GlassButton type="button" variant="secondary" size="sm" onClick={handleAddImage}>
              {isBn ? '+ URL' : '+ URL'}
            </GlassButton>
            <label className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-xs border border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{isBn ? 'ছবি আপলোড' : 'Upload File'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {imageUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto p-1">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 shrink-0 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Negotiable Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="negotiable"
            checked={isNegotiable}
            onChange={(e) => setIsNegotiable(e.target.checked)}
            className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
          />
          <label htmlFor="negotiable" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            {isBn ? 'দরদাম করার সুযোগ রয়েছে (Price is Negotiable)' : 'Price is Negotiable'}
          </label>
        </div>
      </form>
    </GlassModal>
  );
};

import React, { useState } from 'react';
import {
  Type,
  Sparkles,
  Check,
  Save,
  RefreshCw,
  Sliders,
  Eye,
  Globe,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTypography, FontOption } from '../../context/TypographyContext';

export const AdminTypographyManager: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const { typography, updateTypography } = useTypography();

  const [activeFont, setActiveFont] = useState(typography.activeFont);
  const [activeBanglaFont, setActiveBanglaFont] = useState(typography.activeBanglaFont);
  const [activeEnglishFont, setActiveEnglishFont] = useState(typography.activeEnglishFont);
  const [applyTo, setApplyTo] = useState<'all' | 'feed' | 'dashboard'>(typography.applyTo);
  const [fontSizeScale, setFontSizeScale] = useState(typography.fontSizeScale || 100);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const banglaFonts = typography.availableFonts.filter((f) => f.lang === 'bn');
  const englishFonts = typography.availableFonts.filter((f) => f.lang === 'en');

  const handleApply = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    try {
      const ok = await updateTypography({
        activeFont,
        activeBanglaFont,
        activeEnglishFont,
        applyTo,
        fontSizeScale,
      });
      if (ok) {
        setSuccessMessage(
          isBn
            ? 'ফন্ট সেটিংস সফলভাবে আপডেট ও সম্পূর্ণ ওয়েবসাইটে কার্যকর করা হয়েছে!'
            : 'Typography settings updated and applied globally across NIXO!'
        );
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2">
            <Type className="w-6 h-6 text-cyan-400" />
            <span>{isBn ? 'ডাইনামিক ফন্ট ও টাইপোগ্রাফি কন্ট্রোল' : 'Dynamic Font & Typography Engine'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isBn
              ? 'ইউজার ড্যাশবোর্ড, ফিড ও সম্পূর্ণ ওয়েবসাইটের বাংলা ও ইংরেজি ফন্ট এডমিন ড্যাশবোর্ড থেকে তাৎক্ষণিকভাবে পরিবর্তন করুন।'
              : 'Customize and hot-swap global Bangla and English typography across the entire NIXO platform and feeds.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'ফন্ট পরিবর্তন সংরক্ষণ করুন' : 'Save & Apply Fonts')}</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Font Configuration Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Bangla Font Card */}
        <div className="p-5 rounded-3xl bg-slate-900/70 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{isBn ? 'বাংলা ফন্ট নির্বাচন (Bangla Fonts)' : 'Primary Bangla Font'}</span>
            </h3>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {activeBanglaFont}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {isBn ? 'ফিড পোস্ট, মেনু এবং বাংলা টেক্সটের জন্য প্রিমিয়াম গুগল ফন্ট নির্বাচন করুন:' : 'Select official Google font optimized for Bengali typography:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {banglaFonts.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => {
                  setActiveBanglaFont(font.id);
                  setActiveFont(font.id);
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  activeBanglaFont === font.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs" style={{ fontFamily: `'${font.id}', sans-serif` }}>
                    {font.name}
                  </span>
                  {activeBanglaFont === font.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1" style={{ fontFamily: `'${font.id}', sans-serif` }}>
                  আমার সোনার বাংলা, আমি তোমায় ভালোবাসি
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* English / Latin Font Card */}
        <div className="p-5 rounded-3xl bg-slate-900/70 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>{isBn ? 'ইংরেজি ফন্ট নির্বাচন (English Fonts)' : 'Primary English / UI Font'}</span>
            </h3>
            <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              {activeEnglishFont}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {isBn ? 'ইউজার ইন্টারফেস ও ইংরেজি টেক্সটের জন্য আধুনিক ফন্ট নির্বাচন করুন:' : 'Select modern UI typography for numbers, headings, and English text:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {englishFonts.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => {
                  setActiveEnglishFont(font.id);
                  setActiveFont(font.id);
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  activeEnglishFont === font.id
                    ? 'bg-purple-500/20 border-purple-400 text-white shadow-md shadow-purple-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs" style={{ fontFamily: `'${font.id}', sans-serif` }}>
                    {font.name}
                  </span>
                  {activeEnglishFont === font.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1" style={{ fontFamily: `'${font.id}', sans-serif` }}>
                  The quick brown fox jumps over the lazy dog
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Scope & Font Scale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-3xl bg-slate-900/60 border border-white/10">
        {/* Apply Scope */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>{isBn ? 'ফন্ট কার্যকরের পরিধি' : 'Target Application Scope'}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all', label: isBn ? 'সকল পেইজ' : 'All Platform' },
              { id: 'feed', label: isBn ? 'শুধু ফিড ও পোস্ট' : 'Feed Only' },
              { id: 'dashboard', label: isBn ? 'শুধু ড্যাশবোর্ড' : 'Dashboard' },
            ].map((scope) => (
              <button
                key={scope.id}
                type="button"
                onClick={() => setApplyTo(scope.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  applyTo === scope.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Scaling */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>{isBn ? 'ফন্ট স্কেলিং (Font Scale)' : 'Font Size Scale'}</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold">{fontSizeScale}%</span>
          </div>
          <input
            type="range"
            min="90"
            max="115"
            step="1"
            value={fontSizeScale}
            onChange={(e) => setFontSizeScale(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>90% (Compact)</span>
            <span>100% (Default)</span>
            <span>115% (Comfortable)</span>
          </div>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/15 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>{isBn ? 'লাইভ টেক্সট প্রিভিউ' : 'Live Real-Time Font Preview'}</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {activeBanglaFont} + {activeEnglishFont}
          </span>
        </div>

        <div
          className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3"
          style={{
            fontFamily: `'${activeBanglaFont}', '${activeEnglishFont}', sans-serif`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
              NIXO Transmission Feed • লাইভ টেস্ট
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-bold text-white">
            NIXO সোশ্যাল প্ল্যাটফর্মে আপনাকে স্বাগতম — The Next Generation Liquid Glass Universe
          </h4>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            এটি একটি লাইভ প্রিভিউ যেখানে নির্বাচিত বাংলা ও ইংরেজি ফন্টের কম্বিনেশন একসাথে দেখা যাচ্ছে। প্রতিটি পোস্টের শিরোনাম, বিবরণ, লাইক, শেয়ার এবং কয়েন ট্রানজেকশন এই ফন্টে সুন্দরভাবে প্রদর্শিত হবে।
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold">
              💎 500 Nixo Coins
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold">
              ✓ Verified Partner
            </span>
            <span className="text-slate-400 text-[11px]">
              Active Users: 14,289 • Response Time: 12ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

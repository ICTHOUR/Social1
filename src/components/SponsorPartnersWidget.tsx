import React, { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../design-system/components/GlassCard';
import { useLanguage } from '../context/LanguageContext';

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
}

export const SponsorPartnersWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [sponsors, setSponsors] = useState<SponsorPartner[]>([]);

  useEffect(() => {
    async function loadSponsors() {
      try {
        const res = await fetch('/api/sponsors');
        if (res.ok) {
          const data = await res.json();
          setSponsors(data.sponsors || []);
        }
      } catch (err) {
        // Silently handle
      }
    }
    loadSponsors();
  }, []);

  const handleClick = (id: string) => {
    fetch(`/api/sponsors/${id}/click`, { method: 'POST' }).catch(() => {});
  };

  if (sponsors.length === 0) return null;

  return (
    <GlassCard level={2} variant="frosted" className={`p-4 space-y-3 bg-white/95 dark:bg-slate-900/80 border border-blue-200/80 dark:border-blue-500/20 shadow-sm ${className}`}>
      {/* Blue Header with Red & Green Accents */}
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{isBn ? 'স্পন্সর ও পার্টনারবৃন্দ' : 'Sponsor & Partners'}</span>
        </h4>
        <span className="text-[10px] text-red-600 dark:text-red-400 font-extrabold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/25 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>Official</span>
        </span>
      </div>

      <div className="space-y-2.5">
        {sponsors.map((sp) => (
          <a
            key={sp.id}
            href={sp.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(sp.id)}
            className="group block p-3 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-emerald-50/50 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-900/90 hover:from-blue-100/80 hover:to-red-50/60 dark:hover:from-slate-800 dark:hover:to-slate-700/80 border border-blue-200/90 hover:border-red-400/80 dark:border-blue-500/30 dark:hover:border-red-400/50 transition-all shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={sp.logoUrl}
                  alt={sp.name}
                  className="w-10 h-10 rounded-xl object-cover bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 p-0.5 shadow-xs group-hover:border-red-400 transition-colors"
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold ring-1 ring-white">
                  ✓
                </span>
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {/* Sponsor Name: Blue in normal, Red on hover */}
                  <p className="font-bold text-xs text-blue-900 dark:text-blue-300 group-hover:text-red-600 dark:group-hover:text-red-400 truncate transition-colors">
                    {sp.name}
                  </p>
                  
                  {/* Tier tag: Red or Green */}
                  {sp.tier && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold tracking-tight border uppercase ${
                      sp.tier === 'platinum'
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        : sp.tier === 'gold'
                        ? 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}>
                      {sp.tier}
                    </span>
                  )}
                  
                  <ExternalLink className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
                </div>

                {/* Tagline in crisp Emerald Green */}
                {sp.tagline && (
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                    {sp.tagline}
                  </p>
                )}

                {/* Optional description */}
                {sp.description && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {sp.description}
                  </p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </GlassCard>
  );
};

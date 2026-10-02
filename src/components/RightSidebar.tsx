import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { IconCoin } from '../design-system/icons/OriginalIcons';
import { GlassCard } from '../design-system/components/GlassCard';
import { AdSlot } from './ads/AdSlot';
import { SponsorPartnersWidget } from './SponsorPartnersWidget';

interface RightSidebarProps {
  onOpenRecharge: () => void;
  onNavigate: (tab: string) => void;
  onNavigateToProfile?: (id: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ onOpenRecharge, onNavigate, onNavigateToProfile }) => {
  const { user } = useAuth();
  const { isBn, t } = useLanguage();
  const [avatarError, setAvatarError] = React.useState<Record<string, boolean>>({});

  return (
    <aside className="hidden xl:block w-72 shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Wallet Overview Box */}
        {user && (
          <GlassCard level={2} variant="glow" className="p-4 border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <IconCoin size={17} className="text-amber-500" /> {t('sponsor.wallet', 'Nixo Wallet')}
              </span>
              <button
                onClick={onOpenRecharge}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-0.5 rounded-full border border-amber-500/30 transition-colors cursor-pointer"
              >
                {t('sponsor.topUp', 'Top Up')}
              </button>
            </div>
            <div className="font-mono font-extrabold text-2xl text-amber-500 dark:text-amber-300 mt-2 tabular-nums">
              {user.coinsBalance.toLocaleString()} <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">{isBn ? 'কয়েন' : 'Coins'}</span>
            </div>
          </GlassCard>
        )}

        {/* Sponsor Partners Widget */}
        <SponsorPartnersWidget />

        {/* Dynamic Multi-Provider Ad Slot */}
        <AdSlot placement="sidebar_right" compact={false} />

        {/* Online Contacts & Realm Creators */}
        <GlassCard level={2} variant="frosted" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
              {t('sponsor.activeCreators', 'Active Realm Creators')}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">3 {isBn ? 'জন অনলাইন' : 'Online'}</span>
          </div>

          <div className="space-y-1">
            {[
              {
                id: 'user_elena',
                name: isBn ? 'এলেনা রোস্তোভা' : 'Elena Vance',
                avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80',
                role: isBn ? 'মোশন ক্রিয়েটর' : 'Motion Creator',
              },
              {
                id: 'user_marcus',
                name: isBn ? 'মার্কাস ভ্যান্স' : 'Marcus Sterling',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
                role: isBn ? 'সিন্থ প্রডিউসার' : 'Synth Producer',
              },
              {
                id: 'user_sophia',
                name: isBn ? 'সোফিয়া চেন' : 'Sophia Chen',
                avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=80',
                role: isBn ? 'লিকুইড আর্কিটেক্ট' : 'Liquid Architect',
              },
            ].map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  if (onNavigateToProfile) onNavigateToProfile(contact.id);
                  else onNavigate('profile');
                }}
                className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div className="relative shrink-0">
                  {avatarError[contact.id] ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                      {contact.name.substring(0, 2)}
                    </div>
                  ) : (
                    <img 
                      src={contact.avatar} 
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(prev => ({ ...prev, [contact.id]: true }))}
                      className="w-8 h-8 rounded-full object-cover" 
                      alt={contact.name} 
                    />
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{contact.role}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </aside>
  );
};

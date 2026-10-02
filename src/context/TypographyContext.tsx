import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FontOption {
  id: string;
  name: string;
  lang: 'en' | 'bn' | 'all';
  category: 'sans-serif' | 'serif' | 'display';
}

export interface TypographySettings {
  activeFont: string;
  activeBanglaFont: string;
  activeEnglishFont: string;
  applyTo: 'all' | 'feed' | 'dashboard';
  fontSizeScale: number;
  availableFonts: FontOption[];
}

const DEFAULT_FONTS: FontOption[] = [
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Modern UI)', lang: 'en', category: 'sans-serif' },
  { id: 'Inter', name: 'Inter (Clean & Crisp)', lang: 'en', category: 'sans-serif' },
  { id: 'Outfit', name: 'Outfit (Geometric Liquid)', lang: 'en', category: 'sans-serif' },
  { id: 'Space Grotesk', name: 'Space Grotesk (Tech / Cyber)', lang: 'en', category: 'sans-serif' },
  { id: 'Poppins', name: 'Poppins (Friendly & Bold)', lang: 'en', category: 'sans-serif' },
  { id: 'Hind Siliguri', name: 'Hind Siliguri (হিন্দ শিলিগুড়ি - স্পষ্ট ও আধুনিক)', lang: 'bn', category: 'sans-serif' },
  { id: 'Noto Sans Bengali', name: 'Noto Sans Bengali (নোতো সান্স বাংলা)', lang: 'bn', category: 'sans-serif' },
  { id: 'Tiro Bangla', name: 'Tiro Bangla (তিরো বাংলা - ক্লাসিক্যাল)', lang: 'bn', category: 'serif' },
  { id: 'Noto Serif Bengali', name: 'Noto Serif Bengali (নোতো শরিফ বাংলা)', lang: 'bn', category: 'serif' },
];

const DEFAULT_TYPOGRAPHY: TypographySettings = {
  activeFont: 'Plus Jakarta Sans',
  activeBanglaFont: 'Hind Siliguri',
  activeEnglishFont: 'Plus Jakarta Sans',
  applyTo: 'all',
  fontSizeScale: 100,
  availableFonts: DEFAULT_FONTS,
};

interface TypographyContextType {
  typography: TypographySettings;
  updateTypography: (newSettings: Partial<TypographySettings>) => Promise<boolean>;
  activeFontFamily: string;
}

const TypographyContext = createContext<TypographyContextType>({
  typography: DEFAULT_TYPOGRAPHY,
  updateTypography: async () => false,
  activeFontFamily: "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
});

export const TypographyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [typography, setTypography] = useState<TypographySettings>(() => {
    try {
      const saved = localStorage.getItem('nixo_typography_cache');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TYPOGRAPHY;
  });

  const activeFontFamily = `'${typography.activeFont}', '${typography.activeBanglaFont}', '${typography.activeEnglishFont}', system-ui, sans-serif`;

  useEffect(() => {
    // Apply dynamic font styles to document
    const root = document.documentElement;
    root.style.setProperty('--font-primary', activeFontFamily);
    root.style.fontFamily = activeFontFamily;
    if (typography.fontSizeScale) {
      root.style.fontSize = `${typography.fontSizeScale}%`;
    }
    localStorage.setItem('nixo_typography_cache', JSON.stringify(typography));
  }, [typography, activeFontFamily]);

  // Fetch initial typography config from API
  useEffect(() => {
    async function loadPublicTypography() {
      try {
        const res = await fetch('/api/settings/public');
        if (res.ok) {
          const data = await res.json();
          if (data?.settings?.typography) {
            setTypography(data.settings.typography);
          }
        }
      } catch (err) {
        // Use cached or default
      }
    }
    loadPublicTypography();
  }, []);

  const updateTypography = async (newSettings: Partial<TypographySettings>): Promise<boolean> => {
    const updated = { ...typography, ...newSettings };
    setTypography(updated);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/settings/typography', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updated),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  return (
    <TypographyContext.Provider value={{ typography, updateTypography, activeFontFamily }}>
      {children}
    </TypographyContext.Provider>
  );
};

export const useTypography = () => useContext(TypographyContext);

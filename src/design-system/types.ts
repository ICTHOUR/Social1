export type ThemeMode = 'dark' | 'light';

export interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export type GlassLevel = 1 | 2 | 3 | 4 | 5;
export type GlassVariant = 'surface' | 'frosted' | 'deep' | 'floating' | 'modal' | 'glow' | 'accent' | 'subtle' | 'prism';
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

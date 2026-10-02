import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export function getApiBaseUrl(): string {
  // 1. Explicit env variable (e.g. VITE_API_URL in .env)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // 2. Custom server URL saved in local storage (useful for testing on different servers)
  try {
    const custom = localStorage.getItem('nixo_server_url') || localStorage.getItem('nixo_server_url');
    if (custom) return custom.replace(/\/$/, '');
  } catch {
    // ignore storage access errors
  }

  // 3. If running inside native Android/iOS Capacitor WebView (origin is capacitor:// or localhost without port)
  const isNative = Capacitor.isNativePlatform() || 
                   window.location.protocol === 'capacitor:' || 
                   window.location.protocol === 'ionic:' || 
                   (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

  if (isNative) {
    // Default live backend URL for the mobile app
    return 'https://ais-dev-exedmxgl3ppassa6fyh5zf-166282792350.asia-southeast1.run.app';
  }

  // 4. In regular browser / dev server, use same origin
  return window.location.origin;
}

export function initNativeFeatures() {
  const isNative = Capacitor.isNativePlatform();

  // Only apply native configurations if running inside Android / iOS app
  if (isNative) {
    // Intercept window.fetch so relative paths like /api/... automatically route to backend
    try {
      const originalFetch = window.fetch.bind(window);
      const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.startsWith('/api') || url.startsWith('/uploads') || url.startsWith('/data')) {
          const baseUrl = getApiBaseUrl();
          if (baseUrl && baseUrl !== window.location.origin) {
            url = `${baseUrl}${url}`;
            if (typeof input === 'string' || input instanceof URL) {
              return originalFetch(url, init);
            } else {
              return originalFetch(new Request(url, input), init);
            }
          }
        }
        return originalFetch(input, init);
      };

      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
        });
      } catch {
        (window as any).fetch = customFetch;
      }
    } catch (e) {
      console.warn('Native fetch proxy setup bypassed:', e);
    }

    // Configure Status Bar
    try {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#070c18' });
    } catch (e) {
      console.warn('StatusBar not initialized', e);
    }

    // Configure Splash Screen
    try {
      setTimeout(() => {
        SplashScreen.hide({ fadeOutDuration: 400 });
      }, 500);
    } catch (e) {
      console.warn('SplashScreen hide error', e);
    }

    // Configure Keyboard
    try {
      Keyboard.setAccessoryBarVisible({ isVisible: true });
    } catch {
      // ignore
    }
  }
}

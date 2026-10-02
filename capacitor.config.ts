import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.nixosocial.app',
  appName: 'Nixo',
  webDir: 'dist',
  server: {
    // If you want the Android app to load your remote production server directly, 
    // uncomment the url line below and put your live backend domain:
    // url: 'https://ais-dev-exedmxgl3ppassa6fyh5zf-166282792350.asia-southeast1.run.app',
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#070c18',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#070c18'
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark
    }
  }
};

export default config;

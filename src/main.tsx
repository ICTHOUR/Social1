import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initNativeFeatures } from './services/nativeInit.ts';

// Initialize native mobile settings (StatusBar, Splash, API URL interception)
initNativeFeatures();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

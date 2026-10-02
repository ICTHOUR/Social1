import { useState, useEffect, useRef, useCallback } from 'react';

// Browser Web Speech API interface declarations
interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface VoiceCommandResult {
  rawTranscript: string;
  isFinal: boolean;
  matchedCommand?: {
    type: 'navigation' | 'action' | 'search';
    target?: string;
    action?: string;
    label: string;
  };
}

export interface UseVoiceRecognitionOptions {
  language?: 'en-US' | 'bn-BD' | 'auto';
  onCommandDetected?: (result: VoiceCommandResult) => void;
  onSearchDetected?: (query: string) => void;
  continuous?: boolean;
}

export const useVoiceRecognition = ({
  language = 'auto',
  onCommandDetected,
  onSearchDetected,
  continuous = false,
}: UseVoiceRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Check Web Speech API availability on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as IWindowSpeechRecognition;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    } else {
      setIsSupported(true);
    }
  }, []);

  // Parse voice text into navigation / action commands
  const parseCommand = useCallback((text: string): VoiceCommandResult['matchedCommand'] => {
    const clean = text.toLowerCase().trim();

    // 1. Navigation Commands
    if (/\b(home|feed|go home|news feed|হোম|হোমে|ফিড)\b/i.test(clean)) {
      return { type: 'navigation', target: 'home', label: 'Go to Home Feed' };
    }
    if (/\b(explore|discover|search|এক্সপ্লোর|সার্চ)\b/i.test(clean)) {
      return { type: 'navigation', target: 'explore', label: 'Open Explore' };
    }
    if (/\b(reels|feels|shorts|short videos|রিলস|ফিলস)\b/i.test(clean)) {
      return { type: 'navigation', target: 'reels', label: 'Open Reels / FEELS' };
    }
    if (/\b(videos|watch video|ভিডিও)\b/i.test(clean)) {
      return { type: 'navigation', target: 'videos', label: 'Open Videos' };
    }
    if (/\b(messenger|messages|chat|inbox|মেসেজ|মেসেঞ্জার|চ্যাট|ইনবক্স)\b/i.test(clean)) {
      return { type: 'navigation', target: 'messenger', label: 'Open Messenger' };
    }
    if (/\b(notifications|alerts|নোটিফিকেশন|নোটিশ)\b/i.test(clean)) {
      return { type: 'navigation', target: 'notifications', label: 'Open Notifications' };
    }
    if (/\b(wallet|coins|balance|recharge|ট্রেজারি|ওয়ালেট|কয়েন|ব্যালেন্স)\b/i.test(clean)) {
      return { type: 'navigation', target: 'wallet', label: 'Open Wallet & Coins' };
    }
    if (/\b(my profile|profile|user profile|প্রোফাইল)\b/i.test(clean)) {
      return { type: 'navigation', target: 'profile', label: 'Open Profile' };
    }
    if (/\b(friends|friend list|বন্ধু|ফ্রেন্ডস)\b/i.test(clean)) {
      return { type: 'navigation', target: 'friends', label: 'Open Friends' };
    }
    if (/\b(settings|preferences|সেটিংস)\b/i.test(clean)) {
      return { type: 'navigation', target: 'settings', label: 'Open Settings' };
    }
    if (/\b(groups|communities|group|গ্রুপ|কমিউনিটি)\b/i.test(clean)) {
      return { type: 'navigation', target: 'communities', label: 'Open Communities' };
    }
    if (/\b(dashboard|dashboard pro|creator|প্রো ড্যাশবোর্ড)\b/i.test(clean)) {
      return { type: 'navigation', target: 'dashboardPro', label: 'Open Dashboard Pro' };
    }

    // 2. Action Commands
    if (/\b(create post|new post|write post|পোস্ট করো|নতুন পোস্ট|পোস্ট লিখব)\b/i.test(clean)) {
      return { type: 'action', action: 'create_post', label: 'Create New Post' };
    }
    if (/\b(create story|new story|add story|স্টোরি দাও|নতুন স্টোরি)\b/i.test(clean)) {
      return { type: 'action', action: 'create_story', label: 'Create 24h Story' };
    }
    if (/\b(dark mode|light mode|toggle theme|change theme|ডার্ক মোড|লাইট মোড|থিম)\b/i.test(clean)) {
      return { type: 'action', action: 'toggle_theme', label: 'Toggle Theme Mode' };
    }

    // 3. Fallback: Search Query
    return { type: 'search', label: `Search for "${text}"` };
  }, []);

  const simulateAudioWave = useCallback(() => {
    if (!isListening) return;
    setAudioLevel(Math.random() * 0.7 + 0.3);
    animFrameRef.current = requestAnimationFrame(simulateAudioWave);
  }, [isListening]);

  const startListening = useCallback(
    (langOverride?: string) => {
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      if (typeof window === 'undefined') return;
      const win = window as IWindowSpeechRecognition;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setError('SpeechRecognition API is not supported in this browser.');
        setIsListening(false);
        return;
      }

      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }

        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;

        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Set recognition language
        const targetLang = langOverride || (language === 'bn-BD' ? 'bn-BD' : 'en-US');
        recognition.lang = targetLang;

        recognition.onstart = () => {
          setIsListening(true);
          simulateAudioWave();
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript;
            } else {
              currentInterim += res[0].transcript;
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
          }

          if (finalTranscript) {
            const trimmed = finalTranscript.trim();
            setTranscript(trimmed);
            setInterimTranscript('');

            const matched = parseCommand(trimmed);
            const commandResult: VoiceCommandResult = {
              rawTranscript: trimmed,
              isFinal: true,
              matchedCommand: matched,
            };

            onCommandDetected?.(commandResult);
            if (matched?.type === 'search') {
              onSearchDetected?.(trimmed);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[SpeechRecognition Error]:', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone permission denied. Please allow microphone access in browser settings.');
          } else if (event.error === 'no-speech') {
            setError('No speech detected. Please speak clearly into your microphone.');
          } else if (event.error !== 'aborted') {
            setError(`Recognition error: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setAudioLevel(0);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };

        recognition.start();
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        setError(err.message || 'Could not start speech recognition');
        setIsListening(false);
      }
    },
    [continuous, language, onCommandDetected, onSearchDetected, parseCommand, simulateAudioWave]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setAudioLevel(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    audioLevel,
    startListening,
    stopListening,
    parseCommand,
  };
};

export default useVoiceRecognition;

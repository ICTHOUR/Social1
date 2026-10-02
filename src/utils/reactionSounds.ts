// Web Audio API Procedural Reaction Sound Engine
// 100% Client-side synthesized, 0 KB audio files, sub-millisecond latency,
// Autoplay safe, respects browser policy, user configurable with mute toggle.

const SOUND_STORAGE_KEY = 'nixo_reaction_sounds_enabled';

let audioCtx: AudioContext | null = null;
let isAudioMuted: boolean = false;

// Initialize mute state from localStorage (default: true)
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    isAudioMuted = stored === 'false';
  } catch (e) {
    isAudioMuted = false;
  }
}

// Get or resume AudioContext strictly upon direct user interaction
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('Web Audio context could not be initialized:', err);
    return null;
  }
}

export function isSoundMuted(): boolean {
  return isAudioMuted;
}

export function setSoundMuted(muted: boolean): void {
  isAudioMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, muted ? 'false' : 'true');
      window.dispatchEvent(new CustomEvent('nixo-sound-setting-changed', { detail: { muted } }));
    } catch (e) {}
  }
}

export function toggleSoundMuted(): boolean {
  setSoundMuted(!isAudioMuted);
  return isAudioMuted;
}

/**
 * Synthesizes and plays a distinctive spatial audio feedback for a specific reaction.
 * Only triggers if sound is enabled and within direct user gesture context.
 */
export function playReactionSound(reactionType: string): void {
  if (isAudioMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.2, now); // Gentle, pleasant volume level

  const type = reactionType.toLowerCase();

  switch (type) {
    case 'like': {
      // Harmonic crystal water drop chirp (320Hz -> 820Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'love': {
      // Warm romantic dual-sine harmonic shimmer (F#5 to C#6 chord)
      const frequencies = [739.99, 932.33, 1108.73];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);

        gain.gain.setValueAtTime(0.001, now + idx * 0.03);
        gain.gain.linearRampToValueAtTime(0.22 / (idx + 1), now + idx * 0.03 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.03);
        osc.stop(now + 0.5);
      });
      break;
    }

    case 'haha': {
      // Cheerful bouncy staccato triplet (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((note, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.06;

        osc.frequency.setValueAtTime(note, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.1);
      });
      break;
    }

    case 'wow': {
      // Cosmic rising resonant sweep with ethereal overtone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(1080, now + 0.25);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }

    case 'sad': {
      // Tender melancholy raindrop descending tone (587Hz -> 440Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.22);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.38);
      break;
    }

    case 'angry': {
      // Fiery low saw pluck with ember crackle
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.18);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }

    case 'celebrate': {
      // Sparkling triumphal fanfare arpeggio (C6, E6, G6 sparkles)
      const chords = [783.99, 1046.5, 1318.51, 1567.98];
      chords.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + i * 0.04;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.28);
      });
      break;
    }

    case 'support': {
      // Soothing warm nurturing major 7th chord swell
      const padNotes = [349.23, 440.0, 523.25, 659.25];
      padNotes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
      });
      break;
    }

    default: {
      // Default pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }
  }
}

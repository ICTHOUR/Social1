// Futuristic Liquid Glass acoustic chime synthesizer using Web Audio API
// Generates an ethereal, crystal glass chime for real-time notification alerts

class NotificationAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('nixo_notification_sound', muted ? 'muted' : 'unmuted');
    } catch (e) {}
  }

  public getMuted(): boolean {
    try {
      const stored = localStorage.getItem('nixo_notification_sound');
      if (stored === 'muted') return true;
      if (stored === 'unmuted') return false;
    } catch (e) {}
    return this.isMuted;
  }

  public playChime(type?: string) {
    if (this.getMuted()) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);

      // Volume envelope
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      // Dual crystal harmonics
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      // Adjust frequencies based on notification urgency
      if (type === 'security_alert') {
        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.3); // E5
        osc2.frequency.setValueAtTime(1318.51, now); // E6
      } else if (type === 'gift_received' || type === 'coin_received' || type === 'coin_purchase') {
        // Shimmering metallic coin chime
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(1046.5, now); // C6
        osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        osc1.frequency.setValueAtTime(1567.98, now + 0.16); // G6
        osc1.frequency.setValueAtTime(2093.0, now + 0.24); // C7
        osc2.frequency.setValueAtTime(523.25, now); // C5
      } else {
        // Standard sleek Liquid Glass chime (Pentatonic crystal cascade)
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6
        osc2.frequency.setValueAtTime(1975.53, now); // B6
        osc2.frequency.exponentialRampToValueAtTime(2637.02, now + 0.18); // E7
      }

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }
}

export const notificationAudio = new NotificationAudioSynthesizer();

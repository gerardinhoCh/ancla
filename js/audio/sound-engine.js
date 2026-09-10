/* ==========================================================================
   ANCLA - Web Audio & Speech Engine (Offline Soundscapes & Haptics)
   Pure Web Audio API synthesizer - Zero external audio assets required.
   ========================================================================== */

export class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.activeOscillators = [];
    this.isPlayingAmbient = false;
    this.speechSynth = window.speechSynthesis || null;
  }

  /**
   * Initializes or resumes AudioContext on user interaction
   */
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Plays a gentle harmonic chime for breathing phase transition
   * @param {number} freq - Frequency in Hz (e.g. 528 for inhale, 432 for exhale)
   */
  playTransitionBell(freq = 432) {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Smooth attack and long decay
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.7);

      // Trigger subtle haptic vibration
      this.vibrate(60);
    } catch (e) {
      console.warn("Audio playback not allowed yet:", e);
    }
  }

  /**
   * Generates continuous relaxing ambient tone (binaural beats or 432 Hz theta soundscape)
   */
  startAmbientTone(preset = "theta") {
    this.stopAmbient();
    const ctx = this.getAudioContext();

    if (preset === "theta") {
      // Binaural beat: 200 Hz Left, 206 Hz Right (6 Hz Theta rhythm for calming)
      const merger = ctx.createChannelMerger(2);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      const oscL = ctx.createOscillator();
      oscL.frequency.value = 200;
      oscL.connect(merger, 0, 0);

      const oscR = ctx.createOscillator();
      oscR.frequency.value = 206;
      oscR.connect(merger, 0, 1);

      merger.connect(gain);
      gain.connect(ctx.destination);

      oscL.start();
      oscR.start();

      this.activeOscillators = [oscL, oscR];
      this.isPlayingAmbient = true;
    } else if (preset === "432hz") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, ctx.currentTime);

      osc.type = "sine";
      osc.frequency.value = 432;
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      this.activeOscillators = [osc];
      this.isPlayingAmbient = true;
    }
  }

  /**
   * Stops active ambient tone
   */
  stopAmbient() {
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.activeOscillators = [];
    this.isPlayingAmbient = false;
  }

  /**
   * Speaks therapeutic text with smooth cadence using Web Speech API
   * @param {string} text
   */
  speak(text) {
    if (!this.speechSynth) return;
    this.speechSynth.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 0.88; // Slower, calmer pace
    utterance.pitch = 0.95;

    // Pick Spanish voice if available
    const voices = this.speechSynth.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith("es"));
    if (esVoice) utterance.voice = esVoice;

    this.speechSynth.speak(utterance);
  }

  /**
   * Haptic vibration wrapper
   * @param {number|number[]} pattern
   */
  vibrate(pattern = 80) {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }
}

export const soundEngine = new SoundEngine();

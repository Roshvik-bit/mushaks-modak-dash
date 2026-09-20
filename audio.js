/**
 * Mushak's Modak Dash - Procedural Web Audio API Engine
 * Zero external audio files required: 100% synthesized in real-time.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;
    this.ambientGain = null;
    this.ambientInterval = null;
    this.ambientOscillators = [];
  }

  // Initialize on first user gesture
  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;

      // Master ambient gain
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.05, this.ctx.currentTime);
      this.ambientGain.connect(this.ctx.destination);

      // Start gentle background Indian drone (Tanpura warm harmonics)
      this.startAmbientDrone();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  ensureRunning() {
    if (!this.initialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureRunning();
    this.isMuted = !this.isMuted;
    if (this.ambientGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.05, now, 0.1);
    }
    return this.isMuted;
  }

  // Sweet Marimba / Glockenspiel Modak Catch chime (scales pitch with combo)
  playCatch(combo = 1) {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    // Auspicious pentatonic scale intervals (C D E G A C)
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];
    const index = Math.min(combo - 1, baseFreqs.length - 1);
    const freq = baseFreqs[index] || 523.25;

    // Harmonic bell synth
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2.76, now); // Metallic harmonic

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.36);
    overtone.stop(now + 0.36);
  }

  // Golden Modak Catch: Sparkly celebratory arpeggio
  playGoldenCatch() {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const notes = [659.25, 783.99, 1046.50, 1318.51]; // E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const startTime = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.42);
    });
  }

  // Divine Maha Modak: Resonant Temple Bell gong & shimmer
  playMahaCatch() {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    // Deep bell root + harmonics (Temple Ghanta)
    const partials = [440, 880, 1320, 1760];
    partials.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.25);
    });
  }

  // Obstacle Collision (Coconut bonk / crow bump)
  playHit() {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    
    // Low pitch drop thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    // Filter for hollow coconut sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Missed Modak drop sound (soft muffled splat/tap)
  playMiss() {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Lost Life alert (descending dissonant warning)
  playLifeLost() {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    const tones = [370, 311, 246]; // Minor warning
    tones.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.26);
    });
  }

  // Game Over: Meditative Indian Raga descending motif
  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const notes = [587.33, 523.25, 440.00, 392.00, 329.63, 293.66]; // D5, C5, A4, G4, E4, D4
    notes.forEach((freq, idx) => {
      const startTime = this.ctx.currentTime + idx * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.46);
    });
  }

  // Game Start: Auspicious fanfare
  playGameStart() {
    if (this.isMuted || !this.ctx) return;
    this.ensureRunning();

    const notes = [293.66, 392.00, 440.00, 587.33, 783.99]; // D4, G4, A4, D5, G5
    notes.forEach((freq, idx) => {
      const startTime = this.ctx.currentTime + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.52);
    });
  }

  // Ambient Meditative Drone (Sa - Pa / Root & Fifth temple ambience)
  startAmbientDrone() {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;

    // D3 (146.83 Hz) and A3 (220.00 Hz) pure soothing drone
    const droneFreqs = [146.83, 220.00, 293.66];
    droneFreqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      oscGain.gain.setValueAtTime(0.35, now);
      osc.connect(oscGain);
      oscGain.connect(this.ambientGain);

      osc.start(now);
      this.ambientOscillators.push(osc);
    });

    // Occasional gentle temple wind-chime in the background
    this.ambientInterval = setInterval(() => {
      if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
      if (Math.random() > 0.4) return;

      const chimeFreqs = [1174.66, 1318.51, 1567.98, 1760.00, 2093.00];
      const randomFreq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
      const chimeTime = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(randomFreq, chimeTime);

      gain.gain.setValueAtTime(0.02, chimeTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 1.2);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(chimeTime);
      osc.stop(chimeTime + 1.25);
    }, 4500);
  }
}

// Global Audio Engine Instance
window.soundEngine = new SoundEngine();

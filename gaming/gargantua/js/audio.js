// Optional ambient music. Uses a local looping asset with an HTMLAudioElement;
// the Web Audio API fallback synthesizes a drone if the asset is missing.

export class AmbientAudio {
  constructor({ assetUrl = 'assets/audio/gargantua_ambient.ogg', volume = 0.35 } = {}) {
    this.assetUrl = assetUrl;
    this.volume = volume;
    this.enabled = false;
    this.started = false;
    this.audio = null;
    this._fallback = null;
    this._ensureElement();
  }

  _ensureElement() {
    if (this.audio) return;
    try {
      this.audio = new Audio(this.assetUrl);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;
      this.audio.addEventListener('error', () => {
        // Keep UI alive; fall back to a synthesized drone below.
        this.started = false;
      });
    } catch (_) {
      this.audio = null;
    }
  }

  async enable() {
    this.enabled = true;
    this._ensureElement();
    if (!this.audio) return this._startFallback();
    try {
      await this.audio.play();
      this.started = true;
    } catch (_) {
      this.started = false;
      return this._startFallback();
    }
    return true;
  }

  disable() {
    this.enabled = false;
    if (this.audio) this.audio.pause();
    if (this._fallback) this._fallback.suspend();
    this.started = false;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this.volume;
    if (this._fallback && this._fallback.gain) {
      this._fallback.gain.gain.setTargetAtTime(this.volume * 0.16, this._fallback.ctx.currentTime, 0.1);
    }
  }

  async toggle() {
    if (this.enabled) {
      this.disable();
      return false;
    }
    return this.enable();
  }

  _startFallback() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = this.volume * 0.14;
      master.connect(ctx.destination);
      const freqs = [55, 110, 164.81, 220, 329.63];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        osc.type = i % 2 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        gain.gain.value = 1 / (i + 2);
        lfo.frequency.value = 0.04 + i * 0.017;
        lfoGain.gain.value = 0.35 / (i + 1.5);
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        lfo.start();
      });
      this._fallback = { ctx, gain: master, suspend: () => ctx.suspend() };
      if (ctx.state === 'suspended') ctx.resume();
      this.started = true;
      return true;
    } catch (_) {
      return false;
    }
  }
}

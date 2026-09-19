/* ===========================================================
   audio.js — geluid zonder audiobestanden.
   Alles wordt live gesynthetiseerd met de Web Audio API:
   een windlaag die meeloopt met je snelheid plus korte effecten.
   =========================================================== */

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
  }

  /** Browsers staan geluid pas toe na een klik/toets. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.55 : 0;
    this.master.connect(ctx.destination);

    // ruisbuffer voor wind, sneeuw en klappen
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    // continue windlaag
    const wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(windFilter).connect(this.windGain).connect(this.master);
    wind.start();
    this.windFilter = windFilter;

    this.ready = true;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.55 : 0;
  }

  /** @param {number} t 0..1 — hoe hard je gaat */
  setWind(t) {
    if (!this.ready) return;
    const g = this.windGain.gain;
    g.setTargetAtTime(0.02 + t * 0.14, this.ctx.currentTime, 0.4);
    this.windFilter.frequency.setTargetAtTime(380 + t * 760, this.ctx.currentTime, 0.4);
  }

  suspend() { if (this.ctx?.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  /* ---------------- bouwstenen ---------------- */

  _tone({ freq = 440, to = freq, dur = 0.16, type = 'sine', gain = 0.3, delay = 0 }) {
    if (!this.ready || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.2, gain = 0.3, freq = 900, q = 1, type = 'bandpass', sweep = 0 }) {
    if (!this.ready || !this.enabled) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t0 + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* ---------------- effecten ---------------- */

  jump()       { this._tone({ freq: 300, to: 620, dur: 0.16, type: 'triangle', gain: 0.22 }); }
  doubleJump() { this._tone({ freq: 480, to: 880, dur: 0.15, type: 'triangle', gain: 0.2 }); }
  land()       { this._noise({ dur: 0.16, gain: 0.26, freq: 620, sweep: 180, q: 0.8 }); }
  slide()      { this._noise({ dur: 0.55, gain: 0.2, freq: 1600, sweep: 500, q: 0.6 }); }
  dive()       { this._noise({ dur: 0.32, gain: 0.26, freq: 2200, sweep: 420, q: 0.5 });
                 this._tone({ freq: 520, to: 180, dur: 0.22, type: 'sawtooth', gain: 0.12 }); }
  coin()       { this._tone({ freq: 1180, to: 1180, dur: 0.09, type: 'square', gain: 0.14 });
                 this._tone({ freq: 1760, to: 1760, dur: 0.12, type: 'square', gain: 0.12, delay: 0.07 }); }
  shield()     { this._tone({ freq: 620, to: 1240, dur: 0.3, type: 'sine', gain: 0.2 });
                 this._tone({ freq: 930, to: 1860, dur: 0.3, type: 'sine', gain: 0.12, delay: 0.05 }); }
  knock()      { this._noise({ dur: 0.2, gain: 0.3, freq: 1400, sweep: 260, q: 0.5 });
                 this._tone({ freq: 220, to: 90, dur: 0.18, type: 'square', gain: 0.14 }); }
  hit()        { this._noise({ dur: 0.34, gain: 0.42, freq: 380, sweep: 90, q: 0.5 });
                 this._tone({ freq: 150, to: 60, dur: 0.3, type: 'sawtooth', gain: 0.2 }); }
  fall()       { this._tone({ freq: 440, to: 70, dur: 0.6, type: 'sine', gain: 0.24 }); }
  gameOver()   { [440, 350, 262, 196].forEach((f, i) =>
                   this._tone({ freq: f, to: f * 0.98, dur: 0.34, type: 'triangle', gain: 0.2, delay: i * 0.16 })); }
}

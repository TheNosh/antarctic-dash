/* ===========================================================
   audio.js — geluid zonder audiobestanden.
   Alles wordt live gesynthetiseerd met de Web Audio API.

   De windlaag is opgebouwd uit bruine ruis (niet wit!) door een
   laagdoorlaatfilter, met twee trage LFO's eroverheen die de
   vlagen maken. Witte ruis door een breed filter klinkt als
   statische ruis van een radio; bruine ruis heeft veel meer
   energie in de lage tonen en klinkt als wind.
   =========================================================== */

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
    this.volume = 0.5;
  }

  /* ---------------- ruisbuffers ---------------- */

  /** Witte ruis — alleen voor korte, felle effecten. */
  _whiteBuffer(ctx, seconds = 2) {
    const len = (ctx.sampleRate * seconds) | 0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Bruine ruis: witte ruis geïntegreerd, ongeveer -6 dB per octaaf.
   * De lus wordt aan het eind overgekruist, anders hoor je elke ronde
   * een tik op de naad.
   */
  _brownBuffer(ctx, seconds = 6) {
    const rate = ctx.sampleRate;
    const len = (rate * seconds) | 0;
    const fade = (rate * 0.4) | 0;
    const tmp = new Float32Array(len + fade);

    let last = 0;
    for (let i = 0; i < tmp.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      tmp[i] = last * 3.5;
    }

    const buf = ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    d.set(tmp.subarray(0, len));
    for (let i = 0; i < fade; i++) {
      const a = i / fade;
      d[i] = d[i] * a + tmp[len + i] * (1 - a);
    }

    // normaliseren zodat het volume voorspelbaar is
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;

    return buf;
  }

  /** Trage LFO die op een AudioParam wordt opgeteld. */
  _lfo(ctx, rate, depth, target, phaseOffset = 0) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = rate;
    amp.gain.value = depth;
    osc.connect(amp).connect(target);
    osc.start(ctx.currentTime + phaseOffset);
    return osc;
  }

  /* ---------------- opzetten ---------------- */

  /** Browsers staan geluid pas toe na een klik/toets. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(ctx.destination);

    this.noiseBuffer = this._whiteBuffer(ctx);
    this.brownBuffer = this._brownBuffer(ctx);

    /* ---- windlaag: bruine ruis, laagdoorlaat, met vlagen ---- */
    const wind = ctx.createBufferSource();
    wind.buffer = this.brownBuffer;
    wind.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 220;
    windFilter.Q.value = 1.4;

    // vlagen: twee LFO's met onderling priem-achtige periodes, zodat
    // het patroon niet hoorbaar herhaalt
    const gust = ctx.createGain();
    gust.gain.value = 0.62;
    this._lfo(ctx, 0.07, 0.26, gust.gain);
    this._lfo(ctx, 0.031, 0.14, gust.gain);

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;

    wind.connect(windFilter).connect(gust).connect(this.windGain).connect(this.master);
    wind.start();

    this.windFilter = windFilter;

    /* ---- fluitlaag: smalle piek, alleen hoorbaar op hoge snelheid ---- */
    const whistle = ctx.createBufferSource();
    whistle.buffer = this.noiseBuffer;
    whistle.loop = true;

    const whistleFilter = ctx.createBiquadFilter();
    whistleFilter.type = 'bandpass';
    whistleFilter.frequency.value = 1100;
    whistleFilter.Q.value = 9;                 // smal: een toon, geen sis
    this._lfo(ctx, 0.09, 260, whistleFilter.frequency);

    this.whistleGain = ctx.createGain();
    this.whistleGain.gain.value = 0;

    whistle.connect(whistleFilter).connect(this.whistleGain).connect(this.master);
    whistle.start();

    this.ready = true;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  /** @param {number} t 0..1 — hoe hard je gaat */
  setWind(t) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const k = Math.max(0, Math.min(1, t));

    // stil bij stilstand, nooit meer dan een achtergrondlaag
    this.windGain.gain.setTargetAtTime(0.012 + k * 0.075, now, 0.5);
    this.windFilter.frequency.setTargetAtTime(190 + k * 520, now, 0.5);

    // de fluittoon komt pas boven de helft van je topsnelheid opzetten
    const w = Math.max(0, k - 0.45) / 0.55;
    this.whistleGain.gain.setTargetAtTime(w * w * 0.02, now, 0.6);
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

  /**
   * Korte ruisstoot. `brown: true` geeft een doffe, lage klap;
   * witte ruis is feller en schuurt meer.
   */
  _noise({ dur = 0.2, gain = 0.3, freq = 900, q = 1, type = 'lowpass', sweep = 0, brown = false, delay = 0 }) {
    if (!this.ready || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = brown ? this.brownBuffer : this.noiseBuffer;
    src.loop = true;
    // willekeurig startpunt, anders klinkt elke klap identiek
    const off = Math.random() * (src.buffer.duration - dur - 0.05);

    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t0 + dur);
    f.Q.value = q;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.max(0, off));
    src.stop(t0 + dur + 0.02);
  }

  /* ---------------- effecten ---------------- */

  jump()       { this._tone({ freq: 300, to: 620, dur: 0.16, type: 'triangle', gain: 0.22 }); }
  doubleJump() { this._tone({ freq: 480, to: 880, dur: 0.15, type: 'triangle', gain: 0.2 }); }

  // landen: een doffe plof in de sneeuw, geen sis
  land()       { this._noise({ dur: 0.18, gain: 0.3, freq: 480, sweep: 110, q: 1.6, brown: true });
                 this._tone({ freq: 90, to: 55, dur: 0.14, type: 'sine', gain: 0.16 }); }

  // glijden: schurend, maar met de hoge tonen eraf
  slide()      { this._noise({ dur: 0.5, gain: 0.17, freq: 2200, sweep: 520, q: 2.4 }); }

  dive()       { this._noise({ dur: 0.3, gain: 0.2, freq: 2600, sweep: 480, q: 2 });
                 this._tone({ freq: 520, to: 170, dur: 0.24, type: 'sawtooth', gain: 0.12 }); }

  coin()       { this._tone({ freq: 1180, to: 1180, dur: 0.09, type: 'square', gain: 0.13 });
                 this._tone({ freq: 1760, to: 1760, dur: 0.12, type: 'square', gain: 0.11, delay: 0.07 }); }

  shield()     { this._tone({ freq: 620, to: 1240, dur: 0.3, type: 'sine', gain: 0.2 });
                 this._tone({ freq: 930, to: 1860, dur: 0.3, type: 'sine', gain: 0.12, delay: 0.05 }); }

  knock()      { this._noise({ dur: 0.22, gain: 0.26, freq: 900, sweep: 200, q: 1.4, brown: true });
                 this._tone({ freq: 220, to: 90, dur: 0.18, type: 'square', gain: 0.13 }); }

  hit()        { this._noise({ dur: 0.34, gain: 0.4, freq: 700, sweep: 90, q: 1.2, brown: true });
                 this._tone({ freq: 150, to: 55, dur: 0.3, type: 'sawtooth', gain: 0.2 }); }

  fall()       { this._tone({ freq: 440, to: 70, dur: 0.6, type: 'sine', gain: 0.24 }); }

  gameOver()   { [440, 350, 262, 196].forEach((f, i) =>
                   this._tone({ freq: f, to: f * 0.98, dur: 0.34, type: 'triangle', gain: 0.2, delay: i * 0.16 })); }
}

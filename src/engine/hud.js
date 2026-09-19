/* ===========================================================
   hud.js — alles wat buiten het 3D-beeld op het scherm staat.
   =========================================================== */

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.el = {
      hud: $('hud'),
      distance: $('stat-distance'),
      score: $('stat-score'),
      fish: $('stat-fish'),
      speed: $('stat-speed'),
      speedFill: $('speedo-fill'),
      hearts: $('hearts'),
      shield: $('shield-badge'),
      toast: $('toast'),
      app: $('app'),

      screens: {
        start: $('screen-start'),
        pause: $('screen-pause'),
        over: $('screen-over'),
      },

      levelName: $('level-name'),
      levelTagline: $('level-tagline'),
      bestStart: $('best-start'),
      bestOver: $('best-over'),
      overDistance: $('over-distance'),
      overScore: $('over-score'),
      overFish: $('over-fish'),
      overReason: $('over-reason'),
      overRecord: $('over-record'),
      quality: $('btn-quality'),
      sound: $('btn-sound'),
    };

    this._lives = -1;
    this._shown = { distance: -1, score: -1, fish: -1, speed: -1 };
    this._toastTimer = 0;
  }

  setLevel(level) {
    this.el.levelName.textContent = level.name;
    this.el.levelTagline.textContent = level.tagline;
  }

  /* ---------------- schermen ---------------- */

  showScreen(name) {
    for (const [key, el] of Object.entries(this.el.screens)) el.hidden = key !== name;
    this.el.hud.hidden = name !== null && name !== 'pause';
  }

  /* ---------------- meters ---------------- */

  setStats({ distance, score, fish, speed, maxSpeed }) {
    const d = Math.floor(distance);
    if (d !== this._shown.distance) { this.el.distance.textContent = d; this._shown.distance = d; }

    const s = Math.floor(score);
    if (s !== this._shown.score) { this.el.score.textContent = s.toLocaleString('nl-NL'); this._shown.score = s; }

    if (fish !== this._shown.fish) { this.el.fish.textContent = fish; this._shown.fish = fish; }

    const kmh = Math.round(speed * 3.6);
    if (kmh !== this._shown.speed) {
      this.el.speed.textContent = kmh;
      this.el.speedFill.style.width = `${Math.min(100, (speed / maxSpeed) * 100)}%`;
      this._shown.speed = kmh;
    }
  }

  setLives(lives, max) {
    if (lives === this._lives) return;
    this._lives = lives;
    this.el.hearts.replaceChildren();
    for (let i = 0; i < max; i++) {
      const h = document.createElement('div');
      h.className = i < lives ? 'heart' : 'heart empty';
      this.el.hearts.appendChild(h);
    }
  }

  setShield(active) { this.el.shield.hidden = !active; }

  /* ---------------- feedback ---------------- */

  toast(text) {
    const t = this.el.toast;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 900);
  }

  flashHit() {
    this.el.app.classList.remove('hit-flash');
    void this.el.app.offsetWidth;     // forceer herstart van de animatie
    this.el.app.classList.add('hit-flash');
    setTimeout(() => this.el.app.classList.remove('hit-flash'), 340);
  }

  /* ---------------- einde run ---------------- */

  showGameOver({ distance, score, fish, reason, best, isRecord }) {
    this.el.overDistance.textContent = `${Math.floor(distance)} m`;
    this.el.overScore.textContent = Math.floor(score).toLocaleString('nl-NL');
    this.el.overFish.textContent = fish;
    this.el.overReason.textContent = reason;
    this.el.overRecord.hidden = !isRecord;
    this.setBest(best);
    this.showScreen('over');
  }

  setBest(best) {
    const txt = `${Math.floor(best)} m`;
    this.el.bestStart.textContent = txt;
    this.el.bestOver.textContent = txt;
  }

  setQualityLabel(high) {
    this.el.quality.textContent = `Grafisch: ${high ? 'Hoog' : 'Laag'}`;
  }

  setSoundLabel(on) {
    this.el.sound.textContent = `Geluid: ${on ? 'Aan' : 'Uit'}`;
  }

  /* ---------------- knoppen aansluiten ---------------- */

  bind(handlers) {
    $('btn-start').addEventListener('click', handlers.start);
    $('btn-again').addEventListener('click', handlers.start);
    $('btn-resume').addEventListener('click', handlers.resume);
    $('btn-quit').addEventListener('click', handlers.menu);
    $('btn-menu').addEventListener('click', handlers.menu);
    $('btn-pause').addEventListener('click', handlers.pause);
    this.el.quality.addEventListener('click', handlers.quality);
    this.el.sound.addEventListener('click', handlers.sound);
  }
}

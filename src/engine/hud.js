/* ===========================================================
   hud.js — alles wat buiten het 3D-beeld op het scherm staat.
   =========================================================== */

import { SLOTS, ITEMS } from '../outfits.js';

const $ = (id) => document.getElementById(id);

/** 0xff7a3c → "#ff7a3c" */
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

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
        shop: $('screen-shop'),
      },

      creditsStart: $('credits-start'),
      creditsShop: $('credits-shop'),
      shopTabs: $('shop-tabs'),
      shopItems: $('shop-items'),
      shopHint: $('shop-hint'),
      overEarned: $('over-earned'),

      levelName: $('level-name'),
      levelTagline: $('level-tagline'),
      levelPicker: $('level-picker'),
      pickupLabel: $('pickup-label'),
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
    this._shopTab = SLOTS[0].id;
    this._defaultHint = this.el.shopHint.textContent;
  }

  setLevel(level) {
    this.el.levelName.textContent = level.name;
    this.el.levelTagline.textContent = level.tagline;
    const spul = (level.pickupLabel || 'Vis').toLowerCase();
    this.el.pickupLabel.textContent = level.pickupLabel || 'Vis';
    this._defaultHint = `Elk stuk ${spul} dat je onderweg oppakt is één credit waard.`;
    this.el.shopHint.textContent = this._defaultHint;
  }

  /**
   * Tekent de levelknoppen op het startscherm.
   * @param {Array} levels   alle levels
   * @param {string} huidig  id van het level dat nu draait
   * @param {(id:string)=>void} onKies
   * @param {(id:string)=>number} recordVan
   */
  renderLevels(levels, huidig, onKies, recordVan) {
    const nav = this.el.levelPicker;
    nav.replaceChildren();

    levels.forEach((level, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-btn';
      if (level.id === huidig) b.setAttribute('aria-current', 'true');

      const naam = document.createElement('span');
      naam.textContent = `${i + 1}. ${level.name}`;
      const record = document.createElement('small');
      const beste = Math.floor(recordVan(level.id));
      record.textContent = beste > 0 ? `record ${beste} m` : 'nog niet gelopen';
      b.append(naam, record);

      if (level.id !== huidig) b.addEventListener('click', () => onKies(level.id));
      nav.appendChild(b);
    });
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

  showGameOver({ distance, score, fish, reason, best, isRecord, earned, credits }) {
    this.el.overDistance.textContent = `${Math.floor(distance)} m`;
    this.el.overScore.textContent = Math.floor(score).toLocaleString('nl-NL');
    this.el.overFish.textContent = fish;
    this.el.overReason.textContent = reason;
    this.el.overRecord.hidden = !isRecord;
    this.el.overEarned.innerHTML =
      `+${earned} credit${earned === 1 ? '' : 's'} &middot; totaal <b>${Math.floor(credits).toLocaleString('nl-NL')}</b>`;
    this.setCredits(credits);
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

  /* ---------------- shop ---------------- */

  setCredits(n) {
    const txt = Math.floor(n).toLocaleString('nl-NL');
    this.el.creditsStart.textContent = txt;
    this.el.creditsShop.textContent = txt;
  }

  setShopHint(text) {
    this.el.shopHint.textContent = text || this._defaultHint;
  }

  /**
   * Tekent de hele shop opnieuw.
   * @param {Wardrobe} wardrobe
   * @param {(actie:'buy'|'equip', slot:string, id:string) => void} onPick
   */
  renderShop(wardrobe, onPick) {
    this.setCredits(wardrobe.credits);

    /* -- tabbladen -- */
    const tabs = this.el.shopTabs;
    tabs.replaceChildren();
    for (const slot of SLOTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.role = 'tab';
      b.textContent = slot.label;
      b.setAttribute('aria-selected', String(slot.id === this._shopTab));
      b.addEventListener('click', () => {
        this._shopTab = slot.id;
        this.setShopHint(null);
        this.renderShop(wardrobe, onPick);
      });
      tabs.appendChild(b);
    }

    /* -- artikelen -- */
    const list = this.el.shopItems;
    const scroll = list.scrollTop;
    list.replaceChildren();

    const slot = this._shopTab;
    for (const item of ITEMS[slot]) {
      const owned = wardrobe.has(item.id);
      const on = wardrobe.isEquipped(slot, item.id);

      const row = document.createElement('div');
      row.className = `item${on ? ' equipped' : ''}${owned ? '' : ' locked'}`;

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      const a = hex(item.colors.main);
      const b = hex(item.colors.trim ?? item.colors.accent ?? item.colors.main);
      swatch.style.background = `linear-gradient(135deg, ${a} 0 58%, ${b} 58% 100%)`;
      row.appendChild(swatch);

      const body = document.createElement('div');
      body.className = 'item-body';
      const name = document.createElement('div');
      name.className = 'item-name';
      name.textContent = item.name;
      body.appendChild(name);
      if (item.note) {
        const note = document.createElement('div');
        note.className = 'item-note';
        note.textContent = item.note;
        body.appendChild(note);
      }
      row.appendChild(body);

      const btn = document.createElement('button');
      btn.type = 'button';
      if (on) {
        btn.className = 'buy on';
        btn.textContent = 'Aan';
        btn.disabled = true;
      } else if (owned) {
        btn.className = 'buy wear';
        btn.textContent = 'Aantrekken';
        btn.addEventListener('click', () => onPick('equip', slot, item.id));
      } else {
        btn.className = 'buy price';
        const munt = document.createElement('i');
        munt.className = 'coin';
        btn.append(munt, String(item.price));
        btn.disabled = !wardrobe.canAfford(item);
        btn.addEventListener('click', () => onPick('buy', slot, item.id));
      }
      row.appendChild(btn);

      list.appendChild(row);
    }

    list.scrollTop = scroll;
  }

  /* ---------------- knoppen aansluiten ---------------- */

  bind(handlers) {
    $('btn-start').addEventListener('click', handlers.start);
    $('btn-again').addEventListener('click', handlers.start);
    $('btn-resume').addEventListener('click', handlers.resume);
    $('btn-quit').addEventListener('click', handlers.menu);
    $('btn-menu').addEventListener('click', handlers.menu);
    $('btn-pause').addEventListener('click', handlers.pause);
    $('btn-shop').addEventListener('click', handlers.shop);
    $('btn-over-shop').addEventListener('click', handlers.shop);
    $('btn-shop-close').addEventListener('click', handlers.menu);
    this.el.quality.addEventListener('click', handlers.quality);
    this.el.sound.addEventListener('click', handlers.sound);
  }
}

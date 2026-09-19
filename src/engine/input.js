/* ===========================================================
   input.js — toetsenbord, swipes en schermknoppen.
   Vertaalt alles naar losse acties:
     left · right · jump · slide · dive · pause · confirm
   =========================================================== */

/** Op e.code (toetspositie) — werkt ongeacht de toetsenbordindeling. */
const BY_CODE = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'slide', KeyS: 'slide',
  ShiftLeft: 'dive', ShiftRight: 'dive', KeyE: 'dive', ControlLeft: 'dive',
  KeyP: 'pause', Escape: 'pause',
  Enter: 'confirm', NumpadEnter: 'confirm',
};

/** Terugval op e.key: sommige virtuele toetsenborden vullen e.code niet. */
const BY_KEY = {
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
  arrowup: 'jump', w: 'jump', ' ': 'jump', spacebar: 'jump',
  arrowdown: 'slide', s: 'slide',
  shift: 'dive', e: 'dive', control: 'dive',
  p: 'pause', escape: 'pause', esc: 'pause',
  enter: 'confirm',
};

const actionFor = (e) =>
  BY_CODE[e.code] || BY_KEY[String(e.key || '').toLowerCase()] || null;

const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', ' ']);

const SWIPE_MIN = 26;      // px voordat een veeg telt

export class Input {
  constructor(target, onAction) {
    this.onAction = onAction;
    this.target = target;

    this._onKeyDown = (e) => {
      const action = actionFor(e);
      if (!action) return;
      // voorkom dat de pagina scrollt op pijltjes/spatie
      if (SCROLL_KEYS.has(e.code) || SCROLL_KEYS.has(e.key)) e.preventDefault();
      if (e.repeat) return;
      this.onAction(action);
    };
    window.addEventListener('keydown', this._onKeyDown, { passive: false });

    /* ---- swipe ---- */
    this.touch = null;
    this._onDown = (e) => {
      if (e.pointerType === 'mouse') return;
      this.touch = { x: e.clientX, y: e.clientY, t: performance.now(), fired: false };
    };
    this._onMove = (e) => {
      const t = this.touch;
      if (!t || t.fired) return;
      const dx = e.clientX - t.x;
      const dy = e.clientY - t.y;
      if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
      t.fired = true;
      if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx > 0 ? 'right' : 'left');
      else if (dy < 0) this.onAction('jump');
      else this.onAction(this.diveHint ? 'dive' : 'slide');
    };
    this._onUp = () => {
      const t = this.touch;
      this.touch = null;
      if (!t || t.fired) return;
      if (performance.now() - t.t < 260) this.onAction('jump');   // korte tik = springen
    };

    target.addEventListener('pointerdown', this._onDown, { passive: true });
    target.addEventListener('pointermove', this._onMove, { passive: true });
    target.addEventListener('pointerup', this._onUp, { passive: true });
    target.addEventListener('pointercancel', this._onUp, { passive: true });

    /* ---- schermknoppen ---- */
    this._onBtn = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      this.onAction(btn.dataset.action);
    };
    const pad = document.getElementById('touch-pad');
    if (pad) pad.addEventListener('pointerdown', this._onBtn);
    this.pad = pad;
  }

  /** Veeg omlaag betekent duiken zolang de speler in de lucht hangt. */
  setAirborne(v) { this.diveHint = v; }

  showTouchPad(show) { if (this.pad) this.pad.hidden = !show; }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    this.target.removeEventListener('pointerdown', this._onDown);
    this.target.removeEventListener('pointermove', this._onMove);
    this.target.removeEventListener('pointerup', this._onUp);
    this.target.removeEventListener('pointercancel', this._onUp);
    if (this.pad) this.pad.removeEventListener('pointerdown', this._onBtn);
  }
}

/** Grof: heeft dit apparaat een aanraakscherm zonder muis? */
export const isTouchDevice = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

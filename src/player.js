/* ===========================================================
   player.js — de poolreiziger.

   Toestanden: run · air · slide · dive
     springen  → over lage obstakels en spleten
     glijden   → onder ijsrichels en -bruggen door
     duiken    → in de lucht: keihard omlaag (om nog te kunnen
                 glijden); op de grond: voorwaartse duik die
                 pinguins wegmaait en je kort onkwetsbaar maakt
     ontwijken → van baan wisselen
   =========================================================== */

import * as THREE from 'three';
import { createRunner, applyOutfit } from './world/props.js';
import {
  LANE_X, GRAVITY, JUMP_V, DOUBLE_JUMP_V, DIVE_V,
  SLIDE_TIME, DIVE_TIME, DIVE_IFRAMES, DIVE_BOOST, HIT_IFRAMES, HITBOX,
} from './config.js';

export class Player {
  constructor(scene, props) {
    const runner = createRunner(props);
    this.model = runner;
    this.group = runner.group;
    scene.add(this.group);

    // etalagestand: in de shop draait hij rustig heen en weer
    this.showcase = false;
    this.spin = 0;

    this.reset();
  }

  /** Trek een outfit aan (objecten uit outfits.js). */
  setOutfit(outfit) {
    applyOutfit(this.model, outfit);
  }

  reset() {
    this.lane = 1;                 // 0 links · 1 midden · 2 rechts
    this.x = LANE_X[this.lane];
    this.y = 0;
    this.vy = 0;
    this.state = 'run';
    this.grounded = true;
    this.slideTimer = 0;
    this.diveTimer = 0;
    this.invulnTimer = 0;
    this.usedDoubleJump = false;
    this.pendingSlide = false;
    this.dead = false;
    this.runPhase = 0;
    this.tumble = 0;

    this.group.position.set(this.x, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.group.visible = true;
    this.model.torso.position.y = 1.02;
    this.model.torso.rotation.set(0, 0, 0);
  }

  /* ---------------- eigenschappen ---------------- */

  get hitbox() {
    if (this.state === 'slide') return HITBOX.slide;
    if (this.state === 'dive') return HITBOX.dive;
    return HITBOX.run;
  }

  /** Tijdens het duiken maai je pinguins opzij in plaats van er tegenaan te knallen. */
  get diving() { return this.diveTimer > DIVE_TIME - DIVE_IFRAMES; }

  get invulnerable() { return this.invulnTimer > 0 || this.dead; }

  /** Tijdelijke snelheidsbonus tijdens de duik. */
  get speedMultiplier() { return this.diveTimer > 0 ? DIVE_BOOST : 1; }

  /* ---------------- bediening ---------------- */

  input(action) {
    if (this.dead) return null;

    switch (action) {
      case 'left':  return this._move(-1);
      case 'right': return this._move(1);
      case 'jump':  return this._jump();
      case 'slide': return this._slide();
      case 'dive':  return this._dive();
    }
    return null;
  }

  _move(dir) {
    const next = Math.min(2, Math.max(0, this.lane + dir));
    if (next === this.lane) return null;
    this.lane = next;
    return 'move';
  }

  _jump() {
    if (this.grounded || this.state === 'slide') {
      this.state = 'air';
      this.grounded = false;
      this.slideTimer = 0;
      this.diveTimer = 0;
      this.pendingSlide = false;
      this.vy = JUMP_V;
      this.usedDoubleJump = false;
      return 'jump';
    }
    if (!this.usedDoubleJump && this.vy < 6) {
      this.usedDoubleJump = true;
      this.vy = DOUBLE_JUMP_V;
      this.diveTimer = 0;
      this.pendingSlide = false;
      this.state = 'air';
      return 'doublejump';
    }
    return null;
  }

  _slide() {
    if (this.grounded) {
      if (this.state === 'slide') { this.slideTimer = SLIDE_TIME; return null; }
      this.state = 'slide';
      this.slideTimer = SLIDE_TIME;
      this.diveTimer = 0;
      return 'slide';
    }
    // in de lucht: snel zakken en direct doorglijden bij de landing
    this.vy = Math.min(this.vy, DIVE_V * 0.72);
    this.pendingSlide = true;
    return null;
  }

  _dive() {
    if (!this.grounded) {
      this.vy = DIVE_V;
      this.state = 'dive';
      this.diveTimer = DIVE_TIME;
      this.pendingSlide = true;
      return 'dive';
    }
    if (this.diveTimer > 0) return null;
    this.state = 'dive';
    this.diveTimer = DIVE_TIME;
    this.slideTimer = 0;
    return 'dive';
  }

  /** Wordt aangeroepen als je een sneeuwschans raakt. */
  launch(v) {
    this.vy = v;
    this.grounded = false;
    this.state = 'air';
    this.usedDoubleJump = false;
    this.diveTimer = 0;
    this.slideTimer = 0;
    this.pendingSlide = false;
  }

  hurt() {
    this.invulnTimer = HIT_IFRAMES;
    this.vy = Math.max(this.vy, 5.5);
    this.grounded = false;
    this.state = 'air';
    this.slideTimer = 0;
    this.diveTimer = 0;
    this.pendingSlide = false;
  }

  /** Terug op de baan nadat je in een spleet viel. */
  recover() {
    this.y = 0;
    this.vy = 8;
    this.grounded = false;
    this.state = 'air';
    this.invulnTimer = HIT_IFRAMES;
  }

  die() {
    this.dead = true;
    this.vy = 9;
    this.state = 'air';
    this.grounded = false;
  }

  /* ---------------- per frame ---------------- */

  update(dt, speed) {
    const events = [];

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    if (this.dead) {
      this.tumble += dt;
      this.vy -= GRAVITY * 0.55 * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      this.group.position.set(this.x, this.y, 0);
      this.group.rotation.x = -this.tumble * 5.5;
      this.group.rotation.z = this.tumble * 2.2;
      this.group.visible = true;
      return events;
    }

    /* -- zijwaarts -- */
    const targetX = LANE_X[this.lane];
    this.x = THREE.MathUtils.damp(this.x, targetX, 13, dt);
    const drift = targetX - this.x;

    /* -- verticaal -- */
    if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.usedDoubleJump = false;
        events.push('land');
        if (this.pendingSlide) {
          this.pendingSlide = false;
          this.state = 'slide';
          this.slideTimer = SLIDE_TIME;
        } else if (this.diveTimer > 0) {
          this.state = 'dive';
        } else {
          this.state = 'run';
        }
      }
    }

    /* -- timers -- */
    if (this.slideTimer > 0) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0 && this.state === 'slide') this.state = this.grounded ? 'run' : 'air';
    }
    if (this.diveTimer > 0) {
      this.diveTimer -= dt;
      if (this.diveTimer <= 0 && this.state === 'dive') this.state = this.grounded ? 'run' : 'air';
    }
    if (this.grounded && this.state === 'air') this.state = 'run';
    if (!this.grounded && this.state === 'run') this.state = 'air';

    this._animate(dt, speed, drift);
    return events;
  }

  /* ---------------- animatie ---------------- */

  _animate(dt, speed, drift) {
    const { torso, arms, legs, head } = this.model;
    const g = this.group;

    g.position.set(this.x, this.y, 0);

    if (this.showcase) {
      // rustig heen en weer, zodat je de outfit van alle kanten ziet
      this.spin += dt * 0.5;
      this.model.body.rotation.y = Math.PI + Math.sin(this.spin) * 1.3;
      g.rotation.z = 0;
      g.rotation.y = 0;
    } else {
      this.model.body.rotation.y = Math.PI;
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, drift * -0.13, 12, dt);
      // het model kijkt naar -z, dus de draai gaat andersom dan je zou denken
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, drift * -0.16, 12, dt);
    }

    // knipperen tijdens onkwetsbaarheid
    g.visible = this.invulnTimer <= 0 || (Math.floor(this.invulnTimer * 22) % 2 === 0);

    const lerp = (o, prop, to, k = 14) => { o[prop] = THREE.MathUtils.damp(o[prop], to, k, dt); };

    switch (this.state) {
      case 'slide': {
        lerp(torso.position, 'y', 0.46, 16);
        lerp(torso.rotation, 'x', -1.15, 16);
        lerp(arms[0].rotation, 'x', -2.5); lerp(arms[1].rotation, 'x', -2.5);
        lerp(legs[0].rotation, 'x', 0.45); lerp(legs[1].rotation, 'x', 0.75);
        lerp(head.rotation, 'x', 0.7);
        break;
      }
      case 'dive': {
        lerp(torso.position, 'y', 0.44, 18);
        lerp(torso.rotation, 'x', 1.32, 18);
        lerp(arms[0].rotation, 'x', -2.9, 18); lerp(arms[1].rotation, 'x', -2.9, 18);
        lerp(legs[0].rotation, 'x', 0.25); lerp(legs[1].rotation, 'x', 0.25);
        lerp(head.rotation, 'x', -0.85);
        break;
      }
      case 'air': {
        const rising = this.vy > 0;
        lerp(torso.position, 'y', 1.04, 10);
        lerp(torso.rotation, 'x', rising ? -0.12 : 0.22, 10);
        lerp(arms[0].rotation, 'x', rising ? -2.2 : -0.6);
        lerp(arms[1].rotation, 'x', rising ? -1.4 : -1.9);
        lerp(legs[0].rotation, 'x', rising ? -1.0 : 0.35);
        lerp(legs[1].rotation, 'x', rising ? 0.45 : -0.55);
        lerp(head.rotation, 'x', 0);
        break;
      }
      default: {
        // rennen — pasfrequentie loopt mee met de snelheid
        this.runPhase += dt * (5.2 + speed * 0.34);
        const s = Math.sin(this.runPhase);
        const c = Math.cos(this.runPhase * 2);
        lerp(torso.position, 'y', 1.02 + c * 0.035, 20);
        lerp(torso.rotation, 'x', 0.14, 10);
        legs[0].rotation.x = s * 0.95;
        legs[1].rotation.x = -s * 0.95;
        arms[0].rotation.x = -s * 0.85;
        arms[1].rotation.x = s * 0.85;
        lerp(head.rotation, 'x', -0.06);
        break;
      }
    }
  }
}

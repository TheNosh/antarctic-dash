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
import { createRunner, applyOutfit, TORSO_Y } from './world/props.js';
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
    this.model.torso.position.y = TORSO_Y;
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

    /* Tekenafspraak voor de gewrichten (het ledemaat hangt omlaag):
       positieve rotatie.x zwaait het uiteinde naar achteren, negatieve
       naar voren. Een knie kan alleen naar achteren buigen (positief),
       een elleboog alleen naar voren (negatief). */
    const setArm = (i, shoulder, elbow, k = 14) => {
      lerp(arms[i].rotation, 'x', shoulder, k);
      lerp(arms[i].userData.elbow.rotation, 'x', elbow, k);
    };
    const setLeg = (i, hip, knee, k = 14) => {
      lerp(legs[i].rotation, 'x', hip, k);
      lerp(legs[i].userData.knee.rotation, 'x', knee, k);
    };

    switch (this.state) {
      /* Glijden en duiken gaan allebei op de buik, net als de pinguïns.
         Op je rúg zou de rugzak onder je lichaam door de grond zakken;
         op je buik ligt hij bovenop en blijft alles boven het maaiveld.
         De waarden hieronder zijn doorgerekend: het hoogste punt komt op
         y ≈ 0.89 en het laagste op −0.12, gelijk aan gewoon rennen. */
      case 'slide': {
        lerp(torso.position, 'y', 0.28, 16);
        lerp(torso.rotation, 'x', 1.52, 16);
        lerp(torso.rotation, 'y', 0, 12);
        // armen langs het lichaam naar achteren
        setArm(0, -0.15, -0.15, 16); setArm(1, -0.15, -0.15, 16);
        setLeg(0, -0.10, 0.35, 16);  setLeg(1, 0.08, 0.20, 16);
        lerp(head.rotation, 'x', -0.55);
        break;
      }
      case 'dive': {
        lerp(torso.position, 'y', 0.30, 18);
        lerp(torso.rotation, 'x', 1.45, 18);
        lerp(torso.rotation, 'y', 0, 12);
        // gestrekt naar voren, als een duiker
        setArm(0, -2.90, -0.10, 18); setArm(1, -2.90, -0.10, 18);
        setLeg(0, 0.05, 0.12, 18);   setLeg(1, 0.15, 0.12, 18);
        lerp(head.rotation, 'x', -0.50);
        break;
      }
      case 'air': {
        const rising = this.vy > 0;
        lerp(torso.position, 'y', TORSO_Y + 0.02, 10);
        lerp(torso.rotation, 'x', rising ? -0.12 : 0.22, 10);
        lerp(torso.rotation, 'y', 0, 10);
        if (rising) {
          // knieën opgetrokken, armen omhoog
          setArm(0, -2.1, -1.0); setArm(1, -1.5, -1.3);
          setLeg(0, -0.95, 1.45); setLeg(1, 0.40, 0.75);
        } else {
          // benen naar voren om te landen
          setArm(0, -0.6, -0.7); setArm(1, -1.9, -0.9);
          setLeg(0, 0.35, 0.35); setLeg(1, -0.60, 0.95);
        }
        lerp(head.rotation, 'x', 0);
        break;
      }
      default: {
        // rennen — pasfrequentie loopt mee met de snelheid
        this.runPhase += dt * (5.2 + speed * 0.34);
        const ph = this.runPhase;
        const c = Math.cos(ph * 2);

        lerp(torso.position, 'y', TORSO_Y + c * 0.035, 20);
        lerp(torso.rotation, 'x', 0.16, 10);
        // lichte rompdraai tegen de armzwaai in
        torso.rotation.y = Math.sin(ph) * 0.09;

        for (let i = 0; i < 2; i++) {
          const p = ph + i * Math.PI;         // benen lopen in tegenfase
          const sw = Math.sin(p);

          // heup zwaait, knie buigt kort na het afzetten door
          legs[i].rotation.x = sw * 0.95;
          legs[i].userData.knee.rotation.x = Math.max(0, Math.sin(p + 2.0)) * 1.45;

          // arm tegengesteld aan het been aan dezelfde kant
          arms[i].rotation.x = -sw * 0.8;
          arms[i].userData.elbow.rotation.x = -(0.75 + Math.max(0, -sw) * 0.4);
        }

        lerp(head.rotation, 'x', -0.06);
        head.rotation.y = -Math.sin(ph) * 0.05;
        break;
      }
    }
  }
}

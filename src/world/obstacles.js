/* ===========================================================
   obstacles.js — spawnen, bewegen, botsen en opruimen.

   De baan wordt opgebouwd uit *patronen* uit het level-bestand.
   Elk patroon is zo ontworpen dat er altijd minstens één manier
   is om er doorheen te komen (springen, glijden, duiken of
   gewoon een andere baan kiezen).
   =========================================================== */

import * as THREE from 'three';
import { LANE_X, SPAWN_AHEAD, DESPAWN_Z } from '../config.js';

const laneToX = (lane) => (lane === 'all' ? 0 : LANE_X[lane + 1]);

export class ObstacleField {
  constructor(scene, props, level) {
    this.props = props;
    this.level = level;

    this.root = new THREE.Group();
    scene.add(this.root);

    this.pool = new Map();   // type → vrije instanties
    this.active = [];
    this.cursorZ = 0;
    this.lastPatternId = null;
  }

  reset() {
    for (const rec of this.active) this._release(rec);
    this.active.length = 0;
    this.cursorZ = -95;      // rustige aanloop van ~95 m
    this.lastPatternId = null;
  }

  /* ---------------- pooling ---------------- */

  _acquire(type, def) {
    let free = this.pool.get(type);
    if (!free) { free = []; this.pool.set(type, free); }

    let obj = free.pop();
    if (!obj) {
      obj = this.props[def.builder]();
      this.root.add(obj);
    }
    obj.visible = true;
    obj.scale.set(def.scaleX || 1, 1, 1);
    obj.rotation.set(0, 0, 0);
    return obj;
  }

  _release(rec) {
    rec.obj.visible = false;
    const free = this.pool.get(rec.type);
    if (free) free.push(rec.obj); else this.pool.set(rec.type, [rec.obj]);
  }

  /* ---------------- spawnen ---------------- */

  /** Moeilijkheidstrap op basis van afgelegde afstand. */
  tierFor(distance) {
    const tiers = this.level.progression.tiers;
    let t = 0;
    for (let i = 0; i < tiers.length; i++) if (distance >= tiers[i]) t = i;
    return t;
  }

  _choosePattern(tier) {
    const pool = [];
    let total = 0;
    for (const p of this.level.patterns) {
      if (p.tier > tier) continue;
      if (p.id === this.lastPatternId) continue;         // niet twee keer achter elkaar
      // nieuwere patronen krijgen wat meer kans zodra ze opengaan
      const freshness = 1 + Math.max(0, 2 - (tier - p.tier)) * 0.35;
      const w = p.weight * freshness;
      total += w;
      pool.push({ p, w });
    }
    let r = Math.random() * total;
    for (const e of pool) { r -= e.w; if (r <= 0) return e.p; }
    return pool.length ? pool[pool.length - 1].p : this.level.patterns[0];
  }

  _spawnPattern(pattern, baseZ) {
    const flip = pattern.mirror !== false && Math.random() < 0.5 ? -1 : 1;

    for (const item of pattern.items) {
      const def = this.level.obstacles[item.type];
      if (!def) { console.warn('Onbekend obstakel:', item.type); continue; }

      const lane = typeof item.lane === 'number' ? item.lane * flip : item.lane;
      const obj = this._acquire(item.type, def);

      const rec = {
        type: item.type,
        def,
        obj,
        kind: def.kind,
        box: def.box,
        x: laneToX(lane),
        y: item.y ?? 0,
        z: baseZ - item.z,
        hit: false,
        passed: false,
        knock: null,
        phase: Math.random() * 6.28,
      };

      // beweging van pinguïns
      const m = def.motion;
      if (m?.type === 'cross') {
        const side = lane === 'all' ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(lane) || 1;
        rec.x = side * m.bound;
        rec.vx = -side * m.speed;
        rec.bound = m.bound;
      } else if (m?.type === 'charge') {
        rec.vz = m.speed;
      }

      obj.position.set(rec.x, rec.y, rec.z);
      this.active.push(rec);
    }

    this.lastPatternId = pattern.id;
  }

  /* ---------------- per frame ---------------- */

  /**
   * @param {number} dz      meters die de wereld dit frame opschuift
   * @param {number} dt      tijdstap
   * @param {number} distance afgelegde afstand (bepaalt moeilijkheid)
   * @param {object} player  { x, y, hitbox, invulnerable, diving }
   * @returns {Array} lijst met gebeurtenissen voor game.js
   */
  update(dz, dt, distance, player) {
    const events = [];
    const tier = this.tierFor(distance);

    /* -- bestaande objecten bijwerken -- */
    for (let i = this.active.length - 1; i >= 0; i--) {
      const rec = this.active[i];
      const obj = rec.obj;
      const wasBefore = rec.z;

      rec.z += dz;

      if (rec.knock) {
        // weggeduwde pinguïn tolt weg
        rec.knock.vy -= 45 * dt;
        rec.x += rec.knock.vx * dt;
        rec.y += rec.knock.vy * dt;
        rec.z += rec.knock.vz * dt;
        obj.rotation.x += rec.knock.vr * dt;
        obj.rotation.z += rec.knock.vr * 0.7 * dt;
        obj.position.set(rec.x, rec.y, rec.z);
        if (rec.y < -6 || rec.z > DESPAWN_Z + 10) { this._release(rec); this.active.splice(i, 1); }
        continue;
      }

      if (rec.vx !== undefined) {
        rec.x += rec.vx * dt;
        if (rec.x > rec.bound) { rec.x = rec.bound; rec.vx *= -1; }
        else if (rec.x < -rec.bound) { rec.x = -rec.bound; rec.vx *= -1; }
        obj.rotation.y = rec.vx > 0 ? Math.PI / 2 : -Math.PI / 2;
        obj.rotation.z = Math.sin(rec.z * 0.4 + rec.phase) * 0.08;
      } else if (rec.vz !== undefined) {
        rec.z += rec.vz * dt;
        const roller = obj.userData.roller;
        if (roller) {
          // rolt over de grond: draaisnelheid volgt de afgelegde weg
          roller.rotation.x -= (dz + rec.vz * dt) / 0.52;
        } else {
          obj.rotation.z = Math.sin(rec.z * 0.5 + rec.phase) * 0.1;
        }
      }

      if (rec.kind === 'pickup') {
        const d = rec.def;
        obj.rotation.y += (d.spin || 2) * dt;
        obj.position.y = rec.y + Math.sin(performance.now() * 0.003 + rec.phase) * (d.bob || 0.1);
        obj.position.x = rec.x;
        obj.position.z = rec.z;
      } else {
        obj.position.set(rec.x, rec.y, rec.z);
      }

      /* -- botsing -- */
      if (!rec.hit && Math.abs(rec.z - 0) < 5) {
        const ev = this._collide(rec, player);
        if (ev) events.push(ev);
        if (rec.dead) { this._release(rec); this.active.splice(i, 1); continue; }
      }

      /* -- net-gemist -- */
      if (!rec.passed && wasBefore < 0 && rec.z >= 0) {
        rec.passed = true;
        if (!rec.hit && (rec.kind === 'solid' || rec.kind === 'creature')) {
          const dx = Math.abs(player.x - rec.x);
          if (dx < rec.box.hw + 0.95) events.push({ type: 'nearmiss' });
        }
      }

      if (rec.z > DESPAWN_Z) { this._release(rec); this.active.splice(i, 1); }
    }

    /* -- nieuwe patronen -- */
    this.cursorZ += dz;
    let guard = 0;
    while (this.cursorZ > -SPAWN_AHEAD && guard++ < 12) {
      const pattern = this._choosePattern(tier);
      this._spawnPattern(pattern, this.cursorZ);

      const prog = this.level.progression;
      const f = tier / Math.max(1, prog.tiers.length - 1);
      const gap = prog.gapBase + (prog.gapMin - prog.gapBase) * f;
      this.cursorZ -= pattern.length + gap * (0.85 + Math.random() * 0.4);
    }

    return events;
  }

  /* ---------------- botsingsdetectie ---------------- */

  _collide(rec, p) {
    const b = rec.box;
    const h = p.hitbox;

    // x / z overlap (AABB)
    if (Math.abs(p.x - rec.x) > b.hw + h.hw) return null;
    if (Math.abs(rec.z) > b.hl + h.hl) return null;

    switch (rec.kind) {
      case 'pickup': {
        const cy = rec.y;
        if (p.y + h.y1 < cy + b.y0 || p.y + h.y0 > cy + b.y1) return null;
        rec.hit = true;
        rec.dead = true;   // update() ruimt hem op
        return { type: 'pickup', kind: rec.def.pickup, pos: { x: rec.x, y: rec.y, z: rec.z } };
      }

      case 'ramp': {
        if (p.y > 0.45) return null;          // je vliegt er al overheen
        rec.hit = true;
        return { type: 'ramp', launch: rec.def.launch };
      }

      case 'pit': {
        if (p.y > 0.3) return null;           // ruim over de spleet
        if (p.invulnerable) return null;      // net geraakt: niet meteen nog een keer
        rec.hit = true;
        return { type: 'fall', obstacle: rec };
      }

      default: {
        // solid / overhead / creature — hoogtecontrole
        if (p.y + h.y1 < b.y0 || p.y + h.y0 > b.y1) return null;

        if (rec.kind === 'creature' && p.diving) {
          rec.hit = true;
          rec.knock = {
            vx: (rec.x < p.x ? -1 : 1) * (6 + Math.random() * 4),
            vy: 9 + Math.random() * 4,
            vz: 5,
            vr: 7 + Math.random() * 5,
          };
          return { type: 'knock', pos: { x: rec.x, y: rec.y + 0.4, z: rec.z } };
        }

        if (p.invulnerable) return null;
        rec.hit = true;
        return { type: 'hit', obstacle: rec, label: rec.def.label };
      }
    }
  }
}

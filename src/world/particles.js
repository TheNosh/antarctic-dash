/* ===========================================================
   particles.js — sneeuwstuifjes.
   Eén buffer met vaste capaciteit; deeltjes worden hergebruikt.
   Gebruikt voor landen, glijden, duiken, vis pakken en klappen.
   =========================================================== */

import * as THREE from 'three';

const CAPACITY = 520;
const HIDDEN = -9999;

export class Particles {
  constructor(scene, props) {
    this.n = CAPACITY;
    this.pos = new Float32Array(CAPACITY * 3);
    this.col = new Float32Array(CAPACITY * 3);
    this.vel = new Float32Array(CAPACITY * 3);
    this.life = new Float32Array(CAPACITY);
    this.maxLife = new Float32Array(CAPACITY);
    this.grav = new Float32Array(CAPACITY);
    this.cursor = 0;

    for (let i = 0; i < CAPACITY; i++) this.pos[i * 3 + 1] = HIDDEN;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));

    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      map: props.textures.flake,
      size: 0.38,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.NormalBlending,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);

    this._c = new THREE.Color();
  }

  /**
   * @param {object} o {x,y,z,count,speed,spread,up,color,life,gravity,drift}
   */
  emit({ x = 0, y = 0, z = 0, count = 10, speed = 3, spread = 1, up = 2,
         color = 0xffffff, life = 0.6, gravity = 9, drift = 0 }) {
    this._c.set(color);
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      const i3 = i * 3;

      this.pos[i3 + 0] = x + (Math.random() - 0.5) * spread;
      this.pos[i3 + 1] = y + Math.random() * spread * 0.5;
      this.pos[i3 + 2] = z + (Math.random() - 0.5) * spread;

      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.vel[i3 + 0] = Math.cos(a) * r;
      this.vel[i3 + 1] = up * (0.4 + Math.random());
      this.vel[i3 + 2] = Math.sin(a) * r + drift;

      this.col[i3 + 0] = this._c.r;
      this.col[i3 + 1] = this._c.g;
      this.col[i3 + 2] = this._c.b;

      this.life[i] = this.maxLife[i] = life * (0.7 + Math.random() * 0.6);
      this.grav[i] = gravity;
    }
  }

  /** @param {number} dz meters die de wereld opschuift (deeltjes drijven mee) */
  update(dt, dz) {
    const { pos, vel, life, grav } = this;
    for (let i = 0; i < this.n; i++) {
      if (life[i] <= 0) continue;
      const i3 = i * 3;
      life[i] -= dt;
      if (life[i] <= 0) { pos[i3 + 1] = HIDDEN; continue; }
      vel[i3 + 1] -= grav[i] * dt;
      pos[i3 + 0] += vel[i3 + 0] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt + dz;
      if (pos[i3 + 1] < 0.02) { pos[i3 + 1] = 0.02; vel[i3 + 1] *= -0.25; vel[i3] *= 0.6; vel[i3 + 2] *= 0.6; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.n; i++) { this.life[i] = 0; this.pos[i * 3 + 1] = HIDDEN; }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

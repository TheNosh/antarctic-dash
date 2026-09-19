/* ===========================================================
   game.js — de motor: scène, camera, spelregels en de lus.
   =========================================================== */

import * as THREE from 'three';

import { Props } from '../world/props.js';
import { Track } from '../world/track.js';
import { ObstacleField } from '../world/obstacles.js';
import { Particles } from '../world/particles.js';
import { Player } from '../player.js';
import { Hud } from './hud.js';
import { Input, isTouchDevice } from './input.js';
import { Sound } from './audio.js';
import { SCORE, START_LIVES, HIT_SLOWDOWN, STORAGE } from '../config.js';

export class Game {
  constructor(canvas, level) {
    this.canvas = canvas;
    this.level = level;
    this.state = 'menu';
    this.clock = new THREE.Clock();

    this.highQuality = localStorage.getItem(STORAGE.quality) !== 'low';
    this.soundOn = localStorage.getItem(STORAGE.sound) !== 'off';
    this.best = Number(localStorage.getItem(STORAGE.best) || 0);
  }

  /* =====================================================
     Opbouw
     ===================================================== */

  init() {
    const L = this.level;

    /* --- renderer --- */
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: this.highQuality, powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    /* --- scène --- */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);
    this.scene.background = new THREE.Color(L.fog.color);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
    this.camera.position.set(0, 3.4, 7.4);
    this.baseFov = 62;

    /* --- licht --- */
    const hemi = new THREE.HemisphereLight(L.light.hemiSky, L.light.hemiGround, L.light.hemiPower);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(L.light.sunColor, L.light.sunPower);
    sun.position.set(...L.light.sunPos);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 32; sc.bottom = -18; sc.near = 1; sc.far = 160;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.035;
    sun.target.position.set(0, 0, -12);
    this.scene.add(sun, sun.target);
    this.sun = sun;

    /* --- wereld --- */
    this.props = new Props(L);
    this.track = new Track(this.scene, this.props, L);
    this.field = new ObstacleField(this.scene, this.props, L);
    this.particles = new Particles(this.scene, this.props);
    this.player = new Player(this.scene, this.props);

    /* --- schil --- */
    this.hud = new Hud();
    this.hud.setLevel(L);
    this.hud.setBest(this.best);
    this.hud.setQualityLabel(this.highQuality);
    this.hud.setSoundLabel(this.soundOn);
    this.hud.bind({
      start: () => this.start(),
      resume: () => this.resume(),
      menu: () => this.toMenu(),
      pause: () => this.pause(),
      quality: () => this.toggleQuality(),
      sound: () => this.toggleSound(),
    });

    this.sound = new Sound();
    this.sound.setEnabled(this.soundOn);

    this.input = new Input(this.canvas, (a) => this.onAction(a));
    this.input.showTouchPad(false);
    this.isTouch = isTouchDevice();

    /* --- vensterbeheer --- */
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    this.applyQuality();
    this.resize();
    this.resetRun();
    this.hud.showScreen('start');
    document.getElementById('loader').hidden = true;

    this.clock.start();
    this._loop = (t) => this.frame(t);
    requestAnimationFrame(this._loop);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.highQuality ? 2 : 1));
    this.renderer.setSize(w, h, false);
  }

  applyQuality() {
    this.renderer.shadowMap.enabled = this.highQuality;
    this.renderer.shadowMap.needsUpdate = true;
    this.sun.castShadow = this.highQuality;
    this.track.setQuality(this.highQuality);
    this.resize();
  }

  /* =====================================================
     Spelverloop
     ===================================================== */

  resetRun() {
    this.distance = 0;
    this.score = 0;
    this.fish = 0;
    this.lives = START_LIVES;
    this.shield = false;
    this.speed = this.level.speed.start;
    this.speedMul = 1;
    this.shake = 0;
    this.runTime = 0;
    this.stepTimer = 0;
    this.lastReason = 'Je knalde tegen het ijs';

    this.player.reset();
    this.field.reset();
    this.track.reset();
    this.particles.clear();

    this.hud.setLives(this.lives, START_LIVES);
    this.hud.setShield(false);
    this.hud.setStats({ distance: 0, score: 0, fish: 0, speed: this.speed, maxSpeed: this.level.speed.max });
  }

  start() {
    this.sound.unlock();
    this.resetRun();
    this.state = 'playing';
    this.hud.showScreen(null);
    this.input.showTouchPad(this.isTouch);
    this.hud.toast('Ga!');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.sound.suspend();
    this.hud.showScreen('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.sound.resume();
    this.hud.showScreen(null);
    this.clock.getDelta();      // gooi de pauzetijd weg
  }

  toMenu() {
    this.state = 'menu';
    this.sound.resume();
    this.resetRun();
    this.input.showTouchPad(false);
    this.hud.showScreen('start');
  }

  gameOver(reason) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.player.die();
    this.sound.gameOver();
    this.sound.setWind(0);
    this.input.showTouchPad(false);
    this.shake = 0.6;

    const isRecord = this.distance > this.best;
    if (isRecord) {
      this.best = this.distance;
      localStorage.setItem(STORAGE.best, String(Math.floor(this.best)));
    }

    // even laten uittollen voordat het scherm komt
    setTimeout(() => {
      if (this.state !== 'over') return;
      this.hud.showGameOver({
        distance: this.distance, score: this.score, fish: this.fish,
        reason, best: this.best, isRecord,
      });
    }, 900);
  }

  /* =====================================================
     Invoer
     ===================================================== */

  onAction(action) {
    if (action === 'pause') {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
      return;
    }

    if (this.state === 'menu') { if (action === 'confirm' || action === 'jump') this.start(); return; }
    if (this.state === 'over') { if (action === 'confirm' || action === 'jump') this.start(); return; }
    if (this.state !== 'playing') return;

    const result = this.player.input(action);
    const p = this.player;

    switch (result) {
      case 'jump':
        this.sound.jump();
        this.particles.emit({ x: p.x, y: 0.1, z: 0, count: 8, speed: 2.4, up: 1.6, life: 0.5, color: 0xffffff });
        break;
      case 'doublejump':
        this.sound.doubleJump();
        this.particles.emit({ x: p.x, y: p.y, z: 0, count: 10, speed: 3, up: 0.6, life: 0.4, color: 0xdff2ff });
        break;
      case 'slide':
        this.sound.slide();
        this.particles.emit({ x: p.x, y: 0.15, z: 0.3, count: 14, speed: 2.6, up: 1.2, life: 0.55, color: 0xffffff });
        break;
      case 'dive':
        this.sound.dive();
        this.particles.emit({ x: p.x, y: p.y + 0.3, z: 0.2, count: 16, speed: 3.4, up: 1.4, life: 0.5, color: 0xeaf6ff });
        break;
    }
  }

  /* =====================================================
     De lus
     ===================================================== */

  frame() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === 'paused') { this.renderer.render(this.scene, this.camera); return; }

    if (this.state === 'menu') this.updateMenu(dt);
    else this.updatePlay(dt);

    this.renderer.render(this.scene, this.camera);
  }

  /** Rustig scrollende achtergrond achter het startscherm. */
  updateMenu(dt) {
    const dz = 9 * dt;
    this.player.update(dt, 9);
    this.track.update(dz, dt, 9, this.camera.position);
    this.particles.update(dt, dz);
    this.updateCamera(dt, 9);
  }

  updatePlay(dt) {
    const L = this.level;
    const p = this.player;

    if (this.state === 'over') {
      // uittollen: de wereld remt af
      this.speed = Math.max(0, this.speed - 26 * dt);
      const dz = this.speed * dt;
      p.update(dt, this.speed);
      this.track.update(dz, dt, this.speed, this.camera.position);
      this.field.update(dz, dt, this.distance, { x: p.x, y: 99, hitbox: p.hitbox, invulnerable: true, diving: false });
      this.particles.update(dt, dz);
      this.updateCamera(dt, this.speed);
      return;
    }

    this.runTime += dt;

    /* --- snelheid --- */
    const sp = L.speed;
    const target = sp.start + (sp.max - sp.start) * (1 - Math.exp(-this.distance / sp.ramp));
    this.speed = THREE.MathUtils.damp(this.speed, target, 1.6, dt);
    this.speedMul = THREE.MathUtils.damp(this.speedMul, 1, 1.1, dt);

    const effective = this.speed * this.speedMul * p.speedMultiplier;
    const dz = effective * dt;
    this.distance += dz;

    const tier = this.field.tierFor(this.distance);
    this.score += dz * SCORE.perMeter * (1 + tier * 0.15);

    /* --- speler --- */
    const pe = p.update(dt, effective);
    if (pe.includes('land')) {
      this.sound.land();
      this.particles.emit({ x: p.x, y: 0.1, z: 0.2, count: 12, speed: 2.8, up: 1.2, life: 0.5, color: 0xffffff });
    }
    this.input.setAirborne(!p.grounded);

    // stuifsneeuw onder de voeten
    this.stepTimer -= dt;
    if (this.stepTimer <= 0 && p.grounded) {
      this.stepTimer = p.state === 'run' ? 0.19 : 0.05;
      const trail = p.state === 'slide' || p.state === 'dive';
      this.particles.emit({
        x: p.x, y: 0.08, z: trail ? 0.45 : 0.25,
        count: trail ? 7 : 3, speed: trail ? 2.2 : 1.1,
        up: trail ? 1.0 : 0.5, life: trail ? 0.5 : 0.35,
        color: 0xffffff, gravity: 11, drift: 2,
      });
    }

    /* --- wereld --- */
    this.track.update(dz, dt, effective, this.camera.position);
    const events = this.field.update(dz, dt, this.distance, {
      x: p.x, y: p.y, hitbox: p.hitbox,
      invulnerable: p.invulnerable, diving: p.diving,
    });
    this.handleEvents(events);
    this.particles.update(dt, dz);

    /* --- camera, hud, geluid --- */
    this.updateCamera(dt, effective);
    this.sound.setWind(Math.min(1, (effective - sp.start) / (sp.max - sp.start)));
    this.hud.setStats({
      distance: this.distance, score: this.score, fish: this.fish,
      speed: effective, maxSpeed: sp.max,
    });
  }

  /* =====================================================
     Gebeurtenissen
     ===================================================== */

  handleEvents(events) {
    const p = this.player;

    for (const ev of events) {
      switch (ev.type) {
        case 'pickup':
          if (ev.kind === 'fish') {
            this.fish++;
            this.score += SCORE.fish;
            this.sound.coin();
            this.particles.emit({ x: ev.pos.x, y: ev.pos.y, z: ev.pos.z, count: 12, speed: 2.6, up: 1.4, life: 0.5, color: 0x8fdcff, gravity: 5 });
          } else {
            this.shield = true;
            this.score += SCORE.shield;
            this.hud.setShield(true);
            this.hud.toast('Schild!');
            this.sound.shield();
            this.particles.emit({ x: ev.pos.x, y: ev.pos.y, z: ev.pos.z, count: 22, speed: 3.6, up: 2, life: 0.7, color: 0x7ef0d0, gravity: 4 });
          }
          break;

        case 'knock':
          this.score += SCORE.penguinKnock;
          this.sound.knock();
          this.hud.toast('Opzij!');
          this.particles.emit({ x: ev.pos.x, y: ev.pos.y, z: ev.pos.z, count: 18, speed: 4, up: 2.2, life: 0.6, color: 0xffffff });
          break;

        case 'nearmiss':
          this.score += SCORE.nearMiss;
          break;

        case 'ramp':
          p.launch(ev.launch);
          this.sound.jump();
          this.particles.emit({ x: p.x, y: 1.2, z: 0, count: 20, speed: 3.4, up: 2.4, life: 0.6, color: 0xffffff });
          break;

        case 'fall':
          this.loseLife('Je zakte door het ijs in een gletsjerspleet');
          this.sound.fall();
          p.recover();
          this.particles.emit({ x: p.x, y: 0.3, z: 0, count: 20, speed: 3, up: 2, life: 0.7, color: 0xbfe6ff });
          break;

        case 'hit': {
          const label = ev.label || 'het ijs';
          if (this.shield) {
            this.shield = false;
            this.hud.setShield(false);
            this.hud.toast('Schild gebroken!');
            this.sound.knock();
            p.hurt();
            this.shake = 0.25;
            this.particles.emit({ x: p.x, y: 0.9, z: 0, count: 24, speed: 4, up: 2, life: 0.6, color: 0x7ef0d0 });
          } else {
            this.loseLife(`Je knalde tegen ${article(label)}`);
            this.sound.hit();
            p.hurt();
            this.particles.emit({ x: p.x, y: 0.9, z: 0, count: 22, speed: 4, up: 2, life: 0.6, color: 0xffffff });
          }
          break;
        }
      }
    }
  }

  loseLife(reason) {
    this.lives--;
    this.lastReason = reason;
    this.speedMul = HIT_SLOWDOWN;
    this.shake = 0.45;
    this.hud.setLives(Math.max(0, this.lives), START_LIVES);
    this.hud.flashHit();

    if (this.lives <= 0) this.gameOver(reason);
    else this.hud.toast(`Nog ${this.lives} ${this.lives === 1 ? 'leven' : 'levens'}`);
  }

  /* =====================================================
     Camera
     ===================================================== */

  updateCamera(dt, speed) {
    const p = this.player;
    const cam = this.camera;
    const sp = this.level.speed;

    const t = Math.min(1, Math.max(0, (speed - sp.start) / (sp.max - sp.start)));

    const tx = p.x * 0.38;
    const ty = 3.35 + Math.min(p.y, 4) * 0.3 + t * 0.25;
    const tz = 7.3 + t * 0.6;

    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 6, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 7, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, tz, 4, dt);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.6);
      const k = this.shake * this.shake * 1.1;
      cam.position.x += (Math.random() - 0.5) * k;
      cam.position.y += (Math.random() - 0.5) * k;
    }

    // blikveld loopt op met de snelheid — dat voelt sneller
    const fov = this.baseFov + t * 9;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = THREE.MathUtils.damp(cam.fov, fov, 3, dt);
      cam.updateProjectionMatrix();
    }

    this._look ||= new THREE.Vector3();
    this._look.set(p.x * 0.5, 1.25 + Math.min(p.y, 4) * 0.35, -7);
    cam.lookAt(this._look);

    // schaduwcamera meeschuiven met de speler
    this.sun.position.set(
      p.x + this.level.light.sunPos[0],
      this.level.light.sunPos[1],
      this.level.light.sunPos[2],
    );
    this.sun.target.position.set(p.x, 0, -12);
    this.sun.target.updateMatrixWorld();
  }

  /* =====================================================
     Instellingen
     ===================================================== */

  toggleQuality() {
    this.highQuality = !this.highQuality;
    localStorage.setItem(STORAGE.quality, this.highQuality ? 'high' : 'low');
    this.hud.setQualityLabel(this.highQuality);
    this.applyQuality();
  }

  toggleSound() {
    this.soundOn = !this.soundOn;
    localStorage.setItem(STORAGE.sound, this.soundOn ? 'on' : 'off');
    this.hud.setSoundLabel(this.soundOn);
    this.sound.unlock();
    this.sound.setEnabled(this.soundOn);
  }
}

/** "ijsblok" → "een ijsblok", "ijspegels" → "de ijspegels" */
function article(label) {
  if (label.endsWith('s') || label.endsWith('en')) return `de ${label}`;
  return `een ${label}`;
}

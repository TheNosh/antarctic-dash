/* ===========================================================
   track.js — de wereld die langs je heen schuift.
   Grondplaten, sneeuwwallen, decor, lucht, poollicht en sneeuwval.
   Alles wordt hergebruikt (pooling): er wordt tijdens het spelen
   niets nieuws aangemaakt.
   =========================================================== */

import * as THREE from 'three';
import { GROUND_SEGMENT, GROUND_SEGMENTS, DESPAWN_Z, SPAWN_AHEAD } from '../config.js';
import { rand } from './props.js';

const GROUND_WIDTH = 150;

export class Track {
  constructor(scene, props, level) {
    this.scene = scene;
    this.props = props;
    this.level = level;
    this.time = 0;

    this.root = new THREE.Group();
    scene.add(this.root);

    this._buildSky();
    this._buildGround();
    this._buildBerms();
    this._buildScenery();
    this._buildSnowfall(1400);
  }

  /* ---------------- lucht, zon en poollicht ---------------- */

  _buildSky() {
    const t = this.props.textures;

    this.sky = new THREE.Group();
    this.scene.add(this.sky);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(460, 24, 16),
      new THREE.MeshBasicMaterial({ map: t.sky, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    this.sky.add(dome);

    // lage poolzon: een kleine felle kern met een brede, zwakke halo eromheen
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: t.flake, color: 0xffd9a0, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    halo.scale.set(150, 150, 1);
    halo.position.set(-165, 30, -420);
    this.sky.add(halo);

    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: t.flake, color: 0xfff6e2, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    sun.scale.set(38, 38, 1);
    sun.position.set(-165, 30, -420);
    this.sky.add(sun);

    // zuiderlicht: drie langzaam schuivende gordijnen.
    // Levels zonder `colors.aurora` (zoals de woestijn) slaan dit over.
    this.auroras = [];
    for (let i = 0; this.level.colors.aurora && i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: t.aurora.clone(), transparent: true, opacity: 0.20 - i * 0.05,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      mat.map.needsUpdate = true;
      mat.map.repeat.set(2, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(760, 130, 24, 1), mat);
      // lichte golving in het gordijn
      const pos = m.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        pos.setZ(v, Math.sin(pos.getX(v) * 0.02 + i) * 28);
      }
      pos.needsUpdate = true;
      m.position.set(0, 155 + i * 30, -400 + i * 24);
      m.rotation.x = -0.12;
      this.sky.add(m);
      this.auroras.push({ mesh: m, speed: 0.008 + i * 0.004 });
    }
  }

  /**
   * Bouwt een omgevingsmap uit een mini-versie van de lucht.
   *
   * Zonder dit krijgt elk materiaal alleen platte hemelverlichting: alles
   * is dan even mat en niets weerkaatst iets. Met een omgevingsmap vangt
   * ijs de lucht op, krijgen ogen en brillenglazen een lichtpunt, en
   * kleurt de onderkant van alles mee met de sneeuw eronder — precies wat
   * je op een echt sneeuwveld ziet.
   *
   * Dit draait één keer bij het opstarten; daarna kost het niets.
   */
  buildEnvironment(renderer, scene) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const env = new THREE.Scene();

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(50, 24, 16),
      new THREE.MeshBasicMaterial({ map: this.props.textures.sky, side: THREE.BackSide })
    );
    env.add(dome);

    // het sneeuwveld weerkaatst enorm veel licht naar boven
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(48, 24),
      new THREE.MeshBasicMaterial({ color: this.level.colors.ground })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    env.add(floor);

    // de zon als felle vlek, zodat er iets te spiegelen valt
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff4de })
    );
    sun.position.set(...this.level.light.sunPos).normalize().multiplyScalar(44);
    env.add(sun);

    const rt = pmrem.fromScene(env, 0.03);
    scene.environment = rt.texture;
    this.envTarget = rt;

    dome.geometry.dispose();
    floor.geometry.dispose();
    sun.geometry.dispose();
    pmrem.dispose();
  }

  /* ---------------- grond ---------------- */

  _buildGround() {
    this.groundLength = GROUND_SEGMENT * GROUND_SEGMENTS;
    this.plates = [];

    const geo = new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_SEGMENT, 1, 1);
    geo.rotateX(-Math.PI / 2);

    // kleur, reliëf en glans moeten dezelfde herhaling krijgen, anders
    // lopen ze uit de pas en klopt de belichting niet meer
    const mat = this.props.mat.ground;
    for (const t of [mat.map, mat.normalMap, mat.roughnessMap]) {
      t.repeat.set(24, 10);
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
    mat.normalScale.set(1.0, 1.0);

    for (let i = 0; i < GROUND_SEGMENTS; i++) {
      const plate = new THREE.Mesh(geo, mat);
      plate.receiveShadow = true;
      plate.position.z = DESPAWN_Z - i * GROUND_SEGMENT;
      this.root.add(plate);
      this.plates.push(plate);

      // naden tussen de banen: helpt je de banen lezen
      for (const x of [-1.2, 1.2]) {
        const seam = new THREE.Mesh(
          new THREE.PlaneGeometry(0.1, GROUND_SEGMENT),
          this.props.mat.lane
        );
        seam.rotation.x = -Math.PI / 2;
        seam.position.set(x, 0.012, 0);
        plate.add(seam);
      }
    }
  }

  /* ---------------- sneeuwwallen langs de baan ---------------- */

  _buildBerms() {
    this.berms = [];
    const geo = new THREE.SphereGeometry(1, 12, 8);
    const count = 26;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, this.props.mat.snowSoft);
      m.castShadow = false;
      m.receiveShadow = true;
      this.root.add(m);
      this.berms.push(m);
      this._placeBerm(m, DESPAWN_Z - i * (SPAWN_AHEAD / count) * 1.1);
    }
    this.bermSpan = count * (SPAWN_AHEAD / count) * 1.1;
  }

  _placeBerm(m, z) {
    const side = Math.random() < 0.5 ? -1 : 1;
    // ruim buiten de banen: ze mogen de speelruimte niet in steken
    m.position.set(side * rand(9, 14), rand(-1.3, -0.5), z);
    m.scale.set(rand(2.6, 4.6), rand(1.3, 2.8), rand(5, 13));
    m.rotation.y = Math.random() * 3;
  }

  /* ---------------- decor (ijsbergen, rotsen, pinguïnkolonies) ---------------- */

  _buildScenery() {
    const cfg = this.level.scenery;
    this.scenery = [];
    const count = Math.ceil((SPAWN_AHEAD + 60) / cfg.spacing) * 2;

    for (let i = 0; i < count; i++) {
      const obj = this.props.scenery();
      this.root.add(obj);
      const z = DESPAWN_Z - (i >> 1) * cfg.spacing - rand(0, cfg.jitter);
      this._placeScenery(obj, z, i % 2 === 0 ? -1 : 1);
      this.scenery.push(obj);
    }
    this.scenerySpan = (count >> 1) * cfg.spacing;
  }

  _placeScenery(obj, z, side) {
    const cfg = this.level.scenery;
    const s = side ?? (Math.random() < 0.5 ? -1 : 1);
    obj.position.set(s * rand(cfg.minX, cfg.maxX), 0, z);
    obj.rotation.y = Math.random() * Math.PI * 2;
    const k = rand(0.7, 1.5);
    obj.scale.setScalar(k);
    obj.userData.side = s;
  }

  /* ---------------- sneeuwval ---------------- */

  _buildSnowfall(count) {
    // Wat er uit de lucht komt verschilt per level: sneeuwvlokken vallen
    // snel en recht, woestijnstof hangt en drijft.
    const w = this.level.weather || {};
    this.weather = {
      color: w.color ?? 0xffffff,
      size: w.size ?? 0.32,
      opacity: w.opacity ?? 0.85,
      minFall: w.minFall ?? 1.6,
      maxFall: w.maxFall ?? 5.2,
    };

    this.snowCount = count;
    const positions = new Float32Array(count * 3);
    this.snowSpeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = rand(-42, 42);
      positions[i * 3 + 1] = rand(0, 34);
      positions[i * 3 + 2] = rand(-110, 22);
      this.snowSpeeds[i] = rand(this.weather.minFall, this.weather.maxFall);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.snow = new THREE.Points(geo, new THREE.PointsMaterial({
      map: this.props.textures.flake,
      color: this.weather.color,
      size: this.weather.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: this.weather.opacity,
      depthWrite: false,
      fog: true,
    }));
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  /** Minder vlokken op de lage grafische stand. */
  setQuality(high) {
    this.snow.geometry.setDrawRange(0, high ? this.snowCount : (this.snowCount * 0.28) | 0);
    this.snow.material.size = this.weather.size * (high ? 1 : 1.3);
    for (const a of this.auroras) a.mesh.visible = high;
  }

  /* ---------------- per frame ---------------- */

  /**
   * @param {number} dz   afgelegde meters dit frame (wereld schuift +z)
   * @param {number} dt   tijdstap
   * @param {number} speed huidige loopsnelheid
   * @param {THREE.Vector3} camPos camerapositie (lucht + sneeuw volgen mee)
   */
  update(dz, dt, speed, camPos) {
    this.time += dt;

    // grond
    for (const p of this.plates) {
      p.position.z += dz;
      if (p.position.z - GROUND_SEGMENT / 2 > DESPAWN_Z) p.position.z -= this.groundLength;
    }

    // wallen
    for (const b of this.berms) {
      b.position.z += dz;
      if (b.position.z > DESPAWN_Z + 8) this._placeBerm(b, b.position.z - this.bermSpan);
    }

    // decor
    for (const s of this.scenery) {
      s.position.z += dz;
      if (s.position.z > DESPAWN_Z + 20) {
        this._placeScenery(s, s.position.z - this.scenerySpan - rand(0, this.level.scenery.jitter), s.userData.side);
      }
      const flag = s.userData.flag;
      if (flag) flag.rotation.z = Math.sin(this.time * 7 + flag.userData.flutter) * 0.22;
    }

    // sneeuwval — dwarrelt naar beneden en naar achteren
    const pos = this.snow.geometry.attributes.position;
    const arr = pos.array;
    const drift = Math.sin(this.time * 0.6) * 1.4;
    for (let i = 0; i < this.snowCount; i++) {
      const i3 = i * 3;
      arr[i3 + 1] -= this.snowSpeeds[i] * dt;
      arr[i3 + 0] += drift * dt;
      arr[i3 + 2] += (dz * 0.55);
      if (arr[i3 + 1] < -1) { arr[i3 + 1] = 34; arr[i3 + 2] = rand(-110, 10); arr[i3] = rand(-42, 42); }
      if (arr[i3 + 2] > 24) { arr[i3 + 2] -= 132; }
      if (arr[i3] > 44) arr[i3] -= 88; else if (arr[i3] < -44) arr[i3] += 88;
    }
    pos.needsUpdate = true;
    this.snow.position.x = camPos.x;

    // lucht volgt de camera zodat hij nooit dichterbij lijkt te komen
    this.sky.position.set(camPos.x, 0, camPos.z);

    // poollicht schuift langzaam
    for (const a of this.auroras) {
      a.mesh.material.map.offset.x += a.speed * dt;
    }
  }

  reset() {
    for (let i = 0; i < this.plates.length; i++) {
      this.plates[i].position.z = DESPAWN_Z - i * GROUND_SEGMENT;
    }
    for (let i = 0; i < this.berms.length; i++) {
      this._placeBerm(this.berms[i], DESPAWN_Z - i * (this.bermSpan / this.berms.length));
    }
    const cfg = this.level.scenery;
    for (let i = 0; i < this.scenery.length; i++) {
      this._placeScenery(this.scenery[i], DESPAWN_Z - (i >> 1) * cfg.spacing - rand(0, cfg.jitter), i % 2 === 0 ? -1 : 1);
    }
  }
}

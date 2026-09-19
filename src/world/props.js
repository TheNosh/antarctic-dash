/* ===========================================================
   props.js — alle 3D-modellen, procedureel opgebouwd.
   Geen externe assets: puur geometrie + materialen.
   Elk level levert zijn eigen kleurenschema aan (theme.colors),
   zodat dezelfde bouwers hergebruikt kunnen worden in level 2, 3, …
   =========================================================== */

import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/* ---------- Procedurele texturen ---------- */

/** Sneeuwvlak met korrel en een paar ijsaders. */
function snowTexture(colors) {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');

  g.fillStyle = colors.snowTex || '#eaf4ff';
  g.fillRect(0, 0, s, s);

  // korrel
  const img = g.getImageData(0, 0, s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);

  // zachte plekken
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = rand(20, 90);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(190,220,255,.22)');
    grd.addColorStop(1, 'rgba(190,220,255,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // scheurtjes in het ijs
  g.strokeStyle = 'rgba(120,170,215,.3)';
  for (let i = 0; i < 18; i++) {
    g.lineWidth = rand(0.5, 2);
    g.beginPath();
    let x = Math.random() * s, y = Math.random() * s;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += rand(-60, 60); y += rand(-60, 60); g.lineTo(x, y); }
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Verticale gradiënt voor de lucht (dome). */
function skyTexture(colors) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0.00, colors.skyTop);
  grd.addColorStop(0.45, colors.skyMid);
  grd.addColorStop(1.00, colors.skyLow);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Zacht uitlopend lichtgordijn (noorderlicht / zuiderlicht). */
function auroraTexture(color) {
  const w = 256, h = 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w;
    const bw = rand(6, 26);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.35, color);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.globalAlpha = rand(0.15, 0.5);
    g.fillRect(x, 0, bw, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Ronde, zachte vlek — gebruikt voor sneeuwvlokken en spray. */
function flakeTexture() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ===========================================================
   Props — materialen, gedeelde geometrie en modelbouwers
   =========================================================== */

export class Props {
  constructor(theme) {
    this.theme = theme;
    const col = theme.colors;

    this.textures = {
      snow: snowTexture(col),
      sky: skyTexture(col),
      aurora: auroraTexture(col.aurora),
      flake: flakeTexture(),
    };

    this.mat = {
      ground: new THREE.MeshStandardMaterial({
        map: this.textures.snow, color: col.ground, roughness: 0.88, metalness: 0.02,
      }),
      lane: new THREE.MeshBasicMaterial({
        color: col.laneLine, transparent: true, opacity: 0.16, depthWrite: false,
      }),
      ice: new THREE.MeshStandardMaterial({
        color: col.ice, roughness: 0.18, metalness: 0.05,
        transparent: true, opacity: 0.86, flatShading: true,
      }),
      iceSolid: new THREE.MeshStandardMaterial({
        color: col.iceDeep, roughness: 0.3, metalness: 0.05, flatShading: true,
      }),
      snow: new THREE.MeshStandardMaterial({ color: col.snow, roughness: 0.95, flatShading: true }),
      snowSoft: new THREE.MeshStandardMaterial({ color: col.snow, roughness: 0.95 }),
      rock: new THREE.MeshStandardMaterial({ color: col.rock, roughness: 0.95, flatShading: true }),
      void: new THREE.MeshBasicMaterial({ color: col.abyss }),
      hazard: new THREE.MeshStandardMaterial({ color: col.hazard, roughness: 0.6, emissive: col.hazard, emissiveIntensity: 0.18 }),

      // pinguïn
      pBody: new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.62 }),
      pBelly: new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.72 }),
      pBeak: new THREE.MeshStandardMaterial({ color: 0xffa32e, roughness: 0.45 }),
      pEye: new THREE.MeshStandardMaterial({ color: 0x07090f, roughness: 0.25 }),

      // speler
      coat: new THREE.MeshStandardMaterial({ color: col.player, roughness: 0.7 }),
      coatDark: new THREE.MeshStandardMaterial({ color: col.playerDark, roughness: 0.75 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xf3c9a6, roughness: 0.8 }),
      goggle: new THREE.MeshStandardMaterial({ color: 0x0d1b2a, roughness: 0.15, metalness: 0.6 }),
      fur: new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.95 }),

      // pickups
      fish: new THREE.MeshStandardMaterial({ color: 0x8fdcff, roughness: 0.35, emissive: 0x1b6f9c, emissiveIntensity: 0.5 }),
      fishFin: new THREE.MeshStandardMaterial({ color: 0x4fb8e8, roughness: 0.4 }),
      shield: new THREE.MeshStandardMaterial({
        color: 0x7ef0d0, roughness: 0.2, emissive: 0x2fd0a8, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.55,
      }),
    };

    // gedeelde geometrie
    this.geo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(0.5, 14, 10),
      lowSphere: new THREE.SphereGeometry(0.5, 8, 6),
      cone: new THREE.ConeGeometry(0.5, 1, 8),
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      icosa: new THREE.IcosahedronGeometry(0.5, 0),
      capsule: new THREE.CapsuleGeometry(0.34, 0.5, 4, 10),
    };
  }

  /* ---------- kleine helper ---------- */
  mesh(geo, mat, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, shadow = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = shadow;
    m.receiveShadow = false;
    return m;
  }

  /* =====================================================
     OBSTAKELS
     ===================================================== */

  /** Laag ijsblok — eroverheen springen of de baan uit. */
  iceBlock() {
    const g = new THREE.Group();
    const h = rand(0.85, 1.0);
    g.add(this.mesh(this.geo.box, this.mat.ice, { y: h / 2, sx: 1.9, sy: h, sz: 1.5 }));
    // scherfjes erbovenop
    for (let i = 0; i < 3; i++) {
      g.add(this.mesh(this.geo.icosa, this.mat.ice, {
        x: rand(-0.7, 0.7), y: h + rand(0.05, 0.22), z: rand(-0.5, 0.5),
        sx: rand(0.3, 0.55), sy: rand(0.35, 0.7), sz: rand(0.3, 0.55),
        ry: Math.random() * 3,
      }));
    }
    g.add(this.mesh(this.geo.box, this.mat.snowSoft, { y: h + 0.03, sx: 1.95, sy: 0.08, sz: 1.55 }));
    return g;
  }

  /** Hoge ijswand — alleen te ontwijken. */
  iceWall() {
    const g = new THREE.Group();
    const h = 2.9;
    g.add(this.mesh(this.geo.box, this.mat.iceSolid, { y: h / 2, sx: 2.0, sy: h, sz: 1.1 }));
    g.add(this.mesh(this.geo.box, this.mat.ice, { y: h / 2, z: 0.1, sx: 1.4, sy: h * 0.86, sz: 1.2 }));
    g.add(this.mesh(this.geo.box, this.mat.snowSoft, { y: h + 0.06, sx: 2.1, sy: 0.14, sz: 1.2 }));
    for (let i = 0; i < 4; i++) {
      g.add(this.mesh(this.geo.icosa, this.mat.ice, {
        x: rand(-0.9, 0.9), y: rand(0.2, h), z: rand(-0.55, 0.55) + (Math.random() < 0.5 ? -0.55 : 0.55),
        sx: rand(0.25, 0.5), sy: rand(0.25, 0.6), sz: rand(0.25, 0.5), ry: Math.random() * 3,
      }));
    }
    return g;
  }

  /** IJsrichel boven één baan — eronderdoor glijden. */
  iceShelf() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.box, this.mat.ice, { y: 1.75, sx: 2.1, sy: 1.5, sz: 1.2 }));
    g.add(this.mesh(this.geo.box, this.mat.snowSoft, { y: 2.56, sx: 2.2, sy: 0.16, sz: 1.3 }));
    // smalle pijlers zodat de richel als een poort leest (staan buiten je glijpad)
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.box, this.mat.iceSolid, { x: s * 0.95, y: 0.5, sx: 0.2, sy: 1.0, sz: 0.85 }));
    }
    // ijspegels aan de onderkant
    for (let i = -2; i <= 2; i++) {
      g.add(this.mesh(this.geo.cone, this.mat.ice, {
        x: i * 0.42 + rand(-0.06, 0.06), y: 0.9, z: rand(-0.35, 0.35),
        sx: 0.17, sy: rand(0.15, 0.3), sz: 0.17, rx: Math.PI,
      }));
    }
    return g;
  }

  /** IJsbrug over de volle breedte — je moet glijden. */
  iceBridge() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.box, this.mat.ice, { y: 1.9, sx: 11, sy: 1.7, sz: 1.5 }));
    g.add(this.mesh(this.geo.box, this.mat.snowSoft, { y: 2.8, sx: 11.2, sy: 0.22, sz: 1.7 }));
    for (let i = 0; i < 16; i++) {
      g.add(this.mesh(this.geo.cone, this.mat.ice, {
        x: rand(-5.2, 5.2), y: 1.0, z: rand(-0.5, 0.5),
        sx: 0.15, sy: rand(0.12, 0.3), sz: 0.15, rx: Math.PI,
      }));
    }
    // pilaren buiten de baan
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.box, this.mat.iceSolid, { x: s * 5.3, y: 1.3, sx: 0.9, sy: 2.6, sz: 1.6 }));
    }
    return g;
  }

  /** Hangende ijspegels — eronderdoor glijden. */
  icicles() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.box, this.mat.iceSolid, { y: 2.95, sx: 2.2, sy: 0.3, sz: 0.9 }));
    for (let i = 0; i < 9; i++) {
      const len = rand(1.5, 1.95);
      g.add(this.mesh(this.geo.cone, this.mat.ice, {
        x: rand(-0.95, 0.95), y: 2.8 - len / 2, z: rand(-0.35, 0.35),
        sx: rand(0.16, 0.3), sy: len, sz: rand(0.16, 0.3), rx: Math.PI,
      }));
    }
    return g;
  }

  /** Gletsjerspleet — eroverheen springen. */
  crevasse() {
    const g = new THREE.Group();
    const len = 3.6;
    // donkere diepte
    g.add(this.mesh(this.geo.box, this.mat.void, { y: 0.03, sx: 2.3, sy: 0.02, sz: len, shadow: false }));
    g.add(this.mesh(this.geo.box, this.mat.ice, { y: -0.9, sx: 2.1, sy: 1.8, sz: len * 0.92, shadow: false }));
    // gebroken randen
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        g.add(this.mesh(this.geo.icosa, this.mat.ice, {
          x: rand(-1.1, 1.1), y: rand(0.02, 0.26), z: s * (len / 2 + rand(-0.15, 0.1)),
          sx: rand(0.4, 0.8), sy: rand(0.2, 0.45), sz: rand(0.3, 0.6), ry: Math.random() * 3,
        }));
      }
    }
    return g;
  }

  /** Sneeuwhelling — lanceert je de lucht in. */
  snowRamp() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(3.2, 0);
    shape.lineTo(3.2, 1.25);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2);
    geo.translate(1.1, 0, 1.6); // gecentreerd, oploop richting -z
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, this.mat.snow);
    m.castShadow = true;
    g.add(m);
    g.add(this.mesh(this.geo.box, this.mat.hazard, { y: 1.28, z: -1.5, sx: 2.2, sy: 0.1, sz: 0.3 }));
    return g;
  }

  /* ---------- pinguïns ---------- */

  /**
   * Buikglijdende pinguïn, neus richting +z.
   * Het model zit in een binnengroep, zodat obstacles.js de buitenste
   * schaal vrij kan gebruiken zonder de maat van het dier te verpesten.
   */
  penguinSliding() {
    const outer = new THREE.Group();
    const g = new THREE.Group();
    g.scale.setScalar(1.25);          // goed zichtbaar op hoge snelheid
    outer.add(g);

    const body = this.mesh(this.geo.capsule, this.mat.pBody, { y: 0.34, rx: Math.PI / 2, sx: 1.05, sy: 1.0, sz: 1.05 });
    g.add(body);
    g.add(this.mesh(this.geo.sphere, this.mat.pBelly, { y: 0.2, z: 0.05, sx: 0.62, sy: 0.4, sz: 1.0 }));
    // kop
    const head = this.mesh(this.geo.sphere, this.mat.pBody, { y: 0.46, z: 0.6, sx: 0.5, sy: 0.5, sz: 0.5 });
    g.add(head);
    g.add(this.mesh(this.geo.sphere, this.mat.pBelly, { y: 0.38, z: 0.74, sx: 0.32, sy: 0.3, sz: 0.28 }));
    g.add(this.mesh(this.geo.cone, this.mat.pBeak, { y: 0.44, z: 0.88, sx: 0.14, sy: 0.34, sz: 0.14, rx: Math.PI / 2 }));
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.sphere, this.mat.pEye, { x: s * 0.15, y: 0.55, z: 0.79, sx: 0.11, sy: 0.11, sz: 0.09 }));
      // flippers naar achteren
      g.add(this.mesh(this.geo.box, this.mat.pBody, { x: s * 0.38, y: 0.3, z: -0.05, sx: 0.12, sy: 0.3, sz: 0.62, rz: s * 0.5, ry: s * 0.3 }));
      // pootjes omhoog
      g.add(this.mesh(this.geo.box, this.mat.pBeak, { x: s * 0.16, y: 0.3, z: -0.62, sx: 0.16, sy: 0.1, sz: 0.34, rx: -0.5 }));
    }
    // opspattende sneeuw achter hem: maakt de beweging afleesbaar
    for (let i = 0; i < 6; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.snowSoft, {
        x: rand(-0.5, 0.5), y: rand(0.05, 0.55), z: rand(-1.5, -0.7),
        sx: rand(0.3, 0.7), sy: rand(0.25, 0.5), sz: rand(0.4, 0.9), shadow: false,
      }));
    }
    return outer;
  }

  /** Rechtop staande pinguïn — decor langs de baan. */
  penguinStanding() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.capsule, this.mat.pBody, { y: 0.55, sx: 1, sy: 1, sz: 0.9 }));
    g.add(this.mesh(this.geo.sphere, this.mat.pBelly, { y: 0.5, z: 0.16, sx: 0.44, sy: 0.72, sz: 0.4 }));
    g.add(this.mesh(this.geo.sphere, this.mat.pBody, { y: 1.05, sx: 0.46, sy: 0.46, sz: 0.44 }));
    g.add(this.mesh(this.geo.cone, this.mat.pBeak, { y: 1.0, z: 0.26, sx: 0.12, sy: 0.3, sz: 0.12, rx: Math.PI / 2 }));
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.sphere, this.mat.pEye, { x: s * 0.14, y: 1.12, z: 0.19, sx: 0.09, sy: 0.09, sz: 0.07 }));
      g.add(this.mesh(this.geo.box, this.mat.pBody, { x: s * 0.36, y: 0.55, sx: 0.1, sy: 0.5, sz: 0.24, rz: s * 0.18 }));
      g.add(this.mesh(this.geo.box, this.mat.pBeak, { x: s * 0.14, y: 0.04, z: 0.08, sx: 0.16, sy: 0.08, sz: 0.3 }));
    }
    g.rotation.y = rand(-0.6, 0.6) + Math.PI;
    return g;
  }

  /* ---------- pickups ---------- */

  fish() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.sphere, this.mat.fish, { sx: 0.34, sy: 0.24, sz: 0.5 }));
    g.add(this.mesh(this.geo.cone, this.mat.fishFin, { z: -0.34, sx: 0.26, sy: 0.3, sz: 0.24, rx: -Math.PI / 2 }));
    g.add(this.mesh(this.geo.sphere, this.mat.pEye, { x: 0.1, y: 0.06, z: 0.17, sx: 0.07, sy: 0.07, sz: 0.06 }));
    g.add(this.mesh(this.geo.sphere, this.mat.pEye, { x: -0.1, y: 0.06, z: 0.17, sx: 0.07, sy: 0.07, sz: 0.06 }));
    return g;
  }

  shield() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.icosa, this.mat.shield, { sx: 1.05, sy: 1.05, sz: 1.05 }));
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 0),
      new THREE.MeshBasicMaterial({ color: 0xbafff0, wireframe: true, transparent: true, opacity: 0.8 })
    );
    g.add(wire);
    return g;
  }

  /* =====================================================
     DECOR
     ===================================================== */

  iceberg() {
    const g = new THREE.Group();
    const h = rand(3, 11);
    const w = rand(3, 8);
    g.add(this.mesh(this.geo.icosa, this.mat.iceSolid, {
      y: h * 0.4, sx: w, sy: h, sz: w * rand(0.7, 1.3), ry: Math.random() * 3, rz: rand(-0.1, 0.1),
    }));
    g.add(this.mesh(this.geo.icosa, this.mat.ice, {
      x: rand(-w, w) * 0.3, y: h * 0.55, z: rand(-2, 2),
      sx: w * 0.6, sy: h * 0.75, sz: w * 0.6, ry: Math.random() * 3,
    }));
    return g;
  }

  snowMound() {
    const g = new THREE.Group();
    const n = 2 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.snow, {
        x: rand(-1.8, 1.8), y: rand(-0.4, 0.1), z: rand(-2.5, 2.5),
        sx: rand(1.8, 3.6), sy: rand(0.8, 2.0), sz: rand(2, 4.5), ry: Math.random() * 3,
      }));
    }
    return g;
  }

  /** Vlaggenmast van een poolexpeditie. */
  flagPole() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.cyl, this.mat.rock, { y: 1.7, sx: 0.1, sy: 3.4, sz: 0.1 }));
    const flag = this.mesh(this.geo.box, this.mat.hazard, { x: 0.55, y: 3.0, sx: 1.1, sy: 0.6, sz: 0.04 });
    flag.userData.flutter = Math.random() * 6;
    g.add(flag);
    g.userData.flag = flag;
    return g;
  }

  /** Verweerde rotspunt die door de sneeuw steekt. */
  rockSpike() {
    const g = new THREE.Group();
    const h = rand(2, 6);
    g.add(this.mesh(this.geo.cone, this.mat.rock, {
      y: h * 0.45, sx: rand(1.5, 3.5), sy: h, sz: rand(1.5, 3.5), ry: Math.random() * 3, rz: rand(-0.12, 0.12),
    }));
    g.add(this.mesh(this.geo.lowSphere, this.mat.snow, { y: h * 0.9, sx: 1.1, sy: 0.5, sz: 1.1 }));
    return g;
  }

  /** Willekeurig decorstuk, gewogen. */
  scenery() {
    const r = Math.random();
    if (r < 0.34) return this.iceberg();
    if (r < 0.62) return this.snowMound();
    if (r < 0.78) return this.rockSpike();
    if (r < 0.92) {
      const g = new THREE.Group();
      const n = 2 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const p = this.penguinStanding();
        p.position.set(rand(-3, 3), 0, rand(-3, 3));
        g.add(p);
      }
      return g;
    }
    return this.flagPole();
  }
}

/* ===========================================================
   De speler: een poolreiziger met parka en stormbril.

   Het model wordt opgebouwd kijkend naar +z, maar de speler rent
   naar -z. Daarom zit alles in een binnengroep `body` die een halve
   slag gedraaid staat. De buitenste groep blijft vrij voor de
   hellings- en draaianimatie in player.js.

   Kleding: elk onderdeel heeft een eigen materiaal, en hoed en
   schoenen hebben een "mount" waarin het model opnieuw wordt
   opgebouwd zodra je iets anders aantrekt.
   =========================================================== */

/** Bouwt het hoofddeksel; posities zijn in hoofd-coördinaten. */
function buildHat(P, m, style) {
  const parts = [];
  const add = (geo, mat, o) => parts.push(P.mesh(geo, mat, o));

  switch (style) {
    case 'beanie':
      add(P.geo.sphere, m.hat,     { y: 0.18, sx: 0.46, sy: 0.44, sz: 0.46 });
      add(P.geo.cyl,    m.hatTrim, { y: 0.06, sx: 0.49, sy: 0.20, sz: 0.49 });
      add(P.geo.sphere, m.hatTrim, { y: 0.46, sx: 0.20, sy: 0.20, sz: 0.20 });
      break;

    case 'cap':
      add(P.geo.sphere, m.hat,     { y: 0.14, sx: 0.46, sy: 0.38, sz: 0.46 });
      add(P.geo.box,    m.hatTrim, { y: 0.10, z: 0.40, sx: 0.46, sy: 0.07, sz: 0.40, rx: -0.12 });
      break;

    case 'ushanka':
      add(P.geo.sphere, m.hat,     { y: 0.16, sx: 0.48, sy: 0.42, sz: 0.48 });
      add(P.geo.cyl,    m.hatTrim, { y: 0.06, sx: 0.52, sy: 0.22, sz: 0.52 });
      for (const s of [-1, 1]) {
        add(P.geo.box,  m.hatTrim, { x: s * 0.42, y: -0.06, sx: 0.14, sy: 0.34, sz: 0.30, rz: s * 0.14 });
      }
      break;

    case 'helmet':
      add(P.geo.sphere, m.hat,     { y: 0.10, sx: 0.52, sy: 0.50, sz: 0.52 });
      add(P.geo.box,    m.hatTrim, { y: 0.34, sx: 0.12, sy: 0.10, sz: 0.98 });
      add(P.geo.box,    m.hat,     { y: -0.24, z: 0.02, sx: 0.50, sy: 0.09, sz: 0.44 });
      break;

    case 'crown':
      add(P.geo.cyl,    m.hat,     { y: 0.30, sx: 0.46, sy: 0.20, sz: 0.46 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(P.geo.cone, m.hatTrim, {
          x: Math.cos(a) * 0.21, y: 0.52, z: Math.sin(a) * 0.21,
          sx: 0.14, sy: 0.30, sz: 0.14,
        });
      }
      break;

    default: // 'hood'
      add(P.geo.sphere, m.hat,     { z: -0.06, sx: 0.52, sy: 0.54, sz: 0.52 });
      add(P.geo.cyl,    m.hatTrim, { z: 0.10, sx: 0.50, sy: 0.16, sz: 0.50, rx: Math.PI / 2 });
  }
  return parts;
}

/** Bouwt één schoen; posities zijn in voet-coördinaten. */
function buildShoe(P, m, style) {
  const parts = [];
  const add = (geo, mat, o) => parts.push(P.mesh(geo, mat, o));

  add(P.geo.box, m.shoes, { z: 0.08, sx: 0.28, sy: 0.16, sz: 0.44 });

  switch (style) {
    case 'snowshoes':
      add(P.geo.box, m.shoeTrim, { y: -0.10, z: 0.12, sx: 0.44, sy: 0.05, sz: 0.86 });
      break;
    case 'skates':
      add(P.geo.box, m.shoeTrim, { y: -0.19, z: 0.06, sx: 0.05, sy: 0.22, sz: 0.62 });
      break;
    default: // 'boots'
      add(P.geo.box, m.shoeTrim, { y: -0.09, z: 0.08, sx: 0.30, sy: 0.07, sz: 0.46 });
  }
  return parts;
}

/** Vervang de inhoud van een mount-groep. */
function refill(mount, parts) {
  mount.clear();
  for (const p of parts) mount.add(p);
}

export function createRunner(props) {
  const P = props;
  const group = new THREE.Group();

  // halve slag: het model kijkt hierdoor de renrichting in
  const body = new THREE.Group();
  body.rotation.y = Math.PI;
  group.add(body);

  // eigen materialen, zodat kleding verkleuren niets anders raakt
  const mats = {
    shirt:    new THREE.MeshStandardMaterial({ color: 0xff7a3c, roughness: 0.7 }),
    accent:   new THREE.MeshStandardMaterial({ color: 0x2b3c55, roughness: 0.75 }),
    pants:    new THREE.MeshStandardMaterial({ color: 0x2b3c55, roughness: 0.78 }),
    shoes:    new THREE.MeshStandardMaterial({ color: 0x5b4a3b, roughness: 0.85 }),
    shoeTrim: new THREE.MeshStandardMaterial({ color: 0x33291f, roughness: 0.85 }),
    hat:      new THREE.MeshStandardMaterial({ color: 0xff7a3c, roughness: 0.75 }),
    hatTrim:  new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.95 }),
    skin:     P.mat.skin,
    goggle:   P.mat.goggle,
  };

  const torso = new THREE.Group();
  torso.position.y = 1.02;
  body.add(torso);

  torso.add(P.mesh(P.geo.capsule, mats.shirt, { sx: 0.95, sy: 0.9, sz: 0.8 }));
  torso.add(P.mesh(P.geo.box, mats.accent, { y: -0.1, sx: 0.78, sy: 0.22, sz: 0.62 }));   // riem
  torso.add(P.mesh(P.geo.box, mats.accent, { y: 0.05, z: -0.4, sx: 0.6, sy: 0.66, sz: 0.3 })); // rugzak
  torso.add(P.mesh(P.geo.box, P.mat.hazard, { y: 0.16, z: -0.57, sx: 0.4, sy: 0.16, sz: 0.06 }));

  // reflecterende banden — alleen zichtbaar bij een gestreept shirt
  const stripes = [
    P.mesh(P.geo.box, mats.accent, { y: 0.12, sx: 0.70, sy: 0.13, sz: 0.60 }),
    P.mesh(P.geo.box, mats.accent, { y: -0.26, sx: 0.66, sy: 0.11, sz: 0.57 }),
  ];
  for (const s of stripes) { s.visible = false; torso.add(s); }

  const head = new THREE.Group();
  head.position.y = 0.58;
  torso.add(head);
  head.add(P.mesh(P.geo.sphere, mats.skin, { sx: 0.42, sy: 0.46, sz: 0.42 }));
  head.add(P.mesh(P.geo.box, mats.goggle, { y: 0.05, z: 0.2, sx: 0.5, sy: 0.17, sz: 0.14 })); // stormbril

  const hatMount = new THREE.Group();
  head.add(hatMount);

  const arms = [];
  const legs = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.42, 0.22, 0);
    arm.add(P.mesh(P.geo.capsule, mats.shirt, { y: -0.28, sx: 0.42, sy: 0.6, sz: 0.42 }));
    arm.add(P.mesh(P.geo.sphere, mats.accent, { y: -0.58, sx: 0.28, sy: 0.28, sz: 0.28 }));
    torso.add(arm);
    arms.push(arm);

    const leg = new THREE.Group();
    leg.position.set(s * 0.21, -0.34, 0);

    const upper = P.mesh(P.geo.capsule, mats.pants, { y: -0.3, sx: 0.5, sy: 0.72, sz: 0.5 });
    const shin = P.mesh(P.geo.capsule, mats.skin, { y: -0.48, sx: 0.34, sy: 0.4, sz: 0.34 });
    shin.visible = false;
    const footMount = new THREE.Group();
    footMount.position.y = -0.66;

    leg.add(upper, shin, footMount);
    leg.userData = { upper, shin, footMount };
    torso.add(leg);
    legs.push(leg);
  }

  const runner = { group, body, torso, head, arms, legs, mats, hatMount, stripes, props: P };

  applyOutfit(runner, null);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  return runner;
}

/**
 * Trek een outfit aan. `outfit` is {hat, shirt, pants, shoes} met
 * itemobjecten uit outfits.js; null valt terug op de standaardlook.
 */
export function applyOutfit(runner, outfit) {
  const P = runner.props;
  const m = runner.mats;

  const o = outfit || {};
  const hat   = o.hat   || { style: 'hood',   colors: { main: 0xff7a3c, trim: 0xf2efe6 } };
  const shirt = o.shirt || { style: 'plain',  colors: { main: 0xff7a3c, accent: 0x2b3c55 } };
  const pants = o.pants || { style: 'normal', colors: { main: 0x2b3c55 } };
  const shoes = o.shoes || { style: 'boots',  colors: { main: 0x5b4a3b, trim: 0x33291f } };

  /* -- shirt -- */
  m.shirt.color.setHex(shirt.colors.main);
  m.accent.color.setHex(shirt.colors.accent ?? 0x2b3c55);
  for (const s of runner.stripes) s.visible = shirt.style === 'striped';

  /* -- broek -- */
  m.pants.color.setHex(pants.colors.main);
  for (const leg of runner.legs) {
    const { upper, shin } = leg.userData;
    if (pants.style === 'shorts') {
      upper.scale.set(0.54, 0.42, 0.54);
      upper.position.y = -0.2;
      shin.visible = true;
    } else if (pants.style === 'puffy') {
      upper.scale.set(0.62, 0.74, 0.62);
      upper.position.y = -0.3;
      shin.visible = false;
    } else {
      upper.scale.set(0.5, 0.72, 0.5);
      upper.position.y = -0.3;
      shin.visible = false;
    }
  }

  /* -- schoenen -- */
  m.shoes.color.setHex(shoes.colors.main);
  m.shoeTrim.color.setHex(shoes.colors.trim ?? shoes.colors.main);
  for (const leg of runner.legs) {
    refill(leg.userData.footMount, buildShoe(P, m, shoes.style));
  }

  /* -- hoofddeksel -- */
  m.hat.color.setHex(hat.colors.main);
  m.hatTrim.color.setHex(hat.colors.trim ?? hat.colors.main);
  refill(runner.hatMount, buildHat(P, m, hat.style));

  // nieuwe onderdelen moeten ook schaduw werpen
  runner.group.traverse((x) => { if (x.isMesh) x.castShadow = true; });
}

export { rand, pick };

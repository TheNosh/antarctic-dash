/* ===========================================================
   props.js — alle 3D-modellen, procedureel opgebouwd.
   Geen externe assets: puur geometrie + materialen.
   Elk level levert zijn eigen kleurenschema aan (theme.colors),
   zodat dezelfde bouwers hergebruikt kunnen worden in level 2, 3, …
   =========================================================== */

import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/* ---------- Procedurele texturen ----------
   Het sneeuwvlak krijgt niet alleen een kleurtextuur maar ook een
   normal map en een roughness map. Die twee doen het meeste werk:
   zonder reliëf en zonder variatie in glans blijft sneeuw een vlakke
   grijze vlakte, hoe goed je verlichting ook is.
   ------------------------------------------ */

/** Naadloos loopende waarde-ruis op een rooster van freq x freq. */
function valueNoise(size, freq) {
  const lattice = new Float32Array(freq * freq);
  for (let i = 0; i < lattice.length; i++) lattice[i] = Math.random();

  const out = new Float32Array(size * size);
  const scale = freq / size;
  const smooth = (t) => t * t * (3 - 2 * t);

  for (let y = 0; y < size; y++) {
    const fy = y * scale, y0 = Math.floor(fy), ty = smooth(fy - y0);
    const y0i = (y0 % freq) * freq, y1i = ((y0 + 1) % freq) * freq;
    for (let x = 0; x < size; x++) {
      const fx = x * scale, x0 = Math.floor(fx), tx = smooth(fx - x0);
      const x0i = x0 % freq, x1i = (x0 + 1) % freq;
      const a = lattice[y0i + x0i], b = lattice[y0i + x1i];
      const c = lattice[y1i + x0i], d = lattice[y1i + x1i];
      out[y * size + x] = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }
  }
  return out;
}

/** Meerdere octaven ruis opgeteld — geeft natuurlijke, onregelmatige vormen. */
function fbm(size, octaves, baseFreq) {
  const out = new Float32Array(size * size);
  let amp = 1, freq = baseFreq, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const layer = valueNoise(size, freq);
    for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/** Zet een hoogteveld om in een normal map (tangent space). */
function normalMapFrom(height, size, strength) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const d = img.data;
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      d[i]     = ((-dx / len) * 0.5 + 0.5) * 255;
      d[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      d[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;   // linear, géén sRGB: dit zijn richtingen, geen kleuren
}

/**
 * Sneeuwvlak: kleur, reliëf en glans.
 * @returns {{map:THREE.Texture, normalMap:THREE.Texture, roughnessMap:THREE.Texture}}
 */
function snowSurface(colors) {
  const s = 512;

  // grof golvend sneeuwlandschap + fijne korrel erbovenop
  const coarse = fbm(s, 4, 4);
  const fine = fbm(s, 3, 32);
  const height = new Float32Array(s * s);
  for (let i = 0; i < height.length; i++) height[i] = coarse[i] * 0.75 + fine[i] * 0.25;

  /* -- kleur -- */
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const base = new THREE.Color(colors.snowTex || '#eef7ff');
  const img = g.createImageData(s, s);
  const d = img.data;

  for (let i = 0; i < height.length; i++) {
    // hoger = iets witter, lager = iets blauwer (sneeuw strooit blauw licht)
    const h = height[i];
    const tint = 0.9 + h * 0.16;
    const grain = (Math.random() - 0.5) * 0.035;
    const j = i * 4;
    d[j]     = Math.min(255, base.r * 255 * (tint + grain));
    d[j + 1] = Math.min(255, base.g * 255 * (tint + grain));
    d[j + 2] = Math.min(255, base.b * 255 * (tint + grain * 0.4 + (1 - h) * 0.05));
    d[j + 3] = 255;
  }
  g.putImageData(img, 0, 0);

  // een paar haarscheurtjes in het ijs eronder
  g.strokeStyle = 'rgba(120,170,215,.22)';
  for (let i = 0; i < 16; i++) {
    g.lineWidth = rand(0.5, 1.8);
    g.beginPath();
    let x = Math.random() * s, y = Math.random() * s;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += rand(-60, 60); y += rand(-60, 60); g.lineTo(x, y); }
    g.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  /* -- glans: dalen zijn aangestampt en glimmen, toppen zijn poederig -- */
  const rc = document.createElement('canvas');
  rc.width = rc.height = s;
  const rg = rc.getContext('2d');
  const rimg = rg.createImageData(s, s);
  const rd = rimg.data;
  for (let i = 0; i < height.length; i++) {
    const v = (0.62 + height[i] * 0.34) * 255;
    const j = i * 4;
    rd[j] = rd[j + 1] = rd[j + 2] = v;
    rd[j + 3] = 255;
  }
  rg.putImageData(rimg, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(rc);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;

  // De sterkte moet hoog: het hoogteveld loopt van 0 tot 1 over 512 pixels,
  // dus het verschil tussen twee buurpixels is minuscuul. Bij een lage
  // waarde kantelen de normalen maar een paar graden en blijft de sneeuw
  // een vlakke witte plaat.
  return { map, normalMap: normalMapFrom(height, s, 18), roughnessMap };
}

/** Fijn, onregelmatig reliëf voor ijsoppervlakken. */
function frostNormal() {
  const s = 256;
  const h = fbm(s, 3, 16);
  return normalMapFrom(h, s, 12);
}

/**
 * Verticale gradiënt voor de lucht.
 * Een echte hemel loopt niet lineair: hij is donker in het zenit, klaart
 * traag op naar het midden en heeft vlak boven de horizon een smalle,
 * heldere nevelband. Die band maakt het verschil tussen "blauw vlak" en
 * "lucht met diepte".
 */
function skyTexture(colors) {
  const h = 512;
  const c = document.createElement('canvas');
  c.width = 4; c.height = h;
  const g = c.getContext('2d');

  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0.00, colors.skyTop);
  grd.addColorStop(0.28, colors.skyTop);
  grd.addColorStop(0.52, colors.skyMid);
  grd.addColorStop(0.78, colors.skyHaze || colors.skyMid);
  grd.addColorStop(0.93, colors.skyLow);
  grd.addColorStop(1.00, colors.skyLow);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Zacht uitlopend lichtgordijn (noorderlicht / zuiderlicht).
 * Zonder kleur geen gordijn — en vooral: geen uitzondering die het hele
 * spel neerhaalt als een level dit veld leeg laat.
 */
function auroraTexture(color) {
  if (!color) return null;
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

    const surface = snowSurface(col);
    const frost = frostNormal();

    this.textures = {
      snow: surface.map,
      snowNormal: surface.normalMap,
      snowRough: surface.roughnessMap,
      frost,
      sky: skyTexture(col),
      aurora: col.aurora ? auroraTexture(col.aurora) : null,
      flake: flakeTexture(),
    };

    this.mat = {
      ground: new THREE.MeshStandardMaterial({
        map: surface.map,
        normalMap: surface.normalMap,
        roughnessMap: surface.roughnessMap,
        color: col.ground,
        roughness: 1.0,          // wordt gemoduleerd door de roughnessMap
        metalness: 0.0,
        envMapIntensity: 0.55,
      }),
      lane: new THREE.MeshBasicMaterial({
        color: col.laneLine, transparent: true, opacity: 0.16, depthWrite: false,
      }),
      // IJs: glanzend, maar het moet als obstakel wél afsteken tegen de
      // sneeuw. Te glad en te doorzichtig en je ziet het niet aankomen.
      ice: new THREE.MeshStandardMaterial({
        color: col.ice, roughness: 0.2, metalness: 0.0,
        normalMap: frost, normalScale: new THREE.Vector2(0.4, 0.4),
        envMapIntensity: 0.9,
        transparent: true, opacity: 0.93, flatShading: true,
      }),
      iceSolid: new THREE.MeshStandardMaterial({
        color: col.iceDeep, roughness: 0.22, metalness: 0.0,
        normalMap: frost, normalScale: new THREE.Vector2(0.5, 0.5),
        envMapIntensity: 1.2, flatShading: true,
      }),
      snow: new THREE.MeshStandardMaterial({
        color: col.snow, roughness: 0.82, metalness: 0.0,
        normalMap: frost, normalScale: new THREE.Vector2(0.25, 0.25),
        envMapIntensity: 0.7, flatShading: true,
      }),
      snowSoft: new THREE.MeshStandardMaterial({
        color: col.snow, roughness: 0.8, metalness: 0.0,
        normalMap: frost, normalScale: new THREE.Vector2(0.3, 0.3),
        envMapIntensity: 0.7,
      }),
      rock: new THREE.MeshStandardMaterial({
        color: col.rock, roughness: 0.92, metalness: 0.0,
        normalMap: frost, normalScale: new THREE.Vector2(0.8, 0.8),
        envMapIntensity: 0.5, flatShading: true,
      }),
      void: new THREE.MeshBasicMaterial({ color: col.abyss }),
      hazard: new THREE.MeshStandardMaterial({ color: col.hazard, roughness: 0.6, emissive: col.hazard, emissiveIntensity: 0.18 }),

      // pinguïn — veren zijn vet en nat, dus vrij glanzend
      pBody: new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.42, envMapIntensity: 0.9 }),
      pBelly: new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.55, envMapIntensity: 0.8 }),
      pBeak: new THREE.MeshStandardMaterial({ color: 0xffa32e, roughness: 0.3, envMapIntensity: 1.1 }),
      // ogen spiegelen sterk; dat kleine lichtpuntje doet enorm veel
      pEye: new THREE.MeshStandardMaterial({ color: 0x07090f, roughness: 0.06, metalness: 0.1, envMapIntensity: 2.2 }),

      // speler
      coat: new THREE.MeshStandardMaterial({ color: col.player, roughness: 0.68, envMapIntensity: 0.6 }),
      coatDark: new THREE.MeshStandardMaterial({ color: col.playerDark, roughness: 0.72, envMapIntensity: 0.6 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xf3c9a6, roughness: 0.62, envMapIntensity: 0.7 }),
      fur: new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.92, envMapIntensity: 0.5 }),

      // woestijn (ongebruikt in Antarctica, maar kost niets)
      plant: new THREE.MeshStandardMaterial({ color: col.plant ?? 0x4e8c4a, roughness: 0.75, envMapIntensity: 0.5 }),
      spine: new THREE.MeshStandardMaterial({ color: col.spine ?? 0xe8dcae, roughness: 0.5 }),
      bone: new THREE.MeshStandardMaterial({ color: col.bone ?? 0xe6dcc2, roughness: 0.8, envMapIntensity: 0.4 }),
      chitin: new THREE.MeshStandardMaterial({ color: col.chitin ?? 0x4a2f1c, roughness: 0.32, envMapIntensity: 1.0 }),
      twig: new THREE.MeshStandardMaterial({ color: col.twig ?? 0x8a6a42, roughness: 0.9 }),

      // jungle
      moss: new THREE.MeshStandardMaterial({ color: col.moss ?? 0x5f9440, roughness: 0.95, envMapIntensity: 0.4 }),
      hide: new THREE.MeshStandardMaterial({ color: col.hide ?? 0x4a3a2c, roughness: 0.55, envMapIntensity: 0.7 }),
      fruit: new THREE.MeshStandardMaterial({
        color: col.fruit ?? 0xf2c832, roughness: 0.4,
        emissive: col.fruit ?? 0xf2c832, emissiveIntensity: 0.25,
      }),
      flask: new THREE.MeshStandardMaterial({
        color: col.flask ?? 0x3fa9d8, roughness: 0.3,
        emissive: col.flask ?? 0x3fa9d8, emissiveIntensity: 0.35,
      }),

      // pickups
      fish: new THREE.MeshStandardMaterial({ color: 0x8fdcff, roughness: 0.35, emissive: 0x1b6f9c, emissiveIntensity: 0.5 }),
      fishFin: new THREE.MeshStandardMaterial({ color: 0x4fb8e8, roughness: 0.4 }),
      shield: new THREE.MeshStandardMaterial({
        color: 0x7ef0d0, roughness: 0.2, emissive: 0x2fd0a8, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.55,
      }),
    };

    /* Een level mag de gedeelde materialen bijstellen. Zo wordt "ijs"
       in de woestijn gewoon ondoorzichtige rots, zonder dat er een
       tweede set bouwers nodig is. */
    for (const [naam, aanpassing] of Object.entries(theme.materials || {})) {
      const mat = this.mat[naam];
      if (!mat) { console.warn('Onbekend materiaal in level:', naam); continue; }
      for (const [sleutel, waarde] of Object.entries(aanpassing)) {
        if (sleutel === 'normalScale') mat.normalScale.set(waarde, waarde);
        else mat[sleutel] = waarde;
      }
      mat.needsUpdate = true;
    }

    // gedeelde geometrie
    this.geo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(0.5, 14, 10),
      lowSphere: new THREE.SphereGeometry(0.5, 8, 6),
      cone: new THREE.ConeGeometry(0.5, 1, 8),
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      icosa: new THREE.IcosahedronGeometry(0.5, 0),
      capsule: new THREE.CapsuleGeometry(0.34, 0.5, 4, 10),
      torus: new THREE.TorusGeometry(0.5, 0.12, 6, 14),
      // eenheids-ledemaat: totale hoogte 2, straal 0.5.
      // Schaal y met lengte/2 en x/z met straal/0.5.
      limb: new THREE.CapsuleGeometry(0.5, 1.0, 4, 10),
      // taps toelopende koker voor de parkazoom
      hem: new THREE.CylinderGeometry(0.42, 0.5, 1, 14),
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
    // pegels stoppen op y ≈ 0.95, net boven de glijhouding (top 0.89),
    // zodat er niets door je rugzak heen prikt. De hitbox blijft 0.85.
    for (let i = 0; i < 16; i++) {
      g.add(this.mesh(this.geo.cone, this.mat.ice, {
        x: rand(-5.2, 5.2), y: 1.08, z: rand(-0.5, 0.5),
        sx: 0.15, sy: rand(0.12, 0.26), sz: 0.15, rx: Math.PI,
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
    // opspattende sneeuw achter hem: maakt de beweging afleesbaar.
    // Klein en plat gehouden — grote bollen lezen als sneeuwballen.
    for (let i = 0; i < 11; i++) {
      const t = i / 11;                       // verder naar achteren = wijder en lager
      g.add(this.mesh(this.geo.lowSphere, this.mat.snowSoft, {
        x: rand(-0.25 - t * 0.5, 0.25 + t * 0.5),
        y: rand(0.02, 0.1 + t * 0.34),
        z: -0.6 - t * 1.3 + rand(-0.15, 0.15),
        sx: rand(0.16, 0.34), sy: rand(0.1, 0.2), sz: rand(0.2, 0.46),
        shadow: false,
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

  /* =====================================================
     WOESTIJN — level 2
     Kleuren komen uit het level; deze bouwers maken alleen
     de vormen die Antarctica niet heeft.
     ===================================================== */

  /** Lage cactus — eroverheen springen of ontwijken. */
  cactusSmall() {
    const g = new THREE.Group();
    const h = rand(0.8, 0.95);
    g.add(this.mesh(this.geo.capsule, this.mat.plant, { y: h / 2, sx: 0.8, sy: h, sz: 0.8 }));
    for (const s of [-1, 1]) {
      if (Math.random() < 0.6) {
        g.add(this.mesh(this.geo.capsule, this.mat.plant, {
          x: s * 0.34, y: h * 0.62, sx: 0.44, sy: 0.42, sz: 0.44, rz: s * 0.5,
        }));
      }
    }
    // stekels
    for (let i = 0; i < 7; i++) {
      g.add(this.mesh(this.geo.cone, this.mat.spine, {
        x: rand(-0.3, 0.3), y: rand(0.2, h), z: rand(-0.3, 0.3),
        sx: 0.06, sy: 0.16, sz: 0.06, rx: rand(-1.2, 1.2), rz: rand(-1.2, 1.2),
      }));
    }
    return g;
  }

  /** Reuzencactus — te hoog om overheen te springen. */
  cactus() {
    const g = new THREE.Group();
    const h = rand(2.5, 3.0);
    g.add(this.mesh(this.geo.capsule, this.mat.plant, { y: h / 2, sx: 0.95, sy: h * 0.86, sz: 0.95 }));
    for (const s of [-1, 1]) {
      const y = rand(h * 0.4, h * 0.6);
      g.add(this.mesh(this.geo.capsule, this.mat.plant, { x: s * 0.42, y, sx: 0.5, sy: 0.5, sz: 0.5, rz: s * 0.9 }));
      g.add(this.mesh(this.geo.capsule, this.mat.plant, { x: s * 0.62, y: y + 0.42, sx: 0.5, sy: 0.7, sz: 0.5 }));
    }
    for (let i = 0; i < 12; i++) {
      g.add(this.mesh(this.geo.cone, this.mat.spine, {
        x: rand(-0.4, 0.4), y: rand(0.3, h), z: rand(-0.4, 0.4),
        sx: 0.06, sy: 0.18, sz: 0.06, rx: rand(-1.2, 1.2), rz: rand(-1.2, 1.2),
      }));
    }
    return g;
  }

  /** Uitstekende rotsrichel boven één baan — eronderdoor glijden. */
  rockShelf() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.box, this.mat.iceSolid, { y: 1.8, sx: 2.2, sy: 1.4, sz: 1.3 }));
    g.add(this.mesh(this.geo.box, this.mat.rock, { y: 2.55, sx: 2.3, sy: 0.2, sz: 1.4 }));
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.box, this.mat.iceSolid, { x: s * 0.98, y: 0.55, sx: 0.22, sy: 1.1, sz: 0.9 }));
    }
    for (let i = 0; i < 4; i++) {
      g.add(this.mesh(this.geo.icosa, this.mat.rock, {
        x: rand(-0.9, 0.9), y: rand(1.1, 2.5), z: rand(-0.6, 0.6),
        sx: rand(0.3, 0.6), sy: rand(0.25, 0.5), sz: rand(0.3, 0.6), ry: Math.random() * 3,
      }));
    }
    return g;
  }

  /** Verweerde steenboog over de volle breedte — glijden verplicht. */
  stoneArch() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.box, this.mat.iceSolid, { y: 2.0, sx: 11, sy: 1.8, sz: 1.6 }));
    g.add(this.mesh(this.geo.box, this.mat.rock, { y: 2.95, sx: 11.3, sy: 0.26, sz: 1.8 }));
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.box, this.mat.iceSolid, { x: s * 5.3, y: 1.4, sx: 1.0, sy: 2.8, sz: 1.7 }));
    }
    // afgebrokkelde brokken aan de onderrand
    for (let i = 0; i < 12; i++) {
      g.add(this.mesh(this.geo.icosa, this.mat.iceSolid, {
        x: rand(-5, 5), y: 1.16, z: rand(-0.5, 0.5),
        sx: rand(0.25, 0.5), sy: rand(0.2, 0.4), sz: rand(0.25, 0.5), ry: Math.random() * 3,
      }));
    }
    return g;
  }

  /**
   * Fossiele ribbenkast — eronderdoor glijden.
   * De ribben hángen van de ruggengraat naar beneden tot y ≈ 0.95:
   * te laag om onderdoor te rennen, hoog genoeg om onderdoor te glijden.
   * De pootbeenderen staan buiten de hitbox, dus die raak je nooit.
   */
  boneArch() {
    const g = new THREE.Group();

    // ruggengraat met wervels
    g.add(this.mesh(this.geo.box, this.mat.bone, { y: 2.92, sx: 0.28, sy: 0.24, sz: 2.6 }));
    for (let i = 0; i < 5; i++) {
      g.add(this.mesh(this.geo.sphere, this.mat.bone, {
        y: 2.92, z: -1.04 + i * 0.52, sx: 0.34, sy: 0.34, sz: 0.34,
      }));
    }

    for (const s of [-1, 1]) {
      // hangende ribben
      for (let i = 0; i < 4; i++) {
        const z = -0.86 + i * 0.57;
        g.add(this.mesh(this.geo.capsule, this.mat.bone, {
          x: s * 0.72, y: 1.95, z, sx: 0.2, sy: 1.7, sz: 0.2, rz: s * 0.18,
        }));
      }
      // pootbeenderen als verankering, ruim buiten de baan
      g.add(this.mesh(this.geo.capsule, this.mat.bone, { x: s * 1.42, y: 1.45, sx: 0.26, sy: 2.5, sz: 0.26 }));
      g.add(this.mesh(this.geo.sphere, this.mat.bone, { x: s * 1.42, y: 0.16, sx: 0.4, sy: 0.3, sz: 0.5 }));
    }
    return g;
  }

  /** Schorpioen die dwars over de banen scharrelt. */
  scorpion() {
    const outer = new THREE.Group();
    const g = new THREE.Group();
    g.scale.setScalar(1.25);
    outer.add(g);

    g.add(this.mesh(this.geo.capsule, this.mat.chitin, { y: 0.3, sx: 0.9, sy: 0.7, sz: 1.2, rx: Math.PI / 2 }));
    g.add(this.mesh(this.geo.sphere, this.mat.chitin, { y: 0.32, z: 0.5, sx: 0.5, sy: 0.4, sz: 0.5 }));
    // scharen
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.capsule, this.mat.chitin, { x: s * 0.36, y: 0.28, z: 0.72, sx: 0.22, sy: 0.4, sz: 0.22, rx: 1.2, rz: s * 0.3 }));
      g.add(this.mesh(this.geo.sphere, this.mat.chitin, { x: s * 0.46, y: 0.26, z: 1.02, sx: 0.34, sy: 0.24, sz: 0.44 }));
      // pootjes
      for (let i = 0; i < 3; i++) {
        g.add(this.mesh(this.geo.capsule, this.mat.chitin, {
          x: s * 0.42, y: 0.18, z: 0.2 - i * 0.32, sx: 0.1, sy: 0.34, sz: 0.1, rz: s * 1.1,
        }));
      }
    }
    // staart met angel
    const staart = [[0.5, -0.55], [0.72, -0.85], [0.88, -1.05]];
    for (const [y, z] of staart) {
      g.add(this.mesh(this.geo.sphere, this.mat.chitin, { y, z, sx: 0.28, sy: 0.28, sz: 0.28 }));
    }
    g.add(this.mesh(this.geo.cone, this.mat.spine, { y: 0.92, z: -1.22, sx: 0.16, sy: 0.3, sz: 0.16, rx: -0.9 }));
    // stofwolkje
    for (let i = 0; i < 5; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.snowSoft, {
        x: rand(-0.5, 0.5), y: rand(0.02, 0.16), z: rand(-1.6, -0.9),
        sx: rand(0.2, 0.4), sy: rand(0.1, 0.18), sz: rand(0.2, 0.4), shadow: false,
      }));
    }
    return outer;
  }

  /** Rollend struikgewas dat op je af komt. */
  tumbleweed() {
    const outer = new THREE.Group();
    const g = new THREE.Group();
    g.position.y = 0.52;
    outer.add(g);
    outer.userData.roller = g;      // obstacles.js laat deze rollen

    for (let i = 0; i < 14; i++) {
      g.add(this.mesh(this.geo.box, this.mat.twig, {
        x: rand(-0.12, 0.12), y: rand(-0.12, 0.12), z: rand(-0.12, 0.12),
        sx: rand(0.05, 0.09), sy: rand(0.7, 1.0), sz: rand(0.05, 0.09),
        rx: Math.random() * 3, ry: Math.random() * 3, rz: Math.random() * 3,
      }));
    }
    return outer;
  }

  /** Veldfles — het verzamelobject van de woestijn. */
  waterFlask() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.cyl, this.mat.flask, { sx: 0.42, sy: 0.5, sz: 0.28 }));
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: 0.3, sx: 0.16, sy: 0.18, sz: 0.16 }));
    g.add(this.mesh(this.geo.box, this.mat.twig, { z: 0.0, y: 0.06, sx: 0.46, sy: 0.1, sz: 0.3 }));
    return g;
  }

  /* ---------- woestijndecor ---------- */

  /** Grote verweerde rotspunt. */
  mesa() {
    const g = new THREE.Group();
    const h = rand(4, 12), w = rand(4, 9);
    g.add(this.mesh(this.geo.cyl, this.mat.iceSolid, {
      y: h * 0.45, sx: w, sy: h, sz: w * rand(0.7, 1.3), ry: Math.random() * 3,
    }));
    g.add(this.mesh(this.geo.cyl, this.mat.rock, { y: h * 0.92, sx: w * 1.08, sy: h * 0.08, sz: w * 1.08 }));
    return g;
  }

  /** Zandduin. */
  dune() {
    const g = new THREE.Group();
    const n = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.snow, {
        x: rand(-2, 2), y: rand(-0.6, 0.1), z: rand(-3, 3),
        sx: rand(2.5, 5), sy: rand(1, 2.6), sz: rand(3, 6), ry: Math.random() * 3,
      }));
    }
    return g;
  }

  /** Dode boom. */
  deadTree() {
    const g = new THREE.Group();
    const h = rand(2.4, 4);
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: h / 2, sx: 0.34, sy: h, sz: 0.34 }));
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? 1 : -1;
      g.add(this.mesh(this.geo.capsule, this.mat.twig, {
        x: s * rand(0.3, 0.7), y: rand(h * 0.55, h * 0.95), z: rand(-0.4, 0.4),
        sx: 0.2, sy: rand(0.8, 1.4), sz: 0.2, rz: s * rand(0.6, 1.2),
      }));
    }
    return g;
  }

  /** Groepje cactussen langs de route. */
  cactusPatch() {
    const g = new THREE.Group();
    const n = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const c = Math.random() < 0.5 ? this.cactus() : this.cactusSmall();
      c.position.set(rand(-3, 3), 0, rand(-3, 3));
      c.scale.setScalar(rand(0.8, 1.4));
      g.add(c);
    }
    return g;
  }

  /** Gebleekte schedel in het zand. */
  skull() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.sphere, this.mat.bone, { y: 0.34, sx: 0.8, sy: 0.7, sz: 0.9 }));
    g.add(this.mesh(this.geo.box, this.mat.bone, { y: 0.22, z: 0.42, sx: 0.4, sy: 0.3, sz: 0.5 }));
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.cone, this.mat.bone, {
        x: s * 0.42, y: 0.62, sx: 0.22, sy: 0.9, sz: 0.22, rz: s * 1.1, rx: -0.3,
      }));
    }
    g.rotation.y = Math.random() * 3;
    return g;
  }

  /* =====================================================
     JUNGLE — level 3
     ===================================================== */

  /** Omgevallen boomstam — eroverheen springen. */
  log() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: 0.45, sx: 0.9, sy: 2.4, sz: 0.9, rz: Math.PI / 2 }));
    // jaarringen op de kopse kanten
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.cyl, this.mat.bone, { x: s * 1.2, y: 0.45, sx: 0.78, sy: 0.06, sz: 0.78, rz: Math.PI / 2 }));
    }
    // mosplekken
    for (let i = 0; i < 5; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.moss, {
        x: rand(-1.0, 1.0), y: rand(0.55, 0.9), z: rand(-0.35, 0.35),
        sx: rand(0.3, 0.6), sy: rand(0.12, 0.22), sz: rand(0.3, 0.5), ry: Math.random() * 3,
      }));
    }
    return g;
  }

  /** Stam op schraaghoogte met lianen eraan — eronderdoor glijden. */
  logBeam() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: 1.62, sx: 0.84, sy: 2.4, sz: 0.84, rz: Math.PI / 2 }));
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.cyl, this.mat.twig, { x: s * 1.05, y: 0.8, sx: 0.3, sy: 1.6, sz: 0.3 }));
    }
    // lianen die tot net boven glijhoogte hangen
    for (let i = 0; i < 7; i++) {
      const len = rand(0.35, 0.62);
      g.add(this.mesh(this.geo.cyl, this.mat.plant, {
        x: rand(-0.9, 0.9), y: 1.22 - len / 2, z: rand(-0.3, 0.3),
        sx: 0.08, sy: len, sz: 0.08,
      }));
    }
    return g;
  }

  /** Gordijn van lianen — eronderdoor glijden. */
  vines() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: 2.95, sx: 0.36, sy: 2.4, sz: 0.36, rz: Math.PI / 2 }));
    for (let i = 0; i < 9; i++) {
      const len = rand(1.7, 2.0);
      const x = rand(-1.0, 1.0);
      g.add(this.mesh(this.geo.cyl, this.mat.plant, {
        x, y: 2.9 - len / 2, z: rand(-0.35, 0.35), sx: 0.1, sy: len, sz: 0.1,
      }));
      // blaadjes onderaan
      g.add(this.mesh(this.geo.lowSphere, this.mat.moss, {
        x, y: 2.9 - len, z: 0, sx: 0.3, sy: 0.14, sz: 0.24, ry: Math.random() * 3,
      }));
    }
    return g;
  }

  /** Dikke boom midden op de baan — alleen te ontwijken. */
  treeTrunk() {
    const g = new THREE.Group();
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: 1.6, sx: 1.5, sy: 3.2, sz: 1.5 }));
    // steunwortels
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(this.mesh(this.geo.cone, this.mat.twig, {
        x: Math.cos(a) * 0.5, y: 0.45, z: Math.sin(a) * 0.5,
        sx: 0.5, sy: 0.9, sz: 0.5, rx: Math.sin(a) * 0.3, rz: -Math.cos(a) * 0.3,
      }));
    }
    for (let i = 0; i < 4; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.moss, {
        x: rand(-0.6, 0.6), y: rand(0.4, 2.6), z: rand(-0.6, 0.6),
        sx: rand(0.3, 0.6), sy: rand(0.3, 0.7), sz: rand(0.3, 0.6),
      }));
    }
    g.add(this.mesh(this.geo.lowSphere, this.mat.plant, { y: 3.4, sx: 2.4, sy: 1.0, sz: 2.4 }));
    return g;
  }

  /** Aap die dwars over de banen rent. */
  monkey() {
    const outer = new THREE.Group();
    const g = new THREE.Group();
    g.scale.setScalar(1.2);
    outer.add(g);

    g.add(this.mesh(this.geo.capsule, this.mat.chitin, { y: 0.44, sx: 0.85, sy: 0.85, sz: 1.15, rx: Math.PI / 2 }));
    g.add(this.mesh(this.geo.sphere, this.mat.chitin, { y: 0.62, z: 0.52, sx: 0.46, sy: 0.44, sz: 0.44 }));
    g.add(this.mesh(this.geo.sphere, this.mat.bone, { y: 0.56, z: 0.68, sx: 0.3, sy: 0.26, sz: 0.26 })); // snuit
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.sphere, this.mat.pEye, { x: s * 0.13, y: 0.68, z: 0.72, sx: 0.09, sy: 0.09, sz: 0.07 }));
      g.add(this.mesh(this.geo.sphere, this.mat.chitin, { x: s * 0.42, y: 0.72, z: 0.46, sx: 0.2, sy: 0.22, sz: 0.1 })); // oren
      // poten
      g.add(this.mesh(this.geo.capsule, this.mat.chitin, { x: s * 0.28, y: 0.2, z: 0.3, sx: 0.22, sy: 0.4, sz: 0.22 }));
      g.add(this.mesh(this.geo.capsule, this.mat.chitin, { x: s * 0.3, y: 0.2, z: -0.28, sx: 0.24, sy: 0.4, sz: 0.24 }));
    }
    // opkrullende staart
    const staart = [[0.55, -0.6], [0.8, -0.85], [1.0, -0.72]];
    for (const [y, z] of staart) {
      g.add(this.mesh(this.geo.sphere, this.mat.chitin, { y, z, sx: 0.18, sy: 0.18, sz: 0.18 }));
    }
    return outer;
  }

  /** Wild zwijn dat op je af stormt. */
  boar() {
    const outer = new THREE.Group();
    const g = new THREE.Group();
    g.scale.setScalar(1.2);
    outer.add(g);

    g.add(this.mesh(this.geo.capsule, this.mat.hide, { y: 0.48, sx: 1.1, sy: 0.95, sz: 1.35, rx: Math.PI / 2 }));
    g.add(this.mesh(this.geo.sphere, this.mat.hide, { y: 0.46, z: 0.66, sx: 0.55, sy: 0.5, sz: 0.5 }));
    g.add(this.mesh(this.geo.sphere, this.mat.chitin, { y: 0.4, z: 0.86, sx: 0.3, sy: 0.26, sz: 0.24 }));  // snuit
    // slagtanden
    for (const s of [-1, 1]) {
      g.add(this.mesh(this.geo.cone, this.mat.bone, { x: s * 0.2, y: 0.42, z: 0.9, sx: 0.1, sy: 0.3, sz: 0.1, rx: -0.6, rz: s * 0.4 }));
      g.add(this.mesh(this.geo.sphere, this.mat.pEye, { x: s * 0.2, y: 0.6, z: 0.82, sx: 0.09, sy: 0.09, sz: 0.07 }));
      g.add(this.mesh(this.geo.capsule, this.mat.hide, { x: s * 0.32, y: 0.2, z: 0.36, sx: 0.24, sy: 0.4, sz: 0.24 }));
      g.add(this.mesh(this.geo.capsule, this.mat.hide, { x: s * 0.34, y: 0.2, z: -0.4, sx: 0.26, sy: 0.4, sz: 0.26 }));
    }
    // borstelkam
    for (let i = 0; i < 5; i++) {
      g.add(this.mesh(this.geo.cone, this.mat.chitin, {
        y: 0.82, z: 0.35 - i * 0.22, sx: 0.1, sy: 0.26, sz: 0.1, rx: -0.3,
      }));
    }
    // opstuivend blad
    for (let i = 0; i < 5; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.moss, {
        x: rand(-0.5, 0.5), y: rand(0.05, 0.3), z: rand(-1.5, -0.8),
        sx: rand(0.15, 0.3), sy: rand(0.06, 0.12), sz: rand(0.15, 0.3), shadow: false,
      }));
    }
    return outer;
  }

  /** Tros bananen — het verzamelobject van de jungle. */
  banana() {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      g.add(this.mesh(this.geo.capsule, this.mat.fruit, {
        x: i * 0.13, y: 0, z: i * 0.05,
        sx: 0.24, sy: 0.42, sz: 0.24, rz: i * 0.35 + 0.3, rx: 0.2,
      }));
    }
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: 0.26, sx: 0.12, sy: 0.16, sz: 0.12 }));
    return g;
  }

  /* ---------- jungledecor ---------- */

  /** Hoge oerwoudboom met bladerdek. */
  jungleTree() {
    const g = new THREE.Group();
    const h = rand(8, 16);
    const dik = rand(1.6, 2.6);
    g.add(this.mesh(this.geo.cyl, this.mat.twig, { y: h / 2, sx: dik, sy: h, sz: dik }));
    // steunwortels onderaan
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      g.add(this.mesh(this.geo.cone, this.mat.twig, {
        x: Math.cos(a) * dik * 0.5, y: h * 0.12, z: Math.sin(a) * dik * 0.5,
        sx: dik * 0.5, sy: h * 0.25, sz: dik * 0.5,
        rx: Math.sin(a) * 0.25, rz: -Math.cos(a) * 0.25,
      }));
    }
    // breed, gelaagd bladerdek
    const kroon = 4 + ((Math.random() * 4) | 0);
    for (let i = 0; i < kroon; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.plant, {
        x: rand(-3.5, 3.5), y: h + rand(-1.6, 2.2), z: rand(-3.5, 3.5),
        sx: rand(4, 7.5), sy: rand(1.6, 3.2), sz: rand(4, 7.5), ry: Math.random() * 3,
      }));
    }
    // hangende lianen uit de kroon
    for (let i = 0; i < 3; i++) {
      const len = rand(2, 5);
      g.add(this.mesh(this.geo.cyl, this.mat.moss, {
        x: rand(-2.5, 2.5), y: h - len / 2, z: rand(-2.5, 2.5),
        sx: 0.14, sy: len, sz: 0.14,
      }));
    }
    return g;
  }

  /** Varens en struiken. */
  fernPatch() {
    const g = new THREE.Group();
    const n = 3 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const x = rand(-3, 3), z = rand(-3, 3);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.add(this.mesh(this.geo.cone, this.mat.plant, {
          x: x + Math.cos(a) * 0.4, y: rand(0.4, 0.8), z: z + Math.sin(a) * 0.4,
          sx: 0.4, sy: rand(1.0, 1.7), sz: 0.4,
          rx: Math.sin(a) * 0.6, rz: -Math.cos(a) * 0.6,
        }));
      }
    }
    return g;
  }

  /** Verweerde tempelpilaar, half overwoekerd. */
  ruinPillar() {
    const g = new THREE.Group();
    const h = rand(2.5, 6);
    g.add(this.mesh(this.geo.box, this.mat.iceSolid, { y: h / 2, sx: 1.4, sy: h, sz: 1.4, ry: rand(-0.2, 0.2) }));
    g.add(this.mesh(this.geo.box, this.mat.rock, { y: h + 0.15, sx: 1.8, sy: 0.3, sz: 1.8 }));
    for (let i = 0; i < 5; i++) {
      g.add(this.mesh(this.geo.lowSphere, this.mat.moss, {
        x: rand(-0.8, 0.8), y: rand(0.2, h), z: rand(-0.8, 0.8),
        sx: rand(0.4, 0.9), sy: rand(0.2, 0.5), sz: rand(0.4, 0.9),
      }));
    }
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

  /** Groepje rondslenterende pinguïns. */
  penguinColony() {
    const g = new THREE.Group();
    const n = 2 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const p = this.penguinStanding();
      p.position.set(rand(-3, 3), 0, rand(-3, 3));
      g.add(p);
    }
    return g;
  }

  /**
   * Willekeurig decorstuk, gewogen. Welke stukken dat zijn staat in het
   * level (`scenery.props`), zodat elke locatie zijn eigen horizon heeft.
   */
  scenery() {
    const lijst = this.theme.scenery?.props || [
      { builder: 'iceberg', weight: 34 },
      { builder: 'snowMound', weight: 28 },
      { builder: 'rockSpike', weight: 16 },
      { builder: 'penguinColony', weight: 14 },
      { builder: 'flagPole', weight: 8 },
    ];
    let totaal = 0;
    for (const e of lijst) totaal += e.weight;
    let r = Math.random() * totaal;
    for (const e of lijst) {
      r -= e.weight;
      if (r <= 0) return this[e.builder]();
    }
    return this[lijst[0].builder]();
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
      // klep net boven ooghoogte, anders valt hij over je bril heen
      add(P.geo.box,    m.hatTrim, { y: 0.17, z: 0.40, sx: 0.46, sy: 0.07, sz: 0.40, rx: -0.12 });
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

    case 'straw':
      // brede rand; blijft boven ooghoogte zodat je bril zichtbaar blijft
      add(P.geo.cyl,    m.hat,     { y: 0.22, sx: 1.08, sy: 0.05, sz: 1.08 });
      add(P.geo.sphere, m.hat,     { y: 0.30, sx: 0.48, sy: 0.38, sz: 0.48 });
      add(P.geo.cyl,    m.hatTrim, { y: 0.26, sx: 0.50, sy: 0.09, sz: 0.50 });
      break;

    case 'pith':
      add(P.geo.sphere, m.hat,     { y: 0.18, sx: 0.52, sy: 0.46, sz: 0.52 });
      add(P.geo.cyl,    m.hat,     { y: 0.20, sx: 0.82, sy: 0.05, sz: 0.88 });
      add(P.geo.cyl,    m.hatTrim, { y: 0.26, sx: 0.54, sy: 0.08, sz: 0.54 });
      add(P.geo.sphere, m.hatTrim, { y: 0.48, sx: 0.14, sy: 0.14, sz: 0.14 });
      break;

    case 'leafCrown':
      add(P.geo.cyl, m.hat, { y: 0.24, sx: 0.48, sy: 0.10, sz: 0.48 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        add(P.geo.cone, m.hatTrim, {
          x: Math.cos(a) * 0.24, y: 0.36, z: Math.sin(a) * 0.24,
          sx: 0.26, sy: 0.34, sz: 0.1,
          rx: Math.sin(a) * 0.7, rz: -Math.cos(a) * 0.7, ry: -a,
        });
      }
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

/**
 * Bouwt de bril; posities zijn in hoofd-coördinaten, gezicht op +z.
 *
 * De schedel heeft straal ~0.21 en mutsranden lopen tot ~0.26. Glazen
 * staan daarom op z ≈ 0.25 en het vizier op straal 0.285: zo steekt je
 * bril altijd onder het hoofddeksel vandaan in plaats van erin te
 * verdwijnen. Pootjes liggen op x ≈ 0.22, tegen het hoofd aan.
 */
function buildGlasses(P, m, style) {
  const parts = [];
  const add = (geo, mat, o) => parts.push(P.mesh(geo, mat, o));

  switch (style) {
    case 'none':
      break;

    case 'round':
      for (const s of [-1, 1]) {
        add(P.geo.cyl,   m.glass,     { x: s * 0.16, y: 0.05, z: 0.26, sx: 0.30, sy: 0.04, sz: 0.30, rx: Math.PI / 2 });
        add(P.geo.torus, m.glassTrim, { x: s * 0.16, y: 0.05, z: 0.26, sx: 0.34, sy: 0.34, sz: 0.34 });
        add(P.geo.box,   m.glassTrim, { x: s * 0.225, y: 0.06, z: 0.08, sx: 0.04, sy: 0.03, sz: 0.36 });
      }
      add(P.geo.box, m.glassTrim, { y: 0.05, z: 0.26, sx: 0.14, sy: 0.03, sz: 0.03 });
      break;

    case 'shades':
      for (const s of [-1, 1]) {
        add(P.geo.box, m.glass,     { x: s * 0.17, y: 0.06, z: 0.25, sx: 0.24, sy: 0.11, sz: 0.06, rz: s * 0.12 });
        add(P.geo.box, m.glassTrim, { x: s * 0.225, y: 0.07, z: 0.08, sx: 0.04, sy: 0.03, sz: 0.36 });
      }
      add(P.geo.box, m.glassTrim, { y: 0.08, z: 0.25, sx: 0.12, sy: 0.03, sz: 0.04 });
      break;

    case 'visor':
      // wikkelt om het hele hoofd, ruim buiten elke mutsrand
      add(P.geo.cyl, m.glass,     { y: 0.05, sx: 0.57, sy: 0.18, sz: 0.57 });
      add(P.geo.cyl, m.glassTrim, { y: 0.15, sx: 0.58, sy: 0.05, sz: 0.58 });
      break;

    case 'net':
      // muggennet: doorzichtige sluier vanaf een hoepel over je gezicht
      add(P.geo.cyl,   m.net,       { y: -0.08, sx: 0.64, sy: 0.64, sz: 0.64 });
      add(P.geo.torus, m.glassTrim, { y: 0.23, sx: 0.66, sy: 0.66, sz: 0.5, rx: Math.PI / 2 });
      break;

    case 'anaglyph':
      // 3D-bril: links de hoofdkleur, rechts de steunkleur
      add(P.geo.box, m.glass,     { x: -0.16, y: 0.06, z: 0.26, sx: 0.22, sy: 0.12, sz: 0.03 });
      add(P.geo.box, m.glassTrim, { x: 0.16, y: 0.06, z: 0.26, sx: 0.22, sy: 0.12, sz: 0.03 });
      for (const s of [-1, 1]) {
        add(P.geo.box, m.fur, { x: s * 0.225, y: 0.06, z: 0.10, sx: 0.04, sy: 0.04, sz: 0.34 });
      }
      add(P.geo.box, m.fur, { y: 0.06, z: 0.26, sx: 0.46, sy: 0.04, sz: 0.04 });
      break;

    default: // 'goggles' — de vertrouwde stormbril
      add(P.geo.box, m.glass,     { y: 0.05, z: 0.24, sx: 0.50, sy: 0.17, sz: 0.14 });
      add(P.geo.box, m.glassTrim, { y: 0.05, z: 0.02, sx: 0.52, sy: 0.09, sz: 0.46 });
  }
  return parts;
}

/** Bouwt de rugtas; posities zijn in romp-coördinaten, rug op -z. */
function buildBackpack(P, m, style) {
  const parts = [];
  const add = (geo, mat, o) => parts.push(P.mesh(geo, mat, o));

  switch (style) {
    case 'none':
      break;

    case 'expedition':
      add(P.geo.box, m.pack,     { y: 0.14, z: -0.44, sx: 0.66, sy: 0.92, sz: 0.36 });
      add(P.geo.cyl, m.packTrim, { y: 0.62, z: -0.44, sx: 0.36, sy: 0.68, sz: 0.36, rz: Math.PI / 2 });
      for (const s of [-1, 1]) {
        add(P.geo.box, m.packTrim, { x: s * 0.2, y: 0.1, z: -0.30, sx: 0.1, sy: 0.8, sz: 0.06 });
      }
      break;

    case 'duffel':
      add(P.geo.cyl,    m.pack,     { y: 0.08, z: -0.44, sx: 0.40, sy: 0.88, sz: 0.40, rz: Math.PI / 2 });
      for (const s of [-1, 1]) {
        add(P.geo.sphere, m.packTrim, { x: s * 0.44, y: 0.08, z: -0.44, sx: 0.2, sy: 0.2, sz: 0.2 });
      }
      add(P.geo.box, m.packTrim, { y: 0.08, z: -0.30, sx: 0.12, sy: 0.7, sz: 0.06 });
      break;

    case 'bedroll':
      add(P.geo.box, m.pack,     { y: -0.02, z: -0.40, sx: 0.56, sy: 0.54, sz: 0.28 });
      add(P.geo.cyl, m.packTrim, { y: 0.36, z: -0.42, sx: 0.28, sy: 0.78, sz: 0.28, rz: Math.PI / 2 });
      break;

    case 'jetpack':
      for (const s of [-1, 1]) {
        add(P.geo.cyl,  m.pack,     { x: s * 0.2, y: 0.12, z: -0.42, sx: 0.28, sy: 0.78, sz: 0.28 });
        add(P.geo.cone, m.packTrim, { x: s * 0.2, y: -0.36, z: -0.42, sx: 0.26, sy: 0.22, sz: 0.26, rx: Math.PI });
      }
      add(P.geo.box, m.packTrim, { y: 0.30, z: -0.42, sx: 0.56, sy: 0.12, sz: 0.30 });
      break;

    case 'basket':
      // gevlochten mand: gestapelde ringen
      for (let i = 0; i < 5; i++) {
        add(P.geo.torus, m.pack, {
          y: -0.18 + i * 0.17, z: -0.44,
          sx: 0.62 + i * 0.03, sy: 0.62 + i * 0.03, sz: 0.5, rx: Math.PI / 2,
        });
      }
      add(P.geo.cyl, m.packTrim, { y: -0.26, z: -0.44, sx: 0.58, sy: 0.06, sz: 0.58 });
      for (const s of [-1, 1]) {
        add(P.geo.box, m.packTrim, { x: s * 0.18, y: 0.08, z: -0.28, sx: 0.09, sy: 0.7, sz: 0.06 });
      }
      break;

    case 'machete':
      add(P.geo.box, m.pack,     { y: 0.03, z: -0.40, sx: 0.58, sy: 0.62, sz: 0.28 });
      add(P.geo.box, m.packTrim, { y: 0.14, z: -0.56, sx: 0.40, sy: 0.14, sz: 0.06 });
      // kapmes schuin over de klep
      add(P.geo.box, m.blade,    { x: 0.16, y: 0.16, z: -0.58, sx: 0.1, sy: 0.7, sz: 0.04, rz: 0.55 });
      add(P.geo.box, m.packTrim, { x: -0.05, y: -0.08, z: -0.58, sx: 0.09, sy: 0.24, sz: 0.06, rz: 0.55 });
      break;

    default: // 'daypack'
      add(P.geo.box, m.pack,     { y: 0.05, z: -0.40, sx: 0.60, sy: 0.66, sz: 0.30 });
      add(P.geo.box, m.packTrim, { y: 0.16, z: -0.57, sx: 0.40, sy: 0.16, sz: 0.06 });
  }
  return parts;
}

/** Bouwt één schoen; posities zijn in voet-coördinaten. */
function buildShoe(P, m, style) {
  const parts = [];
  const add = (geo, mat, o) => parts.push(P.mesh(geo, mat, o));

  // Sandalen hebben geen schoen: blote voet met een zool eronder.
  if (style === 'sandals') {
    add(P.geo.box, m.skin,     { z: 0.06, sx: 0.26, sy: 0.13, sz: 0.40 });
    add(P.geo.box, m.shoes,    { y: -0.08, z: 0.08, sx: 0.30, sy: 0.06, sz: 0.46 });
    add(P.geo.box, m.shoeTrim, { y: 0.01, z: 0.14, sx: 0.31, sy: 0.05, sz: 0.09 });
    add(P.geo.box, m.shoeTrim, { y: 0.02, z: -0.04, sx: 0.29, sy: 0.05, sz: 0.09, rx: 0.3 });
    return parts;
  }

  add(P.geo.box, m.shoes, { z: 0.08, sx: 0.28, sy: 0.16, sz: 0.44 });

  switch (style) {
    case 'snowshoes':
      add(P.geo.box, m.shoeTrim, { y: -0.10, z: 0.12, sx: 0.44, sy: 0.05, sz: 0.86 });
      break;
    case 'skates':
      // de schoen komt omhoog en het ijzer eronder; anders steekt de
      // hele lengte van het ijzer door de sneeuw en zakt de speler weg
      parts[0].position.y = 0.12;
      add(P.geo.box, m.shoeTrim, { y: 0.01, z: 0.06, sx: 0.05, sy: 0.22, sz: 0.62 });
      break;

    case 'rubber':
      // hoge schacht tot over de kuit
      add(P.geo.cyl, m.shoes,    { y: 0.30, z: -0.02, sx: 0.30, sy: 0.50, sz: 0.30 });
      add(P.geo.cyl, m.shoeTrim, { y: 0.54, z: -0.02, sx: 0.33, sy: 0.08, sz: 0.33 });
      add(P.geo.box, m.shoeTrim, { y: -0.09, z: 0.08, sx: 0.30, sy: 0.07, sz: 0.46 });
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

/**
 * Hoogte van het heup-/rompscharnier boven de grond.
 * De enkels liggen op y ≈ 0.02, dus dit is meteen de beenlengte + 0.02.
 * Met deze waarde is ongeveer 42% van de totale lengte been — dicht
 * genoeg bij een mens om niet als een blokje te lezen.
 */
export const TORSO_Y = 1.18;

export function createRunner(props) {
  const P = props;
  const group = new THREE.Group();

  // halve slag: het model kijkt hierdoor de renrichting in
  const body = new THREE.Group();
  body.rotation.y = Math.PI;
  group.add(body);

  // eigen materialen, zodat kleding verkleuren niets anders raakt
  const mats = {
    shirt:    new THREE.MeshStandardMaterial({ color: 0xff7a3c, roughness: 0.66, envMapIntensity: 0.6 }),
    accent:   new THREE.MeshStandardMaterial({ color: 0x2b3c55, roughness: 0.7, envMapIntensity: 0.6 }),
    pants:    new THREE.MeshStandardMaterial({ color: 0x2b3c55, roughness: 0.74, envMapIntensity: 0.55 }),
    shoes:    new THREE.MeshStandardMaterial({ color: 0x5b4a3b, roughness: 0.6, envMapIntensity: 0.8 }),
    shoeTrim: new THREE.MeshStandardMaterial({ color: 0x33291f, roughness: 0.7, envMapIntensity: 0.7 }),
    hat:      new THREE.MeshStandardMaterial({ color: 0xff7a3c, roughness: 0.72, envMapIntensity: 0.6 }),
    hatTrim:  new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9, envMapIntensity: 0.5 }),
    // brillenglas: spiegelt de lucht, maar houdt zijn eigen kleur
    glass:    new THREE.MeshStandardMaterial({ color: 0x0d1b2a, roughness: 0.05, metalness: 0.25, envMapIntensity: 2.4 }),
    glassTrim: new THREE.MeshStandardMaterial({ color: 0x2b3c55, roughness: 0.4, envMapIntensity: 0.9 }),
    pack:     new THREE.MeshStandardMaterial({ color: 0x2b3c55, roughness: 0.72, envMapIntensity: 0.6 }),
    packTrim: new THREE.MeshStandardMaterial({ color: 0xff8a4c, roughness: 0.65, envMapIntensity: 0.6 }),
    // muggennet: je moet er doorheen kunnen kijken
    net:      new THREE.MeshStandardMaterial({
      color: 0xd8e2d0, roughness: 0.9, transparent: true, opacity: 0.38,
      side: THREE.DoubleSide, depthWrite: false,
    }),
    blade:    new THREE.MeshStandardMaterial({ color: 0xc8d2dc, roughness: 0.18, metalness: 0.7, envMapIntensity: 1.6 }),
    // koude wangen — klein detail, maar het maakt het gezicht levend
    blush:    new THREE.MeshStandardMaterial({ color: 0xe8a289, roughness: 0.7, envMapIntensity: 0.6 }),
    skin:     P.mat.skin,
    fur:      P.mat.fur,
  };

  const torso = new THREE.Group();
  torso.position.y = TORSO_Y;
  body.add(torso);

  /* ---- romp: borstkas, taille en een korte parkazoom ----
     De zoom stopt net onder de heup. Hangt hij lager, dan verdwijnen de
     dijen eronder en lijkt het poppetje op stompjes te staan. */
  torso.add(P.mesh(P.geo.capsule, mats.shirt, { y: 0.16, sx: 0.92, sy: 0.62, sz: 0.78 }));  // borst
  torso.add(P.mesh(P.geo.capsule, mats.shirt, { y: -0.08, sx: 0.78, sy: 0.44, sz: 0.66 })); // taille
  torso.add(P.mesh(P.geo.hem, mats.shirt, { y: -0.21, sx: 0.88, sy: 0.26, sz: 0.76 }));     // zoom
  torso.add(P.mesh(P.geo.box, mats.accent, { y: -0.11, sx: 0.74, sy: 0.13, sz: 0.62 }));    // riem
  torso.add(P.mesh(P.geo.box, mats.accent, { y: 0.14, z: 0.27, sx: 0.07, sy: 0.52, sz: 0.06 })); // rits
  // schouderstukken maken de silhouetlijn breder en minder recht
  for (const s of [-1, 1]) {
    torso.add(P.mesh(P.geo.sphere, mats.shirt, { x: s * 0.34, y: 0.29, sx: 0.34, sy: 0.30, sz: 0.34 }));
  }

  const packMount = new THREE.Group();
  torso.add(packMount);

  // reflecterende banden — alleen zichtbaar bij een gestreept shirt
  const stripes = [
    P.mesh(P.geo.box, mats.accent, { y: 0.20, sx: 0.72, sy: 0.12, sz: 0.62 }),
    P.mesh(P.geo.box, mats.accent, { y: -0.02, sx: 0.66, sy: 0.10, sz: 0.58 }),
  ];
  for (const s of stripes) { s.visible = false; torso.add(s); }

  // borstzakken — alleen zichtbaar bij een safarivest
  const pockets = [];
  for (const s of [-1, 1]) {
    pockets.push(P.mesh(P.geo.box, mats.accent, { x: s * 0.18, y: 0.14, z: 0.26, sx: 0.22, sy: 0.20, sz: 0.06 }));
    pockets.push(P.mesh(P.geo.box, mats.accent, { x: s * 0.18, y: -0.06, z: 0.25, sx: 0.24, sy: 0.18, sz: 0.06 }));
  }
  for (const p of pockets) { p.visible = false; torso.add(p); }

  /* ---- kraag en hoofd ----
     Een poolreiziger in een parka heeft geen zichtbare nek: het hoofd
     komt direct uit de kraag. Die kraag dekt de naad tussen romp en
     hoofd af. */
  torso.add(P.mesh(P.geo.torus, mats.accent, { y: 0.40, sx: 0.54, sy: 0.54, sz: 0.62, rx: Math.PI / 2 }));

  const head = new THREE.Group();
  head.position.y = 0.60;
  torso.add(head);
  head.add(P.mesh(P.geo.sphere, mats.skin, { sx: 0.42, sy: 0.47, sz: 0.43 }));
  head.add(P.mesh(P.geo.sphere, mats.skin, { y: -0.14, z: 0.06, sx: 0.34, sy: 0.26, sz: 0.38 })); // kaak
  head.add(P.mesh(P.geo.cone, mats.skin, { y: -0.02, z: 0.19, sx: 0.10, sy: 0.12, sz: 0.14, rx: Math.PI / 2 })); // neus
  for (const s of [-1, 1]) {
    head.add(P.mesh(P.geo.sphere, mats.blush, { x: s * 0.15, y: -0.06, z: 0.15, sx: 0.15, sy: 0.12, sz: 0.1 }));
  }

  // brillen zitten ónder het hoofddeksel in de boom, zodat een muts
  // er overheen valt en niet andersom
  const glassMount = new THREE.Group();
  head.add(glassMount);

  const hatMount = new THREE.Group();
  head.add(hatMount);

  /* ---- ledematen met gewrichten ----
     Een arm of been is geen stok maar twee segmenten met een scharnier
     ertussen. De bovenste groep draait in de schouder/heup, de
     binnenste groep in de elleboog/knie. Dat verschil bepaalt of een
     loopcyclus er levend uitziet of als een slingerende paal. */
  const arms = [];
  const legs = [];

  for (const s of [-1, 1]) {
    /* -- arm: bovenarm 0.34, onderarm 0.30 -- */
    const arm = new THREE.Group();
    arm.position.set(s * 0.40, 0.24, 0);
    arm.add(P.mesh(P.geo.limb, mats.shirt, { y: -0.17, sx: 0.19, sy: 0.17, sz: 0.19 }));

    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    elbow.add(P.mesh(P.geo.sphere, mats.shirt, { sx: 0.19, sy: 0.19, sz: 0.19 }));           // elleboog
    elbow.add(P.mesh(P.geo.limb, mats.shirt, { y: -0.15, sx: 0.165, sy: 0.15, sz: 0.165 })); // onderarm
    // want met duim
    elbow.add(P.mesh(P.geo.sphere, mats.accent, { y: -0.33, z: 0.02, sx: 0.23, sy: 0.25, sz: 0.21 }));
    elbow.add(P.mesh(P.geo.sphere, mats.accent, { x: s * 0.09, y: -0.30, z: 0.04, sx: 0.1, sy: 0.14, sz: 0.1 }));
    arm.add(elbow);

    arm.userData = { elbow };
    torso.add(arm);
    arms.push(arm);

    /* -- been: dij 0.44, scheen 0.40, enkel komt uit op y ≈ 0.02 -- */
    const leg = new THREE.Group();
    leg.position.set(s * 0.20, -0.32, 0);

    // blote benen zitten er altijd in, iets dunner; de broekspijp valt
    // eroverheen. Bij een korte broek wordt die pijp simpelweg korter.
    leg.add(P.mesh(P.geo.limb, mats.skin, { y: -0.22, sx: 0.245, sy: 0.22, sz: 0.245 }));
    const thigh = P.mesh(P.geo.limb, mats.pants, { y: -0.22, sx: 0.27, sy: 0.22, sz: 0.27 });
    leg.add(thigh);

    // zijzak op de dij — alleen zichtbaar bij een cargobroek
    const pocket = P.mesh(P.geo.box, mats.accent, { x: s * 0.16, y: -0.24, sx: 0.1, sy: 0.22, sz: 0.3 });
    pocket.visible = false;
    leg.add(pocket);

    const knee = new THREE.Group();
    knee.position.y = -0.44;
    const kneeBall = P.mesh(P.geo.sphere, mats.pants, { sx: 0.26, sy: 0.26, sz: 0.26 });
    const shin = P.mesh(P.geo.limb, mats.pants, { y: -0.20, sx: 0.23, sy: 0.20, sz: 0.23 });
    knee.add(kneeBall, shin);

    const footMount = new THREE.Group();
    footMount.position.y = -0.40;
    knee.add(footMount);
    leg.add(knee);

    leg.userData = { thigh, knee, kneeBall, shin, footMount, pocket };
    torso.add(leg);
    legs.push(leg);
  }

  const runner = {
    group, body, torso, head, arms, legs, mats, stripes, pockets, props: P,
    hatMount, glassMount, packMount,
  };

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
  const hat     = o.hat      || { style: 'hood',    colors: { main: 0xff7a3c, trim: 0xf2efe6 } };
  const shirt   = o.shirt    || { style: 'plain',   colors: { main: 0xff7a3c, accent: 0x2b3c55 } };
  const pants   = o.pants    || { style: 'normal',  colors: { main: 0x2b3c55 } };
  const shoes   = o.shoes    || { style: 'boots',   colors: { main: 0x5b4a3b, trim: 0x33291f } };
  const glasses = o.glasses  || { style: 'goggles', colors: { main: 0x0d1b2a, trim: 0x2b3c55 } };
  const pack    = o.backpack || { style: 'daypack', colors: { main: 0x2b3c55, trim: 0xff8a4c } };

  /* -- shirt -- */
  m.shirt.color.setHex(shirt.colors.main);
  m.accent.color.setHex(shirt.colors.accent ?? 0x2b3c55);
  for (const s of runner.stripes) s.visible = shirt.style === 'striped';
  for (const p of runner.pockets) p.visible = shirt.style === 'vest';

  /* -- broek -- */
  m.pants.color.setHex(pants.colors.main);
  for (const leg of runner.legs) {
    const { thigh, shin, kneeBall, pocket } = leg.userData;
    const bloot = pants.style === 'shorts';

    if (bloot) {
      thigh.scale.set(0.29, 0.12, 0.29);   // korte pijp
      thigh.position.y = -0.12;
    } else if (pants.style === 'puffy') {
      thigh.scale.set(0.33, 0.22, 0.33);
      thigh.position.y = -0.22;
    } else {
      thigh.scale.set(0.27, 0.22, 0.27);
      thigh.position.y = -0.22;
    }
    pocket.visible = pants.style === 'cargo';

    // bij een korte broek zijn knie en scheen huid in plaats van stof
    shin.material = bloot ? m.skin : m.pants;
    kneeBall.material = bloot ? m.skin : m.pants;
    shin.scale.set(bloot ? 0.21 : 0.23, 0.20, bloot ? 0.21 : 0.23);
    kneeBall.scale.setScalar(bloot ? 0.23 : 0.26);
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

  /* -- bril -- */
  m.glass.color.setHex(glasses.colors.main);
  m.glassTrim.color.setHex(glasses.colors.trim ?? glasses.colors.main);
  m.net.color.setHex(glasses.colors.main);
  refill(runner.glassMount, buildGlasses(P, m, glasses.style));

  /* -- rugtas -- */
  m.pack.color.setHex(pack.colors.main);
  m.packTrim.color.setHex(pack.colors.trim ?? pack.colors.main);
  refill(runner.packMount, buildBackpack(P, m, pack.style));

  // nieuwe onderdelen moeten ook schaduw werpen
  runner.group.traverse((x) => { if (x.isMesh) x.castShadow = true; });
}

export { rand, pick };

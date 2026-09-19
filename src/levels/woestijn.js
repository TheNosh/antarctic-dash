/* ===========================================================
   LEVEL 2 — WOESTIJN
   -----------------------------------------------------------
   Zelfde opzet als antarctica.js: alleen data. De vier
   bewegingen houden hun betekenis, maar krijgen andere vormen:

     springen  → rotsblokken, cactussen, kloven
     glijden   → rotsrichels, steenbogen, een fossiele ribbenkast
     duiken    → schorpioenen en rollend struikgewas wegmaaien
     ontwijken → reuzencactussen en rotswanden

   Nieuw hier: `materials` stelt de gedeelde materialen bij, zodat
   "ijs" ondoorzichtige zandsteen wordt zonder extra bouwers.
   =========================================================== */

export const woestijn = {
  id: 'woestijn',
  name: 'Woestijn',
  tagline: 'Gloeiend zand, rollend struikgewas en schorpioenen tussen de cactussen. Hoe ver hou je het vol?',

  /** Wat je hier verzamelt (label in de HUD). */
  pickupLabel: 'Water',

  /* ---------- sfeer ---------- */
  colors: {
    skyTop: '#2b4d86',
    skyMid: '#7fabd6',
    skyHaze: '#dcc194',
    // moet gelijk zijn aan fog.color
    skyLow: '#efd7ac',

    // Let op: `ground` en `snowTex` worden vermenigvuldigd. Neem ze
    // allebei licht, anders wordt het zand oranje in plaats van warm.
    ground: 0xf4e2c2,
    snowTex: '#f0d9ad',
    snow: 0xecd3a4,

    // "ijs" is hier zandsteen
    ice: 0xc9905c,
    iceDeep: 0x9d6537,
    rock: 0xb28257,
    abyss: 0x2a1a10,
    hazard: 0xff8a4c,
    laneLine: 0xa9794a,
    // opstuivend zand onder je voeten
    dust: 0xe8d3a6,

    // geen poollicht in de woestijn
    aurora: null,

    player: 0xff7a3c,
    playerDark: 0x2b3c55,

    // woestijnspecifiek
    plant: 0x4c8c48,
    spine: 0xf2e6bc,
    bone: 0xe9ddc2,
    chitin: 0x4a2a16,
    twig: 0x8a6a42,
    flask: 0x3fa9d8,
  },

  /** Zandsteen is dof en ondoorzichtig, geen glanzend ijs. */
  materials: {
    ice: { transparent: false, opacity: 1, roughness: 0.85, metalness: 0, envMapIntensity: 0.4, normalScale: 0.9 },
    iceSolid: { roughness: 0.9, envMapIntensity: 0.35, normalScale: 1.0 },
    ground: { envMapIntensity: 0.4 },
  },

  fog: { color: 0xefd7ac, density: 0.0105 },

  /** Geen sneeuw maar stof: traag en hangend in plaats van vallend. */
  weather: {
    color: 0xe4cfa2,
    size: 0.24,
    opacity: 0.5,
    minFall: 0.2,
    maxFall: 1.1,
  },

  light: {
    hemiSky: 0xffe8c6,
    hemiGround: 0xd8b184,
    hemiPower: 0.34,
    sunColor: 0xfff4de,
    sunPower: 2.4,
    sunPos: [26, 52, -18],
  },

  /* ---------- decor langs de baan ---------- */
  scenery: {
    spacing: 26, jitter: 12, minX: 16, maxX: 54,
    props: [
      { builder: 'dune', weight: 30 },
      { builder: 'mesa', weight: 24 },
      { builder: 'cactusPatch', weight: 20 },
      { builder: 'deadTree', weight: 13 },
      { builder: 'skull', weight: 8 },
      { builder: 'rockSpike', weight: 5 },
    ],
  },

  /* ---------- snelheid: nét iets vinniger dan het ijs ---------- */
  speed: { start: 16, max: 40, ramp: 1500 },

  progression: {
    tiers: [0, 260, 700, 1500, 2600],
    gapBase: 18,
    gapMin: 10.5,
  },

  /* ---------- obstakelcatalogus ---------- */
  obstacles: {
    rockBlock: {
      builder: 'iceBlock', kind: 'solid',
      box: { hw: 0.95, hl: 0.8, y0: 0, y1: 1.02 },
      label: 'rotsblok',
    },
    rockWall: {
      builder: 'iceWall', kind: 'solid',
      box: { hw: 1.02, hl: 0.62, y0: 0, y1: 2.9 },
      label: 'rotswand',
    },
    cactusSmall: {
      builder: 'cactusSmall', kind: 'solid',
      box: { hw: 0.52, hl: 0.52, y0: 0, y1: 1.0 },
      label: 'cactus',
    },
    cactus: {
      builder: 'cactus', kind: 'solid',
      box: { hw: 0.64, hl: 0.64, y0: 0, y1: 2.9 },
      label: 'reuzencactus',
    },
    rockShelf: {
      builder: 'rockShelf', kind: 'overhead',
      box: { hw: 1.12, hl: 0.7, y0: 0.86, y1: 3.0 },
      label: 'rotsrichel',
    },
    stoneArch: {
      builder: 'stoneArch', kind: 'overhead',
      box: { hw: 5.5, hl: 0.85, y0: 0.9, y1: 3.2 },
      label: 'steenboog',
    },
    boneArch: {
      builder: 'boneArch', kind: 'overhead',
      box: { hw: 1.15, hl: 1.3, y0: 0.9, y1: 3.2 },
      label: 'ribbenkast',
    },
    chasm: {
      builder: 'crevasse', kind: 'pit',
      box: { hw: 1.15, hl: 1.8, y0: 0, y1: 0.25 },
      label: 'kloof',
    },
    chasmWide: {
      builder: 'crevasse', kind: 'pit', scaleX: 3.5,
      box: { hw: 4.02, hl: 1.8, y0: 0, y1: 0.25 },
      label: 'brede kloof',
    },
    duneRamp: {
      builder: 'snowRamp', kind: 'ramp', launch: 17.5,
      box: { hw: 1.1, hl: 1.1, y0: 0, y1: 1.3 },
      label: 'duinschans',
    },
    scorpion: {
      builder: 'scorpion', kind: 'creature',
      box: { hw: 0.62, hl: 0.9, y0: 0, y1: 1.1 },
      motion: { type: 'cross', speed: 4.6, bound: 3.6 },
      label: 'schorpioen',
    },
    tumbleweed: {
      builder: 'tumbleweed', kind: 'creature',
      box: { hw: 0.52, hl: 0.52, y0: 0, y1: 1.05 },
      motion: { type: 'charge', speed: 9.5 },
      label: 'rollend struikgewas',
    },
    water: {
      builder: 'waterFlask', kind: 'pickup', pickup: 'water',
      box: { hw: 0.58, hl: 0.62, y0: -0.55, y1: 0.55 },
      spin: 2.2, bob: 0.12,
    },
    shield: {
      builder: 'shield', kind: 'pickup', pickup: 'shield',
      box: { hw: 0.75, hl: 0.75, y0: -0.7, y1: 0.7 },
      spin: 1.4, bob: 0.2,
    },
  },

  /* ---------- patronen ---------- */
  patterns: [
    /* ===== tier 0 ===== */
    { id: 'blok-solo', tier: 0, weight: 4, length: 6, items: [
      { type: 'rockBlock', lane: 0, z: 0 },
      { type: 'water', lane: -1, z: 0, y: 1.1 },
      { type: 'water', lane: -1, z: 3, y: 1.1 },
    ]},
    { id: 'cactus-duo', tier: 0, weight: 4, length: 6, items: [
      { type: 'cactusSmall', lane: -1, z: 0 },
      { type: 'cactusSmall', lane: 1, z: 0 },
      { type: 'water', lane: 0, z: 0, y: 1.1 },
    ]},
    { id: 'richel-solo', tier: 0, weight: 4, length: 9, items: [
      { type: 'rockShelf', lane: 0, z: 0 },
      { type: 'water', lane: 0, z: 4.5, y: 0.75 },
    ]},
    { id: 'kloof-solo', tier: 0, weight: 3, length: 9, items: [
      { type: 'chasm', lane: 0, z: 0 },
      { type: 'water', lane: 0, z: 0, y: 2.3 },
      { type: 'water', lane: 0, z: 4, y: 1.4 },
    ]},
    { id: 'schorpioen-solo', tier: 0, weight: 4, length: 11, items: [
      { type: 'scorpion', lane: -1, z: 0 },
      { type: 'water', lane: 1, z: 6, y: 1.1 },
    ]},
    { id: 'waterboog', tier: 0, weight: 3, length: 12, mirror: false, items: [
      { type: 'water', lane: 0, z: 0, y: 1.0 },
      { type: 'water', lane: 0, z: 2.6, y: 1.9 },
      { type: 'water', lane: 0, z: 5.2, y: 2.5 },
      { type: 'water', lane: 0, z: 7.8, y: 1.9 },
      { type: 'water', lane: 0, z: 10.4, y: 1.0 },
    ]},
    { id: 'schans', tier: 0, weight: 2, length: 15, items: [
      { type: 'duneRamp', lane: 0, z: 0 },
      { type: 'water', lane: 0, z: 6, y: 2.8 },
      { type: 'water', lane: 0, z: 9.5, y: 3.2 },
      { type: 'water', lane: 0, z: 13, y: 2.6 },
    ]},

    /* ===== tier 1 ===== */
    { id: 'steenboog', tier: 1, weight: 4, length: 10, mirror: false, items: [
      { type: 'stoneArch', lane: 'all', z: 0 },
      { type: 'water', lane: 0, z: 0, y: 0.5 },
      { type: 'water', lane: 0, z: 5, y: 1.1 },
    ]},
    { id: 'wand-dwang', tier: 1, weight: 4, length: 8, items: [
      { type: 'rockWall', lane: -1, z: 0 },
      { type: 'cactus', lane: 0, z: 0 },
      { type: 'water', lane: 1, z: 0, y: 1.1 },
      { type: 'water', lane: 1, z: 3, y: 1.1 },
    ]},
    { id: 'slalom', tier: 1, weight: 4, length: 20, items: [
      { type: 'rockBlock', lane: -1, z: 0 },
      { type: 'cactusSmall', lane: 0, z: 7 },
      { type: 'rockBlock', lane: 1, z: 14 },
      { type: 'water', lane: 1, z: 3.5, y: 1.1 },
      { type: 'water', lane: -1, z: 10.5, y: 1.1 },
    ]},
    { id: 'ribben-blok', tier: 1, weight: 3, length: 10, items: [
      { type: 'boneArch', lane: 0, z: 0 },
      { type: 'rockBlock', lane: 1, z: 0 },
      { type: 'water', lane: -1, z: 0, y: 1.1 },
    ]},
    { id: 'struikgewas', tier: 1, weight: 4, length: 14, items: [
      { type: 'tumbleweed', lane: 0, z: 0 },
      { type: 'water', lane: -1, z: 8, y: 1.1 },
    ]},
    { id: 'richel-duo', tier: 1, weight: 3, length: 10, items: [
      { type: 'rockShelf', lane: -1, z: 0 },
      { type: 'rockShelf', lane: 1, z: 0 },
      { type: 'water', lane: 0, z: 0, y: 1.1 },
    ]},
    { id: 'kloof-duo', tier: 1, weight: 3, length: 12, items: [
      { type: 'chasm', lane: -1, z: 0 },
      { type: 'chasm', lane: 1, z: 0 },
      { type: 'water', lane: 0, z: 2, y: 1.1 },
    ]},

    /* ===== tier 2 ===== */
    { id: 'brede-kloof', tier: 2, weight: 4, length: 11, mirror: false, items: [
      { type: 'chasmWide', lane: 'all', z: 0 },
      { type: 'water', lane: 0, z: 0, y: 2.6 },
    ]},
    { id: 'richel-cactus', tier: 2, weight: 4, length: 10, items: [
      { type: 'rockShelf', lane: -1, z: 0 },
      { type: 'cactusSmall', lane: 0, z: 0 },
      { type: 'water', lane: 1, z: 1, y: 1.1 },
    ]},
    { id: 'schorpioen-tang', tier: 2, weight: 4, length: 18, mirror: false, items: [
      { type: 'scorpion', lane: -1, z: 0 },
      { type: 'scorpion', lane: 1, z: 9 },
      { type: 'water', lane: 0, z: 4.5, y: 1.1 },
    ]},
    { id: 'wand-dan-boog', tier: 2, weight: 4, length: 18, items: [
      { type: 'rockWall', lane: 1, z: 0 },
      { type: 'stoneArch', lane: 'all', z: 9 },
      { type: 'water', lane: -1, z: 3, y: 1.1 },
    ]},
    { id: 'dubbel-struikgewas', tier: 2, weight: 3, length: 16, mirror: false, items: [
      { type: 'tumbleweed', lane: -1, z: 0 },
      { type: 'tumbleweed', lane: 1, z: 0 },
      { type: 'water', lane: 0, z: 7, y: 1.1 },
    ]},
    { id: 'gemengd', tier: 2, weight: 3, length: 16, items: [
      { type: 'rockBlock', lane: -1, z: 0 },
      { type: 'cactus', lane: 1, z: 0 },
      { type: 'boneArch', lane: 0, z: 8 },
      { type: 'water', lane: 0, z: 3, y: 1.1 },
    ]},
    { id: 'schans-over-kloof', tier: 2, weight: 3, length: 20, items: [
      { type: 'duneRamp', lane: 0, z: 0 },
      { type: 'chasmWide', lane: 'all', z: 10 },
      { type: 'water', lane: 0, z: 7, y: 3.0 },
      { type: 'water', lane: 0, z: 10, y: 3.4 },
    ]},
    { id: 'schild', tier: 2, weight: 1, length: 9, mirror: false, items: [
      { type: 'shield', lane: 0, z: 0, y: 1.3 },
      { type: 'cactusSmall', lane: -1, z: 5 },
      { type: 'cactusSmall', lane: 1, z: 5 },
    ]},

    /* ===== tier 3 ===== */
    { id: 'poort', tier: 3, weight: 4, length: 20, items: [
      { type: 'rockBlock', lane: -1, z: 0 },
      { type: 'boneArch', lane: 0, z: 0 },
      { type: 'cactus', lane: 1, z: 0 },
      { type: 'chasm', lane: 0, z: 11 },
      { type: 'water', lane: 0, z: 11, y: 2.4 },
    ]},
    { id: 'boog-dan-kloof', tier: 3, weight: 4, length: 24, mirror: false, items: [
      { type: 'stoneArch', lane: 'all', z: 0 },
      { type: 'chasmWide', lane: 'all', z: 17 },
      { type: 'water', lane: 0, z: 17, y: 2.6 },
    ]},
    { id: 'schorpioenennest', tier: 3, weight: 4, length: 26, mirror: false, items: [
      { type: 'scorpion', lane: -1, z: 0 },
      { type: 'scorpion', lane: 1, z: 8 },
      { type: 'scorpion', lane: -1, z: 16 },
      { type: 'water', lane: 0, z: 12, y: 1.1 },
    ]},
    { id: 'struikgewas-slalom', tier: 3, weight: 4, length: 26, items: [
      { type: 'tumbleweed', lane: -1, z: 0 },
      { type: 'tumbleweed', lane: 0, z: 9 },
      { type: 'tumbleweed', lane: 1, z: 18 },
    ]},
    { id: 'richellijn', tier: 3, weight: 3, length: 26, items: [
      { type: 'rockShelf', lane: -1, z: 0 },
      { type: 'boneArch', lane: 0, z: 9 },
      { type: 'rockShelf', lane: 1, z: 18 },
      { type: 'water', lane: 0, z: 4, y: 0.75 },
      { type: 'water', lane: 1, z: 13, y: 0.75 },
    ]},
    { id: 'schans-onder-boog', tier: 3, weight: 3, length: 24, mirror: false, items: [
      { type: 'duneRamp', lane: 0, z: 0 },
      { type: 'stoneArch', lane: 'all', z: 15 },
      { type: 'water', lane: 0, z: 8, y: 3.0 },
    ]},

    /* ===== tier 4 ===== */
    { id: 'chaos-poort', tier: 4, weight: 4, length: 26, items: [
      { type: 'rockWall', lane: -1, z: 0 },
      { type: 'rockBlock', lane: 0, z: 0 },
      { type: 'chasm', lane: 1, z: 0 },
      { type: 'boneArch', lane: 0, z: 11 },
      { type: 'scorpion', lane: 1, z: 18 },
    ]},
    { id: 'chaos-boog', tier: 4, weight: 4, length: 30, mirror: false, items: [
      { type: 'stoneArch', lane: 'all', z: 0 },
      { type: 'scorpion', lane: -1, z: 11 },
      { type: 'chasmWide', lane: 'all', z: 22 },
      { type: 'water', lane: 0, z: 22, y: 2.7 },
    ]},
    { id: 'chaos-tang', tier: 4, weight: 4, length: 30, mirror: false, items: [
      { type: 'tumbleweed', lane: -1, z: 0 },
      { type: 'tumbleweed', lane: 1, z: 0 },
      { type: 'boneArch', lane: 0, z: 11 },
      { type: 'cactusSmall', lane: -1, z: 21 },
      { type: 'cactusSmall', lane: 1, z: 21 },
      { type: 'water', lane: 0, z: 21, y: 1.8 },
    ]},
    { id: 'chaos-cactussen', tier: 4, weight: 3, length: 28, items: [
      { type: 'cactus', lane: 0, z: 0 },
      { type: 'rockWall', lane: 1, z: 0 },
      { type: 'rockShelf', lane: -1, z: 9 },
      { type: 'cactus', lane: -1, z: 18 },
      { type: 'rockBlock', lane: 0, z: 18 },
    ]},
  ],
};

export default woestijn;

/* ===========================================================
   LEVEL 3 — JUNGLE
   -----------------------------------------------------------
   Dichter en benauwder dan de eerste twee: het zicht is korter,
   er valt blad in plaats van sneeuw, en de obstakels staan
   dichter op elkaar.

     springen  → omgevallen stammen, modderpoelen, ruïneblokken
     glijden   → lianengordijnen, een stam op schraaghoogte,
                 een overwoekerde tempelboog
     duiken    → apen en wilde zwijnen wegmaaien
     ontwijken → dikke bomen en ruïnemuren
   =========================================================== */

export const jungle = {
  id: 'jungle',
  name: 'Jungle',
  tagline: 'Lianen, modderpoelen en overwoekerde ruïnes. De apen zijn niet blij dat je er bent.',

  pickupLabel: 'Fruit',

  /* ---------- sfeer ---------- */
  colors: {
    skyTop: '#1b4450',
    skyMid: '#5f9080',
    skyHaze: '#8fb281',
    // moet gelijk zijn aan fog.color
    skyLow: '#9fc08e',

    // Grond × textuur worden vermenigvuldigd: 0xb9c39a × #a8b088 geeft
    // ongeveer (122,134,82) — mosbruin, niet het zand van level 2.
    ground: 0xb9c39a,
    snowTex: '#a8b088',
    snow: 0x7fa054,

    // "ijs" is hier overwoekerd steen
    ice: 0x8a9a7a,
    iceDeep: 0x5c6a52,
    rock: 0x6d7a64,
    abyss: 0x1a2413,
    hazard: 0xffb02e,
    laneLine: 0x7f9a66,
    dust: 0xc6b887,

    aurora: null,

    player: 0xff7a3c,
    playerDark: 0x2b3c55,

    // jungle
    plant: 0x3f8f3a,
    moss: 0x5f9440,
    twig: 0x6b4f33,
    bone: 0xe8dcc2,
    spine: 0xf0e3b8,
    chitin: 0x7a4f2e,   // aap
    hide: 0x4a3a2c,     // zwijn
    fruit: 0xf2c832,
  },

  /** Steen in plaats van ijs: dof, ondoorzichtig, licht bemost. */
  materials: {
    ice: { transparent: false, opacity: 1, roughness: 0.9, metalness: 0, envMapIntensity: 0.3, normalScale: 1.1 },
    iceSolid: { roughness: 0.92, envMapIntensity: 0.28 },
    ground: { envMapIntensity: 0.3 },
  },

  /** Dichter dan de andere levels: je ziet minder ver vooruit. */
  fog: { color: 0x9fc08e, density: 0.0125 },

  /** Vallend blad in plaats van sneeuw. */
  weather: {
    color: 0x86b055,
    size: 0.3,
    opacity: 0.6,
    minFall: 0.6,
    maxFall: 2.0,
  },

  // Gefilterd licht door het bladerdek: zwakkere zon, meer omgevingslicht.
  light: {
    hemiSky: 0xbfe0b0,
    hemiGround: 0x5f7a48,
    hemiPower: 0.5,
    sunColor: 0xfff2cc,
    sunPower: 1.7,
    sunPos: [-18, 46, -28],
  },

  /* ---------- decor ---------- */
  scenery: {
    spacing: 22, jitter: 10, minX: 14, maxX: 48,
    props: [
      { builder: 'jungleTree', weight: 34 },
      { builder: 'fernPatch', weight: 24 },
      { builder: 'snowMound', weight: 16 },   // bemoste heuveltjes
      { builder: 'ruinPillar', weight: 14 },
      { builder: 'deadTree', weight: 7 },
      { builder: 'rockSpike', weight: 5 },
    ],
  },

  /* ---------- snelheid ---------- */
  speed: { start: 15.5, max: 37, ramp: 1500 },

  progression: {
    tiers: [0, 270, 720, 1550, 2650],
    gapBase: 18,
    gapMin: 10.5,
  },

  /* ---------- obstakels ---------- */
  obstacles: {
    log: {
      builder: 'log', kind: 'solid',
      box: { hw: 1.2, hl: 0.5, y0: 0, y1: 0.95 },
      label: 'boomstam',
    },
    ruinBlock: {
      builder: 'iceBlock', kind: 'solid',
      box: { hw: 0.95, hl: 0.8, y0: 0, y1: 1.02 },
      label: 'ruïneblok',
    },
    ruinWall: {
      builder: 'iceWall', kind: 'solid',
      box: { hw: 1.02, hl: 0.62, y0: 0, y1: 2.9 },
      label: 'ruïnemuur',
    },
    treeTrunk: {
      builder: 'treeTrunk', kind: 'solid',
      box: { hw: 0.8, hl: 0.8, y0: 0, y1: 3.0 },
      label: 'boom',
    },
    logBeam: {
      builder: 'logBeam', kind: 'overhead',
      box: { hw: 1.2, hl: 0.5, y0: 0.88, y1: 2.6 },
      label: 'stam op schraaghoogte',
    },
    vines: {
      builder: 'vines', kind: 'overhead',
      box: { hw: 1.15, hl: 0.5, y0: 0.88, y1: 3.2 },
      label: 'lianen',
    },
    templeArch: {
      builder: 'stoneArch', kind: 'overhead',
      box: { hw: 5.5, hl: 0.85, y0: 0.9, y1: 3.2 },
      label: 'tempelboog',
    },
    mudPit: {
      builder: 'crevasse', kind: 'pit',
      box: { hw: 1.15, hl: 1.8, y0: 0, y1: 0.25 },
      label: 'modderpoel',
    },
    mudPitWide: {
      builder: 'crevasse', kind: 'pit', scaleX: 3.5,
      box: { hw: 4.02, hl: 1.8, y0: 0, y1: 0.25 },
      label: 'breed moeras',
    },
    rootRamp: {
      builder: 'snowRamp', kind: 'ramp', launch: 17.5,
      box: { hw: 1.1, hl: 1.1, y0: 0, y1: 1.3 },
      label: 'wortelschans',
    },
    monkey: {
      builder: 'monkey', kind: 'creature',
      box: { hw: 0.58, hl: 0.85, y0: 0, y1: 1.05 },
      motion: { type: 'cross', speed: 5.0, bound: 3.6 },
      label: 'aap',
    },
    boar: {
      builder: 'boar', kind: 'creature',
      box: { hw: 0.62, hl: 0.95, y0: 0, y1: 1.15 },
      motion: { type: 'charge', speed: 9.5 },
      label: 'wild zwijn',
    },
    fruit: {
      builder: 'banana', kind: 'pickup', pickup: 'fruit',
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
    { id: 'stam-solo', tier: 0, weight: 4, length: 6, items: [
      { type: 'log', lane: 0, z: 0 },
      { type: 'fruit', lane: -1, z: 0, y: 1.1 },
      { type: 'fruit', lane: -1, z: 3, y: 1.1 },
    ]},
    { id: 'blok-duo', tier: 0, weight: 4, length: 6, items: [
      { type: 'ruinBlock', lane: -1, z: 0 },
      { type: 'ruinBlock', lane: 1, z: 0 },
      { type: 'fruit', lane: 0, z: 0, y: 1.1 },
    ]},
    { id: 'lianen-solo', tier: 0, weight: 4, length: 9, items: [
      { type: 'vines', lane: 0, z: 0 },
      { type: 'fruit', lane: 0, z: 4.5, y: 0.75 },
    ]},
    { id: 'modder-solo', tier: 0, weight: 3, length: 9, items: [
      { type: 'mudPit', lane: 0, z: 0 },
      { type: 'fruit', lane: 0, z: 0, y: 2.3 },
      { type: 'fruit', lane: 0, z: 4, y: 1.4 },
    ]},
    { id: 'aap-solo', tier: 0, weight: 4, length: 11, items: [
      { type: 'monkey', lane: -1, z: 0 },
      { type: 'fruit', lane: 1, z: 6, y: 1.1 },
    ]},
    { id: 'fruitboog', tier: 0, weight: 3, length: 12, mirror: false, items: [
      { type: 'fruit', lane: 0, z: 0, y: 1.0 },
      { type: 'fruit', lane: 0, z: 2.6, y: 1.9 },
      { type: 'fruit', lane: 0, z: 5.2, y: 2.5 },
      { type: 'fruit', lane: 0, z: 7.8, y: 1.9 },
      { type: 'fruit', lane: 0, z: 10.4, y: 1.0 },
    ]},
    { id: 'schans', tier: 0, weight: 2, length: 15, items: [
      { type: 'rootRamp', lane: 0, z: 0 },
      { type: 'fruit', lane: 0, z: 6, y: 2.8 },
      { type: 'fruit', lane: 0, z: 9.5, y: 3.2 },
      { type: 'fruit', lane: 0, z: 13, y: 2.6 },
    ]},

    /* ===== tier 1 ===== */
    { id: 'tempelboog', tier: 1, weight: 4, length: 10, mirror: false, items: [
      { type: 'templeArch', lane: 'all', z: 0 },
      { type: 'fruit', lane: 0, z: 0, y: 0.5 },
      { type: 'fruit', lane: 0, z: 5, y: 1.1 },
    ]},
    { id: 'boom-dwang', tier: 1, weight: 4, length: 8, items: [
      { type: 'treeTrunk', lane: -1, z: 0 },
      { type: 'ruinWall', lane: 0, z: 0 },
      { type: 'fruit', lane: 1, z: 0, y: 1.1 },
      { type: 'fruit', lane: 1, z: 3, y: 1.1 },
    ]},
    { id: 'slalom', tier: 1, weight: 4, length: 20, items: [
      { type: 'log', lane: -1, z: 0 },
      { type: 'ruinBlock', lane: 0, z: 7 },
      { type: 'log', lane: 1, z: 14 },
      { type: 'fruit', lane: 1, z: 3.5, y: 1.1 },
      { type: 'fruit', lane: -1, z: 10.5, y: 1.1 },
    ]},
    { id: 'schraag-blok', tier: 1, weight: 3, length: 10, items: [
      { type: 'logBeam', lane: 0, z: 0 },
      { type: 'ruinBlock', lane: 1, z: 0 },
      { type: 'fruit', lane: -1, z: 0, y: 1.1 },
    ]},
    { id: 'zwijn', tier: 1, weight: 4, length: 14, items: [
      { type: 'boar', lane: 0, z: 0 },
      { type: 'fruit', lane: -1, z: 8, y: 1.1 },
    ]},
    { id: 'lianen-duo', tier: 1, weight: 3, length: 10, items: [
      { type: 'vines', lane: -1, z: 0 },
      { type: 'vines', lane: 1, z: 0 },
      { type: 'fruit', lane: 0, z: 0, y: 1.1 },
    ]},
    { id: 'modder-duo', tier: 1, weight: 3, length: 12, items: [
      { type: 'mudPit', lane: -1, z: 0 },
      { type: 'mudPit', lane: 1, z: 0 },
      { type: 'fruit', lane: 0, z: 2, y: 1.1 },
    ]},

    /* ===== tier 2 ===== */
    { id: 'breed-moeras', tier: 2, weight: 4, length: 11, mirror: false, items: [
      { type: 'mudPitWide', lane: 'all', z: 0 },
      { type: 'fruit', lane: 0, z: 0, y: 2.6 },
    ]},
    { id: 'lianen-stam', tier: 2, weight: 4, length: 10, items: [
      { type: 'vines', lane: -1, z: 0 },
      { type: 'log', lane: 0, z: 0 },
      { type: 'fruit', lane: 1, z: 1, y: 1.1 },
    ]},
    { id: 'apen-tang', tier: 2, weight: 4, length: 18, mirror: false, items: [
      { type: 'monkey', lane: -1, z: 0 },
      { type: 'monkey', lane: 1, z: 9 },
      { type: 'fruit', lane: 0, z: 4.5, y: 1.1 },
    ]},
    { id: 'muur-dan-boog', tier: 2, weight: 4, length: 18, items: [
      { type: 'ruinWall', lane: 1, z: 0 },
      { type: 'templeArch', lane: 'all', z: 9 },
      { type: 'fruit', lane: -1, z: 3, y: 1.1 },
    ]},
    { id: 'dubbel-zwijn', tier: 2, weight: 3, length: 16, mirror: false, items: [
      { type: 'boar', lane: -1, z: 0 },
      { type: 'boar', lane: 1, z: 0 },
      { type: 'fruit', lane: 0, z: 7, y: 1.1 },
    ]},
    { id: 'gemengd', tier: 2, weight: 3, length: 16, items: [
      { type: 'log', lane: -1, z: 0 },
      { type: 'treeTrunk', lane: 1, z: 0 },
      { type: 'logBeam', lane: 0, z: 8 },
      { type: 'fruit', lane: 0, z: 3, y: 1.1 },
    ]},
    { id: 'schans-over-moeras', tier: 2, weight: 3, length: 20, items: [
      { type: 'rootRamp', lane: 0, z: 0 },
      { type: 'mudPitWide', lane: 'all', z: 10 },
      { type: 'fruit', lane: 0, z: 7, y: 3.0 },
      { type: 'fruit', lane: 0, z: 10, y: 3.4 },
    ]},
    { id: 'schild', tier: 2, weight: 1, length: 9, mirror: false, items: [
      { type: 'shield', lane: 0, z: 0, y: 1.3 },
      { type: 'log', lane: -1, z: 5 },
      { type: 'log', lane: 1, z: 5 },
    ]},

    /* ===== tier 3 ===== */
    { id: 'poort', tier: 3, weight: 4, length: 20, items: [
      { type: 'log', lane: -1, z: 0 },
      { type: 'vines', lane: 0, z: 0 },
      { type: 'treeTrunk', lane: 1, z: 0 },
      { type: 'mudPit', lane: 0, z: 11 },
      { type: 'fruit', lane: 0, z: 11, y: 2.4 },
    ]},
    { id: 'boog-dan-moeras', tier: 3, weight: 4, length: 24, mirror: false, items: [
      { type: 'templeArch', lane: 'all', z: 0 },
      { type: 'mudPitWide', lane: 'all', z: 17 },
      { type: 'fruit', lane: 0, z: 17, y: 2.6 },
    ]},
    { id: 'apenbende', tier: 3, weight: 4, length: 26, mirror: false, items: [
      { type: 'monkey', lane: -1, z: 0 },
      { type: 'monkey', lane: 1, z: 8 },
      { type: 'monkey', lane: -1, z: 16 },
      { type: 'fruit', lane: 0, z: 12, y: 1.1 },
    ]},
    { id: 'zwijn-slalom', tier: 3, weight: 4, length: 26, items: [
      { type: 'boar', lane: -1, z: 0 },
      { type: 'boar', lane: 0, z: 9 },
      { type: 'boar', lane: 1, z: 18 },
    ]},
    { id: 'lianenlijn', tier: 3, weight: 3, length: 26, items: [
      { type: 'vines', lane: -1, z: 0 },
      { type: 'logBeam', lane: 0, z: 9 },
      { type: 'vines', lane: 1, z: 18 },
      { type: 'fruit', lane: 0, z: 4, y: 0.75 },
      { type: 'fruit', lane: 1, z: 13, y: 0.75 },
    ]},
    { id: 'schans-onder-boog', tier: 3, weight: 3, length: 24, mirror: false, items: [
      { type: 'rootRamp', lane: 0, z: 0 },
      { type: 'templeArch', lane: 'all', z: 15 },
      { type: 'fruit', lane: 0, z: 8, y: 3.0 },
    ]},

    /* ===== tier 4 ===== */
    { id: 'chaos-poort', tier: 4, weight: 4, length: 26, items: [
      { type: 'ruinWall', lane: -1, z: 0 },
      { type: 'log', lane: 0, z: 0 },
      { type: 'mudPit', lane: 1, z: 0 },
      { type: 'vines', lane: 0, z: 11 },
      { type: 'monkey', lane: 1, z: 18 },
    ]},
    { id: 'chaos-boog', tier: 4, weight: 4, length: 30, mirror: false, items: [
      { type: 'templeArch', lane: 'all', z: 0 },
      { type: 'monkey', lane: -1, z: 11 },
      { type: 'mudPitWide', lane: 'all', z: 22 },
      { type: 'fruit', lane: 0, z: 22, y: 2.7 },
    ]},
    { id: 'chaos-tang', tier: 4, weight: 4, length: 30, mirror: false, items: [
      { type: 'boar', lane: -1, z: 0 },
      { type: 'boar', lane: 1, z: 0 },
      { type: 'vines', lane: 0, z: 11 },
      { type: 'log', lane: -1, z: 21 },
      { type: 'log', lane: 1, z: 21 },
      { type: 'fruit', lane: 0, z: 21, y: 1.8 },
    ]},
    { id: 'chaos-bomen', tier: 4, weight: 3, length: 28, items: [
      { type: 'treeTrunk', lane: 0, z: 0 },
      { type: 'ruinWall', lane: 1, z: 0 },
      { type: 'logBeam', lane: -1, z: 9 },
      { type: 'treeTrunk', lane: -1, z: 18 },
      { type: 'log', lane: 0, z: 18 },
    ]},
  ],
};

export default jungle;

/* ===========================================================
   LEVEL 1 — ANTARCTICA
   -----------------------------------------------------------
   Dit bestand is het sjabloon voor elk volgend level. Een level
   beschrijft alleen *data*: sfeer, snelheidscurve, welke
   obstakels bestaan en in welke combinaties ze verschijnen.
   De engine weet verder nergens van af.

   Een obstakel bestaat uit:
     builder  — functienaam in world/props.js die het model maakt
     kind     — botsingsgedrag:
                'solid'    raak = klap (springen/ontwijken)
                'overhead' hangt in de lucht (glijden/ontwijken)
                'pit'      gat in het ijs (springen)
                'creature' levend, kan weggeduwd worden met duiken
                'ramp'     lanceert je omhoog
                'pickup'   oppakken
     box      — hitbox: hw (halve breedte), hl (halve lengte),
                y0/y1 (hoogtebereik)
   =========================================================== */

export const antarctica = {
  id: 'antarctica',
  name: 'Antarctica',
  tagline: 'Pakijs, gletsjerspleten en pinguïns die van opzij komen glijden. Hoe ver kom jij?',

  /* ---------- sfeer ---------- */
  colors: {
    skyTop: '#0b2745',
    skyMid: '#3f7fb4',
    skyHaze: '#a9c8de',
    // moet gelijk zijn aan fog.color, anders zie je een harde naad op
    // de horizon tussen de vervagende grond en de lucht erachter
    skyLow: '#d6e5f0',
    ground: 0xdff0ff,
    snowTex: '#eef7ff',
    snow: 0xf4faff,
    // verzadigder dan het wit eromheen, zodat obstakels leesbaar blijven
    ice: 0x74c8ef,
    iceDeep: 0x3691c4,
    rock: 0x76828f,
    abyss: 0x03131f,
    hazard: 0xff8a4c,
    aurora: 'rgba(126,255,206,.85)',
    laneLine: 0x7fb7de,
    player: 0xff7a3c,
    playerDark: 0x2b3c55,
  },

  // exponentiële mist: zicht van ~170 m. Hoger = dichter bij je neus.
  fog: { color: 0xd6e5f0, density: 0.0105 },

  light: {
    // het hemellicht mag laag: de omgevingsmap levert nu het zachte licht
    hemiSky: 0xbfe0ff,
    hemiGround: 0x8fb4d2,
    hemiPower: 0.28,
    sunColor: 0xfff1d8,
    sunPower: 2.1,
    sunPos: [-26, 40, -22],
  },

  /* ---------- decor langs de baan ---------- */
  // minX is de belangrijkste: decor mag nooit het zicht op de baan blokkeren
  scenery: { spacing: 26, jitter: 12, minX: 16, maxX: 54 },

  /* ---------- snelheid ---------- */
  speed: {
    start: 15,      // m/s bij de start
    max: 38,        // absolute bovengrens
    ramp: 1500,     // afstand (m) waarover je richting max klimt
  },

  /* ---------- moeilijkheid ---------- */
  progression: {
    // afstand (m) waarop een nieuwe moeilijkheidstrap opengaat
    tiers: [0, 280, 750, 1600, 2700],
    gapBase: 19,    // ruimte tussen twee patronen bij tier 0
    gapMin: 11,     // ruimte bij de hoogste tier
  },

  /* ---------- obstakelcatalogus ---------- */
  obstacles: {
    iceBlock: {
      builder: 'iceBlock', kind: 'solid',
      box: { hw: 0.95, hl: 0.8, y0: 0, y1: 1.02 },
      label: 'ijsblok',
    },
    iceWall: {
      builder: 'iceWall', kind: 'solid',
      box: { hw: 1.02, hl: 0.62, y0: 0, y1: 2.9 },
      label: 'ijswand',
    },
    iceShelf: {
      builder: 'iceShelf', kind: 'overhead',
      box: { hw: 1.06, hl: 0.65, y0: 0.80, y1: 3.0 },
      label: 'ijsrichel',
    },
    iceBridge: {
      builder: 'iceBridge', kind: 'overhead',
      box: { hw: 5.5, hl: 0.8, y0: 0.85, y1: 3.1 },
      label: 'ijsbrug',
    },
    icicles: {
      builder: 'icicles', kind: 'overhead',
      box: { hw: 1.1, hl: 0.5, y0: 0.85, y1: 3.2 },
      label: 'ijspegels',
    },
    crevasse: {
      builder: 'crevasse', kind: 'pit',
      box: { hw: 1.15, hl: 1.8, y0: 0, y1: 0.25 },
      label: 'gletsjerspleet',
    },
    crevasseWide: {
      builder: 'crevasse', kind: 'pit', scaleX: 3.5,
      box: { hw: 4.02, hl: 1.8, y0: 0, y1: 0.25 },
      label: 'brede spleet',
    },
    snowRamp: {
      builder: 'snowRamp', kind: 'ramp', launch: 17.5,
      box: { hw: 1.1, hl: 1.1, y0: 0, y1: 1.3 },
      label: 'sneeuwschans',
    },
    penguinSlider: {
      builder: 'penguinSliding', kind: 'creature',
      box: { hw: 0.58, hl: 0.88, y0: 0, y1: 1.0 },
      motion: { type: 'cross', speed: 4.4, bound: 3.6 },
      label: 'glijdende pinguïn',
    },
    penguinCharger: {
      builder: 'penguinSliding', kind: 'creature',
      box: { hw: 0.55, hl: 0.95, y0: 0, y1: 1.0 },
      motion: { type: 'charge', speed: 9 },
      label: 'aanstormende pinguïn',
    },
    fish: {
      builder: 'fish', kind: 'pickup', pickup: 'fish',
      box: { hw: 0.58, hl: 0.62, y0: -0.55, y1: 0.55 },
      spin: 2.2, bob: 0.12,
    },
    shield: {
      builder: 'shield', kind: 'pickup', pickup: 'shield',
      box: { hw: 0.75, hl: 0.75, y0: -0.7, y1: 0.7 },
      spin: 1.4, bob: 0.2,
    },
  },

  /* ---------- patronen ----------
     lane: -1 | 0 | 1 | 'all'   (bij een 'cross'-pinguïn is lane de kánt
                                 waar hij vandaan komt)
     z:    meters verder weg binnen het patroon
     y:    alleen voor pickups
     mirror !== false → het patroon wordt willekeurig gespiegeld
  -------------------------------------------------------- */
  patterns: [
    /* ===== tier 0 — rustig inkomen ===== */
    { id: 'blok-solo', tier: 0, weight: 4, length: 6, items: [
      { type: 'iceBlock', lane: 0, z: 0 },
      { type: 'fish', lane: -1, z: 0, y: 1.1 },
      { type: 'fish', lane: -1, z: 3, y: 1.1 },
    ]},
    { id: 'blok-duo', tier: 0, weight: 4, length: 6, items: [
      { type: 'iceBlock', lane: -1, z: 0 },
      { type: 'iceBlock', lane: 1, z: 0 },
      { type: 'fish', lane: 0, z: 0, y: 1.1 },
    ]},
    { id: 'richel-solo', tier: 0, weight: 4, length: 9, items: [
      { type: 'iceShelf', lane: 0, z: 0 },
      { type: 'fish', lane: 0, z: 4.5, y: 0.75 },
    ]},
    { id: 'spleet-solo', tier: 0, weight: 3, length: 9, items: [
      { type: 'crevasse', lane: 0, z: 0 },
      { type: 'fish', lane: 0, z: 0, y: 2.3 },
      { type: 'fish', lane: 0, z: 4, y: 1.4 },
    ]},
    { id: 'pinguin-solo', tier: 0, weight: 4, length: 11, items: [
      { type: 'penguinSlider', lane: -1, z: 0 },
      { type: 'fish', lane: 1, z: 6, y: 1.1 },
    ]},
    { id: 'vissenboog', tier: 0, weight: 3, length: 12, mirror: false, items: [
      { type: 'fish', lane: 0, z: 0, y: 1.0 },
      { type: 'fish', lane: 0, z: 2.6, y: 1.9 },
      { type: 'fish', lane: 0, z: 5.2, y: 2.5 },
      { type: 'fish', lane: 0, z: 7.8, y: 1.9 },
      { type: 'fish', lane: 0, z: 10.4, y: 1.0 },
    ]},
    { id: 'schans', tier: 0, weight: 2, length: 15, items: [
      { type: 'snowRamp', lane: 0, z: 0 },
      { type: 'fish', lane: 0, z: 6, y: 2.8 },
      { type: 'fish', lane: 0, z: 9.5, y: 3.2 },
      { type: 'fish', lane: 0, z: 13, y: 2.6 },
    ]},

    /* ===== tier 1 ===== */
    { id: 'ijsbrug', tier: 1, weight: 4, length: 10, mirror: false, items: [
      { type: 'iceBridge', lane: 'all', z: 0 },
      { type: 'fish', lane: 0, z: 0, y: 0.5 },
      { type: 'fish', lane: 0, z: 5, y: 1.1 },
    ]},
    { id: 'muur-dwang', tier: 1, weight: 4, length: 8, items: [
      { type: 'iceWall', lane: -1, z: 0 },
      { type: 'iceWall', lane: 0, z: 0 },
      { type: 'fish', lane: 1, z: 0, y: 1.1 },
      { type: 'fish', lane: 1, z: 3, y: 1.1 },
    ]},
    { id: 'slalom', tier: 1, weight: 4, length: 20, items: [
      { type: 'iceBlock', lane: -1, z: 0 },
      { type: 'iceBlock', lane: 0, z: 7 },
      { type: 'iceBlock', lane: 1, z: 14 },
      { type: 'fish', lane: 1, z: 3.5, y: 1.1 },
      { type: 'fish', lane: -1, z: 10.5, y: 1.1 },
    ]},
    { id: 'pegels-blok', tier: 1, weight: 3, length: 10, items: [
      { type: 'icicles', lane: 0, z: 0 },
      { type: 'iceBlock', lane: 1, z: 0 },
      { type: 'fish', lane: -1, z: 0, y: 1.1 },
    ]},
    { id: 'stormloop', tier: 1, weight: 4, length: 14, items: [
      { type: 'penguinCharger', lane: 0, z: 0 },
      { type: 'fish', lane: -1, z: 8, y: 1.1 },
    ]},
    { id: 'richel-duo', tier: 1, weight: 3, length: 10, items: [
      { type: 'iceShelf', lane: -1, z: 0 },
      { type: 'iceShelf', lane: 1, z: 0 },
      { type: 'fish', lane: 0, z: 0, y: 1.1 },
    ]},
    { id: 'spleet-duo', tier: 1, weight: 3, length: 12, items: [
      { type: 'crevasse', lane: -1, z: 0 },
      { type: 'crevasse', lane: 1, z: 0 },
      { type: 'fish', lane: 0, z: 2, y: 1.1 },
    ]},

    /* ===== tier 2 ===== */
    { id: 'brede-spleet', tier: 2, weight: 4, length: 11, mirror: false, items: [
      { type: 'crevasseWide', lane: 'all', z: 0 },
      { type: 'fish', lane: 0, z: 0, y: 2.6 },
    ]},
    { id: 'richel-blok', tier: 2, weight: 4, length: 10, items: [
      { type: 'iceShelf', lane: -1, z: 0 },
      { type: 'iceBlock', lane: 0, z: 0 },
      { type: 'fish', lane: 1, z: 1, y: 1.1 },
    ]},
    { id: 'pinguin-tang', tier: 2, weight: 4, length: 18, mirror: false, items: [
      { type: 'penguinSlider', lane: -1, z: 0 },
      { type: 'penguinSlider', lane: 1, z: 9 },
      { type: 'fish', lane: 0, z: 4.5, y: 1.1 },
    ]},
    { id: 'wand-dan-brug', tier: 2, weight: 4, length: 18, items: [
      { type: 'iceWall', lane: 1, z: 0 },
      { type: 'iceBridge', lane: 'all', z: 9 },
      { type: 'fish', lane: -1, z: 3, y: 1.1 },
    ]},
    { id: 'dubbele-stormloop', tier: 2, weight: 3, length: 16, mirror: false, items: [
      { type: 'penguinCharger', lane: -1, z: 0 },
      { type: 'penguinCharger', lane: 1, z: 0 },
      { type: 'fish', lane: 0, z: 7, y: 1.1 },
    ]},
    { id: 'gemengd-blok', tier: 2, weight: 3, length: 16, items: [
      { type: 'iceBlock', lane: -1, z: 0 },
      { type: 'iceWall', lane: 1, z: 0 },
      { type: 'icicles', lane: 0, z: 8 },
      { type: 'fish', lane: 0, z: 3, y: 1.1 },
    ]},
    { id: 'schans-over-spleet', tier: 2, weight: 3, length: 20, items: [
      { type: 'snowRamp', lane: 0, z: 0 },
      { type: 'crevasseWide', lane: 'all', z: 10 },
      { type: 'fish', lane: 0, z: 7, y: 3.0 },
      { type: 'fish', lane: 0, z: 10, y: 3.4 },
    ]},
    { id: 'schild', tier: 2, weight: 1, length: 9, mirror: false, items: [
      { type: 'shield', lane: 0, z: 0, y: 1.3 },
      { type: 'iceBlock', lane: -1, z: 5 },
      { type: 'iceBlock', lane: 1, z: 5 },
    ]},

    /* ===== tier 3 ===== */
    { id: 'poort', tier: 3, weight: 4, length: 20, items: [
      { type: 'iceBlock', lane: -1, z: 0 },
      { type: 'icicles', lane: 0, z: 0 },
      { type: 'iceWall', lane: 1, z: 0 },
      { type: 'crevasse', lane: 0, z: 11 },
      { type: 'fish', lane: 0, z: 11, y: 2.4 },
    ]},
    { id: 'brug-dan-spleet', tier: 3, weight: 4, length: 24, mirror: false, items: [
      { type: 'iceBridge', lane: 'all', z: 0 },
      { type: 'crevasseWide', lane: 'all', z: 17 },
      { type: 'fish', lane: 0, z: 17, y: 2.6 },
    ]},
    { id: 'pinguin-storm', tier: 3, weight: 4, length: 26, mirror: false, items: [
      { type: 'penguinSlider', lane: -1, z: 0 },
      { type: 'penguinSlider', lane: 1, z: 8 },
      { type: 'penguinSlider', lane: -1, z: 16 },
      { type: 'fish', lane: 0, z: 12, y: 1.1 },
    ]},
    { id: 'stormloop-slalom', tier: 3, weight: 4, length: 26, items: [
      { type: 'penguinCharger', lane: -1, z: 0 },
      { type: 'penguinCharger', lane: 0, z: 9 },
      { type: 'penguinCharger', lane: 1, z: 18 },
    ]},
    { id: 'richellijn', tier: 3, weight: 3, length: 26, items: [
      { type: 'iceShelf', lane: -1, z: 0 },
      { type: 'iceShelf', lane: 0, z: 9 },
      { type: 'iceShelf', lane: 1, z: 18 },
      { type: 'fish', lane: 0, z: 4, y: 0.75 },
      { type: 'fish', lane: 1, z: 13, y: 0.75 },
    ]},
    { id: 'schans-onder-brug', tier: 3, weight: 3, length: 24, mirror: false, items: [
      { type: 'snowRamp', lane: 0, z: 0 },
      { type: 'iceBridge', lane: 'all', z: 15 },
      { type: 'fish', lane: 0, z: 8, y: 3.0 },
    ]},

    /* ===== tier 4 — alles tegelijk ===== */
    { id: 'chaos-poort', tier: 4, weight: 4, length: 26, items: [
      { type: 'iceWall', lane: -1, z: 0 },
      { type: 'iceBlock', lane: 0, z: 0 },
      { type: 'crevasse', lane: 1, z: 0 },
      { type: 'icicles', lane: 0, z: 11 },
      { type: 'penguinSlider', lane: 1, z: 18 },
    ]},
    { id: 'chaos-brug', tier: 4, weight: 4, length: 30, mirror: false, items: [
      { type: 'iceBridge', lane: 'all', z: 0 },
      { type: 'penguinSlider', lane: -1, z: 11 },
      { type: 'crevasseWide', lane: 'all', z: 22 },
      { type: 'fish', lane: 0, z: 22, y: 2.7 },
    ]},
    { id: 'chaos-tang', tier: 4, weight: 4, length: 30, mirror: false, items: [
      { type: 'penguinCharger', lane: -1, z: 0 },
      { type: 'penguinCharger', lane: 1, z: 0 },
      { type: 'icicles', lane: 0, z: 11 },
      { type: 'iceBlock', lane: -1, z: 21 },
      { type: 'iceBlock', lane: 1, z: 21 },
      { type: 'fish', lane: 0, z: 21, y: 1.8 },
    ]},
    { id: 'chaos-muren', tier: 4, weight: 3, length: 28, items: [
      { type: 'iceWall', lane: 0, z: 0 },
      { type: 'iceWall', lane: 1, z: 0 },
      { type: 'iceShelf', lane: -1, z: 9 },
      { type: 'iceWall', lane: -1, z: 18 },
      { type: 'iceBlock', lane: 0, z: 18 },
    ]},
  ],
};

export default antarctica;

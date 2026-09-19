/* ===========================================================
   outfits.js — de garderobe.

   Vier categorieën, elk met een gratis startstuk (prijs 0) dat je
   automatisch bezit. De rest koop je met credits; credits verdien je
   door visjes te vangen tijdens een run.

   Een item beschrijft alleen *data*: een stijl (welke vorm) en
   kleuren. De 3D-modellen ervan staan in world/props.js, zodat je
   hier een item kunt toevoegen zonder aan de engine te komen.
   =========================================================== */

import { STORAGE, CREDITS_PER_FISH } from './config.js';

/** Volgorde van boven naar beneden; bepaalt ook de tabbladen in de shop. */
export const SLOTS = [
  { id: 'hat',      label: 'Hoofddeksels' },
  { id: 'glasses',  label: 'Brillen' },
  { id: 'shirt',    label: 'Shirts' },
  { id: 'backpack', label: 'Rugtassen' },
  { id: 'pants',    label: 'Broeken' },
  { id: 'shoes',    label: 'Schoenen' },
];

export const ITEMS = {
  /* ---------- hoofddeksels ---------- */
  hat: [
    { id: 'hood-orange', name: 'Parka-capuchon', price: 0,
      style: 'hood', note: 'Waar je mee begon.',
      colors: { main: 0xff7a3c, trim: 0xf2efe6 } },
    { id: 'beanie-red', name: 'Rode wintermuts', price: 80,
      style: 'beanie', note: 'Met pompon.',
      colors: { main: 0xe0414f, trim: 0xfff2df } },
    { id: 'cap-blue', name: 'Expeditiepet', price: 130,
      style: 'cap', note: 'Klep tegen de laagstaande zon.',
      colors: { main: 0x2f6fb5, trim: 0x16304c } },
    { id: 'ushanka', name: 'Bontmuts', price: 190,
      style: 'ushanka', note: 'Oorflappen omlaag.',
      colors: { main: 0x6b4a33, trim: 0xdac8af } },
    { id: 'helmet-white', name: 'Poolhelm', price: 300,
      style: 'helmet', note: 'Voor de zware botsingen.',
      colors: { main: 0xf2f5f8, trim: 0xff6b3d } },
    { id: 'crown-ice', name: 'IJskroon', price: 750,
      style: 'crown', note: 'Koning van het pakijs.',
      colors: { main: 0x9fe1ff, trim: 0xffd479 } },
  ],

  /* ---------- brillen ---------- */
  glasses: [
    { id: 'goggles-dark', name: 'Stormbril', price: 0,
      style: 'goggles', note: 'Waar je mee begon.',
      colors: { main: 0x0d1b2a, trim: 0x2b3c55 } },
    { id: 'goggles-none', name: 'Geen bril', price: 0,
      style: 'none', note: 'Blote ogen in de poolwind.',
      colors: { main: 0xf3c9a6, trim: 0xd8a985 } },
    { id: 'goggles-amber', name: 'Amberbril', price: 70,
      style: 'goggles', note: 'Meer contrast in de sneeuw.',
      colors: { main: 0xffb347, trim: 0x7a4a12 } },
    { id: 'shades', name: 'Zonnebril', price: 110,
      style: 'shades', note: 'Tegen de laagstaande zon.',
      colors: { main: 0x14181f, trim: 0x8a8f99 } },
    { id: 'round-glasses', name: 'Ronde bril', price: 150,
      style: 'round', note: 'Voor de onderzoeker in je.',
      colors: { main: 0x243447, trim: 0xd9b25a } },
    { id: 'visor-mirror', name: 'Spiegelvizier', price: 320,
      style: 'visor', note: 'Wikkelt om je hele hoofd.',
      colors: { main: 0x63d8ff, trim: 0xe6f7ff } },
    { id: 'anaglyph', name: '3D-bril', price: 420,
      style: 'anaglyph', note: 'Rood en cyaan. Vraag niet waarom.',
      colors: { main: 0xe0302f, trim: 0x2fc8e0 } },
  ],

  /* ---------- rugtassen ---------- */
  backpack: [
    { id: 'daypack-navy', name: 'Dagrugzak', price: 0,
      style: 'daypack', note: 'Waar je mee begon.',
      colors: { main: 0x2b3c55, trim: 0xff8a4c } },
    { id: 'pack-none', name: 'Geen tas', price: 0,
      style: 'none', note: 'Reist een stuk lichter.',
      colors: { main: 0x8fa8c4, trim: 0x5d7490 } },
    { id: 'daypack-green', name: 'Mosgroene rugzak', price: 60,
      style: 'daypack', colors: { main: 0x3f6b46, trim: 0xe0c877 } },
    { id: 'duffel', name: 'Duffeltas', price: 140,
      style: 'duffel', note: 'Dwars over je rug.',
      colors: { main: 0x7b5533, trim: 0xd8c29a } },
    { id: 'bedroll', name: 'Tas met slaapmat', price: 210,
      style: 'bedroll', note: 'Opgerolde mat erbovenop.',
      colors: { main: 0x4a5568, trim: 0xe4685d } },
    { id: 'expedition', name: 'Expeditietas', price: 330,
      style: 'expedition', note: 'Groot, met rolsluiting.',
      colors: { main: 0xc43f2e, trim: 0x2b3c55 } },
    { id: 'jetpack', name: 'Jetpack', price: 900,
      style: 'jetpack', note: 'Doet niets. Staat geweldig.',
      colors: { main: 0xdfe5ec, trim: 0xff6b3d } },
  ],

  /* ---------- shirts (parka's) ---------- */
  shirt: [
    { id: 'parka-orange', name: 'Oranje parka', price: 0,
      style: 'plain', note: 'Goed zichtbaar in de sneeuw.',
      colors: { main: 0xff7a3c, accent: 0x2b3c55 } },
    { id: 'parka-teal', name: 'Gletsjerblauw', price: 70,
      style: 'plain', colors: { main: 0x27a8c4, accent: 0x114256 } },
    { id: 'parka-lime', name: 'Signaalgroen', price: 70,
      style: 'plain', colors: { main: 0xa6d64a, accent: 0x2e441a } },
    { id: 'parka-pink', name: 'Poolroze', price: 120,
      style: 'plain', colors: { main: 0xff5f9e, accent: 0x5a1c37 } },
    { id: 'parka-stripes', name: 'Reddingsstrepen', price: 200,
      style: 'striped', note: 'Met reflecterende banden.',
      colors: { main: 0xe9ebf0, accent: 0xd2372f } },
    { id: 'parka-black', name: 'Nachtzwart', price: 280,
      style: 'plain', colors: { main: 0x1b1f2a, accent: 0xffb02e } },
    { id: 'parka-gold', name: 'Gouden parka', price: 800,
      style: 'striped', note: 'Subtiel is anders.',
      colors: { main: 0xe8b53a, accent: 0x6b4708 } },
  ],

  /* ---------- broeken ---------- */
  pants: [
    { id: 'pants-navy', name: 'Donkerblauwe broek', price: 0,
      style: 'normal', colors: { main: 0x2b3c55 } },
    { id: 'pants-grey', name: 'Grijze thermobroek', price: 60,
      style: 'normal', colors: { main: 0x59636f } },
    { id: 'pants-snow', name: 'Sneeuwwit', price: 100,
      style: 'normal', colors: { main: 0xe4eef9 } },
    { id: 'pants-puffy', name: 'Gewatteerde broek', price: 190,
      style: 'puffy', note: 'Dikker, maar wel warm.',
      colors: { main: 0x3d6ea8 } },
    { id: 'pants-shorts', name: 'Korte broek', price: 340,
      style: 'shorts', note: 'Op Antarctica. Ja echt.',
      colors: { main: 0xd94f3d } },
    { id: 'pants-neon', name: 'Neonbroek', price: 460,
      style: 'puffy', colors: { main: 0x2fe0a0 } },
  ],

  /* ---------- schoenen ---------- */
  shoes: [
    { id: 'boots-brown', name: 'Wandelschoenen', price: 0,
      style: 'boots', colors: { main: 0x5b4a3b, trim: 0x33291f } },
    { id: 'boots-red', name: 'Rode snowboots', price: 50,
      style: 'boots', colors: { main: 0xc0392b, trim: 0x5e1a12 } },
    { id: 'snowshoes', name: 'Sneeuwschoenen', price: 160,
      style: 'snowshoes', note: 'Brede plaat onder je voet.',
      colors: { main: 0x8a6a45, trim: 0xd9c9a8 } },
    { id: 'skates', name: 'Schaatsen', price: 250,
      style: 'skates', note: 'Met echte ijzers.',
      colors: { main: 0x1f2937, trim: 0xd7e3ee } },
    { id: 'boots-gold', name: 'Gouden laarzen', price: 600,
      style: 'boots', colors: { main: 0xe8b53a, trim: 0x8a6716 } },
  ],
};

/** Zoek een item op in een categorie. */
export function findItem(slot, id) {
  const list = ITEMS[slot] || [];
  return list.find((i) => i.id === id) || list[0];
}

/** De gratis startstukken. */
function starterSet() {
  const set = {};
  for (const { id: slot } of SLOTS) {
    set[slot] = (ITEMS[slot].find((i) => i.price === 0) || ITEMS[slot][0]).id;
  }
  return set;
}

/* ===========================================================
   Wardrobe — credits, bezit en wat je aanhebt. Bewaard in
   localStorage, zodat het tussen sessies blijft staan.
   =========================================================== */

export class Wardrobe {
  constructor() {
    this.credits = 0;
    this.owned = new Set();
    this.equipped = starterSet();
    this.load();
  }

  load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORAGE.wardrobe) || 'null'); }
    catch { data = null; }

    if (data && typeof data === 'object') {
      this.credits = Math.max(0, Math.floor(Number(data.credits) || 0));
      if (Array.isArray(data.owned)) this.owned = new Set(data.owned);
      if (data.equipped && typeof data.equipped === 'object') {
        for (const { id: slot } of SLOTS) {
          const wanted = data.equipped[slot];
          // alleen overnemen als het item nog bestaat én in bezit is
          if (wanted && ITEMS[slot].some((i) => i.id === wanted)) {
            this.equipped[slot] = wanted;
          }
        }
      }
    }

    // gratis stukken zijn altijd van jou
    for (const { id: slot } of SLOTS) {
      for (const item of ITEMS[slot]) if (item.price === 0) this.owned.add(item.id);
    }
    // nooit iets aanhebben dat je niet bezit
    for (const { id: slot } of SLOTS) {
      if (!this.owned.has(this.equipped[slot])) this.equipped[slot] = starterSet()[slot];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE.wardrobe, JSON.stringify({
        credits: this.credits,
        owned: [...this.owned],
        equipped: this.equipped,
      }));
    } catch { /* privémodus: dan onthouden we het gewoon niet */ }
  }

  /** Visjes uit een run omzetten in credits. */
  awardFish(fish) {
    const earned = Math.max(0, Math.floor(fish)) * CREDITS_PER_FISH;
    if (earned > 0) { this.credits += earned; this.save(); }
    return earned;
  }

  has(id) { return this.owned.has(id); }
  isEquipped(slot, id) { return this.equipped[slot] === id; }
  canAfford(item) { return this.credits >= item.price; }

  buy(slot, id) {
    const item = findItem(slot, id);
    if (this.owned.has(item.id)) return 'owned';
    if (!this.canAfford(item)) return 'poor';
    this.credits -= item.price;
    this.owned.add(item.id);
    this.equipped[slot] = item.id;      // meteen aantrekken
    this.save();
    return 'bought';
  }

  equip(slot, id) {
    if (!this.owned.has(id)) return false;
    this.equipped[slot] = id;
    this.save();
    return true;
  }

  /** De vier items die je nu aanhebt, als objecten. */
  outfit() {
    const out = {};
    for (const { id: slot } of SLOTS) out[slot] = findItem(slot, this.equipped[slot]);
    return out;
  }

  /** Hoeveel van alles heb je al? Handig voor een voortgangsregel. */
  progress() {
    let total = 0, owned = 0;
    for (const { id: slot } of SLOTS) {
      for (const item of ITEMS[slot]) { total++; if (this.owned.has(item.id)) owned++; }
    }
    return { owned, total };
  }
}

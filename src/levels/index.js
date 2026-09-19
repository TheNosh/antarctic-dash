/* ===========================================================
   Levelregister.
   Nieuw level toevoegen? Kopieer antarctica.js, pas de data aan
   en zet hem hieronder in de lijst. Verder hoeft er niets te
   veranderen aan de engine.
   =========================================================== */

import { antarctica } from './antarctica.js';

export const LEVELS = [
  antarctica,
  // volgende keer bijvoorbeeld:
  // woestijn,   // level 2 — zandstormen, cactussen, scorpioenen
  // jungle,     // level 3 — lianen, moerasgaten, apen
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

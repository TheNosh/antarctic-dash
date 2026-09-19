/* ===========================================================
   Levelregister.
   Nieuw level toevoegen? Kopieer antarctica.js, pas de data aan
   en zet hem hieronder in de lijst. Verder hoeft er niets te
   veranderen aan de engine.
   =========================================================== */

import { antarctica } from './antarctica.js';
import { woestijn } from './woestijn.js';

export const LEVELS = [
  antarctica,
  woestijn,
  // volgende keer bijvoorbeeld:
  // jungle,     // level 3 — lianen, moerasgaten, apen
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

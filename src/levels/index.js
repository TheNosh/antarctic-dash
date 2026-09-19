/* ===========================================================
   Levelregister.
   Nieuw level toevoegen? Kopieer antarctica.js, pas de data aan
   en zet hem hieronder in de lijst. Verder hoeft er niets te
   veranderen aan de engine.
   =========================================================== */

import { antarctica } from './antarctica.js';
import { woestijn } from './woestijn.js';
import { jungle } from './jungle.js';

export const LEVELS = [
  antarctica,
  woestijn,
  jungle,
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

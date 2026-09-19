/* ===========================================================
   main.js — startpunt.
   =========================================================== */

import { Game } from './engine/game.js';
import { getLevel } from './levels/index.js';

// ?level=antarctica  → handig om straks snel tussen levels te wisselen
const wanted = new URLSearchParams(location.search).get('level');
const level = getLevel(wanted);

const canvas = document.getElementById('scene');

try {
  const game = new Game(canvas, level);
  game.init();
  window.game = game;          // handig tijdens het sleutelen
} catch (err) {
  console.error(err);
  document.getElementById('loader').innerHTML =
    `<div class="panel narrow">
       <h2>Oeps</h2>
       <p class="tagline">Het spel kon niet starten. Waarschijnlijk ondersteunt deze
       browser WebGL niet, of staat hardwareversnelling uit.</p>
       <p class="tagline" style="font-size:.75rem;opacity:.7">${String(err.message || err)}</p>
     </div>`;
  document.getElementById('loader').hidden = false;
}

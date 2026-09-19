/* ===========================================================
   config.js — vaste spelconstanten (gelden voor élk level).
   Level-specifieke waarden (snelheid, kleuren, obstakels)
   staan in src/levels/*.js
   =========================================================== */

/** Baanposities. Drie banen; index 0/1/2 → x. */
export const LANE_X = [-2.4, 0, 2.4];
export const TRACK_HALF_WIDTH = 4.6;

/** Zwaartekracht en sprong. apex ≈ 2.9 m, hangtijd ≈ 0.61 s */
export const GRAVITY = 62;
export const JUMP_V = 19.0;
export const DOUBLE_JUMP_V = 15.0;

/** Duiken: vanuit de lucht keihard naar beneden. */
export const DIVE_V = -34;

/** Hoe lang de acties duren (seconden). */
export const SLIDE_TIME = 0.72;
export const DIVE_TIME = 0.42;
export const DIVE_IFRAMES = 0.30;   // tijdens duiken ben je onkwetsbaar voor dieren
export const DIVE_BOOST = 1.32;     // tijdelijke snelheidsboost tijdens de duik
export const HIT_IFRAMES = 1.25;    // onkwetsbaar na een treffer

/** Hitbox van de speler per houding. */
export const HITBOX = {
  run:   { hw: 0.36, hl: 0.34, y0: 0.00, y1: 1.72 },
  slide: { hw: 0.40, hl: 0.52, y0: 0.00, y1: 0.62 },
  dive:  { hw: 0.34, hl: 0.55, y0: 0.00, y1: 0.55 },
};

/** Wereldbeheer. */
export const SPAWN_AHEAD = 170;   // hoe ver vooruit obstakels ontstaan
export const DESPAWN_Z = 16;      // achter de camera opruimen
export const GROUND_SEGMENT = 60;
export const GROUND_SEGMENTS = 6;

/** Scores. */
export const SCORE = {
  perMeter: 1,
  fish: 25,
  penguinKnock: 60,
  shield: 40,
  nearMiss: 15,
};

/** Levens waarmee je begint. */
export const START_LIVES = 3;

/** Snelheidsverlies bij een botsing (fractie). */
export const HIT_SLOWDOWN = 0.62;

/** localStorage-sleutels. */
export const STORAGE = {
  best: 'antarctic-dash:best',
  quality: 'antarctic-dash:quality',
  sound: 'antarctic-dash:sound',
  wardrobe: 'antarctic-dash:wardrobe',
};

/** Hoeveel credits levert één gevangen vis op? */
export const CREDITS_PER_FISH = 1;

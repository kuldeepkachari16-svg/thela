// The pantry. Ingredients pair into dishes on a culinary grammar the player can
// guess: aloo + pav is obviously vada pav. Dishes are the weapons.

export const CATEGORIES = ['fried', 'chaat', 'sweet', 'bread', 'drink'];

export const CATEGORY_COLOR = {
  fried: '#f2a13c',
  chaat: '#7fc45b',
  sweet: '#e05c9e',
  bread: '#c98a4b',
  drink: '#5fb4d8',
};

export const INGREDIENTS = {
  aloo:   { id: 'aloo',   name: 'Aloo',    emoji: '\u{1F954}' },
  pav:    { id: 'pav',    name: 'Pav',     emoji: '\u{1F35E}' },
  maida:  { id: 'maida',  name: 'Maida',   emoji: '\u{1F33E}' },
  imli:   { id: 'imli',   name: 'Imli',    emoji: '\u{1FAD9}' },
  chana:  { id: 'chana',  name: 'Chana',   emoji: '\u{1FAD8}' },
  dahi:   { id: 'dahi',   name: 'Dahi',    emoji: '\u{1F95B}' },
  chai:   { id: 'chai',   name: 'Chai',    emoji: '\u{1F375}' },
  cheeni: { id: 'cheeni', name: 'Cheeni',  emoji: '\u{1F36C}' },
  pyaaz:  { id: 'pyaaz',  name: 'Pyaaz',   emoji: '\u{1F9C5}' },
  masala: { id: 'masala', name: 'Masala',  emoji: '\u{1F336}' },
  puri:   { id: 'puri',   name: 'Puri',    emoji: '\u{1FAD3}' },
};

/**
 * Weapon behaviours:
 *  straight - single fast projectile at nearest craving-match
 *  lob      - arcs to a point, explodes for AoE
 *  burst    - N projectiles fanned out
 *  chain    - hits, then jumps to nearest unhit targets
 *  zone     - drops a persistent damaging patch on the ground
 *  dot      - applies stacking burn
 *  support  - no damage: repairs the cart and pulses heat back
 */
export const DISHES = {
  vadapav: {
    id: 'vadapav', name: 'Vada Pav', emoji: '\u{1F354}', cat: 'fried',
    behaviour: 'straight',
    dmg: 11, cd: 0.42, heat: 6, speed: 470, range: 320,
    per: { dmg: 3, cd: -0.035 },
    blurb: 'Cheap, fast, endless. Mumbai’s burger.',
  },
  samosa: {
    id: 'samosa', name: 'Samosa', emoji: '\u{1F95F}', cat: 'fried',
    behaviour: 'lob',
    dmg: 16, cd: 1.0, heat: 13, speed: 300, range: 300, aoe: 62,
    per: { dmg: 6, aoe: 5 },
    blurb: 'Lobbed. Bursts hot on landing.',
  },
  kachori: {
    id: 'kachori', name: 'Kachori', emoji: '\u{1F959}', cat: 'fried',
    behaviour: 'lob',
    dmg: 24, cd: 1.5, heat: 18, speed: 260, range: 280, aoe: 84,
    per: { dmg: 9, aoe: 7 },
    blurb: 'Heavier than it looks. Wider blast.',
  },
  panipuri: {
    id: 'panipuri', name: 'Pani Puri', emoji: '\u{1F4A6}', cat: 'chaat',
    behaviour: 'burst',
    dmg: 8, cd: 1.05, heat: 14, speed: 380, range: 270, count: 6, spread: 1.1,
    per: { dmg: 2, count: 1 },
    blurb: 'Six at once, straight into the queue.',
  },
  dahipuri: {
    id: 'dahipuri', name: 'Dahi Puri', emoji: '\u{1F944}', cat: 'chaat',
    behaviour: 'chain',
    dmg: 12, cd: 1.25, heat: 15, speed: 420, range: 280, jumps: 2, jumpRange: 120,
    per: { dmg: 4, jumps: 0.5 },
    blurb: 'Splashes from one customer to the next.',
  },
  cholebhature: {
    id: 'cholebhature', name: 'Chole Bhature', emoji: '\u{1FAD3}', cat: 'bread',
    behaviour: 'straight',
    dmg: 34, cd: 1.8, heat: 25, speed: 300, range: 300, pierce: 2, radius: 11,
    per: { dmg: 13, pierce: 0.5 },
    blurb: 'Slow, enormous, punches through a line.',
  },
  pavbhaji: {
    id: 'pavbhaji', name: 'Pav Bhaji', emoji: '\u{1F372}', cat: 'bread',
    behaviour: 'zone',
    dmg: 11, cd: 2.6, heat: 21, range: 240, aoe: 76, duration: 4.5,
    per: { dmg: 4, aoe: 6 },
    blurb: 'Poured on the tawa. Keeps burning where it lands.',
  },
  misalpav: {
    id: 'misalpav', name: 'Misal Pav', emoji: '\u{1F963}', cat: 'fried',
    behaviour: 'dot',
    dmg: 7, cd: 0.9, heat: 11, speed: 400, range: 300, burn: 5, burnTime: 4,
    per: { dmg: 2, burn: 2.5 },
    blurb: 'Kolhapuri tarri. It keeps working after it lands.',
  },
  jalebi: {
    id: 'jalebi', name: 'Jalebi', emoji: '\u{1F365}', cat: 'sweet',
    behaviour: 'straight',
    dmg: 10, cd: 0.8, heat: 10, speed: 340, range: 300, slow: 0.45, slowTime: 2.2,
    per: { dmg: 4, slowTime: 0.3 },
    blurb: 'Sticky. Whoever eats it stops running.',
  },
  cuttingchai: {
    id: 'cuttingchai', name: 'Cutting Chai', emoji: '\u{1F375}', cat: 'drink',
    behaviour: 'support',
    dmg: 0, cd: 7.0, heat: 0, repair: 7, heatBack: 26,
    per: { repair: 3, heatBack: 8 },
    blurb: 'Not for them. For you and the cart.',
  },
};

/** First matching pair wins; both ingredients are consumed. */
export const RECIPES = [
  { a: 'aloo',   b: 'pav',    dish: 'vadapav' },
  { a: 'aloo',   b: 'maida',  dish: 'samosa' },
  { a: 'pyaaz',  b: 'maida',  dish: 'kachori' },
  { a: 'puri',   b: 'imli',   dish: 'panipuri' },
  { a: 'puri',   b: 'dahi',   dish: 'dahipuri' },
  { a: 'chana',  b: 'maida',  dish: 'cholebhature' },
  { a: 'pav',    b: 'masala', dish: 'pavbhaji' },
  { a: 'chana',  b: 'masala', dish: 'misalpav' },
  { a: 'maida',  b: 'cheeni', dish: 'jalebi' },
  { a: 'chai',   b: 'cheeni', dish: 'cuttingchai' },
];

export const MAX_DISH_LEVEL = 5;

/** Resolve a dish's stat at a given level. */
export function dishStat(dish, key, level) {
  const base = dish[key];
  if (base === undefined) return undefined;
  const step = dish.per && dish.per[key];
  if (step === undefined) return base;
  return base + step * (level - 1);
}

/**
 * Which recipes could still complete given a set of held ingredients and the
 * city's pantry? Used to bias level-up offers toward useful ingredients.
 */
export function reachableRecipes(pantry, held) {
  return RECIPES.filter(
    (r) => pantry.includes(r.a) && pantry.includes(r.b) &&
      (held.includes(r.a) || held.includes(r.b)),
  );
}

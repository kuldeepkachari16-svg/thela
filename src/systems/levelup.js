// Level-up offers. Three cards: an ingredient, a dish upgrade, or a perk.
// Ingredient offers are biased toward ones that actually complete a recipe,
// so the culinary grammar stays legible instead of feeling random.

import { INGREDIENTS, DISHES, RECIPES, MAX_DISH_LEVEL, dishStat } from '../data/dishes.js';
import { shuffled, choice } from '../util.js';

const PERKS = [
  { id: 'burner',  emoji: '\u{1F525}', title: 'Bigger Burner',      sub: '+18 max heat',
    apply: (w) => { w.stats.heatMax += 18; w.vendor.heatMax = w.stats.heatMax; w.vendor.heat += 18; } },
  { id: 'blower',  emoji: '\u{1F32C}', title: 'Hand Blower',        sub: '+7 heat regen at the cart',
    apply: (w) => { w.stats.heatRegen += 7; } },
  { id: 'chappal', emoji: '\u{1FA74}', title: 'New Chappals',       sub: '+16 move speed',
    apply: (w) => { w.stats.moveSpeed += 16; } },
  { id: 'tadka',   emoji: '\u{1F336}', title: 'Louder Tadka',       sub: '−1.1s aroma cooldown, +18 radius',
    apply: (w) => { w.stats.aromaCd = Math.max(2.4, w.stats.aromaCd - 1.1); w.aromaRadius += 18; } },
  { id: 'jugaad',  emoji: '\u{1F527}', title: 'Jugaad Repair',      sub: 'Repair the cart by 34',
    apply: (w) => { w.cart.hp = Math.min(w.cart.maxHp, w.cart.hp + 34); } },
  { id: 'thela',   emoji: '\u{1F6D2}', title: 'Reinforced Thela',   sub: '+28 max cart HP (and heal it)',
    apply: (w) => { w.cart.maxHp += 28; w.cart.hp += 28; } },
  { id: 'change',  emoji: '\u{1FA99}', title: 'Loose Change Sense',  sub: '+30 pickup magnet',
    apply: (w) => { w.magnet += 30; } },
  { id: 'regular', emoji: '\u{1F91D}', title: 'Regulars',           sub: '+20% money from every order',
    apply: (w) => { w.payMult += 0.2; } },
  { id: 'apron',   emoji: '\u{1F9F5}', title: 'Thick Apron',        sub: 'Cart takes 12% less damage',
    apply: (w) => { w.cartArmour *= 0.88; } },
];

function ingredientOffer(id) {
  const ing = INGREDIENTS[id];
  const completes = RECIPES.filter((r) => r.a === id || r.b === id);
  return {
    kind: 'ingredient', id,
    emoji: ing.emoji,
    title: ing.name,
    sub: 'Ingredient · pairs into ' + completes.map((r) => DISHES[r.dish].name).join(' / '),
    apply: (w) => w.takeIngredient(id),
  };
}

function dishOffer(slot) {
  const d = DISHES[slot.id];
  const next = slot.level + 1;
  const dmgNow = dishStat(d, 'dmg', slot.level);
  const dmgNext = dishStat(d, 'dmg', next);
  return {
    kind: 'dish', id: slot.id,
    emoji: d.emoji,
    title: `${d.name}  Lv${next}`,
    sub: d.behaviour === 'support'
      ? `Repairs ${dishStat(d, 'repair', next)} and returns ${Math.round(dishStat(d, 'heatBack', next))} heat`
      : `Damage ${dmgNow} → ${dmgNext}`,
    apply: () => { slot.level = next; },
  };
}

function perkOffer(p) {
  return { kind: 'perk', id: p.id, emoji: p.emoji, title: p.title, sub: p.sub, apply: p.apply };
}

export function rollOffers(w, n = 3) {
  const held = w.vendor.ingredients;
  const pantry = w.city.pantry;

  // Ingredients that finish a recipe right now, then anything else in the pantry.
  const completing = pantry.filter((id) =>
    !held.includes(id) &&
    RECIPES.some((r) =>
      (r.a === id && held.includes(r.b)) || (r.b === id && held.includes(r.a))),
  );
  const plain = pantry.filter((id) => !held.includes(id) && !completing.includes(id));

  const upgradable = w.vendor.dishes.filter((s) => s.level < MAX_DISH_LEVEL);

  const pool = [];
  for (const id of shuffled(completing)) pool.push({ w: 46, mk: () => ingredientOffer(id) });
  for (const id of shuffled(plain).slice(0, 4)) pool.push({ w: 20, mk: () => ingredientOffer(id) });
  for (const s of shuffled(upgradable)) pool.push({ w: 30, mk: () => dishOffer(s) });
  for (const p of shuffled(PERKS).slice(0, 5)) pool.push({ w: 14, mk: () => perkOffer(p) });

  const out = [];
  const seen = new Set();
  const bag = pool.slice();
  while (out.length < n && bag.length) {
    let total = 0;
    for (const b of bag) total += b.w;
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      r -= bag[i].w;
      if (r <= 0) { idx = i; break; }
    }
    const pick = bag.splice(idx, 1)[0].mk();
    const key = pick.kind + ':' + pick.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pick);
  }
  // Absolute fallback so the player is never handed an empty screen.
  while (out.length < n) out.push(perkOffer(choice(PERKS)));
  return out;
}

export function xpForLevel(level) {
  return Math.round(9 + level * 7 + level * level * 1.5);
}

// Entity factories + self-contained per-frame behaviour.
// Anything that needs to see the whole world (targeting, damage) lives in game.js.

import { clamp, dist, rand, weighted } from './util.js';
import { CUSTOMERS, ANGRY_SPEED_MULT, ANGRY_CONTACT_DPS } from './data/customers.js';
import { DISHES, dishStat } from './data/dishes.js';

let nextId = 1;

/** Munna. He is the weapon, the wallet and the health bar — there is no cart. */
export function makeHero(def, stats, x, y) {
  return {
    id: nextId++, def, x, y, r: 14,
    facing: 1,
    hp: stats.hp, maxHp: stats.hp,
    heat: stats.heatMax,
    heatMax: stats.heatMax,
    cold: false,
    stoke: 0,          // seconds held still — drives the stoking ring
    stoking: false,
    aromaCd: 0,
    slipT: 0,
    hitFlash: 0,
    invuln: 0,
    dishes: [],
    ingredients: [],
    stepPhase: 0,
    sizzle: 1,
  };
}

export function addDish(hero, dishId) {
  const found = hero.dishes.find((d) => d.id === dishId);
  if (found) return found;
  const d = { id: dishId, level: 1, timer: 0 };
  hero.dishes.push(d);
  return d;
}

export function makeCustomer(typeId, x, y, city, difficulty = 1) {
  const t = CUSTOMERS[typeId];
  const craving = t.cravings ? weighted(city.cravingWeights).v : null;
  const hp = Math.round(t.hp * difficulty * (city.mods.toughMult ?? 1));
  const patience = t.patience ? t.patience * (city.mods.patienceMult ?? 1) : 0;
  return {
    id: nextId++, kind: 'customer', type: typeId, def: t,
    x, y, r: t.r, hp, maxHp: hp,
    craving,
    patience, patienceMax: patience,
    angry: !!t.alwaysAngry,
    speed: t.speed,
    slowT: 0, slowMult: 1,
    burn: 0, burnT: 0,
    seedN: Math.random() * 997,   // stable per-customer look seed; without it the
                                  // drawn figure would re-roll its skin tone every frame
    markT: 0,            // aroma mark: takes more damage, stops caring what it ordered
    pullT: 0,            // aroma pull: sprints at Munna
    queueA: rand(Math.PI * 2),   // its own seat in the ring around him
    vx: 0, vy: 0,
    hitFlash: 0,
    contactCd: 0,
    bob: rand(Math.PI * 2),
  };
}

export function makeBoss(def, x, y) {
  return {
    id: nextId++, kind: 'boss', def,
    x, y, r: def.r, hp: def.hp, maxHp: def.hp,
    craving: null, angry: true,
    timers: def.attacks.map(() => rand(1.5, 0.5)),
    telegraph: null,
    hitFlash: 0, markT: 0, slowT: 0, slowMult: 1, burn: 0, burnT: 0,
    bob: 0, speed: def.speed, contactCd: 0,
  };
}

export function makeProjectile(o) {
  return {
    id: nextId++, life: 2.2, r: 7, pierce: 0, hit: null, kind: 'proj', ...o,
  };
}

export function makeZone(x, y, r, dps, life, cat) {
  return { id: nextId++, x, y, r, dps, life, maxLife: life, cat, tick: 0 };
}

export function makePickup(type, x, y, value) {
  return {
    id: nextId++, type, x, y, value,
    vx: rand(70, -70), vy: rand(-40, -110),
    life: 14, r: 9, born: 0,
  };
}

export function makeFx(type, o) {
  return { id: nextId++, type, t: 0, life: 0.7, ...o };
}

/* ------------------------------------------------------------------ */

export function updateCustomer(c, w, dt) {
  c.bob += dt * 6;
  if (c.hitFlash > 0) c.hitFlash -= dt;
  if (c.contactCd > 0) c.contactCd -= dt;

  if (c.slowT > 0) {
    c.slowT -= dt;
    if (c.slowT <= 0) c.slowMult = 1;
  }
  if (c.markT > 0) c.markT -= dt;
  if (c.pullT > 0) c.pullT -= dt;

  if (c.burnT > 0) {
    c.burnT -= dt;
    w.damage(c, c.burn * dt, null, { silent: true, burn: true });
    if (c.burnT <= 0) c.burn = 0;
  }

  // Patience is the whole hostility system: run out and they come for Munna.
  if (!c.angry && c.patienceMax > 0) {
    c.patience -= dt;
    if (c.patience <= 0) {
      c.angry = true;
      w.fx('turn', { x: c.x, y: c.y - 22, text: 'ANGRY!', color: '#ff3b30' });
    }
  }

  // Everyone orbits Munna now. Aroma sprints them in, anger closes the ring,
  // and a patient customer just holds its place in the queue.
  const h = w.hero;
  let arriveR;
  if (c.pullT > 0) arriveR = 24;
  else if (c.def.thief) arriveR = 18;
  else if (c.angry) arriveR = 16;
  else arriveR = 58 + (c.id % 5) * 10;

  const tx = h.x + Math.cos(c.queueA) * (c.angry || c.pullT > 0 ? 0 : 6);
  const ty = h.y + Math.sin(c.queueA) * (c.angry || c.pullT > 0 ? 0 : 6);

  const d = dist(c.x, c.y, tx, ty);
  const spd = c.speed * c.slowMult * (c.angry ? ANGRY_SPEED_MULT : 1) * (c.pullT > 0 ? 1.5 : 1);
  if (d > arriveR) {
    c.x += ((tx - c.x) / d) * spd * dt;
    c.y += ((ty - c.y) / d) * spd * dt;
  } else if (!c.angry && !c.def.thief) {
    // shuffle in the queue rather than freezing on the spot
    c.queueA += dt * 0.35;
    c.x += Math.cos(c.bob * 0.5 + c.id) * 9 * dt;
    c.y += Math.sin(c.bob * 0.4 + c.id) * 9 * dt;
  }

  // Soft separation so a crowd reads as a crowd, not a stack.
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.vx *= 0.82; c.vy *= 0.82;

  c.x = clamp(c.x, w.lane.x0 + c.r, w.lane.x1 - c.r);
  c.y = clamp(c.y, -60, w.H + 40);

  // Contact effects — on Munna himself.
  const dh = dist(c.x, c.y, h.x, h.y);
  if (dh < c.r + h.r + 6 && c.contactCd <= 0) {
    if (c.def.thief) {
      w.robbed(c);
      c.contactCd = 1.5;
    } else if (c.angry) {
      const dmg = c.def.contact ?? ANGRY_CONTACT_DPS * 0.6;
      w.damageHero(dmg, c.def.name);
      c.contactCd = 0.7;
    }
  }
}

export function separate(list, dt) {
  // O(n^2) is fine at prototype crowd sizes (<160).
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const min = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = ((min - d) / min) * 120;
      const nx = dx / d, ny = dy / d;
      a.vx -= nx * push; a.vy -= ny * push;
      b.vx += nx * push; b.vy += ny * push;
    }
  }
}

export function updateProjectile(p, w, dt) {
  p.life -= dt;
  if (p.behaviour === 'lob') {
    p.t += dt / p.flight;
    const t = Math.min(p.t, 1);
    p.x = p.sx + (p.tx - p.sx) * t;
    p.y = p.sy + (p.ty - p.sy) * t;
    p.arc = Math.sin(t * Math.PI) * p.arcH;
    if (t >= 1) { w.explode(p); p.dead = true; }
    return;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.life <= 0 || p.x < w.lane.x0 - 40 || p.x > w.lane.x1 + 40 || p.y < -60 || p.y > w.H + 60) {
    p.dead = true;
  }
}

export function updatePickup(pu, w, dt) {
  pu.born += dt;
  pu.life -= dt;
  pu.x += pu.vx * dt;
  pu.y += pu.vy * dt;
  pu.vx *= 0.9;
  pu.vy = pu.vy * 0.9 + 60 * dt;
  pu.x = clamp(pu.x, w.lane.x0 + 8, w.lane.x1 - 8);

  const d = dist(pu.x, pu.y, w.hero.x, w.hero.y);
  if (pu.born > 0.25 && d < w.magnet) {
    const k = 1 - d / w.magnet;
    pu.x += ((w.hero.x - pu.x) / (d || 1)) * 420 * k * dt;
    pu.y += ((w.hero.y - pu.y) / (d || 1)) * 420 * k * dt;
  }
  if (d < 18) { w.collect(pu); pu.dead = true; }
  if (pu.life <= 0) pu.dead = true;
}

/** Fire timers for every equipped dish. Returns nothing; queues via world. */
export function updateDishes(h, w, dt) {
  const rateMult = w.stats.fireRateMult * w.fireRatePenalty();
  for (const slot of h.dishes) {
    const def = DISHES[slot.id];
    slot.timer -= dt * rateMult * (h.cold ? 0.5 : 1);
    if (slot.timer > 0) continue;
    const cd = Math.max(0.18, dishStat(def, 'cd', slot.level));
    if (w.fireDish(slot, def)) {
      slot.timer = cd;
    } else {
      slot.timer = 0.12; // nothing to shoot at; re-check soon
    }
  }
}

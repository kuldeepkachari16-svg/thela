// The world. Owns the six theme mechanics:
//   heat (tawa), aroma (tadka), order matching, cart-as-HP,
//   patience→hostility, and the city pantry.

import { clamp, dist, rand } from './util.js';
import { CITIES, BOSSES } from './data/cities.js';
import { CHARACTERS, statsFor } from './data/characters.js';
import { DISHES, RECIPES, INGREDIENTS, dishStat } from './data/dishes.js';
import {
  makeVendor, makeCart, makeBoss, makeProjectile, makeZone,
  makePickup, makeFx, addDish, updateCustomer, updateProjectile, updatePickup,
  updateDishes, separate,
} from './entities.js';
import { Spawner } from './systems/spawner.js';
import { rollOffers, xpForLevel } from './systems/levelup.js';

export const HEAT_ZONE = 112;   // how close to the cart you must be to reheat

export class World {
  constructor(W, H, hooks) {
    this.W = W; this.H = H;
    this.hooks = hooks; // { onLevelUp, onStopClear, onGameOver, onVictory, onBanner }
    this.state = 'idle';
  }

  start(cityId, charId) {
    const city = CITIES[cityId];
    this.city = city;
    this.charId = charId;
    this.char = CHARACTERS[charId];
    this.stats = statsFor(charId);

    const half = city.lane.width / 2;
    this.lane = { x0: this.W / 2 - half, x1: this.W / 2 + half };

    this.cart = makeCart(this.W / 2, this.H * 0.72);
    this.vendor = makeVendor(this.char, this.stats, this.W / 2, this.H * 0.6);
    addDish(this.vendor, this.char.starter);

    this.customers = [];
    this.projectiles = [];
    this.zones = [];
    this.pickups = [];
    this.effects = [];
    this.puddles = [];
    this.boss = null;

    this.aromaRadius = 188;
    this.magnet = 58;
    this.payMult = 1;
    this.cartArmour = 1;
    this.money = 0;
    this.served = 0;
    this.xp = 0;
    this.level = 1;
    this.xpNext = xpForLevel(1);
    this.pendingLevelUps = 0;
    this.runTime = 0;
    this.scroll = 0;
    this.pushSpeed = 46;
    this.shake = 0;
    this._firePenalty = 1;

    this.stopIndex = 0;
    this.spawner = new Spawner(this);
    this.beginStop();

    // Home-city bonus, straight from the concept.
    this.homeBonus = this.char.city === cityId;
    if (this.homeBonus) {
      this.payMult += 0.15;
      this.cart.maxHp += 15;
      this.cart.hp += 15;
    }

    this.state = 'playing';
  }

  /* ---------------------------------------------------------------- stops */

  get stopDef() { return this.city.stops[this.stopIndex]; }

  beginStop() {
    const s = this.stopDef;
    this.spawner.reset();
    if (s.boss) {
      this.stopDuration = 0;
      this.stopTimeLeft = 0;
      const def = BOSSES[s.boss];
      this.boss = makeBoss(def, this.W / 2, this.H * 0.28);
      this.banner(def.name, def.subtitle);
    } else {
      this.stopDuration = s.dur;
      this.stopTimeLeft = s.dur;
      this.boss = null;
      this.banner(`STOP ${this.stopIndex + 1} · ${s.name}`, this.city.ruleShort);
    }
  }

  advanceStop() {
    if (this.stopIndex >= this.city.stops.length - 1) return;
    // The lane clears between stops — the crowd you didn't serve walks off.
    for (const c of this.customers) this.fx('poof', { x: c.x, y: c.y });
    this.customers.length = 0;
    this.projectiles.length = 0;
    this.stopIndex++;
    this.vendor.heat = this.stats.heatMax;
    this.cart.hp = Math.min(this.cart.maxHp, this.cart.hp + 18);
    this.beginStop();
    this.state = 'playing';
  }

  bail() {
    this.money = Math.floor(this.money * 0.5);
    this.state = 'over';
    this.hooks.onGameOver({ reason: 'bailed', money: this.money, served: this.served, stop: this.stopIndex + 1 });
  }

  /* ---------------------------------------------------------------- frame */

  update(dt, input) {
    if (this.state !== 'playing') return;

    this.runTime += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);

    this.updateHazards(dt);
    this.updateVendor(dt, input);
    this.updateCart(dt);
    this.updateHeat(dt);

    this._firePenalty = this.computeFirePenalty();
    updateDishes(this.vendor, this, dt);

    this.spawner.update(dt);
    if (this.boss) this.updateBoss(dt);

    for (const c of this.customers) updateCustomer(c, this, dt);
    separate(this.customers, dt);
    this.customers = this.customers.filter((c) => !c.dead);

    for (const p of this.projectiles) updateProjectile(p, this, dt);
    this.resolveProjectileHits();
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    this.updateZones(dt);

    for (const pu of this.pickups) updatePickup(pu, this, dt);
    this.pickups = this.pickups.filter((pu) => !pu.dead);

    for (const f of this.effects) { f.t += dt; }
    this.effects = this.effects.filter((f) => f.t < f.life);

    // A boss can die mid-frame and set state to 'won'; don't let the stop
    // timer below stomp that (or any other terminal state).
    if (this.state !== 'playing') return;

    if (!this.boss) {
      this.stopTimeLeft -= dt;
      if (this.stopTimeLeft <= 0) {
        this.state = 'stopclear';
        this.hooks.onStopClear({
          stop: this.stopIndex + 1,
          name: this.stopDef.name,
          next: this.city.stops[this.stopIndex + 1],
          money: this.money,
        });
      }
    }
  }

  /* --------------------------------------------------------------- vendor */

  updateVendor(dt, input) {
    const v = this.vendor;
    if (v.slipT > 0) v.slipT -= dt;
    const d = input.dir();
    const mult = v.slipT > 0 ? 0.45 : 1;
    const sp = this.stats.moveSpeed * mult;
    v.x += d.x * sp * dt;
    v.y += d.y * sp * dt;
    if (d.x) v.facing = d.x > 0 ? 1 : -1;
    if (d.x || d.y) v.stepPhase += dt * 11;

    v.x = clamp(v.x, this.lane.x0 + v.r, this.lane.x1 - v.r);
    v.y = clamp(v.y, this.H * 0.16, this.H - 54);

    if (v.aromaCd > 0) v.aromaCd -= dt;
    if (input.takeAroma()) this.tadka();
  }

  /** Aroma: pull the crowd in and mark them. Aggro as a weapon. */
  tadka() {
    const v = this.vendor;
    if (v.aromaCd > 0) return false;
    v.aromaCd = this.stats.aromaCd;
    this.fx('aroma', { x: v.x, y: v.y, r: this.aromaRadius, life: 0.75 });
    this.shake = Math.max(this.shake, 0.35);
    let pulled = 0;
    const targets = this.boss ? [...this.customers, this.boss] : this.customers;
    for (const c of targets) {
      if (dist(c.x, c.y, v.x, v.y) > this.aromaRadius) continue;
      c.markT = 4;
      if (c.kind !== 'boss') { c.pullT = 1.35; pulled++; }
    }
    if (pulled) this.fx('text', { x: v.x, y: v.y - 30, text: `${pulled} PULLED`, color: '#ffcf5c', life: 0.9 });
    return true;
  }

  /* ----------------------------------------------------------------- cart */

  updateCart(dt) {
    const c = this.cart;
    let follow = this.city.cartFollow;
    if (this.inPuddle(c.x, c.y)) follow *= 0.42;
    c.x += (this.vendor.x - c.x) * follow * dt;
    c.x = clamp(c.x, this.lane.x0 + c.w / 2, this.lane.x1 - c.w / 2);
    // The cart trails you up and down the lane too — that's what makes it an
    // anchor you drag rather than a turret you park at.
    const wantY = clamp(this.vendor.y + 48, this.H * 0.48, this.H * 0.82);
    c.y += (wantY - c.y) * follow * 0.8 * dt;
    c.tilt = clamp((this.vendor.x - c.x) * 0.004, -0.14, 0.14);
    if (c.hitFlash > 0) c.hitFlash -= dt;

    let push = this.pushSpeed;
    if (this.inPuddle(c.x, c.y)) push *= 0.5;
    this.scroll += push * dt;

    // Sizzle level is the audio/visual read on heat.
    c.sizzle = this.vendor.heat / this.stats.heatMax;
  }

  damageCart(amount, src) {
    if (this.state !== 'playing') return;
    const dmg = amount * this.cartArmour;
    this.cart.hp -= dmg;
    this.cart.hitFlash = 0.18;
    this.shake = Math.max(this.shake, 0.4);
    if (this.cart.hp <= 0) {
      this.cart.hp = 0;
      this.state = 'over';
      this.hooks.onGameOver({
        reason: 'tipped', money: this.money, served: this.served, stop: this.stopIndex + 1,
      });
    }
  }

  stealFromCart(dog) {
    this.vendor.heat = Math.max(0, this.vendor.heat - 15);
    this.cart.hp = Math.max(1, this.cart.hp - 3);
    this.cart.hitFlash = 0.12;
    this.fx('text', { x: this.cart.x, y: this.cart.y - 34, text: 'CHORI!', color: '#ff8a4a', life: 0.8 });
  }

  /* ----------------------------------------------------------------- heat */

  updateHeat(dt) {
    const v = this.vendor;
    const near = dist(v.x, v.y, this.cart.x, this.cart.y) < HEAT_ZONE;
    if (near) v.heat += this.stats.heatRegen * dt;
    v.heat -= (this.city.heatDrain ?? 0) * dt;    // the Mumbai rain
    v.heat = clamp(v.heat, 0, this.stats.heatMax);
    const wasCold = v.cold;
    v.cold = v.heat <= 0.6;
    if (v.cold && !wasCold) {
      this.fx('text', { x: v.x, y: v.y - 30, text: 'COLD TAWA', color: '#7fb8ff', life: 1.1 });
    }
  }

  nearCart() {
    return dist(this.vendor.x, this.vendor.y, this.cart.x, this.cart.y) < HEAT_ZONE;
  }

  /* -------------------------------------------------------------- firing */

  computeFirePenalty() {
    // Unserved foodies filming you slow your hands down.
    let p = 1;
    for (const c of this.customers) {
      const a = c.def.aura;
      if (!a) continue;
      if (dist(c.x, c.y, this.vendor.x, this.vendor.y) < a.radius) {
        p = Math.min(p, 1 - a.fireRatePenalty);
      }
    }
    return p;
  }
  fireRatePenalty() { return this._firePenalty; }

  targets() {
    return this.boss ? this.customers.concat(this.boss) : this.customers;
  }

  /** Closest target in range, preferring one whose craving matches this dish. */
  pickTarget(range, cat) {
    let best = null, bestD = Infinity;
    let match = null, matchD = Infinity;
    const vx = this.vendor.x, vy = this.vendor.y;
    for (const c of this.targets()) {
      if (c.hp <= 0) continue;
      const d = dist(c.x, c.y, vx, vy);
      if (d > range) continue;
      if (d < bestD) { bestD = d; best = c; }
      if (cat && c.craving === cat && d < matchD) { matchD = d; match = c; }
    }
    return match || best;
  }

  fireDish(slot, def) {
    const v = this.vendor;
    const lvl = slot.level;

    if (def.behaviour === 'support') {
      const repair = dishStat(def, 'repair', lvl);
      const back = dishStat(def, 'heatBack', lvl);
      this.cart.hp = Math.min(this.cart.maxHp, this.cart.hp + repair);
      v.heat = clamp(v.heat + back, 0, this.stats.heatMax);
      this.fx('text', { x: v.x, y: v.y - 28, text: 'CUTTING CHAI', color: '#9ee6ff', life: 0.8 });
      this.fx('ring', { x: v.x, y: v.y, r: 60, color: '#9ee6ff', life: 0.5 });
      return true;
    }

    const range = def.range;
    const target = this.pickTarget(range, def.cat);
    if (!target) return false;

    const cost = (def.heat ?? 0) * this.stats.heatCostMult;
    v.heat = Math.max(0, v.heat - cost);

    const coldK = v.cold ? 0.5 : 1;
    const dmg = dishStat(def, 'dmg', lvl) * this.stats.dmgMult * coldK;
    const aoe = (dishStat(def, 'aoe', lvl) ?? 0) * this.stats.aoeMult;

    const ang = Math.atan2(target.y - v.y, target.x - v.x);

    switch (def.behaviour) {
      case 'straight':
      case 'dot': {
        const p = makeProjectile({
          behaviour: def.behaviour, x: v.x, y: v.y,
          vx: Math.cos(ang) * def.speed, vy: Math.sin(ang) * def.speed,
          dmg, cat: def.cat, emoji: def.emoji, r: def.radius ?? 8,
          pierce: Math.floor(dishStat(def, 'pierce', lvl) ?? 0),
          hit: new Set(),
          slow: def.slow, slowTime: dishStat(def, 'slowTime', lvl),
          burn: def.burn ? dishStat(def, 'burn', lvl) * coldK : 0,
          burnTime: def.burnTime,
          life: range / def.speed + 0.15,
        });
        this.projectiles.push(p);
        break;
      }
      case 'lob': {
        const d = dist(v.x, v.y, target.x, target.y);
        this.projectiles.push(makeProjectile({
          behaviour: 'lob', x: v.x, y: v.y, sx: v.x, sy: v.y,
          tx: target.x, ty: target.y, t: 0,
          flight: Math.max(0.28, d / def.speed), arc: 0, arcH: 40 + d * 0.16,
          dmg, cat: def.cat, emoji: def.emoji, aoe, r: 9, life: 4,
        }));
        break;
      }
      case 'burst': {
        const n = Math.round(dishStat(def, 'count', lvl));
        const spread = def.spread;
        for (let i = 0; i < n; i++) {
          const a = ang - spread / 2 + (spread * i) / Math.max(1, n - 1);
          this.projectiles.push(makeProjectile({
            behaviour: 'straight', x: v.x, y: v.y,
            vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
            dmg, cat: def.cat, emoji: def.emoji, r: 6, hit: new Set(),
            life: range / def.speed + 0.1,
          }));
        }
        break;
      }
      case 'chain': {
        this.projectiles.push(makeProjectile({
          behaviour: 'chain', x: v.x, y: v.y,
          vx: Math.cos(ang) * def.speed, vy: Math.sin(ang) * def.speed,
          dmg, cat: def.cat, emoji: def.emoji, r: 8, hit: new Set(),
          jumps: Math.floor(dishStat(def, 'jumps', lvl)), jumpRange: def.jumpRange,
          life: range / def.speed + 0.2,
        }));
        break;
      }
      case 'zone': {
        this.zones.push(makeZone(target.x, target.y, aoe, dmg, def.duration, def.cat));
        this.fx('ring', { x: target.x, y: target.y, r: aoe, color: '#ffb74d', life: 0.4 });
        break;
      }
    }
    return true;
  }

  resolveProjectileHits() {
    for (const p of this.projectiles) {
      if (p.dead || p.behaviour === 'lob') continue;
      for (const c of this.targets()) {
        if (c.hp <= 0) continue;
        if (p.hit && p.hit.has(c.id)) continue;
        if (dist(p.x, p.y, c.x, c.y) > c.r + p.r) continue;

        this.damage(c, p.dmg, p.cat);
        if (p.hit) p.hit.add(c.id);

        if (p.slow) { c.slowMult = p.slow; c.slowT = p.slowTime; }
        if (p.burn) { c.burn = Math.max(c.burn, p.burn); c.burnT = p.burnTime; }

        if (p.behaviour === 'chain' && p.jumps > 0) {
          const next = this.nearestExcluding(c.x, c.y, p.jumpRange, p.hit);
          if (next) {
            const a = Math.atan2(next.y - p.y, next.x - p.x);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
            p.jumps--; p.life = 1.0;
            this.fx('line', { x: p.x, y: p.y, x2: next.x, y2: next.y, color: '#c9f5a0', life: 0.18 });
            continue;
          }
          p.dead = true;
        } else if (p.pierce > 0) {
          p.pierce--;
        } else {
          p.dead = true;
        }
        break;
      }
    }
  }

  nearestExcluding(x, y, range, exclude) {
    let best = null, bd = range;
    for (const c of this.targets()) {
      if (c.hp <= 0 || exclude.has(c.id)) continue;
      const d = dist(c.x, c.y, x, y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  explode(p) {
    this.fx('boom', { x: p.x, y: p.y, r: p.aoe, life: 0.34 });
    for (const c of this.targets()) {
      if (c.hp <= 0) continue;
      if (dist(c.x, c.y, p.x, p.y) > c.r + p.aoe) continue;
      this.damage(c, p.dmg, p.cat);
    }
  }

  updateZones(dt) {
    for (const z of this.zones) {
      z.life -= dt;
      z.tick += dt;
      if (z.tick >= 0.25) {
        z.tick -= 0.25;
        for (const c of this.targets()) {
          if (c.hp <= 0) continue;
          if (dist(c.x, c.y, z.x, z.y) > c.r + z.r) continue;
          this.damage(c, z.dps * 0.25, z.cat, { silent: true });
        }
      }
      z.y += this.pushSpeed * 0.35 * dt;
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  /* --------------------------------------------------------------- damage */

  /** Order matching lives here: the right dish is worth double the wrong one. */
  damage(target, amount, cat, opts = {}) {
    if (target.hp <= 0) return;
    let mult = 1;
    let matched = true;

    if (cat && target.craving) {
      matched = target.craving === cat;
      if (target.markT > 0) {
        // Aroma-marked: hungry enough that they stop caring what they ordered.
        matched = true;
      } else if (target.def && target.def.strictOrder) {
        mult *= matched ? 1.25 : 0.15;
      } else {
        mult *= matched ? 1 : 0.5;
      }
    }
    if (target.markT > 0) mult *= 1.35;

    const final = amount * mult;
    target.hp -= final;
    target.hitFlash = 0.12;

    if (!opts.silent && cat && target.craving && !matched) {
      if (Math.random() < 0.25) {
        this.fx('text', { x: target.x, y: target.y - 20, text: 'wrong order', color: '#9aa5b1', life: 0.6, small: true });
      }
    }

    if (target.hp <= 0) this.satisfy(target, matched);
  }

  satisfy(c, matched) {
    if (c.kind === 'boss') {
      this.boss = null;
      this.shake = 1;
      this.fx('boom', { x: c.x, y: c.y, r: 140, life: 0.7 });
      this.state = 'won';
      this.hooks.onVictory({
        money: this.money, served: this.served, city: this.city, time: this.runTime,
      });
      return;
    }

    c.dead = true;
    this.served++;

    if (c.def.thief) {
      this.fx('text', { x: c.x, y: c.y, text: 'SHOOED', color: '#c0c8d0', life: 0.7 });
      this.pickups.push(makePickup('xp', c.x, c.y, c.def.xp));
      return;
    }

    // Served fresh — before their patience burned down — pays a premium.
    const fresh = c.patienceMax > 0 && c.patience > c.patienceMax * 0.5;
    const payMult = (fresh ? 1.45 : 1) * (matched ? 1.25 : 0.85);
    const pay = Math.max(1, Math.round(c.def.pay * payMult * this.payMult * (this.city.payMult ?? 1)));

    this.fx('pop', { x: c.x, y: c.y, emoji: '\u{1F60C}', life: 0.55 });
    if (fresh) this.fx('text', { x: c.x, y: c.y - 24, text: 'GARAM GARAM!', color: '#ffd166', life: 0.8, small: true });

    this.pickups.push(makePickup('coin', c.x, c.y, pay));
    this.pickups.push(makePickup('xp', c.x + rand(10, -10), c.y, c.def.xp));
  }

  collect(pu) {
    if (pu.type === 'coin') {
      this.money += pu.value;
      this.fx('text', { x: pu.x, y: pu.y - 8, text: `+${pu.value}`, color: '#ffd166', life: 0.55, small: true });
    } else {
      this.xp += pu.value;
      while (this.xp >= this.xpNext) {
        this.xp -= this.xpNext;
        this.level++;
        this.xpNext = xpForLevel(this.level);
        this.pendingLevelUps++;
      }
      if (this.pendingLevelUps > 0 && this.state === 'playing') this.openLevelUp();
    }
  }

  openLevelUp() {
    this.state = 'levelup';
    this.hooks.onLevelUp(rollOffers(this), this.level);
  }

  /** Called by the UI when a card is chosen. Chains if several levels stacked. */
  resolveLevelUp(offer) {
    offer.apply(this);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    if (this.pendingLevelUps > 0) this.openLevelUp();
    else this.state = 'playing';
  }

  /* ---------------------------------------------------------- ingredients */

  takeIngredient(id) {
    const v = this.vendor;
    for (const r of RECIPES) {
      const other = r.a === id ? r.b : r.b === id ? r.a : null;
      if (!other) continue;
      const idx = v.ingredients.indexOf(other);
      if (idx === -1) continue;
      v.ingredients.splice(idx, 1);
      const slot = addDish(v, r.dish);
      const d = DISHES[r.dish];
      this.hooks.onBanner(`${INGREDIENTS[r.a].name} + ${INGREDIENTS[r.b].name}`, `${d.emoji}  ${d.name.toUpperCase()}!`);
      this.fx('text', { x: v.x, y: v.y - 34, text: d.name.toUpperCase(), color: '#7CFF9B', life: 1.2 });
      return { paired: true, dish: r.dish };
    }
    v.ingredients.push(id);
    return { paired: false };
  }

  /* ------------------------------------------------------------- hazards */

  updateHazards(dt) {
    if (this.city.hazard !== 'puddles') return;
    for (const p of this.puddles) p.y += this.pushSpeed * dt;
    this.puddles = this.puddles.filter((p) => p.y < this.H + 80);
    if (this.puddles.length < 3 && Math.random() < dt * 1.6) {
      this.puddles.push({
        x: rand(this.lane.x1 - 40, this.lane.x0 + 40),
        y: -70, rx: rand(74, 40), ry: rand(30, 16),
      });
    }
  }

  inPuddle(x, y) {
    for (const p of this.puddles) {
      const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry;
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  }

  /* ----------------------------------------------------------------- boss */

  updateBoss(dt) {
    const b = this.boss;
    b.bob += dt;
    if (b.hitFlash > 0) b.hitFlash -= dt;
    if (b.markT > 0) b.markT -= dt;

    if (b.dash) {
      b.dash.t += dt;
      const k = Math.min(1, b.dash.t / 0.75);
      b.y = b.dash.y0 + (this.H * 0.82 - b.dash.y0) * Math.sin(k * Math.PI);
      if (dist(b.x, b.y, this.cart.x, this.cart.y) < b.r + 40 && !b.dash.hit) {
        b.dash.hit = true;
        this.damageCart(b.dash.dmg, b);
      }
      if (dist(b.x, b.y, this.vendor.x, this.vendor.y) < b.r + 24) this.vendor.slipT = 1.1;
      if (k >= 1) { b.dash = null; b.y = this.H * 0.28; }
    } else {
      b.x = this.W / 2 + Math.sin(b.bob * 0.6) * (this.city.lane.width * 0.3);
      b.y = this.H * 0.28 + Math.sin(b.bob * 1.2) * 10;
    }

    if (b.telegraph) {
      b.telegraph.t -= dt;
      if (b.telegraph.t <= 0) {
        const tg = b.telegraph;
        b.telegraph = null;
        if (tg.type === 'lob') {
          this.fx('boom', { x: tg.x, y: tg.y, r: tg.aoe, life: 0.4 });
          if (dist(this.cart.x, this.cart.y, tg.x, tg.y) < tg.aoe + 26) this.damageCart(tg.dmg, b);
          if (dist(this.vendor.x, this.vendor.y, tg.x, tg.y) < tg.aoe) this.vendor.slipT = 1.2;
        } else if (tg.type === 'dash') {
          b.dash = { t: 0, y0: b.y, dmg: tg.dmg, hit: false };
        }
      }
    }

    b.def.attacks.forEach((atk, i) => {
      b.timers[i] -= dt;
      if (b.timers[i] > 0) return;
      b.timers[i] = atk.cd;
      if (atk.type === 'spawn') {
        this.spawner.spawnFromTable(atk.table, atk.count);
        this.fx('text', { x: b.x, y: b.y + 30, text: 'REINFORCEMENTS', color: '#ff8a4a', life: 0.9, small: true });
      } else if (atk.type === 'lob') {
        b.telegraph = {
          type: 'lob', t: atk.telegraph, x: this.cart.x + rand(30, -30), y: this.cart.y + rand(24, -24),
          aoe: atk.aoe, dmg: atk.dmg,
        };
      } else if (atk.type === 'dash') {
        b.x = clamp(this.cart.x, this.lane.x0 + b.r, this.lane.x1 - b.r);
        b.telegraph = { type: 'dash', t: atk.telegraph, dmg: atk.dmg };
      }
    });
  }

  /* -------------------------------------------------------------- helpers */

  fx(type, o) { this.effects.push(makeFx(type, o)); }
  banner(a, b) { this.hooks.onBanner(a, b); }

  heatPct() { return this.vendor.heat / this.stats.heatMax; }
  aromaPct() { return 1 - clamp(this.vendor.aromaCd / this.stats.aromaCd, 0, 1); }
  cartPct() { return clamp(this.cart.hp / this.cart.maxHp, 0, 1); }
  xpPct() { return clamp(this.xp / this.xpNext, 0, 1); }
}

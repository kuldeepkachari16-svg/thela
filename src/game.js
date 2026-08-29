// The world. Munna is the only body on the street — no cart to defend.
// The six theme mechanics now hang off him:
//   heat (stoke the tawa by holding still), aroma (tadka), order matching,
//   HERO-as-HP, patience→hostility, and the city pantry.

import { clamp, dist, rand } from './util.js';
import { CITIES, BOSSES, pageFor } from './data/cities.js';
import { HERO, heroStats } from './data/hero.js';
import { DISHES, RECIPES, INGREDIENTS, dishStat } from './data/dishes.js';
import {
  makeHero, makeBoss, makeProjectile, makeZone,
  makePickup, makeFx, addDish, updateCustomer, updateProjectile, updatePickup,
  updateDishes, separate,
} from './entities.js';
import { Spawner } from './systems/spawner.js';
import { rollOffers, xpForLevel } from './systems/levelup.js';

export const STOKE_DELAY = 0.18;   // how long you must hold still before the coals catch
export const STREAK_WINDOW = 3.2;  // grace on a cold streak; it tightens as the streak climbs
export const BHEED_MIN = 5;        // crowd size that makes a tadka worth holding for

export class World {
  constructor(W, H, hooks) {
    this.W = W; this.H = H;
    this.hooks = hooks; // { onLevelUp, onStopClear, onGameOver, onVictory, onBanner }
    this.state = 'idle';
  }

  start(cityId) {
    const city = CITIES[cityId];
    this.city = city;
    this.mods = { ...city.mods };
    this.stats = heroStats();

    const half = city.lane.width / 2;
    this.lane = { x0: this.W / 2 - half, x1: this.W / 2 + half };

    this.hero = makeHero(HERO, this.stats, this.W / 2, this.H * 0.66);
    addDish(this.hero, HERO.starter);

    this.customers = [];
    this.projectiles = [];
    this.zones = [];
    this.pickups = [];
    this.effects = [];
    this.patches = [];
    this.sweepers = [];
    this.sweepT = rand(9, 5);
    this.boss = null;

    this.aromaRadius = 190 * (this.mods.aromaMult ?? 1);
    this.magnet = 58;
    this.payMult = 1;
    this.armour = 1;
    this.money = 0;
    this.served = 0;
    this.robbedOf = 0;
    this.xp = 0;
    this.level = 1;
    this.xpNext = xpForLevel(1);
    this.pendingLevelUps = 0;
    this.runTime = 0;
    this.scroll = 0;
    this.walkSpeed = 46;
    this.shake = 0;
    this.streak = 0;          // consecutive GARAM GARAM serves
    this.streakT = 0;         // time left on the current streak
    this.streakBest = 0;
    this.flipped = false;
    this._firePenalty = 1;
    this._wrongHintT = 0;

    this.stopIndex = 0;
    this.spawner = new Spawner(this);
    this.beginStop();

    this.state = 'playing';
  }

  /* ---------------------------------------------------------------- stops */

  get stopDef() { return this.city.stops[this.stopIndex]; }

  beginStop() {
    const s = this.stopDef;
    this.spawner.reset();

    // Ahmedabad flips at midnight: the rule change is a stop, not a skybox.
    const flipAt = this.mods.flipStop;
    if (flipAt != null && !this.flipped && this.stopIndex >= flipAt) {
      const f = this.city.mods.flip;
      this.flipped = true;
      this.mods.spawnRateMult = f.spawnRateMult;
      this.mods.payMult = f.payMult;
      this.mods.dark = f.dark;
      this.banner(f.label, 'Everything doubles. Both ways.');
    }

    if (s.boss) {
      this.stopDuration = 0;
      this.stopTimeLeft = 0;
      const def = BOSSES[s.boss];
      this.boss = makeBoss(def, this.W / 2, this.H * 0.24);
      this.banner(def.name, def.subtitle);
    } else {
      this.stopDuration = s.dur;
      this.stopTimeLeft = s.dur;
      this.boss = null;
      if (!this.flipped || this.stopIndex !== this.mods.flipStop) {
        this.banner(`STOP ${this.stopIndex + 1} · ${s.name}`, this.city.ruleShort);
      }
    }
  }

  advanceStop() {
    if (this.stopIndex >= this.city.stops.length - 1) return;
    // The lane clears between stops — the crowd you didn't serve walks off.
    for (const c of this.customers) this.fx('poof', { x: c.x, y: c.y });
    this.customers.length = 0;
    this.projectiles.length = 0;
    this.sweepers.length = 0;
    this.stopIndex++;
    this.hero.heat = this.stats.heatMax;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 22);
    this.beginStop();
    this.state = 'playing';
  }

  bail() {
    this.money = Math.floor(this.money * 0.5);
    this.state = 'over';
    this.hooks.onGameOver({ reason: 'bailed', money: this.money, served: this.served, stop: this.stopIndex + 1, best: this.streakBest });
  }

  /* ---------------------------------------------------------------- frame */

  update(dt, input) {
    if (this.state !== 'playing') return;

    this.runTime += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    this.updateStreak(dt);
    if (this._wrongHintT > 0) this._wrongHintT -= dt;

    this.updateHazards(dt);
    this.updateHero(dt, input);
    this.updateHeat(dt);

    this._firePenalty = this.computeFirePenalty();
    updateDishes(this.hero, this, dt);

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

  /* ----------------------------------------------------------------- hero */

  updateHero(dt, input) {
    const h = this.hero;
    if (h.slipT > 0) h.slipT -= dt;
    if (h.hitFlash > 0) h.hitFlash -= dt;
    if (h.invuln > 0) h.invuln -= dt;

    const d = input.dir();
    const moving = !!(d.x || d.y);
    let mult = h.slipT > 0 ? 0.45 : 1;
    if (this.inPatch(h.x, h.y, 'slow')) mult *= 0.62;
    const sp = this.stats.moveSpeed * mult;
    h.x += d.x * sp * dt;
    h.y += d.y * sp * dt;
    if (d.x) h.facing = d.x > 0 ? 1 : -1;
    if (moving) h.stepPhase += dt * 11;

    h.x = clamp(h.x, this.lane.x0 + h.r, this.lane.x1 - h.r);
    h.y = clamp(h.y, this.H * 0.16, this.H - 54);

    // Stoking: plant your feet and the coals come back. Move and they die down.
    // That is the whole dive-in / back-off rhythm, with no cart to hide behind.
    h.stoke = moving ? 0 : h.stoke + dt;
    h.stoking = h.stoke >= STOKE_DELAY;

    // Munna walks the street forward whether or not he is moving laterally.
    this.scroll += this.walkSpeed * dt;

    h.sizzle = h.heat / this.stats.heatMax;

    if (h.aromaCd > 0) h.aromaCd -= dt;
    if (input.takeAroma()) this.tadka();
  }

  /** Aroma: pull the crowd in and mark them. Aggro as a weapon. */
  tadka() {
    const h = this.hero;
    if (h.aromaCd > 0) return false;
    h.aromaCd = this.stats.aromaCd;
    // Chennai's sea wind (and Goa's) drags the cone off-centre.
    const wx = this.mods.windX ?? 0;
    const cx = h.x + wx * 0.5;
    this.fx('aroma', { x: cx, y: h.y, r: this.aromaRadius, life: 0.75 });
    this.shake = Math.max(this.shake, 0.35);
    const targets = this.boss ? [...this.customers, this.boss] : this.customers;
    const inRange = targets.filter((c) => dist(c.x, c.y, cx, h.y) <= this.aromaRadius);
    const pulled = inRange.filter((c) => c.kind !== 'boss').length;

    // A bigger crowd smells it for longer — tadka pays for being held until one
    // forms, instead of being dumped the moment it comes off cooldown.
    const markT = Math.min(6.5, 4 + Math.max(0, pulled - 4) * 0.12);
    for (const c of inRange) {
      c.markT = markT;
      if (c.kind !== 'boss') c.pullT = 1.35;
    }

    if (pulled >= BHEED_MIN) {
      // The smell works the coals: a real crowd hands you heat back.
      const back = Math.min(30, pulled * 2.5);
      h.heat = clamp(h.heat + back, 0, this.stats.heatMax);
      this.fx('text', { x: h.x, y: h.y - 30, text: `BHEED! ${pulled} · +${Math.round(back)} heat`, color: '#ff8a00', life: 1.1 });
      this.fx('ring', { x: h.x, y: h.y, r: this.aromaRadius * 0.6, color: '#ff8a00', life: 0.45 });
      this.shake = Math.max(this.shake, 0.5);
    } else if (pulled) {
      this.fx('text', { x: h.x, y: h.y - 30, text: `${pulled} PULLED`, color: '#ff8a00', life: 0.9 });
    }
    return true;
  }

  damageHero(amount, srcName) {
    if (this.state !== 'playing') return;
    const h = this.hero;
    if (h.invuln > 0) return;
    h.hp -= amount * this.armour;
    h.hitFlash = 0.2;
    h.invuln = 0.28;          // a mob of twenty cannot delete you in one frame
    this.shake = Math.max(this.shake, 0.4);
    this.endStreak(true);     // greed has a price: one hit and the streak is gone
    if (h.hp <= 0) {
      h.hp = 0;
      this.state = 'over';
      this.hooks.onGameOver({
        reason: 'mobbed', money: this.money, served: this.served,
        stop: this.stopIndex + 1, by: srcName, best: this.streakBest,
      });
    }
  }

  /** Strays take heat off the tawa; monkeys take the cash. */
  robbed(thief) {
    const h = this.hero;
    if (thief.def.steals === 'coins') {
      const take = Math.min(this.money, 4 + Math.floor(this.money * 0.04));
      this.money -= take;
      this.robbedOf += take;
      this.fx('text', { x: h.x, y: h.y - 34, text: take ? `−₹${take}` : 'MISSED', color: '#ff3b30', life: 0.8 });
    } else {
      h.heat = Math.max(0, h.heat - 16);
      this.fx('text', { x: h.x, y: h.y - 34, text: 'CHORI!', color: '#ff8a00', life: 0.8 });
    }
    h.hitFlash = 0.14;
  }

  /* ----------------------------------------------------------------- heat */

  updateHeat(dt) {
    const h = this.hero;
    const regen = this.stats.heatRegen * (h.stoking ? 1 : this.stats.idleRegen);
    h.heat += regen * dt;
    h.heat -= (this.mods.heatDrain ?? 0) * dt;     // the Mumbai rain, the Chennai wind
    if (this.inPatch(h.x, h.y, 'heal')) {
      h.hp = Math.min(h.maxHp, h.hp + 9 * dt);     // Amritsar langar
      h.heat += 10 * dt;
    }
    h.heat = clamp(h.heat, 0, this.stats.heatMax);
    const wasCold = h.cold;
    h.cold = h.heat <= 0.6;
    if (h.cold && !wasCold) {
      this.fx('text', { x: h.x, y: h.y - 30, text: 'COLD TAWA', color: '#2e86ab', life: 1.1 });
    }
  }

  stoking() { return this.hero.stoking; }

  /* -------------------------------------------------------------- firing */

  computeFirePenalty() {
    // Unserved foodies filming you slow your hands down.
    let p = 1;
    for (const c of this.customers) {
      const a = c.def.aura;
      if (!a) continue;
      if (dist(c.x, c.y, this.hero.x, this.hero.y) < a.radius) {
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
    const vx = this.hero.x, vy = this.hero.y;
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
    const h = this.hero;
    const lvl = slot.level;

    if (def.behaviour === 'support') {
      const heal = dishStat(def, 'repair', lvl);
      const back = dishStat(def, 'heatBack', lvl);
      if (h.hp >= h.maxHp && h.heat >= this.stats.heatMax) return false;
      h.hp = Math.min(h.maxHp, h.hp + heal);
      h.heat = clamp(h.heat + back, 0, this.stats.heatMax);
      this.fx('text', { x: h.x, y: h.y - 28, text: 'CUTTING CHAI', color: '#0f9b8e', life: 0.8 });
      this.fx('ring', { x: h.x, y: h.y, r: 60, color: '#0f9b8e', life: 0.5 });
      return true;
    }

    const range = def.range;
    const target = this.pickTarget(range, def.cat);
    if (!target) return false;

    const cost = (def.heat ?? 0) * this.stats.heatCostMult;
    h.heat = Math.max(0, h.heat - cost);

    const coldK = h.cold ? 0.5 : 1;
    const dmg = dishStat(def, 'dmg', lvl) * this.stats.dmgMult * coldK;
    const aoe = (dishStat(def, 'aoe', lvl) ?? 0) * this.stats.aoeMult;

    const ang = Math.atan2(target.y - h.y, target.x - h.x);

    switch (def.behaviour) {
      case 'straight':
      case 'dot': {
        const p = makeProjectile({
          behaviour: def.behaviour, x: h.x, y: h.y,
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
        const d = dist(h.x, h.y, target.x, target.y);
        this.projectiles.push(makeProjectile({
          behaviour: 'lob', x: h.x, y: h.y, sx: h.x, sy: h.y,
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
            behaviour: 'straight', x: h.x, y: h.y,
            vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
            dmg, cat: def.cat, emoji: def.emoji, r: 6, hit: new Set(),
            life: range / def.speed + 0.1,
          }));
        }
        break;
      }
      case 'chain': {
        this.projectiles.push(makeProjectile({
          behaviour: 'chain', x: h.x, y: h.y,
          vx: Math.cos(ang) * def.speed, vy: Math.sin(ang) * def.speed,
          dmg, cat: def.cat, emoji: def.emoji, r: 8, hit: new Set(),
          jumps: Math.floor(dishStat(def, 'jumps', lvl)), jumpRange: def.jumpRange,
          life: range / def.speed + 0.2,
        }));
        break;
      }
      case 'zone': {
        this.zones.push(makeZone(target.x, target.y, aoe, dmg, def.duration, def.cat));
        this.fx('ring', { x: target.x, y: target.y, r: aoe, color: '#ff8a00', life: 0.4 });
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
            this.fx('line', { x: p.x, y: p.y, x2: next.x, y2: next.y, color: '#3fb6a8', life: 0.18 });
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
      z.y += this.walkSpeed * 0.35 * dt;
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  /* --------------------------------------------------------------- streak */

  // The greed engine. Serving fresh is worth more than serving at all, and
  // serving fresh *in a row* is worth more again — so the play is to bait a
  // cluster, tadka it, and clear the whole thing before anyone sours.
  updateStreak(dt) {
    if (this.streak <= 0) return;
    this.streakT -= dt;
    if (this.streakT <= 0) this.endStreak(false);
  }

  /** 1x at no streak, climbing to 1.6x by 12. Applies to both pay and xp. */
  streakMult() {
    return 1 + Math.min(this.streak, 12) * 0.05;
  }

  /**
   * The window tightens as the streak climbs — 3.2s cold, 1.2s once you're
   * deep. That's what stops a hot streak from being the default state: past a
   * point you have to keep finding fresh customers faster than they sour.
   */
  streakWindow() {
    return Math.max(1.2, STREAK_WINDOW - this.streak * 0.08);
  }

  bumpStreak(c) {
    this.streak++;
    this.streakT = this.streakWindow();
    if (this.streak > this.streakBest) this.streakBest = this.streak;
    // Call out the tiers rather than every single serve.
    if (this.streak % 5 === 0) {
      this.fx('text', {
        x: this.hero.x, y: this.hero.y - 44,
        text: `${this.streak} HOT · ${this.streakMult().toFixed(2)}x`,
        color: '#ff8a00', life: 1,
      });
      this.shake = Math.max(this.shake, 0.25);
    }
  }

  endStreak(dropped) {
    if (this.streak >= 5) {
      this.fx('text', {
        x: this.hero.x, y: this.hero.y - 44,
        text: dropped ? `STREAK DROPPED · ${this.streak}` : `${this.streak} COOLED`,
        color: dropped ? '#ff3b30' : '#6b5e52', life: 0.9, small: true,
      });
    }
    this.streak = 0;
    this.streakT = 0;
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

    // A wrong order is only worth saying out loud when the player can do
    // something about it — firing is automatic, so the fix is always tadka.
    // Scolding them while tadka is on cooldown just reads as noise.
    if (!opts.silent && cat && target.craving && !matched
        && this.hero.aromaCd <= 0 && this._wrongHintT <= 0) {
      this._wrongHintT = 2.6;
      this.fx('text', { x: target.x, y: target.y - 22, text: 'wrong order → TADKA', color: '#ff8a00', life: 1.1, small: true });
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
        money: this.money, served: this.served, city: this.city,
        time: this.runTime, page: pageFor(this.city.id), best: this.streakBest,
      });
      return;
    }

    c.dead = true;
    this.served++;

    if (c.def.thief) {
      this.fx('text', { x: c.x, y: c.y, text: 'SHOOED', color: '#6b5e52', life: 0.7 });
      this.pickups.push(makePickup('xp', c.x, c.y, c.def.xp));
      return;
    }

    // Served fresh — before their patience burned down — pays a premium, and
    // keeps the streak alive. Serving a soured customer pays, but cools you.
    const fresh = c.patienceMax > 0 && c.patience > c.patienceMax * 0.5;
    if (fresh) this.bumpStreak(c);
    const streakMult = this.streakMult();
    const payMult = (fresh ? 1.45 : 1) * (matched ? 1.25 : 0.85) * streakMult;
    const pay = Math.max(1, Math.round(c.def.pay * payMult * this.payMult * (this.mods.payMult ?? 1)));
    const xp = Math.max(1, Math.round(c.def.xp * streakMult));

    this.fx('pop', { x: c.x, y: c.y, emoji: '\u{1F60C}', life: 0.55 });
    if (fresh && this.streak % 5 !== 0) {
      this.fx('text', { x: c.x, y: c.y - 24, text: 'GARAM GARAM!', color: '#ff8a00', life: 0.8, small: true });
    }

    this.pickups.push(makePickup('coin', c.x, c.y, pay));
    this.pickups.push(makePickup('xp', c.x + rand(10, -10), c.y, xp));
  }

  collect(pu) {
    if (pu.type === 'coin') {
      this.money += pu.value;
      this.fx('text', { x: pu.x, y: pu.y - 8, text: `+${pu.value}`, color: '#e6a100', life: 0.55, small: true });
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
    const h = this.hero;
    for (const r of RECIPES) {
      const other = r.a === id ? r.b : r.b === id ? r.a : null;
      if (!other) continue;
      const idx = h.ingredients.indexOf(other);
      if (idx === -1) continue;
      h.ingredients.splice(idx, 1);
      addDish(h, r.dish);
      const d = DISHES[r.dish];
      this.hooks.onBanner(`${INGREDIENTS[r.a].name} + ${INGREDIENTS[r.b].name}`, `${d.emoji}  ${d.name.toUpperCase()}!`);
      this.fx('text', { x: h.x, y: h.y - 34, text: d.name.toUpperCase(), color: '#0f9b8e', life: 1.2 });
      return { paired: true, dish: r.dish };
    }
    h.ingredients.push(id);
    return { paired: false };
  }

  /* ------------------------------------------------------------- hazards */

  updateHazards(dt) {
    const hz = this.city.hazard;
    if (!hz) return;

    if (hz.patch) {
      const cfg = hz.patch;
      for (const p of this.patches) p.y += this.walkSpeed * dt;
      this.patches = this.patches.filter((p) => p.y < this.H + 90);
      if (this.patches.length < cfg.max && Math.random() < dt * 1.5) {
        this.patches.push({
          x: rand(this.lane.x1 - 46, this.lane.x0 + 46),
          y: -80, rx: rand(78, 42), ry: rand(32, 17),
          effect: cfg.effect, skin: cfg.skin,
        });
      }
    }

    if (hz.sweeper) {
      const cfg = hz.sweeper;
      this.sweepT -= dt;
      if (this.sweepT <= 0) {
        this.sweepT = cfg.every;
        const fromLeft = Math.random() < 0.5;
        this.sweepers.push({
          x: fromLeft ? this.lane.x0 - 60 : this.lane.x1 + 60,
          y: rand(this.H * 0.72, this.H * 0.26),
          dir: fromLeft ? 1 : -1,
          warn: cfg.warn, cfg, hit: false,
        });
        this.banner(cfg.label, 'Get out of the line.');
      }
      for (const s of this.sweepers) {
        if (s.warn > 0) { s.warn -= dt; continue; }
        s.x += s.dir * s.cfg.speed * dt;
        if (!s.hit && Math.abs(s.x - this.hero.x) < 44 && Math.abs(s.y - this.hero.y) < 30) {
          s.hit = true;
          this.damageHero(s.cfg.dmg, 'the tram');
          this.hero.slipT = 0.9;
        }
        for (const c of this.customers) {
          if (Math.abs(s.x - c.x) < 42 && Math.abs(s.y - c.y) < 26) this.damage(c, 999, null, { silent: true });
        }
      }
      this.sweepers = this.sweepers.filter(
        (s) => s.x > this.lane.x0 - 140 && s.x < this.lane.x1 + 140,
      );
    }
  }

  inPatch(x, y, effect) {
    for (const p of this.patches) {
      if (p.effect !== effect) continue;
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
      if (dist(b.x, b.y, this.hero.x, this.hero.y) < b.r + 26 && !b.dash.hit) {
        b.dash.hit = true;
        this.damageHero(b.dash.dmg, b.def.name);
        this.hero.slipT = 1.1;
      }
      if (k >= 1) { b.dash = null; b.y = this.H * 0.24; }
    } else {
      b.x = this.W / 2 + Math.sin(b.bob * 0.6) * (this.city.lane.width * 0.3);
      b.y = this.H * 0.24 + Math.sin(b.bob * 1.2) * 10;
    }

    if (b.telegraph) {
      b.telegraph.t -= dt;
      if (b.telegraph.t <= 0) {
        const tg = b.telegraph;
        b.telegraph = null;
        if (tg.type === 'lob') {
          this.fx('boom', { x: tg.x, y: tg.y, r: tg.aoe, life: 0.4 });
          if (dist(this.hero.x, this.hero.y, tg.x, tg.y) < tg.aoe) {
            this.damageHero(tg.dmg, b.def.name);
            this.hero.slipT = 1.2;
          }
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
        this.fx('text', { x: b.x, y: b.y + 30, text: 'REINFORCEMENTS', color: '#ff3b30', life: 0.9, small: true });
      } else if (atk.type === 'lob') {
        b.telegraph = {
          type: 'lob', t: atk.telegraph, x: this.hero.x + rand(34, -34), y: this.hero.y + rand(28, -28),
          aoe: atk.aoe, dmg: atk.dmg,
        };
      } else if (atk.type === 'dash') {
        b.x = clamp(this.hero.x, this.lane.x0 + b.r, this.lane.x1 - b.r);
        b.telegraph = { type: 'dash', t: atk.telegraph, dmg: atk.dmg };
      }
    });
  }

  /* -------------------------------------------------------------- helpers */

  fx(type, o) { this.effects.push(makeFx(type, o)); }
  banner(a, b) { this.hooks.onBanner(a, b); }

  heatPct() { return this.hero.heat / this.stats.heatMax; }
  aromaPct() { return 1 - clamp(this.hero.aromaCd / this.stats.aromaCd, 0, 1); }
  hpPct() { return clamp(this.hero.hp / this.hero.maxHp, 0, 1); }
  xpPct() { return clamp(this.xp / this.xpNext, 0, 1); }
}

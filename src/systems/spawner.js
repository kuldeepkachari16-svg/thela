// Wave director. Spawn pressure ramps within a stop and across the route.

import { weighted, rand, randInt, clamp } from '../util.js';
import { CUSTOMERS } from '../data/customers.js';
import { makeCustomer } from '../entities.js';

// Ordered by how much the beat belongs to a city: the first entry whose type
// the city actually spawns is the one that fires.
const ELITES = [
  { type: 'student',    label: 'THE ADDA HAS SETTLED IN', sub: 'They are not leaving. Ever.' },
  { type: 'pilgrim',    label: 'THE SANGAT IS COMING',     sub: 'Everyone eats. That is the rule.' },
  { type: 'tourist',    label: 'A COACH JUST PARKED',      sub: 'Big money, no patience.' },
  { type: 'officeRush', label: 'LUNCH RUSH INCOMING',      sub: 'Forty minutes, one lane.' },
  { type: 'kid',        label: 'SCHOOL JUST LET OUT',      sub: 'Fast, loud, two rupees each.' },
];

export class Spawner {
  constructor(world) {
    this.w = world;
    this.acc = 0;
    this.eliteFired = false;
  }

  reset() {
    this.acc = 0;
    this.eliteFired = false;
  }

  rate() {
    const w = this.w;
    const stopK = 1 + w.stopIndex * 0.22;
    const timeK = 1 + (1 - w.stopTimeLeft / Math.max(1, w.stopDuration)) * 0.7;
    return 0.46 * (w.mods.spawnRateMult ?? 1) * stopK * timeK;
  }

  difficulty() {
    return 1 + this.w.stopIndex * 0.22 + this.w.runTime * 0.003;
  }

  update(dt) {
    const w = this.w;
    if (w.boss) {
      // The boss owns the spawn budget during its fight.
      return;
    }
    if (w.customers.length > 120) return;

    this.acc += dt * this.rate();
    while (this.acc >= 1) {
      this.acc -= 1;
      this.spawnOne();
    }

    // One elite beat halfway through every non-boss stop.
    const half = w.stopDuration * 0.5;
    if (!this.eliteFired && w.stopTimeLeft < half) {
      this.eliteFired = true;
      this.spawnElite();
    }
  }

  spawnPoint() {
    const w = this.w;
    const side = Math.random();
    if (side < 0.72) {
      return { x: rand(w.lane.x1 - 24, w.lane.x0 + 24), y: rand(-30, -80) };
    }
    const left = Math.random() < 0.5;
    return {
      x: left ? w.lane.x0 + 14 : w.lane.x1 - 14,
      y: rand(w.H * 0.15, w.H * 0.62),
    };
  }

  spawnOne(forceType = null) {
    const w = this.w;
    const typeId = forceType ?? weighted(w.city.spawnTable).v;
    const def = CUSTOMERS[typeId];
    const p = this.spawnPoint();
    const n = def.swarm ? randInt(Math.ceil(def.swarm * 0.6), def.swarm) : 1;
    for (let i = 0; i < n; i++) {
      const c = makeCustomer(
        typeId,
        clamp(p.x + rand(26, -26), w.lane.x0 + def.r, w.lane.x1 - def.r),
        p.y + rand(24, -24),
        w.city,
        this.difficulty(),
      );
      w.customers.push(c);
    }
  }

  /** One elite beat per stop, phrased in the city's own voice. */
  spawnElite() {
    const w = this.w;
    const table = w.city.spawnTable.map((s) => s.v);
    const pick = ELITES.find((e) => table.includes(e.type)) ?? ELITES[ELITES.length - 1];
    const type = table.includes(pick.type) ? pick.type : table[0];
    w.banner(pick.label, pick.sub);
    for (let i = 0; i < 3; i++) this.spawnOne(type);
  }

  /** Used by boss 'spawn' attacks. */
  spawnFromTable(table, count) {
    for (let i = 0; i < count; i++) this.spawnOne(weighted(table).v);
  }
}

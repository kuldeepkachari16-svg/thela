// Death-cause diagnostics. Answers "what actually put Munna down" by
// attributing damage per customer type, and tracks whether the heat
// loop (stoke → fire → stoke) ever actually stalls.
// `npm run diag [city]`

import { World } from '../src/game.js';
import { CITIES } from '../src/data/cities.js';

function diag(cityId) {
  const w = new World(480, 854, {
    onBanner: () => {}, onLevelUp: (o) => w.resolveLevelUp(o[0]),
    onStopClear: () => w.advanceStop(), onGameOver: () => {}, onVictory: () => {},
  });
  w.start(cityId);

  // instrument hero damage by source type
  const src = {};
  const realDamage = w.damageHero.bind(w);
  w.damageHero = (amount, name) => {
    const k = name || 'unknown';
    src[k] = (src[k] || 0) + amount;
    realDamage(amount, name);
  };

  const bot = {
    dir() {
      const v = w.hero;
      if (w.heatPct() < 0.45) return { x: 0, y: 0 };
      let ax = 0, ay = 0, n = 0;
      for (const c of w.customers) {
        if (!c.angry) continue;
        const d = Math.hypot(c.x - v.x, c.y - v.y);
        if (d < 66) { ax += v.x - c.x; ay += v.y - c.y; n++; }
      }
      if (n) { const l = Math.hypot(ax, ay) || 1; return { x: ax / l, y: ay / l }; }
      return { x: 0, y: 0 };
    },
    takeAroma() { return w.hero.aromaCd <= 0; },
    takePause() { return false; },
  };

  const dt = 1 / 60;
  let t = 0, n = 0, coldTime = 0, heatSum = 0, minHeat = 1, aromaUses = 0, stokeTime = 0;
  let lastAroma = w.hero.aromaCd;
  while (t < 900 && (w.state === 'playing' || w.state === 'stopclear' || w.state === 'levelup')) {
    if (w.state === 'stopclear') { w.advanceStop(); continue; }
    if (w.state === 'levelup') break;
    w.update(dt, bot);
    t += dt; n++;
    const hp = w.heatPct();
    heatSum += hp;
    if (hp < minHeat) minHeat = hp;
    if (w.hero.cold) coldTime += dt;
    if (w.hero.stoking) stokeTime += dt;
    if (w.hero.aromaCd > lastAroma) aromaUses++;
    lastAroma = w.hero.aromaCd;
  }
  const angry = w.customers.filter((c) => c.angry).length;
  console.log(`${cityId.padEnd(10)} ended ${w.state} t=${t.toFixed(0)}s stop=${w.stopIndex + 1} hp=${Math.round(w.hero.hp)} crowd=${w.customers.length} angry=${angry} cold=${(coldTime / t * 100).toFixed(0)}% stoking=${(stokeTime / t * 100).toFixed(0)}% heat[min=${(minHeat * 100).toFixed(0)}% avg=${(heatSum / n * 100).toFixed(0)}%] aroma=${aromaUses}`);
  const total = Object.values(src).reduce((a, b) => a + b, 0);
  console.log('   damage taken:', total ? Object.entries(src).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${Math.round(v)}`).join(' ') : 'none');
}

const args = process.argv.slice(2);
for (const id of args.length ? args : Object.keys(CITIES)) diag(id);

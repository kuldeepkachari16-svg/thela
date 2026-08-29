// Headless balance harness. `npm run sim` — no DOM, plays whole routes.
import { World } from '../src/game.js';
import { DISHES } from '../src/data/dishes.js';
import { CITIES } from '../src/data/cities.js';

// A "competent player" proxy: keeps the tawa hot, banks coins that are close,
// spends tadka on real clusters, and dodges boss telegraphs.
function makeBot(w) {
  let aromaT = 0;
  return {
    tick(dt) { aromaT -= dt; },
    dir() {
      const v = w.hero;
      const b = w.boss;
      const tg = b && b.telegraph;

      // 1. A telegraphed boss attack outranks everything else on the street.
      if (tg) {
        if (tg.type === 'lob' && Math.hypot(v.x - tg.x, v.y - tg.y) < tg.aoe + 40) {
          return { x: v.x < 240 ? 1 : -1, y: 0 };
        }
        if (tg.type === 'dash' && Math.abs(v.x - b.x) < b.r + 24) {
          return { x: v.x < 240 ? 1 : -1, y: 0 };
        }
      }

      // 2. Otherwise peel away from a knot of angry customers.
      let ax = 0, ay = 0, n = 0;
      for (const c of w.customers) {
        if (!c.angry) continue;
        const d = Math.hypot(c.x - v.x, c.y - v.y);
        if (d < 66) { ax += v.x - c.x; ay += v.y - c.y; n++; }
      }
      if (n) { const l = Math.hypot(ax, ay) || 1; return { x: ax / l, y: ay / l }; }

      // 3. Tawa low? Plant your feet and stoke — that is the whole heat loop.
      if (w.heatPct() <= 0.42) return { x: 0, y: 0 };

      // 4. Hold a firing line on the boss, else go bank the nearest coin.
      let tx = null, ty = null;
      if (b) { tx = b.x; ty = b.y + 180; }
      let bd = 230;
      for (const p of w.pickups) {
        const d = Math.hypot(p.x - v.x, p.y - v.y);
        if (d < bd) { bd = d; tx = p.x; ty = p.y; }
      }
      if (tx === null) return { x: 0, y: 0 };
      const dx = tx - v.x, dy = ty - v.y, l = Math.hypot(dx, dy) || 1;
      return l < 4 ? { x: 0, y: 0 } : { x: dx / l, y: dy / l };
    },
    takeAroma() {
      if (aromaT > 0 || w.hero.aromaCd > 0) return false;
      let n = 0;
      for (const c of w.customers) {
        if (Math.hypot(c.x - w.hero.x, c.y - w.hero.y) < w.aromaRadius) n++;
      }
      if (n >= 6 || (w.boss && Math.hypot(w.boss.x - w.hero.x, w.boss.y - w.hero.y) < w.aromaRadius)) {
        aromaT = 0.4; return true;
      }
      return false;
    },
    takePause() { return false; },
  };
}

// Score offers roughly the way a player would: finish recipes, then level dishes.
function pickOffer(offers, w) {
  const score = (o) => {
    if (o.kind === 'ingredient') return 3;
    if (o.kind === 'dish') return 4;
    if (o.id === 'tonic' && w.hpPct() < 0.6) return 6;
    return 2;
  };
  return offers.slice().sort((a, b) => score(b) - score(a))[0];
}

function run(cityId, seconds = 600) {
  let offers = null;
  const hooks = {
    onBanner: () => {},
    onLevelUp: (o) => { offers = o; },
    onStopClear: () => {},
    onGameOver: (i) => { w.__over = i; },
    onVictory: (i) => { w.__won = i; },
  };
  const w = new World(480, 854, hooks);
  w.start(cityId);
  const bot = makeBot(w);
  const dt = 1 / 60;
  let t = 0, maxCrowd = 0;
  while (t < seconds) {
    if (w.state === 'playing') {
      bot.tick(dt); w.update(dt, bot);
      maxCrowd = Math.max(maxCrowd, w.customers.length); t += dt;
    } else if (w.state === 'levelup' && offers) {
      const p = pickOffer(offers, w); offers = null; w.resolveLevelUp(p);
    } else if (w.state === 'stopclear') { w.advanceStop(); }
    else break;
  }
  return {
    city: cityId, t: +t.toFixed(0), stop: w.stopIndex + 1,
    level: w.level, money: w.money, served: w.served, maxCrowd, best: w.streakBest,
    result: w.__won ? 'VICTORY' : w.__over ? w.__over.reason : 'timeout',
    dishes: w.hero.dishes.map(d => DISHES[d.id].name + ':' + d.level).join(' '),
  };
}

const combos = Object.keys(CITIES);
const tally = {};
for (const key of combos) {
  tally[key] = { win: 0, n: 0, stops: [] };
  const RUNS = Number(process.env.RUNS || 8);
  for (let i = 0; i < RUNS; i++) {
    const r = run(key);
    tally[key].n++; tally[key].stops.push(r.stop);
    if (r.result === 'VICTORY') tally[key].win++;
    if (i === 0) console.log(`${key.padEnd(10)} sample: ${r.result.padEnd(8)} t=${String(r.t).padStart(3)}s stop=${r.stop} lv=${r.level} ₹${r.money} served=${r.served} streak=${r.best} crowd=${r.maxCrowd} | ${r.dishes}`);
  }
}
console.log(`\nclear rate over ${process.env.RUNS || 8} runs each:`);
for (const [k, v] of Object.entries(tally)) {
  console.log(`  ${k.padEnd(10)} ${v.win}/${v.n} cleared · avg stop reached ${(v.stops.reduce((a,b)=>a+b,0)/v.n).toFixed(1)}/5`);
}

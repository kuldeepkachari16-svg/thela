// Headless balance harness. `npm run sim` — no DOM, plays whole routes.
import { World } from '../src/game.js';
import { DISHES } from '../src/data/dishes.js';

// A "competent player" proxy: keeps the tawa hot, banks coins that are close,
// spends tadka on real clusters, and dodges boss telegraphs.
function makeBot(w) {
  let aromaT = 0;
  return {
    tick(dt) { aromaT -= dt; },
    dir() {
      const v = w.vendor;
      let tx = w.cart.x, ty = w.cart.y - 34;
      if (w.heatPct() > 0.5) {
        let bd = 230;
        for (const p of w.pickups) {
          const d = Math.hypot(p.x - v.x, p.y - v.y);
          if (d < bd) { bd = d; tx = p.x; ty = p.y; }
        }
      }
      if (w.boss) {
        const b = w.boss;
        if (w.heatPct() > 0.35) { tx = b.x; ty = b.y + 180; }
        const tg = b.telegraph;
        if (tg && tg.type === 'lob' && Math.hypot(v.x - tg.x, v.y - tg.y) < tg.aoe + 40) {
          tx = v.x + (v.x < 240 ? 100 : -100); ty = v.y;
        }
        if (tg && tg.type === 'dash' && Math.abs(v.x - b.x) < b.r + 20) {
          tx = v.x + (v.x < 240 ? 110 : -110); ty = v.y;
        }
      }
      const dx = tx - v.x, dy = ty - v.y, l = Math.hypot(dx, dy) || 1;
      return l < 4 ? { x: 0, y: 0 } : { x: dx / l, y: dy / l };
    },
    takeAroma() {
      if (aromaT > 0 || w.vendor.aromaCd > 0) return false;
      let n = 0;
      for (const c of w.customers) {
        if (Math.hypot(c.x - w.vendor.x, c.y - w.vendor.y) < w.aromaRadius) n++;
      }
      if (n >= 6 || (w.boss && Math.hypot(w.boss.x - w.vendor.x, w.boss.y - w.vendor.y) < w.aromaRadius)) {
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
    if (o.id === 'jugaad' && w.cartPct() < 0.6) return 6;
    return 2;
  };
  return offers.slice().sort((a, b) => score(b) - score(a))[0];
}

function run(cityId, charId, seconds = 600) {
  let offers = null;
  const hooks = {
    onBanner: () => {},
    onLevelUp: (o) => { offers = o; },
    onStopClear: () => {},
    onGameOver: (i) => { w.__over = i; },
    onVictory: (i) => { w.__won = i; },
  };
  const w = new World(480, 854, hooks);
  w.start(cityId, charId);
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
    city: cityId, char: charId, t: +t.toFixed(0), stop: w.stopIndex + 1,
    level: w.level, money: w.money, served: w.served, maxCrowd,
    result: w.__won ? 'VICTORY' : w.__over ? w.__over.reason : 'timeout',
    dishes: w.vendor.dishes.map(d => DISHES[d.id].name + ':' + d.level).join(' '),
  };
}

const combos = [['delhi','munna'],['delhi','pk'],['mumbai','pk'],['mumbai','munna']];
const tally = {};
for (const [c, ch] of combos) {
  const key = `${c}/${ch}`;
  tally[key] = { win: 0, n: 0, stops: [] };
  const RUNS = Number(process.env.RUNS || 8);
  for (let i = 0; i < RUNS; i++) {
    const r = run(c, ch);
    tally[key].n++; tally[key].stops.push(r.stop);
    if (r.result === 'VICTORY') tally[key].win++;
    if (i === 0) console.log(`${key.padEnd(14)} sample: ${r.result.padEnd(8)} t=${String(r.t).padStart(3)}s stop=${r.stop} lv=${r.level} ₹${r.money} served=${r.served} crowd=${r.maxCrowd} | ${r.dishes}`);
  }
}
console.log(`\nclear rate over ${process.env.RUNS || 8} runs each:`);
for (const [k, v] of Object.entries(tally)) {
  console.log(`  ${k.padEnd(14)} ${v.win}/${v.n} cleared · avg stop reached ${(v.stops.reduce((a,b)=>a+b,0)/v.n).toFixed(1)}/5`);
}

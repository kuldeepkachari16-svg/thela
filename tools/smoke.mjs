// Smoke test: drives the real render.js and ui.js against minimal DOM/canvas
// stubs, so every draw path and screen transition is actually executed.
// `node tools/smoke.mjs`

import { World } from '../src/game.js';

const calls = [];
function ctxStub() {
  const rec = new Proxy({}, {
    get(_, k) {
      if (k === 'canvas') return { width: 480, height: 854 };
      if (k === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k === 'getImageData') return () => ({ data: [0, 0, 0, 0] });
      if (k === 'measureText') return () => ({ width: 10 });
      if (typeof k === 'symbol') return undefined;
      return (...a) => { calls.push(k); return undefined; };
    },
    set() { return true; },
  });
  return rec;
}

const els = new Map();
function el(id) {
  if (!els.has(id)) {
    els.set(id, {
      id, textContent: '', innerHTML: '', style: {},
      _cls: new Set(id.startsWith('scr') ? ['hidden'] : []),
      classList: {
        add: (...c) => c.forEach((x) => els.get(id)._cls.add(x)),
        remove: (...c) => c.forEach((x) => els.get(id)._cls.delete(x)),
        toggle: (c, on) => (on ? els.get(id)._cls.add(c) : els.get(id)._cls.delete(c)),
        contains: (c) => els.get(id)._cls.has(c),
      },
      appendChild() {}, addEventListener() {}, get offsetWidth() { return 1; },
      querySelector: () => null, onclick: null,
    });
  }
  return els.get(id);
}
globalThis.document = {
  getElementById: el,
  querySelector: () => el('_q'),
  querySelectorAll: () => [],
  createElement: () => ({ className: '', innerHTML: '', onclick: null, style: {} }),
};
globalThis.setTimeout = globalThis.setTimeout;
globalThis.clearTimeout = globalThis.clearTimeout;

const { Renderer } = await import('../src/render.js');
const { UI } = await import('../src/ui.js');

const renderer = Object.create(Renderer.prototype);
renderer.ctx = ctxStub();
renderer.rainSeed = Array.from({ length: 20 }, (_, i) => ({ x: i / 20, y: i / 20, l: 18, s: 1 }));

const ui = new UI();
const seen = new Set();
const fail = [];

function drive(cityId, label) {
  let offers = null;
  const w = new World(480, 854, {
    onBanner: (a, b) => { ui.banner(a, b); seen.add('banner'); },
    onLevelUp: (o, lv) => { offers = o; ui.showOffers(o, lv, () => {}); seen.add('levelup'); },
    onStopClear: (i) => { ui.showStopClear(i, w.city); seen.add('stopclear'); },
    onGameOver: (i) => { ui.showOver(i, w.city); seen.add(i.reason); },
    onVictory: (i) => { ui.showVictory(i); seen.add('victory'); },
  });
  w.start(cityId);

  const bot = {
    dir() {
      const v = w.hero;
      // Stand still to stoke when the tawa is low; otherwise go bank a coin.
      if (w.heatPct() < 0.45) return { x: 0, y: 0 };
      let tx = null, ty = null;
      for (const p of w.pickups) {
        if (Math.hypot(p.x - v.x, p.y - v.y) < 220) { tx = p.x; ty = p.y; break; }
      }
      if (tx === null) return { x: 0, y: 0 };
      const dx = tx - v.x, dy = ty - v.y, l = Math.hypot(dx, dy) || 1;
      return l < 4 ? { x: 0, y: 0 } : { x: dx / l, y: dy / l };
    },
    takeAroma() { return w.hero.aromaCd <= 0; },
    takePause() { return false; },
  };

  const dt = 1 / 60;
  let frames = 0, t = 0;
  try {
    while (t < 400) {
      if (w.state === 'playing') {
        w.update(dt, bot); t += dt;
        if (frames % 3 === 0) { renderer.draw(w, t); ui.syncHud(w); }
        frames++;
      } else if (w.state === 'levelup' && offers) { const o = offers[0]; offers = null; w.resolveLevelUp(o); }
      else if (w.state === 'stopclear') { renderer.draw(w, t); w.advanceStop(); }
      else break;
    }
  } catch (e) {
    fail.push(`${label}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
  return { label, frames, state: w.state, stop: w.stopIndex + 1, served: w.served };
}

/** Boss stops get their own world so telegraph/dash/boss-bar draws always run. */
function driveBoss(cityId, label) {
  const w = new World(480, 854, {
    onBanner: (a, b) => ui.banner(a, b),
    onLevelUp: (o, lv) => { ui.showOffers(o, lv, () => {}); w.resolveLevelUp(o[0]); },
    onStopClear: () => {},
    onGameOver: (i) => { ui.showOver(i, w.city); seen.add(i.reason); },
    onVictory: (i) => { ui.showVictory(i); seen.add('victory'); },
  });
  w.start(cityId);
  w.stopIndex = w.city.stops.length - 1;
  w.customers.length = 0;
  w.beginStop();
  w.state = 'playing';
  // Smoke run, not a balance run: keep Munna alive so the full boss script
  // (telegraph → dash → spawn → victory) always gets exercised.
  w.damageHero = () => {};
  const bot = { dir: () => ({ x: 0, y: -0.4 }), takeAroma: () => w.hero.aromaCd <= 0, takePause: () => false };
  const dt = 1 / 60;
  let frames = 0;
  try {
    for (let i = 0; i < 60 * 25 && w.state === 'playing'; i++) {
      w.update(dt, bot);
      if (i % 3 === 0) { renderer.draw(w, i * dt); ui.syncHud(w); frames++; }
    }
    if (w.state === 'playing' && w.boss) {   // finish it to prove the victory path
      w.damage(w.boss, 1e9, null);
      renderer.draw(w, 1);
    }
  } catch (e) {
    fail.push(`${label}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
  return { label, frames, state: w.state, stop: w.stopIndex + 1, served: w.served };
}

const CITY_IDS = Object.keys((await import('../src/data/cities.js')).CITIES);
const results = [
  ...CITY_IDS.map((id) => drive(id, id)),
  ...CITY_IDS.map((id) => driveBoss(id, id + '/BOSS')),
];

for (const r of results) console.log(`  ${r.label.padEnd(16)} ${String(r.frames).padStart(6)} frames drawn · ended ${r.state} at stop ${r.stop} · ${r.served} served`);

const wantHooks = ['banner', 'levelup', 'stopclear', 'victory'];
const missingHooks = wantHooks.filter((h) => !seen.has(h));
const wantDraws = ['fillRect', 'arc', 'fillText', 'stroke', 'ellipse', 'setLineDash',
  'quadraticCurveTo', 'clip', 'rotate', 'translate', 'strokeRect'];
const missingDraws = wantDraws.filter((d) => !calls.includes(d));

console.log(`\n  canvas ops issued: ${calls.length}`);
console.log(`  screen hooks fired: ${[...seen].sort().join(', ')}`);
if (missingHooks.length) fail.push('hooks never fired: ' + missingHooks.join(', '));
if (missingDraws.length) fail.push('draw ops never issued: ' + missingDraws.join(', '));

if (fail.length) { console.log('\nFAIL'); for (const f of fail) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nPASS — every render path and screen transition executed clean.');

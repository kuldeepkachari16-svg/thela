// Death-cause diagnostics. Answers "what actually killed the cart" by
// attributing cart damage per customer type, and tracks whether the heat
// mechanic is biting at all. This is the harness that caught the tawa being
// decorative — heat never dropped below 95%. `npm run diag`.

import { World } from '../src/game.js';

function diag(cityId, charId) {
  let offers = null;
  const w = new World(480, 854, {
    onBanner: () => {}, onLevelUp: (o) => { offers = o; }, onStopClear: () => {},
    onGameOver: (i) => { w.__over = i; }, onVictory: (i) => { w.__won = i; },
  });
  w.start(cityId, charId);

  // instrument cart damage by source type
  const src = {};
  const orig = w.damageCart.bind(w);
  w.damageCart = (amt, s) => {
    const k = s && s.def ? s.def.id : s && s.def_ ? 'boss' : 'unknown';
    src[k] = (src[k] || 0) + amt;
    orig(amt, s);
  };

  let aromaT = 0, coldTime = 0, t = 0, aromaUses = 0, minHeat = 999, heatSum = 0, n = 0;
  const bot = {
    dir() {
      const v = w.vendor;
      let tx = w.cart.x, ty = w.cart.y - 34;
      if (w.heatPct() > 0.5) {
        let bd = 230;
        for (const p of w.pickups) { const d = Math.hypot(p.x-v.x,p.y-v.y); if (d<bd){bd=d;tx=p.x;ty=p.y;} }
      }
      const dx=tx-v.x, dy=ty-v.y, l=Math.hypot(dx,dy)||1;
      return l<4?{x:0,y:0}:{x:dx/l,y:dy/l};
    },
    takeAroma() {
      if (aromaT>0 || w.vendor.aromaCd>0) return false;
      let n=0; for (const c of w.customers) if (Math.hypot(c.x-w.vendor.x,c.y-w.vendor.y)<w.aromaRadius) n++;
      if (n>=6) { aromaT=0.4; aromaUses++; return true; }
      return false;
    },
    takePause(){return false;},
  };

  const dt=1/60;
  while (t < 600) {
    if (w.state === 'playing') {
      aromaT -= dt; w.update(dt, bot);
      if (w.vendor.cold) coldTime += dt;
      minHeat = Math.min(minHeat, w.heatPct()); heatSum += w.heatPct(); n++;
      t += dt;
    } else if (w.state === 'levelup' && offers) { const p = offers[0]; offers = null; w.resolveLevelUp(p); }
    else if (w.state === 'stopclear') w.advanceStop();
    else break;
  }
  const angry = w.customers.filter(c=>c.angry).length;
  console.log(`${cityId}/${charId}: died t=${t.toFixed(0)}s stop=${w.stopIndex+1} crowd=${w.customers.length} angry=${angry} cold=${(coldTime/t*100).toFixed(0)}% heat[min=${(minHeat*100).toFixed(0)}% avg=${(heatSum/n*100).toFixed(0)}%] aroma=${aromaUses}`);
  console.log('   cart damage by source:', Object.entries(src).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${Math.round(v)}`).join(' '));
}
const combos = process.argv.slice(2);
if (combos.length) {
  for (const c of combos) { const [city, char] = c.split('/'); diag(city, char); }
} else {
  for (const [c, ch] of [['delhi','munna'],['delhi','pk'],['mumbai','pk'],['mumbai','munna']]) diag(c, ch);
}

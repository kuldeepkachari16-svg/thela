// DOM overlay: HUD readouts, screens, and the level-up cards.

import { CITIES, ROUTE_ORDER } from './data/cities.js';
import { CHARACTERS } from './data/characters.js';
import { DISHES, INGREDIENTS } from './data/dishes.js';
import { fmtTime } from './util.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'),
      stopLabel: $('stopLabel'), timer: $('timer'), xpFill: $('xpFill'),
      lvl: $('lvl'), money: $('money'), served: $('served'), cityRule: $('cityRule'),
      bossWrap: $('bossWrap'), bossName: $('bossName'), bossFill: $('bossFill'),
      banner: $('banner'), bannerA: $('bannerA'), bannerB: $('bannerB'),
      dishRow: $('dishRow'), ingRow: $('ingRow'),
      heatFill: $('heatFill'), heatLabel: $('heatLabel'),
      heatbar: document.querySelector('.heatbar'),
      aromaBtn: $('aromaBtn'), aromaArc: $('aromaArc'),
      cityList: $('cityList'), charList: $('charList'), offerList: $('offerList'),
      levelTitle: $('levelTitle'),
      stopTitle: $('stopTitle'), stopSub: $('stopSub'),
      overTitle: $('overTitle'), overSub: $('overSub'), overStats: $('overStats'),
    };
    this.screens = {
      title: $('scrTitle'), city: $('scrCity'), char: $('scrChar'),
      level: $('scrLevel'), stop: $('scrStop'), over: $('scrOver'), pause: $('scrPause'),
    };
    this._bannerTimer = null;
  }

  show(name) {
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('hidden', k !== name);
    this.el.hud.classList.toggle('hidden', !(name === null || name === 'level' || name === 'stop' || name === 'pause'));
  }

  showGame() {
    for (const el of Object.values(this.screens)) el.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
  }

  /* ------------------------------------------------------------- pickers */

  buildCities(onPick) {
    const wrap = this.el.cityList;
    wrap.innerHTML = '';
    for (const id of ROUTE_ORDER) {
      const c = CITIES[id];
      const b = document.createElement('button');
      b.className = 'card' + (c.playable ? '' : ' locked');
      b.innerHTML = `
        <div class="ce">${c.emoji || '\u{1F4CD}'}</div>
        <div class="cbody">
          <div class="ct">${c.name} <span style="color:var(--dim);font-weight:600">· ${c.area}</span></div>
          <div class="cs">${c.ruleShort}</div>
        </div>
        ${c.playable ? '' : '<div class="lock">SOON</div>'}`;
      if (c.playable) b.onclick = () => onPick(id);
      else b.disabled = true;
      wrap.appendChild(b);
    }
  }

  buildChars(cityId, onPick) {
    const wrap = this.el.charList;
    wrap.innerHTML = '';
    const order = Object.keys(CHARACTERS).sort((a, b) => (CHARACTERS[b].playable ? 1 : 0) - (CHARACTERS[a].playable ? 1 : 0));
    for (const id of order) {
      const ch = CHARACTERS[id];
      const home = ch.city === cityId;
      const b = document.createElement('button');
      b.className = 'card' + (ch.playable ? '' : ' locked');
      b.innerHTML = `
        <div class="ce">${ch.emoji}</div>
        <div class="cbody">
          <div class="ct">${ch.name} <span style="color:var(--dim);font-weight:600">· ${ch.station}</span>
            ${home && ch.playable ? '<span class="chip" style="color:var(--good)">HOME</span>' : ''}</div>
          <div class="cs">${ch.tagline}${ch.playable ? ` · starts with ${DISHES[ch.starter].emoji} ${DISHES[ch.starter].name}` : ''}</div>
        </div>
        ${ch.playable ? '' : '<div class="lock">SOON</div>'}`;
      if (ch.playable) b.onclick = () => onPick(id);
      else b.disabled = true;
      wrap.appendChild(b);
    }
  }

  /* ----------------------------------------------------------------- HUD */

  banner(a, b) {
    const el = this.el.banner;
    this.el.bannerA.textContent = a || '';
    this.el.bannerB.textContent = b || '';
    el.classList.remove('hidden', 'show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => el.classList.add('hidden'), 2100);
  }

  syncHud(w) {
    const e = this.el;
    const s = w.stopDef;
    e.stopLabel.textContent = `STOP ${w.stopIndex + 1}/${w.city.stops.length} · ${s.name}`;
    e.cityRule.textContent = `${w.city.name} — ${w.city.ruleShort}`;

    if (w.boss) {
      e.timer.textContent = '';
      e.bossWrap.classList.remove('hidden');
      e.bossName.textContent = w.boss.def.name;
      e.bossFill.style.width = `${Math.max(0, (w.boss.hp / w.boss.maxHp) * 100)}%`;
    } else {
      e.timer.textContent = fmtTime(Math.max(0, w.stopTimeLeft));
      e.bossWrap.classList.add('hidden');
    }

    e.xpFill.style.width = `${w.xpPct() * 100}%`;
    e.lvl.textContent = `Lv ${w.level}`;
    e.money.textContent = `₹${w.money}`;
    e.served.textContent = `${w.served} served`;

    const hp = w.heatPct();
    e.heatFill.style.width = `${hp * 100}%`;
    e.heatbar.classList.toggle('cold', w.vendor.cold);
    e.heatLabel.textContent = w.vendor.cold
      ? 'COLD TAWA — GET TO THE CART'
      : w.nearCart() ? 'REHEATING' : `GARAM ${Math.round(hp * 100)}%`;

    const ready = w.vendor.aromaCd <= 0;
    e.aromaBtn.classList.toggle('ready', ready);
    e.aromaArc.style.strokeDashoffset = `${119.4 * (1 - w.aromaPct())}`;

    // dishes
    const sig = w.vendor.dishes.map((d) => d.id + d.level).join(',') + '|' + w.vendor.ingredients.join(',');
    if (sig !== this._sig) {
      this._sig = sig;
      e.dishRow.innerHTML = w.vendor.dishes.map((d) => {
        const def = DISHES[d.id];
        return `<span class="dish" title="${def.name}">${def.emoji}<b>${d.level}</b></span>`;
      }).join('');
      e.ingRow.innerHTML = w.vendor.ingredients.map((i) =>
        `<span class="ing" title="${INGREDIENTS[i].name}">${INGREDIENTS[i].emoji}</span>`).join('');
    }
  }

  /* ------------------------------------------------------------- modals */

  showOffers(offers, level, onPick) {
    this.el.levelTitle.textContent = `LEVEL ${level}`;
    const wrap = this.el.offerList;
    wrap.innerHTML = '';
    for (const o of offers) {
      const b = document.createElement('button');
      b.className = 'card';
      b.innerHTML = `<div class="ce">${o.emoji}</div>
        <div class="cbody"><div class="ct">${o.title}</div><div class="cs">${o.sub}</div></div>`;
      b.onclick = () => onPick(o);
      wrap.appendChild(b);
    }
    this.screens.level.classList.remove('hidden');
  }
  hideOffers() { this.screens.level.classList.add('hidden'); }

  showStopClear(info, city) {
    this.el.stopTitle.textContent = `${info.name.toUpperCase()} — CLEARED`;
    const next = info.next;
    this.el.stopSub.textContent = next
      ? (next.boss ? `Next: ${next.name}. Something is waiting there.` : `Next stop: ${next.name}. It gets heavier.`)
      : 'End of the route.';
    this.screens.stop.classList.remove('hidden');
  }
  hideStopClear() { this.screens.stop.classList.add('hidden'); }

  showOver(info, city) {
    const tipped = info.reason === 'tipped';
    this.el.overTitle.textContent = tipped ? 'THELA TIPPED' : 'PACKED UP EARLY';
    this.el.overSub.textContent = tipped
      ? 'The crowd you couldn’t feed took it out on the cart.'
      : 'You walked away with half the takings. Safe is a choice.';
    this.el.overStats.innerHTML = `
      <div><b>₹${info.money}</b><span>banked</span></div>
      <div><b>${info.served}</b><span>served</span></div>
      <div><b>${info.stop}/${city.stops.length}</b><span>stops</span></div>`;
    this.screens.over.classList.remove('hidden');
  }

  showVictory(info) {
    this.el.overTitle.textContent = 'ROUTE CLEARED';
    this.el.overSub.textContent = `${info.city.name} is yours. The whole street knows the cart now.`;
    this.el.overStats.innerHTML = `
      <div><b>₹${info.money}</b><span>banked</span></div>
      <div><b>${info.served}</b><span>served</span></div>
      <div><b>${fmtTime(info.time)}</b><span>route time</span></div>`;
    this.screens.over.classList.remove('hidden');
  }
}

// Canvas painter. Sticker-book loud and daylight-bright: saturated blocks,
// hard shadows, no grime. Every city paints from its own palette, its own
// skyline and its own street furniture.

import { clamp } from './util.js';
import { CATEGORY_COLOR } from './data/dishes.js';

const HORIZON = 104;      // the far end of the street, where the city sits
const BLOCK = 92;         // shopfront pitch down the pavement

const CRAVING_GLYPH = {
  fried: '\u{1F95F}', chaat: '\u{1F957}', sweet: '\u{1F36C}',
  bread: '\u{1F35E}', drink: '\u{1F375}',
};

function emoji(ctx, ch, x, y, size) {
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y);
}

function shadow(ctx, x, y, rx, ry, a = 0.22) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Cheap deterministic hash so scrolling scenery never flickers or re-rolls. */
function h1(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rainSeed = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(), l: 12 + Math.random() * 22, s: 0.6 + Math.random() * 0.8,
    }));
  }

  draw(w, t) {
    const ctx = this.ctx;
    const P = w.city.palette;
    ctx.save();
    if (w.shake > 0) {
      ctx.translate((Math.random() - 0.5) * w.shake * 9, (Math.random() - 0.5) * w.shake * 9);
    }

    this.drawHorizon(w, P, t);
    this.drawStreet(w, P);
    this.drawPatches(w, P);
    this.drawZones(w);
    this.drawPickups(w);

    // y-sorted actor pass so the crowd reads with depth
    const actors = [];
    for (const c of w.customers) actors.push({ y: c.y, kind: 'cust', o: c });
    actors.push({ y: w.hero.y, kind: 'hero', o: w.hero });
    if (w.boss) actors.push({ y: w.boss.y, kind: 'boss', o: w.boss });
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (a.kind === 'cust') this.drawCustomer(ctx, a.o, w);
      else if (a.kind === 'hero') this.drawHero(ctx, w, t);
      else this.drawBoss(ctx, w, a.o);
    }

    this.drawSweepers(w);
    this.drawProjectiles(w);
    if (w.boss) this.drawTelegraph(ctx, w);
    this.drawFx(w);
    this.drawSkyProps(w, P, t);
    if (w.city.hazard && w.city.hazard.rain) this.drawRain(w, t);

    ctx.fillStyle = P.wash;
    ctx.fillRect(0, 0, w.W, w.H);
    if (w.mods.dark > 0) this.drawNight(w, P);
    ctx.restore();
  }

  /* -------------------------------------------------------------- horizon */

  drawHorizon(w, P, t) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, P.skyTop);
    g.addColorStop(1, P.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, w.W + 40, HORIZON + 20);

    // The skyline drifts a fraction of the walk speed — depth without cost.
    const off = (w.scroll * 0.06) % w.W;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = P.far;
    for (let pass = 0; pass < 2; pass++) {
      const dx = pass === 0 ? -off : w.W - off;
      for (const s of w.city.skyline) this.skylineShape(ctx, s, dx, w.W, P.far);
    }
    ctx.restore();

    // Ground line where the far city meets the street.
    ctx.fillStyle = P.kerb;
    ctx.fillRect(0, HORIZON - 4, w.W, 8);
  }

  skylineShape(ctx, s, dx, W, col) {
    ctx.fillStyle = col;
    const x = dx + s.x * W;
    const base = HORIZON;
    const wide = s.w < 1 ? s.w * W : s.w;
    const top = base - s.h;
    switch (s.t) {
      case 'block':
        ctx.fillRect(x - wide / 2, top, wide, s.h);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) ctx.fillRect(x - wide / 2 + 6 + i * (wide / 3.4), top + 8, 6, 8);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = col;
        break;
      case 'dome':
        ctx.beginPath();
        ctx.ellipse(x, top + s.h * 0.62, wide / 2, s.h * 0.62, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x - wide / 2, top + s.h * 0.6, wide, s.h * 0.4);
        ctx.fillRect(x - 2, top - 10, 4, 12);
        break;
      case 'minar':
        ctx.fillRect(x - wide / 2, top, wide, s.h);
        ctx.beginPath();
        ctx.arc(x, top, wide * 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'spire':
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + wide / 2, base);
        ctx.lineTo(x - wide / 2, base);
        ctx.closePath();
        ctx.fill();
        break;
      case 'arch':
        ctx.fillRect(x - wide / 2, base - s.h * 0.5, wide, s.h * 0.5);
        ctx.beginPath();
        ctx.ellipse(x, base - s.h * 0.5, wide / 2, s.h * 0.5, 0, Math.PI, 0);
        ctx.fill();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, base, wide * 0.24, s.h * 0.56, 0, Math.PI, 0);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = col;
        break;
      case 'bridge': {
        ctx.strokeStyle = col;
        const half = wide / 2;
        ctx.fillRect(x - half, base - 12, wide, 8);
        ctx.fillRect(x - half + 10, top, 10, s.h);
        ctx.fillRect(x + half - 20, top, 10, s.h);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - half + 15, top + 6);
        ctx.quadraticCurveTo(x, base - 4, x + half - 15, top + 6);
        ctx.stroke();
        break;
      }
      case 'wheel':
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, base - s.h, wide / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillRect(x - 2, base - s.h, 4, s.h);
        break;
      case 'lighthouse':
        ctx.beginPath();
        ctx.moveTo(x - wide / 2, base);
        ctx.lineTo(x - wide / 4, top);
        ctx.lineTo(x + wide / 4, top);
        ctx.lineTo(x + wide / 2, base);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - wide * 0.45, top - 8, wide * 0.9, 8);
        break;
      case 'gopuram':
        for (let i = 0; i < 4; i++) {
          const k = i / 4;
          const ww = wide * (1 - k * 0.55);
          ctx.fillRect(x - ww / 2, base - s.h * (k + 0.25), ww, s.h * 0.26);
        }
        break;
      case 'church':
        ctx.fillRect(x - wide / 2, base - s.h * 0.55, wide, s.h * 0.55);
        ctx.beginPath();
        ctx.moveTo(x, base - s.h);
        ctx.lineTo(x + wide * 0.28, base - s.h * 0.55);
        ctx.lineTo(x - wide * 0.28, base - s.h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - 2, base - s.h - 12, 4, 12);
        ctx.fillRect(x - 7, base - s.h - 8, 14, 4);
        break;
      case 'palm':
        ctx.fillRect(x - 2, base - s.h, 5, s.h);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i / 4) * Math.PI;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * wide * 0.5, base - s.h + Math.sin(a) * 8 + 4,
            wide * 0.55, 5, a * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }

  /* --------------------------------------------------------------- street */

  drawStreet(w, P) {
    const ctx = this.ctx;
    const { x0, x1 } = w.lane;
    const off = w.scroll;

    // road first, so the pavement blocks overlap its edge cleanly
    ctx.fillStyle = P.road;
    ctx.fillRect(x0, HORIZON, x1 - x0, w.H - HORIZON);

    this.drawRoadMarks(w, P, x0, x1, off);

    // pavements — deliberately thin now, just enough for shopfronts and props
    ctx.fillStyle = P.kerb;
    ctx.fillRect(0, HORIZON, x0, w.H - HORIZON);
    ctx.fillRect(x1, HORIZON, w.W - x1, w.H - HORIZON);

    this.drawShopRow(w, P, 0, x0, -1);
    this.drawShopRow(w, P, x1, w.W - x1, 1);

    // kerb edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x0 - 4, HORIZON, 4, w.H - HORIZON);
    ctx.fillRect(x1, HORIZON, 4, w.H - HORIZON);

    // the road fades into the far city instead of stopping dead
    const haze = ctx.createLinearGradient(0, HORIZON, 0, HORIZON + 90);
    haze.addColorStop(0, P.skyBot);
    haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = haze;
    ctx.fillRect(0, HORIZON, w.W, 70);
    ctx.globalAlpha = 1;
  }

  /** What is painted on the road is part of the city, not decoration:
      lane dashes, tram rails, or nothing at all on sand. */
  drawRoadMarks(w, P, x0, x1, off) {
    const ctx = this.ctx;
    const mid = (x0 + x1) / 2;
    ctx.strokeStyle = P.roadLine;

    if (w.city.roadMark === 'tram') {
      // College Street's rails, and the reason the tram can reach you.
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#6f6257';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(mid - 34, HORIZON); ctx.lineTo(mid - 34, w.H);
      ctx.moveTo(mid + 34, HORIZON); ctx.lineTo(mid + 34, w.H);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#d8cfc2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mid - 34, HORIZON); ctx.lineTo(mid - 34, w.H);
      ctx.moveTo(mid + 34, HORIZON); ctx.lineTo(mid + 34, w.H);
      ctx.stroke();
      // sleepers
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#8a7660';
      ctx.setLineDash([7, 26]);
      ctx.lineDashOffset = -off % 33;
      ctx.beginPath();
      for (let k = -34; k <= 34; k += 68) { ctx.moveTo(mid + k, HORIZON); ctx.lineTo(mid + k, w.H); }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      return;
    }

    if (w.city.roadMark === 'sand') {
      // Marina and Miramar: no lanes, just the tide's own lines.
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = P.roadLine;
      ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const y = ((k * 150 - off * 0.5) % (w.H + 200) + w.H + 200) % (w.H + 200) - 100;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.quadraticCurveTo(mid, y + 22, x1, y - 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }

    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 5;
    ctx.setLineDash([26, 34]);
    ctx.lineDashOffset = -off % 60;
    ctx.beginPath();
    ctx.moveTo(mid, HORIZON);
    ctx.lineTo(mid, w.H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 + 12, HORIZON); ctx.lineTo(x0 + 12, w.H);
    ctx.moveTo(x1 - 12, HORIZON); ctx.lineTo(x1 - 12, w.H);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** One pavement strip: shopfront blocks, awnings, signboards and props.
      The strip is deliberately narrow, so it has to carry the city with
      colour and script rather than detail. */
  drawShopRow(w, P, x, width, side) {
    if (width <= 2) return;
    const ctx = this.ctx;
    const off = w.scroll;
    const cols = [P.shopA, P.shopB, P.shopC];
    const rows = Math.ceil((w.H - HORIZON) / BLOCK) + 2;
    const base = Math.floor(off / BLOCK);
    const SIGN = 30;   // signboard band; the rest stays shop colour

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, HORIZON, width, w.H - HORIZON);
    ctx.clip();

    for (let i = -1; i < rows; i++) {
      const yy = HORIZON + i * BLOCK - (off % BLOCK);
      const idx = base + i;
      const r = h1(idx * (side + 3.7));
      const shop = cols[((idx % cols.length) + cols.length) % cols.length];

      ctx.fillStyle = shop;
      ctx.fillRect(x, yy, width, BLOCK - 8);

      // shutter ribs over the shop body only
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#000';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 3, yy + SIGN + 8 + k * 11, width - 6, 4);
      ctx.globalAlpha = 1;

      // doorway, so a shop reads as a shop and not a stripe
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(x + width * 0.28, yy + BLOCK - 30, width * 0.44, 22);
      ctx.globalAlpha = 1;

      // signboard in the city's own script, only as tall as it needs to be
      const sign = w.city.signs[Math.floor(r * w.city.signs.length)];
      ctx.fillStyle = r > 0.5 ? P.accent : P.awning;
      ctx.fillRect(x + 2, yy + 3, width - 4, SIGN);
      ctx.save();
      ctx.translate(x + width / 2, yy + 3 + SIGN / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = '800 11px system-ui, "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign, 0, 0.5);
      ctx.restore();

      // striped awning, hung on the kerb side
      const ax = side < 0 ? x + width - 16 : x;
      ctx.fillStyle = P.awning;
      ctx.fillRect(ax, yy + SIGN + 2, 16, 13);
      ctx.fillStyle = P.awning2;
      for (let k = 0; k < 3; k++) ctx.fillRect(ax + 1 + k * 5, yy + SIGN + 2, 2.5, 13);

      // street furniture, standing in front of the shop
      if (r > 0.38) {
        const props = w.city.props;
        const p = props[Math.floor(h1(idx * 5.3 + side) * props.length)];
        emoji(ctx, p, x + width / 2, yy + BLOCK - 22, Math.min(23, width * 0.66));
      }

      // hard shadow between blocks
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(x, yy + BLOCK - 8, width, 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawSkyProps(w, P, t) {
    const ctx = this.ctx;
    const list = w.city.skyProps;
    if (!list || !list.length) return;
    for (let i = 0; i < 3; i++) {
      const seed = h1(i * 9.1 + 3);
      const ch = list[Math.floor(seed * list.length)];
      const y = 24 + seed * 90 + Math.sin(t * 0.7 + i) * 9;
      const x = ((t * (14 + seed * 22) + seed * w.W) % (w.W + 80)) - 40;
      ctx.globalAlpha = 0.85;
      emoji(ctx, ch, x, y, 16 + seed * 8);
      ctx.globalAlpha = 1;
    }
  }

  /** Lucknow after dark / Ahmedabad past midnight: lamplight, never mud. */
  drawNight(w, P) {
    const ctx = this.ctx;
    const k = w.mods.dark;
    const g = ctx.createRadialGradient(w.hero.x, w.hero.y, 40, w.hero.x, w.hero.y, 300);
    g.addColorStop(0, 'rgba(40,18,58,0)');
    g.addColorStop(0.55, `rgba(46,20,64,${k * 0.42})`);
    g.addColorStop(1, `rgba(28,12,44,${k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w.W, w.H);
    // the tawa itself throws light
    ctx.globalCompositeOperation = 'lighter';
    const l = ctx.createRadialGradient(w.hero.x, w.hero.y, 0, w.hero.x, w.hero.y, 120);
    l.addColorStop(0, `rgba(255,180,80,${0.22 * w.hero.sizzle})`);
    l.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = l;
    ctx.fillRect(0, 0, w.W, w.H);
    ctx.globalCompositeOperation = 'source-over';
  }

  drawPatches(w, P) {
    const ctx = this.ctx;
    for (const p of w.patches) {
      const heal = p.effect === 'heal';
      ctx.globalAlpha = heal ? 0.6 : 0.72;
      ctx.fillStyle = heal ? '#ffe08a'
        : p.skin === 'sand' ? '#f7e3b0'
          : p.skin === 'pothole' ? '#a8875f' : '#7fd0ef';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = heal ? '#ff9a1f' : p.skin === 'pothole' ? '#6b5236' : '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (p.skin === 'pothole') {         // depth, so it reads as a hole not a ring
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#5a4228';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + p.ry * 0.16, p.rx * 0.72, p.ry * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.skin === 'puddle') {          // a wet reflection, so rain reads as rain
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(p.x - p.rx * 0.3, p.y - p.ry * 0.3, p.rx * 0.32, p.ry * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (heal) {
        ctx.globalAlpha = 0.9;
        emoji(ctx, '\u{1F35B}', p.x, p.y, 18);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawSweepers(w) {
    const ctx = this.ctx;
    for (const s of w.sweepers) {
      if (s.warn > 0) {
        // Telegraph the whole line before anything moves.
        const k = 1 - clamp(s.warn / s.cfg.warn, 0, 1);
        ctx.globalAlpha = 0.2 + k * 0.3;
        ctx.fillStyle = '#ff3b30';
        ctx.fillRect(w.lane.x0, s.y - 24, w.lane.x1 - w.lane.x0, 48);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#ff3b30';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(w.lane.x0, s.y - 24, w.lane.x1 - w.lane.x0, 48);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        continue;
      }
      shadow(ctx, s.x, s.y + 16, 34, 9, 0.3);
      emoji(ctx, s.cfg.emoji, s.x, s.y, 58);
    }
  }

  drawRain(w, t) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const d of this.rainSeed) {
      const x = d.x * w.W + Math.sin(t * 0.6 + d.y * 9) * 6;
      const y = ((d.y * w.H + t * 720 * d.s) % (w.H + 40)) - 20;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + d.l);
    }
    ctx.stroke();
  }

  /* --------------------------------------------------------------- actors */

  drawHero(ctx, w, t) {
    const h = w.hero;
    shadow(ctx, h.x, h.y + 15, 15, 6.5);

    // Stoking ring: plant your feet, the coals catch, the tawa comes back.
    if (h.stoking) {
      const pulse = 0.5 + Math.sin(t * 6) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.28;
      const g = ctx.createRadialGradient(h.x, h.y, 6, h.x, h.y, 56);
      g.addColorStop(0, 'rgba(255,180,60,0.95)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x, h.y, 56, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ff8a00';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 7]);
      ctx.beginPath(); ctx.arc(h.x, h.y, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (h.slipT > 0) {
      ctx.globalAlpha = 0.8;
      emoji(ctx, '\u{1F4A2}', h.x + 15, h.y - 22, 16);
      ctx.globalAlpha = 1;
    }
    if (h.cold) {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#2e86ab';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const bounce = Math.sin(h.stepPhase) * 2.4;
    const hy = h.y - 4 + bounce;

    // Dadi's brass tawa, slung on his back. This is the weapon and the story.
    ctx.save();
    ctx.translate(h.x - h.facing * 15, hy - 2);
    ctx.rotate(h.facing * 0.32);
    ctx.fillStyle = h.cold ? '#8497a8' : '#b8862c';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = h.cold ? '#a8b8c6' : '#e0ac45';
    ctx.beginPath(); ctx.ellipse(0, -1.5, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (h.hitFlash > 0) {
      ctx.save();
      ctx.filter = 'brightness(2.4)';
      emoji(ctx, h.def.emoji, h.x, hy, 32);
      ctx.restore();
    } else {
      if (h.invuln > 0) ctx.globalAlpha = 0.62;
      emoji(ctx, h.def.emoji, h.x, hy, 32);
      ctx.globalAlpha = 1;
    }

    // sizzle: the visual read on heat, rising off the tawa
    const s = h.sizzle;
    if (s > 0.02) {
      ctx.globalAlpha = 0.3 + s * 0.5;
      for (let i = 0; i < 3; i++) {
        const ph = t * 2.2 + i * 1.7;
        ctx.fillStyle = '#ffd9a0';
        ctx.beginPath();
        ctx.arc(h.x - h.facing * 15 + Math.sin(ph) * 4, hy - 14 - ((ph * 14) % 24), 2.5 + s * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // health pips, right above him — the only health bar in the game now
    const pct = w.hpPct();
    ctx.fillStyle = 'rgba(58,42,26,0.5)';
    ctx.fillRect(h.x - 24, h.y - 32, 48, 6);
    ctx.fillStyle = pct > 0.5 ? '#3fb26a' : pct > 0.25 ? '#ffb703' : '#ff3b30';
    ctx.fillRect(h.x - 24, h.y - 32, 48 * pct, 6);
  }

  drawCustomer(ctx, c, w) {
    shadow(ctx, c.x, c.y + c.r * 0.9, c.r * 0.85, c.r * 0.4);
    const bob = Math.sin(c.bob) * 1.8;

    if (c.markT > 0) {
      ctx.globalAlpha = 0.45 + Math.sin(c.bob * 3) * 0.12;
      ctx.strokeStyle = '#ff8a00';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const glyph = c.angry && !c.def.alwaysAngry ? '\u{1F621}' : c.def.emoji;
    if (c.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.filter = 'brightness(2.2)';
      emoji(ctx, glyph, c.x, c.y + bob, c.r * 2.1);
      ctx.restore();
    } else {
      emoji(ctx, glyph, c.x, c.y + bob, c.r * 2.1);
    }

    if (c.angry) {
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // craving bubble — the order-matching read
    if (c.craving) {
      const bx = c.x + c.r + 6, by = c.y - c.r - 6;
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = CATEGORY_COLOR[c.craving];
      ctx.lineWidth = 2.5;
      ctx.stroke();
      emoji(ctx, CRAVING_GLYPH[c.craving], bx, by + 0.5, 11);
    }

    // patience arc
    if (!c.angry && c.patienceMax > 0) {
      const p = clamp(c.patience / c.patienceMax, 0, 1);
      ctx.strokeStyle = p > 0.5 ? '#3fb26a' : p > 0.25 ? '#ffb703' : '#ff3b30';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.stroke();
    }

    // hp
    if (c.hp < c.maxHp) {
      ctx.fillStyle = 'rgba(58,42,26,0.5)';
      ctx.fillRect(c.x - 13, c.y - c.r - 15, 26, 4);
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(c.x - 13, c.y - c.r - 15, 26 * clamp(c.hp / c.maxHp, 0, 1), 4);
    }
  }

  drawBoss(ctx, w, b) {
    shadow(ctx, b.x, b.y + b.r * 0.8, b.r * 0.9, b.r * 0.35, 0.32);
    if (b.markT > 0) {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#ff8a00'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.save();
    if (b.hitFlash > 0) ctx.filter = 'brightness(2)';
    emoji(ctx, b.def.emoji, b.x, b.y, b.r * 1.9);
    ctx.restore();
  }

  drawTelegraph(ctx, w) {
    const b = w.boss;
    if (!b) return;
    const tg = b.telegraph;
    if (tg) {
      const k = 1 - clamp(tg.t / 1.2, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.4 + k * 0.4;
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      if (tg.type === 'lob') {
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.aoe, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.16 + k * 0.22;
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.aoe * k, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = 0.18 + k * 0.22;
        ctx.fillStyle = '#ff3b30';
        ctx.fillRect(b.x - b.r, b.y, b.r * 2, w.H - b.y);
        ctx.globalAlpha = 0.7;
        ctx.strokeRect(b.x - b.r, b.y, b.r * 2, w.H - b.y);
      }
      ctx.restore();
      ctx.setLineDash([]);
    }
  }

  drawZones(w) {
    const ctx = this.ctx;
    for (const z of w.zones) {
      const a = clamp(z.life / z.maxLife, 0, 1);
      ctx.globalAlpha = 0.22 + a * 0.24;
      ctx.fillStyle = CATEGORY_COLOR[z.cat] || '#ff8a00';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7 * a;
      ctx.strokeStyle = '#fff3d0'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawProjectiles(w) {
    const ctx = this.ctx;
    for (const p of w.projectiles) {
      if (p.behaviour === 'lob') {
        shadow(ctx, p.x, p.y, 8, 4, 0.18);
        emoji(ctx, p.emoji, p.x, p.y - p.arc, 22);
      } else {
        emoji(ctx, p.emoji, p.x, p.y, p.r * 2.2);
      }
    }
  }

  drawPickups(w) {
    const ctx = this.ctx;
    for (const pu of w.pickups) {
      const blink = pu.life < 3 && Math.floor(pu.life * 8) % 2 === 0;
      if (blink) continue;
      if (pu.type === 'coin') {
        emoji(ctx, '\u{1FA99}', pu.x, pu.y, 17);
      } else {
        ctx.fillStyle = '#3fb26a';
        ctx.beginPath(); ctx.arc(pu.x, pu.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(pu.x, pu.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  drawFx(w) {
    const ctx = this.ctx;
    for (const f of w.effects) {
      const k = f.t / f.life;
      const a = 1 - k;
      ctx.globalAlpha = a;
      switch (f.type) {
        case 'aroma': {
          const r = f.r * (0.25 + k * 0.9);
          ctx.strokeStyle = '#ff8a00';
          ctx.lineWidth = 5 * a + 1;
          ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = a * 0.5;
          ctx.strokeStyle = '#ffe0a0';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.7, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = a;
          emoji(ctx, '\u{1F336}', f.x, f.y - 26 - k * 16, 20 + k * 8);
          break;
        }
        case 'ring':
          ctx.strokeStyle = f.color || '#fff';
          ctx.lineWidth = 3 * a + 1;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + k), 0, Math.PI * 2); ctx.stroke();
          break;
        case 'boom':
          ctx.fillStyle = '#ffb703';
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + k * 0.9), 0, Math.PI * 2); ctx.fill();
          break;
        case 'line':
          ctx.strokeStyle = f.color || '#fff';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          break;
        case 'pop':
          emoji(ctx, f.emoji, f.x, f.y - k * 22, 20 + k * 6);
          break;
        case 'poof':
          ctx.fillStyle = '#fffaf0';
          ctx.beginPath(); ctx.arc(f.x, f.y - k * 14, 8 + k * 12, 0, Math.PI * 2); ctx.fill();
          break;
        case 'turn':
        case 'text': {
          ctx.font = `900 ${f.small ? 12 : 16}px ui-rounded, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#fffaf0';
          ctx.strokeText(f.text, f.x, f.y - k * 26);
          ctx.fillStyle = f.color || '#3a2a1a';
          ctx.fillText(f.text, f.x, f.y - k * 26);
          break;
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}

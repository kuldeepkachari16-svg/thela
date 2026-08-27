// Canvas painter. Chunky, saturated, sticker-book — not heritage-poster India.

import { clamp } from './util.js';
import { CATEGORY_COLOR } from './data/dishes.js';
import { HEAT_ZONE } from './game.js';

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

function shadow(ctx, x, y, rx, ry, a = 0.28) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
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

    ctx.fillStyle = P.sky;
    ctx.fillRect(-20, -20, w.W + 40, w.H + 40);

    this.drawStreet(w, P);
    this.drawPuddles(w, P);
    this.drawZones(w);
    this.drawHeatZone(w);
    this.drawPickups(w);

    // y-sorted actor pass so the crowd reads with depth
    const actors = [];
    for (const c of w.customers) actors.push({ y: c.y, kind: 'cust', o: c });
    actors.push({ y: w.cart.y + 12, kind: 'cart', o: w.cart });
    actors.push({ y: w.vendor.y, kind: 'vendor', o: w.vendor });
    if (w.boss) actors.push({ y: w.boss.y, kind: 'boss', o: w.boss });
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (a.kind === 'cust') this.drawCustomer(ctx, a.o, w);
      else if (a.kind === 'cart') this.drawCart(ctx, w, t);
      else if (a.kind === 'vendor') this.drawVendor(ctx, w, t);
      else this.drawBoss(ctx, w, a.o);
    }

    this.drawProjectiles(w);
    if (w.boss) this.drawTelegraph(ctx, w);
    this.drawFx(w);
    if (w.city.hazard === 'puddles') this.drawRain(w, t);

    ctx.fillStyle = P.fog;
    ctx.fillRect(0, 0, w.W, w.H);
    ctx.restore();
  }

  /* --------------------------------------------------------------- street */

  drawStreet(w, P) {
    const ctx = this.ctx;
    const { x0, x1 } = w.lane;
    const off = w.scroll;

    // shopfronts flanking the lane
    const bh = 96;
    const rows = Math.ceil(w.H / bh) + 2;
    for (let i = -1; i < rows; i++) {
      const yy = i * bh - (off % bh);
      const idx = i + Math.floor(off / bh);
      ctx.fillStyle = ((idx % 2) + 2) % 2 === 0 ? P.shopA : P.shopB;
      ctx.fillRect(0, yy, x0, bh - 6);
      ctx.fillRect(x1, yy, w.W - x1, bh - 6);
      ctx.fillStyle = P.awning;
      ctx.fillRect(x0 - 22, yy + bh - 26, 22, 16);
      ctx.fillRect(x1, yy + bh - 26, 22, 16);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, yy + bh - 6, x0, 6);
      ctx.fillRect(x1, yy + bh - 6, w.W - x1, 6);
      ctx.globalAlpha = 1;
    }

    // road
    ctx.fillStyle = P.road;
    ctx.fillRect(x0, 0, x1 - x0, w.H);
    ctx.strokeStyle = P.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    ctx.lineDashOffset = -off % 56;
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2, 0);
    ctx.lineTo((x0 + x1) / 2, w.H);
    ctx.stroke();
    ctx.setLineDash([]);

    // kerbs
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fillRect(x0 - 5, 0, 5, w.H);
    ctx.fillRect(x1, 0, 5, w.H);

    if (w.city.id === 'delhi') this.drawWires(w, off);
  }

  drawWires(w, off) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const y = ((k * 140 - off * 0.35) % (w.H + 200) + w.H + 200) % (w.H + 200) - 100;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(w.W / 2, y + 26 + k * 4, w.W, y - 6);
      ctx.stroke();
    }
  }

  drawPuddles(w, P) {
    const ctx = this.ctx;
    for (const p of w.puddles) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#12222c';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#9fd8ee';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawRain(w, t) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(190,225,245,0.28)';
    ctx.lineWidth = 1.4;
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

  drawHeatZone(w) {
    const ctx = this.ctx;
    const near = w.nearCart();
    ctx.save();
    ctx.globalAlpha = near ? 0.20 : 0.10;
    const g = ctx.createRadialGradient(w.cart.x, w.cart.y, 10, w.cart.x, w.cart.y, HEAT_ZONE);
    g.addColorStop(0, near ? 'rgba(255,170,60,0.9)' : 'rgba(255,140,60,0.5)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w.cart.x, w.cart.y, HEAT_ZONE, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = near ? 0.5 : 0.22;
    ctx.strokeStyle = '#ff9a3c';
    ctx.setLineDash([7, 9]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawCart(ctx, w, t) {
    const c = w.cart;
    shadow(ctx, c.x, c.y + 20, c.w * 0.5, 10);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.tilt);

    ctx.fillStyle = c.hitFlash > 0 ? '#ff6b5a' : '#c8791f';
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-c.w / 2, c.h / 2 - 8, c.w, 8);

    // tawa top
    ctx.fillStyle = '#3a2b20';
    ctx.beginPath();
    ctx.ellipse(0, -c.h / 2 + 4, c.w * 0.34, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // canopy
    ctx.fillStyle = w.city.palette.awning;
    ctx.fillRect(-c.w / 2 - 6, -c.h / 2 - 20, c.w + 12, 9);

    // wheels
    ctx.fillStyle = '#241a12';
    ctx.beginPath(); ctx.arc(-c.w / 2 + 12, c.h / 2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.w / 2 - 12, c.h / 2, 9, 0, Math.PI * 2); ctx.fill();

    // sizzle: the visual read on heat
    const s = c.sizzle;
    if (s > 0.02) {
      ctx.globalAlpha = 0.25 + s * 0.5;
      for (let i = 0; i < 3; i++) {
        const ph = t * 2.2 + i * 1.7;
        ctx.fillStyle = '#ffd9a0';
        ctx.beginPath();
        ctx.arc(-14 + i * 14 + Math.sin(ph) * 4, -c.h / 2 - 12 - ((ph * 14) % 26), 3 + s * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // cart health pips
    const pct = w.cartPct();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(c.x - 30, c.y - c.h / 2 - 32, 60, 6);
    ctx.fillStyle = pct > 0.5 ? '#7CFF9B' : pct > 0.25 ? '#ffd166' : '#ff5b4a';
    ctx.fillRect(c.x - 30, c.y - c.h / 2 - 32, 60 * pct, 6);
  }

  drawVendor(ctx, w, t) {
    const v = w.vendor;
    shadow(ctx, v.x, v.y + 14, 13, 6);
    const bounce = Math.sin(v.stepPhase) * 2.4;
    if (v.cold) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#7fb8ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(v.x, v.y, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (v.slipT > 0) {
      ctx.globalAlpha = 0.7;
      emoji(ctx, '\u{1F4A2}', v.x + 14, v.y - 20, 16);
      ctx.globalAlpha = 1;
    }
    emoji(ctx, w.char.emoji, v.x, v.y - 4 + bounce, 30);
  }

  drawCustomer(ctx, c, w) {
    shadow(ctx, c.x, c.y + c.r * 0.9, c.r * 0.85, c.r * 0.4);
    const bob = Math.sin(c.bob) * 1.8;

    if (c.markT > 0) {
      ctx.globalAlpha = 0.35 + Math.sin(c.bob * 3) * 0.1;
      ctx.strokeStyle = '#ffcf5c';
      ctx.lineWidth = 2;
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
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#ff3b2e';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // craving bubble — the order-matching read
    if (c.craving) {
      const bx = c.x + c.r + 6, by = c.y - c.r - 6;
      ctx.fillStyle = 'rgba(12,12,16,0.82)';
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = CATEGORY_COLOR[c.craving];
      ctx.lineWidth = 2;
      ctx.stroke();
      emoji(ctx, CRAVING_GLYPH[c.craving], bx, by + 0.5, 11);
    }

    // patience arc
    if (!c.angry && c.patienceMax > 0) {
      const p = clamp(c.patience / c.patienceMax, 0, 1);
      ctx.strokeStyle = p > 0.5 ? 'rgba(124,255,155,0.85)' : p > 0.25 ? 'rgba(255,209,102,0.9)' : 'rgba(255,91,74,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.stroke();
    }

    // hp
    if (c.hp < c.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(c.x - 13, c.y - c.r - 15, 26, 4);
      ctx.fillStyle = '#ff8a4a';
      ctx.fillRect(c.x - 13, c.y - c.r - 15, 26 * clamp(c.hp / c.maxHp, 0, 1), 4);
    }
  }

  drawBoss(ctx, w, b) {
    shadow(ctx, b.x, b.y + b.r * 0.8, b.r * 0.9, b.r * 0.35, 0.4);
    if (b.markT > 0) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 3;
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
      ctx.globalAlpha = 0.35 + k * 0.4;
      ctx.strokeStyle = '#ff4d3d';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      if (tg.type === 'lob') {
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.aoe, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.15 + k * 0.2;
        ctx.fillStyle = '#ff4d3d';
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.aoe * k, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = 0.16 + k * 0.2;
        ctx.fillStyle = '#ff4d3d';
        ctx.fillRect(b.x - b.r, b.y, b.r * 2, w.H - b.y);
        ctx.globalAlpha = 0.6;
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
      ctx.globalAlpha = 0.16 + a * 0.2;
      ctx.fillStyle = CATEGORY_COLOR[z.cat] || '#ffb74d';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5 * a;
      ctx.strokeStyle = '#ffce7a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawProjectiles(w) {
    const ctx = this.ctx;
    for (const p of w.projectiles) {
      if (p.behaviour === 'lob') {
        shadow(ctx, p.x, p.y, 8, 4, 0.2);
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
        ctx.fillStyle = '#7CFF9B';
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
          ctx.strokeStyle = '#ffb03a';
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
          ctx.fillStyle = '#ffca6b';
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
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath(); ctx.arc(f.x, f.y - k * 14, 8 + k * 12, 0, Math.PI * 2); ctx.fill();
          break;
        case 'turn':
        case 'text': {
          ctx.font = `800 ${f.small ? 12 : 16}px ui-rounded, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.65)';
          ctx.strokeText(f.text, f.x, f.y - k * 26);
          ctx.fillStyle = f.color || '#fff';
          ctx.fillText(f.text, f.x, f.y - k * 26);
          break;
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}

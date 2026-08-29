// Canvas painter. Sticker-book loud and daylight-bright: saturated blocks,
// hard shadows, no grime. Every city paints from its own palette, its own
// skyline and its own street furniture.

import { clamp } from './util.js';
import { CATEGORY_COLOR } from './data/dishes.js';

const HORIZON = 152;      // the far end of the street, where the city sits
                          // (below the HUD block, so the city is not drawn
                          //  behind the stop label and chips)
const BLOCK = 92;         // shopfront pitch down the pavement

// --- ground plane -----------------------------------------------------------
// The world stays a flat rectangle — every hitbox, distance and speed in
// game.js is unprojected, and stays that way. The camera is the only thing
// that knows about depth: it looks along the street from just above and behind
// Munna, so the lane, the shopfronts and the crowd all agree where the far end
// is. Because screen-y is linear in the depth parameter, the road is an exact
// trapezoid and the taper can be drawn with straight edges.
const FAR = 0.52;         // ground scale at the horizon, before normalising
const CURVE = 1.35;       // how hard the ground compresses toward the far end
const Y_TOP = -90;        // the world row the spawner works from = the horizon
const HOME = 0.66;        // Munna's home row; scale is pinned to 1 here, so the
                          // projection is identity exactly where the fight is

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

// How each customer is drawn. Presentation only — customers.js stays game data.
// Everyone is built from the same parts (legs, torso, arms, head, topper) so a
// crowd of forty reads as a crowd and not as a sticker sheet; the per-type
// colour and topper is what tells a school kid from an aunty at a glance.
const SKIN = ['#8d5524', '#a9683a', '#c68642', '#e0ac69'];

const LOOKS = {
  bhukkad:    { kind: 'person', body: '#4a7fb5', legs: '#33465e', top: 'none' },
  kid:        { kind: 'person', body: '#e8534f', legs: '#2f4858', top: 'bag',   small: true },
  aunty:      { kind: 'person', body: '#c9407a', legs: '#7a2348', top: 'bun',   drape: '#f2a13c' },
  officeRush: { kind: 'person', body: '#eef1f5', legs: '#39404d', top: 'tie',   accent: '#c0392b' },
  influencer: { kind: 'person', body: '#f6c445', legs: '#3b3b46', top: 'phone' },
  student:    { kind: 'person', body: '#5aa469', legs: '#2f4858', top: 'bag',   accent: '#2f4858' },
  pilgrim:    { kind: 'person', body: '#f2efe6', legs: '#c9b79a', top: 'shawl', drape: '#e07b39' },
  tourist:    { kind: 'person', body: '#7fc9d4', legs: '#d8cfc2', top: 'hat',   accent: '#f2efe6' },
  dog:        { kind: 'animal', body: '#c99a5b', ear: 'flop' },
  monkey:     { kind: 'animal', body: '#8a6b52', ear: 'round', face: '#d9b48f' },
  rider:      { kind: 'rider',  body: '#e8534f', legs: '#2f4858', bike: '#37474f' },
};

/** A standing figure, feet on the ground row, built to scale off the hitbox. */
function drawPerson(ctx, x, y, r, L, seed) {
  const h = r * 2.15;
  const foot = y + r * 0.92;
  const headR = r * 0.42 * (L.small ? 0.92 : 1);
  const torsoH = h * 0.40;
  const torsoW = r * (L.small ? 0.92 : 1.12);
  const torsoTop = foot - h * 0.52 - torsoH * 0.5;
  const skin = SKIN[Math.floor(seed * SKIN.length) % SKIN.length];

  // legs
  ctx.fillStyle = L.legs;
  ctx.fillRect(x - torsoW * 0.42, torsoTop + torsoH - 1, torsoW * 0.32, foot - (torsoTop + torsoH));
  ctx.fillRect(x + torsoW * 0.10, torsoTop + torsoH - 1, torsoW * 0.32, foot - (torsoTop + torsoH));

  // torso
  ctx.fillStyle = L.body;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - torsoW / 2, torsoTop, torsoW, torsoH, r * 0.3);
  else ctx.rect(x - torsoW / 2, torsoTop, torsoW, torsoH);
  ctx.fill();

  // a draped pallu / shawl over the torso, for the types that wear one
  if (L.drape) {
    ctx.fillStyle = L.drape;
    ctx.beginPath();
    ctx.moveTo(x - torsoW / 2, torsoTop + torsoH * 0.1);
    ctx.lineTo(x + torsoW * 0.14, torsoTop);
    ctx.lineTo(x + torsoW * 0.4, torsoTop + torsoH);
    ctx.lineTo(x - torsoW * 0.1, torsoTop + torsoH);
    ctx.closePath();
    ctx.fill();
  }

  // arms
  ctx.fillStyle = L.body;
  ctx.fillRect(x - torsoW * 0.72, torsoTop + torsoH * 0.1, torsoW * 0.24, torsoH * 0.68);
  ctx.fillRect(x + torsoW * 0.48, torsoTop + torsoH * 0.1, torsoW * 0.24, torsoH * 0.68);

  // head
  const hy = torsoTop - headR * 0.86;
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(x, hy, headR, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = '#2b1c14';
  ctx.beginPath();
  ctx.arc(x, hy - headR * 0.16, headR * 0.98, Math.PI * 1.06, Math.PI * 1.94);
  ctx.fill();

  switch (L.top) {
    case 'bun':
      ctx.beginPath(); ctx.arc(x - headR * 0.1, hy - headR * 1.05, headR * 0.44, 0, Math.PI * 2); ctx.fill();
      break;
    case 'hat':
      ctx.fillStyle = L.accent || '#f2efe6';
      ctx.beginPath();
      ctx.ellipse(x, hy - headR * 0.5, headR * 1.5, headR * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - headR * 0.7, hy - headR * 1.25, headR * 1.4, headR * 0.8);
      break;
    case 'tie':
      ctx.fillStyle = L.accent || '#c0392b';
      ctx.beginPath();
      ctx.moveTo(x, torsoTop);
      ctx.lineTo(x + torsoW * 0.11, torsoTop + torsoH * 0.16);
      ctx.lineTo(x, torsoTop + torsoH * 0.62);
      ctx.lineTo(x - torsoW * 0.11, torsoTop + torsoH * 0.16);
      ctx.closePath(); ctx.fill();
      break;
    case 'bag':
      ctx.fillStyle = L.accent || '#8a5a2b';
      ctx.fillRect(x + torsoW * 0.36, torsoTop + torsoH * 0.18, torsoW * 0.34, torsoH * 0.6);
      break;
    case 'shawl':
      ctx.fillStyle = L.drape || '#e07b39';
      ctx.beginPath();
      ctx.arc(x, hy, headR * 1.12, Math.PI * 0.96, Math.PI * 2.04);
      ctx.fill();
      break;
    case 'phone':
      ctx.fillStyle = '#2b2b33';
      ctx.fillRect(x + torsoW * 0.5, torsoTop - torsoH * 0.12, torsoW * 0.26, torsoH * 0.42);
      ctx.fillStyle = '#9fd8ef';
      ctx.fillRect(x + torsoW * 0.53, torsoTop - torsoH * 0.08, torsoW * 0.2, torsoH * 0.32);
      break;
  }
}

/** Stray and bandar: four legs, low to the ground, read at a glance. */
function drawAnimal(ctx, x, y, r, L) {
  const foot = y + r * 0.9;
  const bodyH = r * 0.78, bodyW = r * 1.7;
  const by = foot - bodyH * 1.15;
  ctx.fillStyle = L.body;
  ctx.fillRect(x - bodyW * 0.34, by + bodyH * 0.4, r * 0.2, foot - (by + bodyH * 0.4));
  ctx.fillRect(x + bodyW * 0.16, by + bodyH * 0.4, r * 0.2, foot - (by + bodyH * 0.4));
  ctx.beginPath();
  ctx.ellipse(x, by + bodyH * 0.3, bodyW / 2, bodyH * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  // tail
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = L.body;
  ctx.beginPath();
  ctx.moveTo(x - bodyW * 0.48, by + bodyH * 0.2);
  ctx.quadraticCurveTo(x - bodyW * 0.78, by - bodyH * 0.3, x - bodyW * 0.58, by - bodyH * 0.62);
  ctx.stroke();
  // head
  const hx = x + bodyW * 0.44, hy = by - bodyH * 0.18;
  ctx.fillStyle = L.body;
  ctx.beginPath(); ctx.arc(hx, hy, r * 0.44, 0, Math.PI * 2); ctx.fill();
  if (L.face) {
    ctx.fillStyle = L.face;
    ctx.beginPath(); ctx.ellipse(hx + r * 0.14, hy + r * 0.08, r * 0.26, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = L.body;
  if (L.ear === 'round') {
    ctx.beginPath(); ctx.arc(hx - r * 0.3, hy - r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + r * 0.34, hy - r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.2, hy - r * 0.3, r * 0.16, r * 0.3, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The delivery rider: the only customer who arrives already angry. */
function drawRider(ctx, x, y, r, L, seed) {
  const foot = y + r * 0.95;
  ctx.fillStyle = L.bike;
  ctx.beginPath();
  ctx.ellipse(x, foot - r * 0.2, r * 1.15, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22282e';
  ctx.beginPath(); ctx.arc(x - r * 0.78, foot - r * 0.1, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.78, foot - r * 0.1, r * 0.3, 0, Math.PI * 2); ctx.fill();
  drawPerson(ctx, x, y - r * 0.5, r * 0.86, { ...L, top: 'none' }, seed);
  // helmet
  ctx.fillStyle = '#e8534f';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.5 - r * 0.86 * 1.02, r * 0.42, Math.PI, Math.PI * 2);
  ctx.fill();
}

/** Blend two hex colours — aerial perspective washes distance toward the sky. */
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${g},${bl})`;
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

  /* ---------------------------------------------------------- projection */

  /** Depth parameter: 0 at the horizon, 1 at the near edge of the screen. */
  gp(w, y) {
    const u = clamp((y - Y_TOP) / (w.H - Y_TOP), 0, 1);
    return u / (u + CURVE * (1 - u));
  }

  /** Ground scale at a world row — 1 exactly on Munna's home row. */
  gs(w, y) { return (FAR + (1 - FAR) * this.gp(w, y)) / this._norm; }

  gy(w, y) { return HORIZON + this.gp(w, y) * (w.H - HORIZON); }
  gx(w, x, y) { const m = w.W / 2; return m + (x - m) * this.gs(w, y); }

  /**
   * Run a draw in world coordinates, placed and scaled on the ground plane.
   * Everything that stands on the street goes through this, which is what lets
   * the per-actor painters below stay written in plain world space.
   */
  ground(w, x, y, fn) {
    const ctx = this.ctx;
    const s = this.gs(w, y);
    ctx.save();
    ctx.translate(this.gx(w, x, y), this.gy(w, y));
    ctx.scale(s, s);
    ctx.translate(-x, -y);
    fn(ctx, s);
    ctx.restore();
  }

  draw(w, t) {
    const ctx = this.ctx;
    const P = w.city.palette;
    // Pin the scale to 1 on Munna's row, so near actors grow and far ones
    // shrink around the band the player actually fights in.
    this._norm = FAR + (1 - FAR) * this.gp(w, w.H * HOME);
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
      // Actors stand on the ground plane: near ones grow, far ones shrink.
      this.ground(w, a.o.x, a.o.y, () => {
        if (a.kind === 'cust') this.drawCustomer(ctx, a.o, w);
        else if (a.kind === 'hero') this.drawHero(ctx, w, t);
        else this.drawBoss(ctx, w, a.o);
      });
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

  /** A world-space strip of road paint, projected. Foreshortens on its own. */
  gstrip(ctx, w, cx, halfW, ya, yb) {
    const sa = this.gs(w, ya), sb = this.gs(w, yb);
    const ax = this.gx(w, cx, ya), bx = this.gx(w, cx, yb);
    ctx.beginPath();
    ctx.moveTo(ax - halfW * sa, this.gy(w, ya));
    ctx.lineTo(ax + halfW * sa, this.gy(w, ya));
    ctx.lineTo(bx + halfW * sb, this.gy(w, yb));
    ctx.lineTo(bx - halfW * sb, this.gy(w, yb));
    ctx.closePath();
    ctx.fill();
  }

  /**
   * The far city, in three depth bands. Aerial perspective does the work: the
   * further a band sits, the paler it washes toward the sky and the slower it
   * drifts. There is no line where the city meets the street — the base of the
   * skyline dissolves into haze, because a hard edge there is what made the
   * whole thing read as a sticker pasted across the top.
   */
  drawHorizon(w, P, t) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 40);
    g.addColorStop(0, P.skyTop);
    g.addColorStop(1, P.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, w.W + 40, HORIZON + 60);

    const bands = [
      { depth: 0.34, drift: 0.018, lift: 16, squash: 0.62 },
      { depth: 0.62, drift: 0.038, lift: 7, squash: 0.82 },
      { depth: 1.00, drift: 0.070, lift: 0, squash: 1.00 },
    ];

    ctx.save();
    // Back to front. Each band is pre-blended toward the sky rather than washed
    // over afterwards — overlaying a wash is what turned the city into a smear.
    for (const b of bands) {
      const off = (w.scroll * b.drift) % w.W;
      const col = mix(P.far, P.skyBot, (1 - b.depth) * 0.72);
      const base = HORIZON + 2 - b.lift;
      ctx.globalAlpha = 1;
      for (let pass = 0; pass < 2; pass++) {
        const dx = pass === 0 ? -off : w.W - off;
        // Offset each band along the row so they don't stack into one shape.
        for (const s of w.city.skyline) {
          this.skylineShape(ctx, s, dx + b.depth * 61, w.W, col, base, b.squash);
        }
      }
    }
    ctx.restore();

    // The dissolve across the join is painted by drawStreet, which runs after
    // this and would otherwise cover it.
  }

  skylineShape(ctx, s, dx, W, col, base = HORIZON, squash = 1) {
    ctx.fillStyle = col;
    const x = dx + s.x * W;
    const wide = (s.w < 1 ? s.w * W : s.w) * squash;
    const h = s.h * squash;
    const top = base - h;
    switch (s.t) {
      case 'block':
        ctx.fillRect(x - wide / 2, top, wide, h);
        if (squash > 0.9 && wide > 20) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < Math.min(3, Math.floor(h / 18)); j++) {
              ctx.fillRect(x - wide / 2 + 6 + i * (wide / 3.4), top + 8 + j * 16, 6, 8);
            }
          }
          ctx.restore();
        }
        break;
      case 'dome':
        ctx.beginPath();
        ctx.ellipse(x, top + h * 0.62, wide / 2, h * 0.62, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x - wide / 2, top + h * 0.6, wide, h * 0.4);
        ctx.fillRect(x - 2 * squash, top - 10 * squash, 4 * squash, 12 * squash);
        break;
      case 'minar':
        ctx.fillRect(x - wide / 2, top, wide, h);
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
        ctx.fillRect(x - wide / 2, base - h * 0.5, wide, h * 0.5);
        ctx.beginPath();
        ctx.ellipse(x, base - h * 0.5, wide / 2, h * 0.5, 0, Math.PI, 0);
        ctx.fill();
        break;
      case 'bridge': {
        ctx.strokeStyle = col;
        const half = wide / 2;
        ctx.fillRect(x - half, base - 12 * squash, wide, 8 * squash);
        ctx.fillRect(x - half + 10 * squash, top, 10 * squash, h);
        ctx.fillRect(x + half - 20 * squash, top, 10 * squash, h);
        ctx.lineWidth = 3 * squash;
        ctx.beginPath();
        ctx.moveTo(x - half + 15 * squash, top + 6 * squash);
        ctx.quadraticCurveTo(x, base - 4, x + half - 15 * squash, top + 6 * squash);
        ctx.stroke();
        break;
      }
      case 'wheel':
        ctx.strokeStyle = col;
        ctx.lineWidth = 3 * squash;
        ctx.beginPath();
        ctx.arc(x, base - h, wide / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillRect(x - 2 * squash, base - h, 4 * squash, h);
        break;
      case 'lighthouse':
        ctx.beginPath();
        ctx.moveTo(x - wide / 2, base);
        ctx.lineTo(x - wide / 4, top);
        ctx.lineTo(x + wide / 4, top);
        ctx.lineTo(x + wide / 2, base);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - wide * 0.45, top - 8 * squash, wide * 0.9, 8 * squash);
        break;
      case 'gopuram':
        for (let i = 0; i < 4; i++) {
          const k = i / 4;
          const ww = wide * (1 - k * 0.55);
          ctx.fillRect(x - ww / 2, base - h * (k + 0.25), ww, h * 0.26);
        }
        break;
      case 'church':
        ctx.fillRect(x - wide / 2, base - h * 0.55, wide, h * 0.55);
        ctx.beginPath();
        ctx.moveTo(x, base - h);
        ctx.lineTo(x + wide * 0.28, base - h * 0.55);
        ctx.lineTo(x - wide * 0.28, base - h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - 2 * squash, base - h - 12 * squash, 4 * squash, 12 * squash);
        break;
      case 'palm':
        ctx.fillRect(x - 2 * squash, base - h, 5 * squash, h);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i / 4) * Math.PI;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * wide * 0.5, base - h + Math.sin(a) * 8 * squash + 4,
            wide * 0.55, 5 * squash, a * 0.4, 0, Math.PI * 2);
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
    const yT = Y_TOP, yB = w.H;
    const sT = this.gs(w, yT), sB = this.gs(w, yB);
    const m = w.W / 2;
    const l = { tx0: m + (x0 - m) * sT, tx1: m + (x1 - m) * sT,
                bx0: m + (x0 - m) * sB, bx1: m + (x1 - m) * sB };
    const yTop = this.gy(w, yT);

    // Pavements first, out to the frustum edge — they are what the road sits in.
    ctx.fillStyle = P.kerb;
    ctx.beginPath();
    ctx.moveTo(0, yTop); ctx.lineTo(l.tx0, yTop);
    ctx.lineTo(l.bx0, yB); ctx.lineTo(0, yB);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(l.tx1, yTop); ctx.lineTo(w.W, yTop);
    ctx.lineTo(w.W, yB); ctx.lineTo(l.bx1, yB);
    ctx.closePath(); ctx.fill();

    // The road: one trapezoid running to the far end.
    ctx.fillStyle = P.road;
    ctx.beginPath();
    ctx.moveTo(l.tx0, yTop); ctx.lineTo(l.tx1, yTop);
    ctx.lineTo(l.bx1, yB); ctx.lineTo(l.bx0, yB);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fill();
    this.drawRoadTexture(w, P, off);
    this.drawRoadMarks(w, P, x0, x1, off);
    ctx.restore();

    this.drawShopRow(w, P, -1);
    this.drawShopRow(w, P, 1);

    // Kerb edge, tapering with the lane instead of running straight down.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(l.tx0, yTop); ctx.lineTo(l.bx0, yB);
    ctx.moveTo(l.tx1, yTop); ctx.lineTo(l.bx1, yB);
    ctx.stroke();

    // Dissolve the join. The band straddles the seam — up into the city and
    // down onto the road — so the far end fades out instead of stopping on a
    // line. This is the whole reason the top of the screen read as a pasted
    // strip before: a hard horizontal edge across the full width.
    const top = yTop - 54, bot = yTop + 132;
    const haze = ctx.createLinearGradient(0, top, 0, bot);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(0.34, P.skyBot);
    haze.addColorStop(0.46, P.skyBot);
    haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = haze;
    ctx.fillRect(0, top, w.W, bot - top);
    ctx.globalAlpha = 1;
  }

  /** Grain, patches and wear, scrolling with the street so motion reads. */
  drawRoadTexture(w, P, off) {
    const ctx = this.ctx;
    const PITCH = 46;
    const base = Math.floor(off / PITCH);
    const rows = Math.ceil((w.H - HORIZON) / PITCH) + 3;
    ctx.fillStyle = '#3a2a1a';
    for (let i = -2; i < rows; i++) {
      const idx = base + i;
      const yy = Y_TOP + (i * PITCH) + (PITCH - (off % PITCH));
      if (yy > w.H) continue;
      const r = h1(idx * 2.7), r2 = h1(idx * 8.3 + 1), r3 = h1(idx * 4.1 + 5);
      const s = this.gs(w, yy);
      const sx = this.gx(w, w.lane.x0 + (w.lane.x1 - w.lane.x0) * r, yy);
      const sy = this.gy(w, yy);
      ctx.globalAlpha = 0.025 + r2 * 0.03;
      ctx.beginPath();
      ctx.ellipse(sx, sy, (7 + r2 * 15) * s, (3 + r3 * 5) * s, r * 3, 0, Math.PI * 2);
      ctx.fill();
      // a lighter scuff, so the surface isn't only dark blotches
      ctx.globalAlpha = 0.03 + r3 * 0.025;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(this.gx(w, w.lane.x0 + (w.lane.x1 - w.lane.x0) * r3, yy), sy + 8 * s,
        (6 + r * 12) * s, (2 + r2 * 3) * s, r2 * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2a1a';
    }
    ctx.globalAlpha = 1;
  }

  /** What is painted on the road is part of the city, not decoration:
      lane dashes, tram rails, or nothing at all on sand. Every mark is laid
      in world space and projected, so it converges with the lane. */
  drawRoadMarks(w, P, x0, x1, off) {
    const ctx = this.ctx;
    const mid = (x0 + x1) / 2;

    if (w.city.roadMark === 'tram') {
      for (const k of [-34, 34]) {
        ctx.globalAlpha = 0.75; ctx.fillStyle = '#6f6257';
        this.gstrip(ctx, w, mid + k, 2.5, Y_TOP, w.H);
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#d8cfc2';
        this.gstrip(ctx, w, mid + k, 1, Y_TOP, w.H);
      }
      // sleepers, foreshortening as they recede
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#8a7660';
      const SP = 33;
      for (let i = -2, n = Math.ceil((w.H - Y_TOP) / SP) + 3; i < n; i++) {
        const ya = Y_TOP + i * SP + (SP - (off % SP));
        if (ya > w.H) continue;
        const s = this.gs(w, ya);
        ctx.fillRect(this.gx(w, mid - 44, ya), this.gy(w, ya), 88 * s, 5 * s);
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (w.city.roadMark === 'sand') {
      // Marina and Miramar: no lanes, just the tide's own lines.
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = P.roadLine;
      for (let k = 0; k < 7; k++) {
        const y = Y_TOP + (((k * 150 - off * 0.5) % (w.H + 240) + w.H + 240) % (w.H + 240));
        if (y > w.H) continue;
        const s = this.gs(w, y);
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(this.gx(w, x0, y), this.gy(w, y));
        ctx.quadraticCurveTo(this.gx(w, mid, y), this.gy(w, y) + 22 * s,
          this.gx(w, x1, y), this.gy(w, y) - 8 * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }

    // Centre dashes, each one a projected strip so it shortens with distance.
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = P.roadLine;
    const PITCH = 60, DASH = 26;
    for (let i = -2, n = Math.ceil((w.H - Y_TOP) / PITCH) + 3; i < n; i++) {
      const ya = Y_TOP + i * PITCH + (PITCH - (off % PITCH));
      if (ya > w.H) continue;
      this.gstrip(ctx, w, mid, 2.5, ya, Math.min(w.H, ya + DASH));
    }
    // Edge lines run the whole way and converge with the kerb.
    ctx.globalAlpha = 0.5;
    this.gstrip(ctx, w, x0 + 12, 1.5, Y_TOP, w.H);
    this.gstrip(ctx, w, x1 - 12, 1.5, Y_TOP, w.H);
    ctx.globalAlpha = 1;
  }

  /**
   * One pavement strip: shopfront blocks seen at a slight angle, so the facade
   * a block presents to the lane narrows as it recedes. Every block rolls its
   * own width, sign band, awning and palette slot off the scroll index, which
   * is what stops the row reading as repeating wallpaper.
   */
  drawShopRow(w, P, side) {
    const ctx = this.ctx;
    const off = w.scroll;
    const cols = [P.shopA, P.shopB, P.shopC];
    const laneX = side < 0 ? w.lane.x0 : w.lane.x1;
    const edge = side < 0 ? 0 : w.W;
    const rows = Math.ceil((w.H - HORIZON) / BLOCK) + 3;
    const base = Math.floor(off / BLOCK);

    ctx.save();
    // Clip to this pavement so nothing leaks over the road.
    const yTop = this.gy(w, Y_TOP);
    const tx = this.gx(w, laneX, Y_TOP), bx = this.gx(w, laneX, w.H);
    ctx.beginPath();
    ctx.moveTo(edge, yTop); ctx.lineTo(tx, yTop);
    ctx.lineTo(bx, w.H); ctx.lineTo(edge, w.H);
    ctx.closePath();
    ctx.clip();

    for (let i = -2; i < rows; i++) {
      const idx = base + i;
      const ya = Y_TOP + i * BLOCK - (off % BLOCK);
      const yb = ya + BLOCK - 8;
      if (ya > w.H) continue;

      const r = h1(idx * (side + 3.7));
      const r2 = h1(idx * 6.1 + side * 2.3);
      const r3 = h1(idx * 11.7 + side);
      const shop = cols[Math.floor(h1(idx * 3.3 + side * 7) * cols.length)];

      const yA = this.gy(w, ya), yB = this.gy(w, yb);
      const sA = this.gs(w, ya), sB = this.gs(w, yb);
      const aX = this.gx(w, laneX, ya), bX = this.gx(w, laneX, yb);
      // How far this block stands back off the kerb — varied per block.
      const setback = (6 + r2 * 20) * side;
      const aI = this.gx(w, laneX + setback, ya);
      const bI = this.gx(w, laneX + setback, yb);

      // shop body: a trapezoid from the frustum edge to its own setback
      ctx.fillStyle = shop;
      ctx.beginPath();
      ctx.moveTo(edge, yA); ctx.lineTo(aI, yA);
      ctx.lineTo(bI, yB); ctx.lineTo(edge, yB);
      ctx.closePath(); ctx.fill();

      // signboard, hung along the top of the block in the city's own script
      const signH = (22 + r3 * 14);
      const ys = Math.min(yb, ya + signH);
      const sX = this.gx(w, laneX + setback, ys);
      ctx.fillStyle = r > 0.5 ? P.accent : P.awning;
      ctx.beginPath();
      ctx.moveTo(edge, yA); ctx.lineTo(aI, yA);
      ctx.lineTo(sX, this.gy(w, ys)); ctx.lineTo(edge, this.gy(w, ys));
      ctx.closePath(); ctx.fill();

      const sign = w.city.signs[Math.floor(r * w.city.signs.length)];
      ctx.save();
      ctx.translate((edge + aI) / 2, (yA + this.gy(w, ys)) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(sA, sA);
      ctx.fillStyle = '#fff';
      ctx.font = '800 11px system-ui, "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign, 0, 0.5);
      ctx.restore();

      // shutter ribs, only on some blocks
      if (r2 > 0.35) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#000';
        for (let k = 0; k < 3; k++) {
          const yr = ya + signH + 8 + k * 11;
          if (yr > yb) break;
          const s = this.gs(w, yr);
          const rx = this.gx(w, laneX + setback, yr);
          ctx.fillRect(Math.min(edge, rx), this.gy(w, yr), Math.abs(rx - edge), 4 * s);
        }
        ctx.globalAlpha = 1;
      }

      // doorway, so a shop reads as a shop and not a stripe
      if (r3 > 0.28) {
        const yd = yb - 26;
        if (yd > ya + signH) {
          const s = this.gs(w, yd);
          const dx0 = this.gx(w, laneX + setback * 0.3, yd);
          const dOut = edge + (dx0 - edge) * 0.55;
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(Math.min(dOut, dx0), this.gy(w, yd), Math.abs(dx0 - dOut) * 0.7, 22 * s);
          ctx.globalAlpha = 1;
        }
      }

      // striped awning on the kerb side, on roughly half the blocks
      if (r > 0.42) {
        const ya2 = ya + signH + 2;
        const s = this.gs(w, ya2);
        const ax = this.gx(w, laneX + setback, ya2);
        const aw = 16 * s * -side;
        ctx.fillStyle = P.awning;
        ctx.fillRect(Math.min(ax, ax + aw), this.gy(w, ya2), Math.abs(aw), 13 * s);
        ctx.fillStyle = P.awning2;
        for (let k = 0; k < 3; k++) {
          ctx.fillRect(Math.min(ax, ax + aw) + (1 + k * 5) * s, this.gy(w, ya2), 2.5 * s, 13 * s);
        }
      }

      // street furniture, standing in front of the shop
      if (r > 0.38) {
        const props = w.city.props;
        const pr = props[Math.floor(h1(idx * 5.3 + side) * props.length)];
        const yp = yb - 22;
        const s = this.gs(w, yp);
        emoji(ctx, pr, (edge + this.gx(w, laneX + setback, yp)) / 2, this.gy(w, yp),
          Math.min(23, Math.abs(edge - bX) * 0.66) * s);
      }

      // hard shadow in the gap between blocks
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#3a2a1a';
      const yg = yb, yg2 = Math.min(w.H, yb + 8);
      ctx.beginPath();
      ctx.moveTo(edge, this.gy(w, yg)); ctx.lineTo(bI, this.gy(w, yg));
      ctx.lineTo(this.gx(w, laneX + setback, yg2), this.gy(w, yg2));
      ctx.lineTo(edge, this.gy(w, yg2));
      ctx.closePath(); ctx.fill();
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
    const hx = this.gx(w, w.hero.x, w.hero.y), hy = this.gy(w, w.hero.y);
    const g = ctx.createRadialGradient(hx, hy, 40, hx, hy, 300);
    g.addColorStop(0, 'rgba(40,18,58,0)');
    g.addColorStop(0.55, `rgba(46,20,64,${k * 0.42})`);
    g.addColorStop(1, `rgba(28,12,44,${k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w.W, w.H);
    // the tawa itself throws light
    ctx.globalCompositeOperation = 'lighter';
    const l = ctx.createRadialGradient(hx, hy, 0, hx, hy, 120);
    l.addColorStop(0, `rgba(255,180,80,${0.22 * w.hero.sizzle})`);
    l.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = l;
    ctx.fillRect(0, 0, w.W, w.H);
    ctx.globalCompositeOperation = 'source-over';
  }

  drawPatches(w, P) {
    const ctx = this.ctx;
    for (const p of w.patches) this.ground(w, p.x, p.y, () => {
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
    });
  }

  drawSweepers(w) {
    const ctx = this.ctx;
    for (const s of w.sweepers) {
      if (s.warn > 0) {
        // Telegraph the whole line before anything moves.
        const k = 1 - clamp(s.warn / s.cfg.warn, 0, 1);
        const mid = (w.lane.x0 + w.lane.x1) / 2;
        const half = (w.lane.x1 - w.lane.x0) / 2;
        ctx.globalAlpha = 0.2 + k * 0.3;
        ctx.fillStyle = '#ff3b30';
        this.gstrip(ctx, w, mid, half, s.y - 24, s.y + 24);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#ff3b30';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        continue;
      }
      this.ground(w, s.x, s.y, () => {
        shadow(ctx, s.x, s.y + 16, 34, 9, 0.3);
        emoji(ctx, s.cfg.emoji, s.x, s.y, 58);
      });
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
    const R = 15;

    // Dadi's brass tawa, slung on his back. This is the weapon and the story.
    ctx.save();
    ctx.translate(h.x - h.facing * 15, hy - 2);
    ctx.rotate(h.facing * 0.32);
    ctx.fillStyle = h.cold ? '#8497a8' : '#b8862c';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = h.cold ? '#a8b8c6' : '#e0ac45';
    ctx.beginPath(); ctx.ellipse(0, -1.5, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Munna himself, drawn like the crowd he is walking into: white cook's
    // kurta, apron, topi. He was the last emoji left on the street.
    ctx.save();
    if (h.hitFlash > 0) ctx.filter = 'brightness(2.4)';
    if (h.invuln > 0) ctx.globalAlpha = 0.62;
    ctx.translate(0, bounce);
    drawPerson(ctx, h.x, h.y - 4, R, {
      kind: 'person', body: '#fbf6ec', legs: '#5b6672', top: 'none',
    }, 0.55);
    // apron over the kurta, in the tawa's brass
    ctx.fillStyle = h.cold ? '#8497a8' : '#d9932f';
    ctx.fillRect(h.x - R * 0.44, h.y - 4 - R * 0.06, R * 0.88, R * 0.72);
    // topi
    ctx.fillStyle = '#fffdf7';
    const topY = h.y - 4 - R * 1.28;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(h.x - R * 0.46, topY - R * 0.44, R * 0.92, R * 0.6, R * 0.22);
    else ctx.rect(h.x - R * 0.46, topY - R * 0.44, R * 0.92, R * 0.6);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

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
    // Contact shadow on the ground row, so the figure stands on the street
    // instead of floating over it.
    shadow(ctx, c.x, c.y + c.r * 0.92, c.r * 0.8, c.r * 0.3, 0.26);
    const bob = Math.sin(c.bob) * 1.8;

    if (c.markT > 0) {
      ctx.globalAlpha = 0.45 + Math.sin(c.bob * 3) * 0.12;
      ctx.strokeStyle = '#ff8a00';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Anger reads on the ground, not as a wash over the figure — a tint would
    // fight the body colour that tells the types apart.
    if (c.angry) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + c.r * 0.92, c.r * 0.95, c.r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const L = LOOKS[c.def.id] || LOOKS.bhukkad;
    const seed = h1(c.seedN || 1);
    ctx.save();
    if (c.hitFlash > 0) ctx.filter = 'brightness(2.2)';
    ctx.translate(0, bob);
    if (L.kind === 'animal') drawAnimal(ctx, c.x, c.y, c.r, L);
    else if (L.kind === 'rider') drawRider(ctx, c.x, c.y, c.r, L, seed);
    else drawPerson(ctx, c.x, c.y, c.r, L, seed);
    ctx.restore();

    if (c.angry) {
      // the vein-pop, kept small and above the head
      ctx.globalAlpha = 0.95;
      emoji(ctx, '\u{1F4A2}', c.x + c.r * 0.85, c.y - c.r * 1.5 + bob, c.r * 0.95);
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
        this.ground(w, tg.x, tg.y, () => {
          ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.aoe, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.16 + k * 0.22;
          ctx.fillStyle = '#ff3b30';
          ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.aoe * k, 0, Math.PI * 2); ctx.fill();
        });
      } else {
        // the lane the boss is about to sweep, converging with the street
        ctx.globalAlpha = 0.18 + k * 0.22;
        ctx.fillStyle = '#ff3b30';
        this.gstrip(ctx, w, b.x, b.r, b.y, w.H);
        ctx.globalAlpha = 0.7;
        ctx.stroke();
      }
      ctx.restore();
      ctx.setLineDash([]);
    }
  }

  drawZones(w) {
    const ctx = this.ctx;
    for (const z of w.zones) this.ground(w, z.x, z.y, () => {
      const a = clamp(z.life / z.maxLife, 0, 1);
      ctx.globalAlpha = 0.22 + a * 0.24;
      ctx.fillStyle = CATEGORY_COLOR[z.cat] || '#ff8a00';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7 * a;
      ctx.strokeStyle = '#fff3d0'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  drawProjectiles(w) {
    const ctx = this.ctx;
    for (const p of w.projectiles) this.ground(w, p.x, p.y, () => {
      if (p.behaviour === 'lob') {
        shadow(ctx, p.x, p.y, 8, 4, 0.18);
        emoji(ctx, p.emoji, p.x, p.y - p.arc, 22);
      } else {
        emoji(ctx, p.emoji, p.x, p.y, p.r * 2.2);
      }
    });
  }

  drawPickups(w) {
    const ctx = this.ctx;
    for (const pu of w.pickups) {
      const blink = pu.life < 3 && Math.floor(pu.life * 8) % 2 === 0;
      if (blink) continue;
      this.ground(w, pu.x, pu.y, () => {
      if (pu.type === 'coin') {
        emoji(ctx, '\u{1FA99}', pu.x, pu.y, 17);
      } else {
        ctx.fillStyle = '#3fb26a';
        ctx.beginPath(); ctx.arc(pu.x, pu.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(pu.x, pu.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      });
    }
  }

  drawFx(w) {
    const ctx = this.ctx;
    for (const f of w.effects) this.ground(w, f.x, f.y, () => {
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
    });
  }
}

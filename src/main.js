// Bootstrap: layout, loop, and the wiring between World and UI.

import { World } from './game.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { CITIES } from './data/cities.js';

const LOGICAL_W = 480;
const LOGICAL_H = 854;

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const ui = new UI();

let world = null;
let paused = false;
let selectedCity = 'delhi';

/* ------------------------------------------------------------------ layout */

function layout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
  const cw = Math.floor(LOGICAL_W * scale);
  const ch = Math.floor(LOGICAL_H * scale);

  canvas.width = Math.floor(LOGICAL_W * dpr);
  canvas.height = Math.floor(LOGICAL_H * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderer.ctx.imageSmoothingEnabled = true;

  const hud = ui.el.hud;
  hud.style.left = Math.round((vw - cw) / 2) + 'px';
  hud.style.top = Math.round((vh - ch) / 2) + 'px';
  hud.style.width = cw + 'px';
  hud.style.height = ch + 'px';
  hud.style.transformOrigin = 'top left';
  hud.style.fontSize = Math.max(11, 16 * Math.min(1, scale)) + 'px';
}
addEventListener('resize', layout);
addEventListener('orientationchange', () => setTimeout(layout, 120));

/* -------------------------------------------------------------------- run */

const hooks = {
  onBanner: (a, b) => ui.banner(a, b),
  onLevelUp: (offers, level) => {
    ui.showOffers(offers, level, (o) => {
      ui.hideOffers();
      world.resolveLevelUp(o);
    });
  },
  onStopClear: (info) => ui.showStopClear(info, world.city),
  onGameOver: (info) => { ui.hideStopClear(); ui.showOver(info, world.city); },
  onVictory: (info) => ui.showVictory(info),
};

function startRun(cityId, charId) {
  world = new World(LOGICAL_W, LOGICAL_H, hooks);
  world.start(cityId, charId);
  paused = false;
  ui.showGame();
  layout();
}

function goto(name) {
  paused = false;
  if (name === 'title') { world = null; ui.show('title'); }
  else if (name === 'city') {
    world = null;
    ui.buildCities((id) => {
      selectedCity = id;
      ui.buildChars(id, (charId) => startRun(id, charId));
      ui.show('char');
    });
    ui.show('city');
  }
}

for (const b of document.querySelectorAll('[data-go]')) {
  b.addEventListener('click', () => goto(b.dataset.go));
}
document.getElementById('btnContinue').addEventListener('click', () => {
  ui.hideStopClear();
  world.advanceStop();
});
document.getElementById('btnBail').addEventListener('click', () => {
  world.bail();
});
document.getElementById('btnResume').addEventListener('click', () => togglePause(false));
ui.el.aromaBtn.addEventListener('click', (e) => { e.preventDefault(); input.queueAroma(); });
ui.el.aromaBtn.addEventListener('touchstart', (e) => { e.preventDefault(); input.queueAroma(); }, { passive: false });

function togglePause(on) {
  if (!world || world.state === 'over' || world.state === 'won') return;
  paused = on ?? !paused;
  ui.screens.pause.classList.toggle('hidden', !paused);
}
addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });

/* ------------------------------------------------------------------- loop */

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 1 / 20) dt = 1 / 20;   // never let a stall teleport the crowd

  if (input.takePause()) togglePause();

  if (world) {
    if (!paused) world.update(dt, input);
    renderer.draw(world, now / 1000);
    ui.syncHud(world);
  } else {
    const ctx = renderer.ctx;
    ctx.fillStyle = '#120b06';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }
  requestAnimationFrame(frame);
}

/* -------------------------------------------------------------------- pwa */

if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // A new build activating means the cached shell is stale — take it once.
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', () => {}));
    }).catch(() => { /* offline install is a bonus, never a blocker */ });
  });
}

const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const installBtn = document.getElementById('btnInstall');
const iosHint = document.getElementById('iosHint');
let installPrompt = null;

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  if (!standalone) installBtn.classList.remove('hidden');
});
installBtn.addEventListener('click', async () => {
  if (!installPrompt) return;
  installBtn.classList.add('hidden');
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
});
addEventListener('appinstalled', () => installBtn.classList.add('hidden'));

// iOS has no install prompt — tell people where the button actually is.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isIOS && !standalone) iosHint.classList.remove('hidden');

/* ------------------------------------------------------------------- boot */

layout();
goto('title');
requestAnimationFrame(frame);

// Handy for poking at balance from the console — and for driving the game
// deterministically when rAF is throttled (background tabs, headless checks).
window.THELA = {
  get world() { return world; },
  get renderer() { return renderer; },
  startRun, CITIES,
  step(seconds, dt = 1 / 60) {
    const n = Math.round(seconds / dt);
    for (let i = 0; i < n; i++) {
      if (!world) break;
      if (world.state === 'playing') world.update(dt, input);
    }
    if (world) {
      renderer.draw(world, performance.now() / 1000);
      ui.syncHud(world);
    }
    return n;
  },
};

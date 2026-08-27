# THELA — Street Food Survivors

A forward-scrolling survivor set on Indian streets. You push a food cart down a
gully while a hungry mob closes in. Every enemy is a customer; killing is serving.

Playable prototype: **Delhi (Chandni Chowk)** and **Mumbai (Dadar, monsoon)**,
with **Munna** and **PK** as vendors. Full design: [`docs/thela-concept.md`](docs/thela-concept.md).

## Play it

**On your phone:** open the GitHub Pages link, then add it to your home screen.
It installs as a PWA — fullscreen, portrait-locked, and fully playable offline
once the shell is cached.

- Android/Chrome: an **Install to home screen** button appears on the title screen.
- iPhone/Safari: **Share → Add to Home Screen**.

**Locally:**

```bash
npm start          # or: python3 -m http.server 8123
```

Then open <http://localhost:8123>. No build step, no dependencies — plain ES
modules and a 2D canvas. `npm run build:sw` regenerates the service worker's
precache list from the file tree; run it after adding or renaming any shipped
file, or the new file won't be cached offline.

**Controls** — WASD / arrows to move, `SPACE` for tadka (aroma), `P`/`Esc` to
pause. On touch: drag anywhere to move, tap the chilli button for tadka.

## The six mechanics

| Mechanic | Where it lives |
|---|---|
| **Heat (tawa)** | `World.updateHeat` — firing drains, only the cart's radius refills it. Empty = *cold tawa*: half fire rate, half damage. |
| **Aroma (tadka)** | `World.tadka` — pulls the crowd onto you, and marks them: aroma-marked customers stop caring what they ordered. |
| **Order matching** | `World.damage` — the right category does full damage, the wrong one half. Aunty takes 15% from a wrong order. |
| **Cart is your HP** | `World.damageCart` — the cart trails you around the lane and tipping it ends the run. |
| **Patience → hostility** | `updateCustomer` — unserved customers never despawn; at zero patience they turn and charge the cart. |
| **Regional pantry** | `data/cities.js` — each city's `pantry` decides which ingredients (and so which dishes) can appear at all. |

Serving someone before their patience burns down pays a **GARAM GARAM** premium —
that's the greed lever. Bait a bigger cluster, get paid more, risk the cart.

## Cities are rule changes

- **Delhi** — 300px lane (tightest in the game), strays that steal heat off the cart, chaat-heavy cravings, overhead wire tangle.
- **Mumbai** — wider lane but rain drains heat continuously, puddles halve the cart's follow speed and forward push, fastest waves, delivery riders that spawn permanently hostile.

## Layout

```
index.html            shell + HUD/screens markup
manifest.webmanifest  PWA metadata
sw.js                 generated — precaches the whole shell, cache-first
icons/                generated app icons (any + maskable)
css/style.css
src/
  main.js             layout, loop, World↔UI wiring
  game.js             World: the six mechanics, stops, bosses, damage
  entities.js         factories + self-contained per-frame behaviour
  render.js           canvas painter
  input.js            keyboard + drag-anywhere stick
  ui.js               HUD readouts, screens, level-up cards
  util.js
  data/               cities · characters · customers · dishes+recipes
  systems/            spawner (wave director) · levelup (offer rolls)
```

`window.THELA.world` is exposed for poking at balance from the console.

## Balance

Tuned against a headless bot harness (no DOM) that plays the full route:
`npm run sim` (`RUNS=25 npm run sim` for a bigger sample). Current state,
25 runs per combination:

| Route | Route clears | Avg stop reached |
|---|---|---|
| Delhi / PK (off-city) | 6/25 | 4.7 / 5 |
| Delhi / Munna (home) | 1/25 | 4.6 / 5 |
| Mumbai / PK (home) | 3/25 | 2.6 / 5 |
| Mumbai / Munna (off-city) | 0/25 | 1.9 / 5 |

Two readings. Delhi is the onramp and Mumbai is the step up — that gap is doing
what it should. But PK out-clears Munna even in Munna's own city, so the home
bonus is currently weaker than the raw gap between a fast single-target station
and a spread one. Munna needs a buff, not Delhi a nerf.

The bot is a crude floor, not a skilled player — it hugs the cart and only spends
tadka on clusters of six or more, so a human should clear well above these rates.

## Checks

```bash
npm run smoke      # drives real render.js + ui.js against DOM/canvas stubs
RUNS=25 npm run sim  # headless balance sweep
```

`smoke` plays four routes plus both boss fights, asserting that every draw path
and every screen transition (banner, level-up, stop-clear, tipped, victory)
actually fires. It caught the bug where killing a boss set `won` and the stop
timer immediately overwrote it with `stopclear`.

Verified in Chrome too: HUD binds live, level-up modal opens, the canvas paints
real Delhi shopfront/road/cart pixels, no console errors. Offline was checked by
killing the dev server and reloading — the shell booted from the service-worker
cache and a Mumbai run played through with the right palette and lane width.

## Not built yet

Six remaining cities, six remaining vendors, meta progression (the Thela upgrade
tree, Recipe Book, Regulars, travelling recipes), and audio. All specified in the
concept doc.

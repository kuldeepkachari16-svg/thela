# THELA — Street Food Survivors

A forward-scrolling survivor set on Indian streets. **Munna** walks a gully with
his grandmother's brass tawa on his back while a hungry mob closes in. Every
enemy is a customer; killing is serving.

There is no cart to defend. Dadi's thela was cleared out of Chandni Chowk when
she died and her recipe book was broken up, one page sold to a halwai in every
city she ever cooked in. Munna is walking all eight of them to get the pages
back — **THELA is the thing he's earning, not the thing he's protecting.**

All eight cities are playable. Full design: [`docs/thela-concept.md`](docs/thela-concept.md).

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
**Stand still to stoke the tawa** — that's the whole heat loop.

`#city=goa&t=30` on the URL drops straight into a warmed-up run (and skips the
service worker) — that's the hook the headless screenshot pass uses.

## The six mechanics

| Mechanic | Where it lives |
|---|---|
| **Heat (tawa)** | `World.updateHeat` — firing drains it; it only refills properly while you stand still and stoke. Empty = *cold tawa*: half fire rate, half damage. |
| **Aroma (tadka)** | `World.tadka` — pulls the crowd onto you, and marks them: aroma-marked customers stop caring what they ordered. |
| **Order matching** | `World.damage` — the right category does full damage, the wrong one half. Aunty takes 15% from a wrong order. |
| **Munna is your HP** | `World.damageHero` — no cart soaks hits for you. A 0.28s i-frame stops a twenty-strong mob deleting you in one frame; everything else lands. |
| **Patience → hostility** | `updateCustomer` — unserved customers never despawn. They queue in a ring around you; at zero patience they turn and charge. |
| **Regional pantry** | `data/cities.js` — each city's `pantry` decides which ingredients (and so which dishes) can appear at all. |

Serving someone before their patience burns down pays a **GARAM GARAM** premium —
that's the greed lever. Bait a bigger cluster, get paid more, risk your neck.

## Cities are rule changes — and places

Each city owns its rule modifiers *and* its look: palette, skyline silhouette,
shopfront colours, signage script, street furniture, road markings.

| City | Rule | Street |
|---|---|---|
| **Delhi** — Chandni Chowk | Tightest lane; strays steal heat, monkeys steal cash | Marigold and terracotta, Jama Masjid, rickshaws and cows |
| **Mumbai** — Dadar, monsoon | Rain drains heat; puddles slow you; fastest waves | Bright monsoon teal, taxi yellow, BEST red, rain |
| **Kolkata** — College Street | Huge patience, permanent density; the tram cuts the lane | Tram rails down the road, Bengali signage, Howrah |
| **Chennai** — Marina | Widest lane, no cover; sea wind bends your aroma sideways | Sand with tide lines instead of lane markings, gopuram, palms |
| **Amritsar** — Hall Bazaar | Everything tankier; langar patches heal you where you stand | Marble and kesari, domes, Gurmukhi signage |
| **Lucknow** — Chowk at night | Lamplit; your own tawa is the light you see by | Warm plum and gold, Rumi Darwaza, diyas |
| **Ahmedabad** — Manek Chowk | Flips at stop 3: spawns and pay both double, live | Patola pink and green, kites, jewellers |
| **Goa** — Panjim | Everyone pays double and waits half as long | Portuguese blue and pink, church, palms, no lane markings |

## Layout

```
index.html            shell + HUD/screens markup
manifest.webmanifest  PWA metadata
sw.js                 generated — precaches the whole shell, cache-first
icons/                generated app icons (any + maskable)
css/style.css
src/
  main.js             layout, loop, World↔UI wiring, #city= boot hook
  game.js             World: the six mechanics, stops, hazards, bosses, damage
  entities.js         factories + self-contained per-frame behaviour
  render.js           canvas painter: horizon, street, actors, weather
  input.js            keyboard + drag-anywhere stick
  ui.js               HUD readouts, screens, level-up cards
  util.js
  data/               cities · hero · customers · dishes+recipes
  systems/            spawner (wave director) · levelup (offer rolls)
```

`window.THELA.world` is exposed for poking at balance from the console.

## Balance

Tuned against a headless bot harness (no DOM) that plays whole routes:
`npm run sim` (`RUNS=25 npm run sim` for a bigger sample). 25 runs per city:

| City | Route clears | Avg stop reached |
|---|---|---|
| Kolkata | 20/25 | 5.0 / 5 |
| Delhi | 15/25 | 5.0 / 5 |
| Lucknow | 5/25 | 5.0 / 5 |
| Ahmedabad | 5/25 | 4.1 / 5 |
| Mumbai | 4/25 | 3.8 / 5 |
| Goa | 3/25 | 4.8 / 5 |
| Chennai | 1/25 | 4.9 / 5 |
| Amritsar | 1/25 | 5.0 / 5 |

Kolkata is the softest route because its rule *is* patience — the crowd never
sours, so you can always plant your feet and stoke. Mumbai is the only city
where the bot regularly dies before the boss; everywhere else it arrives and
loses there. Chennai and Amritsar are the two walls: no cover, and 1.3× HP on
every customer.

The bot is a crude floor, not a skilled player — it only backs off angry
customers inside 66px and only spends tadka on clusters of six or more — so a
human should clear well above these rates.

## Checks

```bash
npm run smoke              # drives real render.js + ui.js against DOM/canvas stubs
RUNS=25 npm run sim        # headless balance sweep
npm run diag amritsar      # what actually put Munna down, and is heat biting?
```

`smoke` plays all eight routes plus all eight boss fights, asserting that every
draw path and every screen transition (banner, level-up, stop-clear, mobbed,
victory) actually fires. It caught the bug where killing a boss set `won` and the
stop timer immediately overwrote it with `stopclear`.

`diag` attributes hero damage per source and reports the heat range over a run.
It's what caught heat going decorative after the cart was removed: the first pass
at "stand still to stoke" regenerated so fast that the tawa never went cold once
across eight cities.

The same harness found the real cost of deleting the cart. Runs were reaching
every boss and dying with it still on 75–89% health, with a *calm* crowd of
7–22 on screen — so the mob wasn't the killer, the boss was. Those attacks had
been priced against a 120 HP cart that couldn't dodge; they were now landing on
a 120 HP hero who also absorbs the entire crowd. Halving boss and tram damage
(not their health) is what turned three cities from 0/25 into a real ladder.

Verified in Chrome: the title/story/city flow, and Delhi, Mumbai, Kolkata,
Chennai and Lucknow driven live with no console errors — thin pavements, the
right palette and skyline per city, tram rails in Kolkata, tide lines on the
Marina, and Lucknow lamplit rather than dark.

## Not built yet

Meta progression (the Thela upgrade tree that rebuilds the cart, the Recipe Book,
Regulars, travelling recipes), festival live-ops, and audio. All specified in the
concept doc.

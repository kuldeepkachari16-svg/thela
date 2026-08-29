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
**Stand still to stoke the tawa.** Firing is automatic — your three real levers
are where you stand, when you tadka, and what you take at level-up.

`#city=goa&t=30` on the URL drops straight into a warmed-up run (and skips the
service worker). Add `&shot=1` to freeze the world once it's warm — the scene
stops evolving and nothing levels up mid-capture, which is what makes the
headless screenshot pass deterministic. (The warm-up used to stall the first
time the crowd levelled you up, leaving the deep link parked on the level-up
card rather than in play; it now auto-takes an offer while warming.)

## The seven mechanics

| Mechanic | Where it lives |
|---|---|
| **Heat (tawa)** | `World.updateHeat` — firing drains it; it only refills properly while you stand still and stoke. Empty = *cold tawa*: half fire rate, half damage. |
| **Aroma (tadka)** | `World.tadka` — pulls the crowd onto you, and marks them: aroma-marked customers stop caring what they ordered. |
| **Order matching** | `World.damage` — the right category does full damage, the wrong one half. Aunty takes 15% from a wrong order. |
| **Munna is your HP** | `World.damageHero` — no cart soaks hits for you. A 0.28s i-frame stops a twenty-strong mob deleting you in one frame; everything else lands. |
| **Patience → hostility** | `updateCustomer` — unserved customers never despawn. They queue in a ring around you; at zero patience they turn and charge. |
| **Regional pantry** | `data/cities.js` — each city's `pantry` decides which ingredients (and so which dishes) can appear at all. |

| **GARAM streak** | `World.bumpStreak` — fresh serves chain into a multiplier on pay *and* xp, up to 1.6x. One hit ends it, and the window to keep it alive tightens from 3.2s to 1.2s as it climbs. |

Serving someone before their patience burns down pays a **GARAM GARAM** premium,
and serving fresh *in a row* runs the streak up — that's the greed lever. The
streak is the thing you're actually protecting once you get greedy: it survives
souring customers and near-misses, but never a hit.

Tadka pays for being **held**. Pull five or more and the crowd hands you heat
back (up to +30) and stays marked longer, so the play is to let a crowd gather
and eat the risk, not to dump the button the moment it's off cooldown. Because
firing is automatic, tadka is also the only answer to a wrong order — an
aroma-marked customer stops caring what they asked for.

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
  render.js           canvas painter: ground plane, horizon, street, actors
  input.js            keyboard + drag-anywhere stick
  ui.js               HUD readouts, screens, level-up cards
  util.js
  data/               cities · hero · customers · dishes+recipes
  systems/            spawner (wave director) · levelup (offer rolls)
```

`window.THELA.world` is exposed for poking at balance from the console.

## The street is drawn in perspective

The world is a flat rectangle — every hitbox, distance and speed in `game.js` is
unprojected and stays that way. Only the camera knows about depth. It looks
along the street from just above and behind Munna, and everything standing on
the road goes through one ground-plane transform (`Renderer.ground`), so the
lane, the shopfronts and the crowd all agree about where the far end is.

Screen-y is linear in the depth parameter, which makes the road an exact
trapezoid: the taper draws with straight edges and every road mark is laid out
in world space and projected, so dashes and tram rails foreshorten for free.
Scale is pinned to 1 on Munna's home row (`HOME`), so the projection is identity
exactly where the fight happens, and near actors grow to ~1.17× while the far
end shrinks to ~0.63×. That range is deliberately shallow: visuals scale but
hitboxes don't, so a deep taper would start lying to the player about reach.

This replaced a scene that mixed two projections — a top-down road with a
side-on skyline and side-on shopfronts pasted along it. The giveaway was a hard
8px bar across the full width where the two met. The far city is now three
depth bands with aerial perspective (each pre-blended toward the sky rather than
washed over afterwards, which is what turned it to mush on the first attempt),
and the join is a dissolve straddling the seam rather than a line. The horizon
also sits below the HUD block now; before, the city was drawn behind the stop
label and chips, so only a smear of it was ever visible.

Customers and Munna are drawn figures rather than emoji — a shared parts system
(legs, torso, arms, head, topper) with a per-type colour and topper, so a crowd
of forty reads as a crowd and you can still tell an aunty from a school kid.
Each customer carries a stable `seedN` from spawn; without it the drawn skin
tone re-rolled every frame. Shopfront blocks roll their own width, setback,
sign band and awning off the scroll index so the row stops tiling.

## Balance

Tuned against a headless bot harness (no DOM) that plays whole routes:
`npm run sim` (`RUNS=25 npm run sim` for a bigger sample). 25 runs per city:

| City | Route clears | Avg stop reached |
|---|---|---|
| Delhi | 22/25 | 5.0 / 5 |
| Kolkata | 21/25 | 5.0 / 5 |
| Lucknow | 8/25 | 4.9 / 5 |
| Ahmedabad | 7/25 | 4.4 / 5 |
| Mumbai | 5/25 | 4.1 / 5 |
| Goa | 2/25 | 4.8 / 5 |
| Chennai | 1/25 | 4.8 / 5 |
| Amritsar | 1/25 | 5.0 / 5 |

Delhi and Kolkata are the soft routes — Kolkata because its rule *is* patience,
so the crowd never sours and you can always plant your feet and stoke. Mumbai is
the only city where the bot regularly dies before the boss; everywhere else it
arrives and loses there. Chennai and Amritsar are the two walls: no cover, and
1.3× HP on every customer.

The streak was tuned against this table. A first pass with a 2× cap and a flat
3.8s window had the bot sitting on streaks of 80–320 for whole routes — a
permanent buff rather than a streak, and Ahmedabad banked ₹11,379 against a
~₹2,000 baseline. Capping the multiplier at 12 serves and tightening the window
as the streak climbs put peak streaks back at 15–55 and the ladder back within
noise of the pre-streak numbers. `diag` also shows heat biting harder than
before, not less: average heat over a Delhi run fell 86% → 67%, with the tawa
actually reaching empty.

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
Chennai and Lucknow driven live with no console errors — the right palette and
skyline per city, tram rails converging down Kolkata's lane, tide lines on the
Marina, and Lucknow lamplit rather than dark. The perspective pass was checked
against headless captures of Delhi, Mumbai, Kolkata and Amritsar.

## Not built yet

Meta progression (the Thela upgrade tree that rebuilds the cart, the Recipe Book,
Regulars, travelling recipes), festival live-ops, and audio. All specified in the
concept doc.

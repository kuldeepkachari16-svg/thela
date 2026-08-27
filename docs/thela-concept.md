# THELA — Street Food Survivors

#project/thela #project/game-design

**Parent:** [[Code/INDEX]]
**Related:** [[thela-implementation-notes]]
**Status:** Concept locked 2026-08-27 · prototype built for Delhi + Mumbai (`Code/Gamev2`)

---

**Street-food survivors. You don't kill the crowd — you feed it.**

## The pitch
A forward-scrolling survivor: you push a food cart down a real Indian street while a hungry mob closes in. Every "enemy" is a customer. Killing is serving. The crowd is simultaneously your damage sponge, your currency, and the thing that will tip your cart over.

## Why it's a survivor, not a runner
Survivor.io arenas are featureless boxes. A street isn't. The **gully lane** is a bounded arena that scrolls forward at the cart's pace — you move freely inside a band, the world feeds you architecture, traffic and landmarks instead of empty floor. You control the cart's forward push; slower push = denser crowd = more money and more risk.

## The six mechanics the theme actually earns
Not skins. Each of these only exists because the game is about street food.

| Mechanic | What it does |
|---|---|
| **Heat (tawa)** | Firing drains heat; heat regenerates only near the cart. Dive to serve, retreat to reload. This is the skill ceiling. |
| **Aroma (tadka)** | Tempering spices releases a smell burst that *pulls* customers toward you, boosts damage on them, and — the important part — makes them stop caring what they ordered. Hunger overrides pickiness. Aggro is a weapon. |
| **Order matching** | Customers crave a specific category. Right dish = full damage + full pay. Wrong dish = half. Elemental weakness, expressed as a menu. |
| **The cart is your HP** | Slow, nudgeable, positional anchor. It tips over — that's the fail state. You can't kite forever because you can't leave it. |
| **Patience → hostility** | Unserved customers don't despawn. Patience hits zero, they turn Angry and charge the cart. Ignoring the crowd is how you die. |
| **Regional pantry** | City determines the dish pool. Punjabi dairy = shields. Awadhi dum = charge-up. Gujarati farsan = economy. Cuisine *is* the class system. |

**The greed loop:** aroma → cluster → serve → collect. Bigger cluster pays more and kills you faster. You choose the density. That's the game.

## Characters
Eight vendors, each defined by their cooking station — the station is the weapon grammar, not a stat block.

| Vendor | City | Station | Signature |
|---|---|---|---|
| Munna | Delhi | chaat platter | Serves many at once. Splash-heavy, weak single target. |
| PK | Mumbai | kadhai | Fastest fire rate, cheapest dishes. Built for swarms. |
| Bishu-da | Kolkata | roll tawa | Wraps pierce in a line; sweets apply slow. |
| Selvi | Chennai | dosa griddle | Pours batter as persistent ground zones. Area denial. |
| Gurleen | Amritsar | tandoor | Charge-and-release burst. Dairy grants shields. |
| Rehana | Lucknow | dum handi | Damage ramps the longer a crowd stays clustered. |
| Jigar | Ahmedabad | steamer | Low damage, doubles income and buffs. The economy pick. |
| Fernandes | Goa | vinegar pan | Stacking burn / damage-over-time. |

Any character can run any city; each gets a home-city bonus.

## Enemies — a crowd, not a bestiary
Bhukkads (basic), schoolkids (fast swarm), Aunty (tanky, immune unless served the exact craving), office lunch rush (timed formation block), the influencer (films you; unserved, drops a bad-review debuff aura), stray dogs and monkeys (steal ingredients — must be chased, can't be fed), crows (aerial theft), the drunk uncle (erratic, knocks the cart), delivery riders (dash lanes, contact damage).

**Elites:** the Baraat — a moving wedding procession whose band music buffs everything near it. The Cricket Crowd — dead quiet, then a wicket falls and the street empties into you at once.

**Bosses** are rivals and events, not health inspectors: the aggregator cloud-kitchen truck, the wedding caterer, a VIP convoy that shuts the lane, the Mumbai monsoon itself.

## Cities as rule changes
Each city rewrites a rule. The skybox is the least interesting thing about it.

- **Delhi — Chandni Chowk.** Narrow lanes, minimal lateral room, constant ingredient theft by dogs and monkeys.
- **Mumbai — Dadar in monsoon.** Rain drains heat continuously. Puddles slow the cart. Fastest waves in the game.
- **Kolkata — College Street.** Trams sweep the lane on a timer. Customers have huge patience but refuse to disperse — permanent density.
- **Chennai — Marina.** Wide open, no cover. Sand slows the cart, sea wind bends your aroma cone sideways so bait lands off-target.
- **Amritsar — Hall Bazaar.** Everything bigger and tankier; dairy pickups heal; langar zones are safe pockets.
- **Lucknow — Chowk at night.** Low visibility. Aroma is your only way to see the crowd. Forces mastery of the bait mechanic.
- **Ahmedabad — Manek Chowk.** Flips at midnight from jewellery market to food street: spawn rate and payout both double.
- **Goa — Panjim.** Tourists pay double, wait half as long.

Later routes: Indore (Sarafa), Hyderabad Old City, Varanasi ghats, Srinagar.

## Progression
**In-run:** level up → pick 1 of 3 ingredients. Ingredients pair on a legible culinary grammar (aloo + pav = vada pav — players *guess correctly*, which is the pleasure). Max-level dishes evolve with a Secret Ingredient drop.

**Meta:**
- **The Thela** — permanent cart tree: wheels (speed), burner (heat cap), canopy (weather resist), speaker (aroma radius), cashbox (gold).
- **Recipe Book** — permanently unlocked dishes enter the level-up pool.
- **Regulars** — customers served at max rating become permanent passive slots. The constable clears a lane. The rickshaw-wala tows faster. The aunty generates XP by talking. The real reward of running a stall, and it's a collection.
- **Travelling recipe** — clear a city, carry one of its dishes into every other city. Beating Kolkata changes how Delhi plays. The meta expands instead of repeating.

**Session:** 8–12 min. A route = five stops down one street, ~90s each, boss at the end. Bail at any stop and bank half.

## Live ops
The festival calendar is the spine and it's native to the theme: Ganpati in Mumbai, Durga Puja in Kolkata, Baisakhi in Amritsar, Pongal in Chennai. Each drops a limited menu and a city-specific event wave. Free content structure that writes itself for a decade.

## Look and sound
Chunky, saturated, semi-2.5D top-down. Sticker-book loud — modern India, not heritage-poster India. Sizzle is the primary feedback layer: heat level *is* audible, so you can play the heat meter with your ears while watching the crowd.

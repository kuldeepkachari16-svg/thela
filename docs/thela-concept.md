# THELA — Street Food Survivors

#project/thela #project/game-design

**Parent:** [[Code/INDEX]]
**Related:** [[thela-implementation-notes]]
**Status:** Reworked 2026-08-28 — hero-led, no cart to defend, all eight cities playable (`Code/Gamev2`)

---

**Street-food survivors. You don't kill the crowd — you feed it.**

## The pitch
A forward-scrolling survivor: one cook walks a real Indian street with a tawa on his back while a hungry mob closes in. Every "enemy" is a customer. Killing is serving. The crowd is simultaneously your damage sponge, your currency, and the thing that will put you on the ground.

## The hero
**Munna Prasad.** His grandmother ran a thela in Chandni Chowk for forty years. When she died the lane was cleared out — cart and all — and her handwritten recipe book was broken up and sold off, one page to a halwai in every city she ever cooked in.

All Munna inherited was her brass tawa. He slung it across his back and started walking. Eight cities, eight pages.

**This is why there is no stall to defend.** He doesn't have one yet. THELA is the thing he lost and the thing he is earning back — the title is the goal, not the health bar. The meta-progression is rebuilding the cart, page by page.

## Why it's a survivor, not a runner
Survivor.io arenas are featureless boxes. A street isn't. The **gully lane** is a bounded arena that scrolls forward at walking pace — you move freely inside a band, and the world feeds you architecture, traffic and landmarks instead of empty floor. The lane is wide and the pavements are thin, so almost every pixel is playable.

## The six mechanics the theme actually earns
Not skins. Each of these only exists because the game is about street food.

| Mechanic | What it does |
|---|---|
| **Heat (tawa)** | Firing drains heat; heat comes back only while you **stand still and stoke the coals**. Move and it dies down. Plant your feet to reload, run to survive — you cannot do both. This is the skill ceiling. |
| **Aroma (tadka)** | Tempering spices releases a smell burst that *pulls* customers toward you, boosts damage on them, and — the important part — makes them stop caring what they ordered. Hunger overrides pickiness. Aggro is a weapon. |
| **Order matching** | Customers crave a specific category. Right dish = full damage + full pay. Wrong dish = half. Elemental weakness, expressed as a menu. |
| **Munna is your HP** | There is no cart to soak hits. You are the only body on the street, so every angry customer is coming for *you*. Mobility is your defence and standing still is what heat costs you. |
| **Patience → hostility** | Unserved customers don't despawn. They queue in a ring around you. Patience hits zero, they turn Angry and charge. Ignoring the crowd is how you die. |
| **Regional pantry** | City determines the dish pool. Punjabi dairy = shields. Awadhi dum = charge-up. Gujarati farsan = economy. Cuisine *is* the class system. |

**The greed loop:** aroma → cluster → serve → collect. Bigger cluster pays more and kills you faster. You choose the density. That's the game.

**The heat loop:** stoke → dive → fire → back off → stoke. Standing still is safe only for as long as you have kept patience under control. Let the crowd sour and you can never plant your feet again — that's the death spiral, and it is entirely self-inflicted.

## One hero, not a roster
Munna is the only playable character. The station *is* the weapon grammar — the brass tawa — and the dish pool does the work a class system used to. Cuisine is the class, and it changes with the city you're standing in rather than with a character select screen.

## Enemies — a crowd, not a bestiary
Bhukkads (basic), schoolkids (fast swarm), Aunty (tanky, immune unless served the exact craving), office lunch rush (timed formation block), the influencer (films you; unserved, drops a bad-review debuff aura), stray dogs and monkeys (steal ingredients — must be chased, can't be fed), crows (aerial theft), the drunk uncle (erratic, knocks the cart), delivery riders (dash lanes, contact damage).

**Elites:** the Baraat — a moving wedding procession whose band music buffs everything near it. The Cricket Crowd — dead quiet, then a wicket falls and the street empties into you at once.

**Bosses** are rivals and events, not health inspectors: the aggregator cloud-kitchen truck, the wedding caterer, a VIP convoy that shuts the lane, the Mumbai monsoon itself.

## Cities as rule changes
Each city rewrites a rule **and** paints its own street: its own palette, skyline silhouette, shopfront colours, signage script, street furniture and road markings. All eight are playable.

- **Delhi — Chandni Chowk.** Narrow lane, constant theft by strays and monkeys. Marigold and terracotta, Jama Masjid on the horizon.
- **Mumbai — Dadar in monsoon.** Rain drains heat continuously. Puddles slow you. Fastest waves in the game. Bright monsoon teal, taxi yellow, BEST red.
- **Kolkata — College Street.** Tram rails run down the lane and the tram uses them on a timer. Customers have huge patience but refuse to disperse — permanent density. Howrah on the skyline.
- **Chennai — Marina.** The widest lane in the game and not one wall. Sand slows you, sea wind drags your aroma cone sideways so bait lands off-target. No road markings — just tide lines.
- **Amritsar — Hall Bazaar.** Everything bigger and tankier. Langar patches on the road heal you while you stand in them.
- **Lucknow — Chowk at night.** Lamplit, not dark: warm plum and gold, with your own tawa throwing the light you see by. Aroma is how you find the crowd.
- **Ahmedabad — Manek Chowk.** Quiet jewellery market until stop three, then midnight lands mid-route: spawn rate and payout both double, live.
- **Goa — Panjim.** Tourists pay double, wait half as long.

Later routes: Indore (Sarafa), Hyderabad Old City, Varanasi ghats, Srinagar.

## Progression
**In-run:** level up → pick 1 of 3 ingredients. Ingredients pair on a legible culinary grammar (aloo + pav = vada pav — players *guess correctly*, which is the pleasure). Max-level dishes evolve with a Secret Ingredient drop.

**Meta:**
- **The Thela** — the cart he is earning back, built up piece by piece: wheels (speed), burner (heat cap), canopy (weather resist), speaker (aroma radius), cashbox (gold). Getting the stall back is the ending, not the starting kit.
- **The Recipe Book** — clearing a city's boss recovers one of Dadi's pages. Eight cities, eight pages, and the book is the completion track.
- **Recipe Book** — permanently unlocked dishes enter the level-up pool.
- **Regulars** — customers served at max rating become permanent passive slots. The constable clears a lane. The rickshaw-wala tows faster. The aunty generates XP by talking. The real reward of running a stall, and it's a collection.
- **Travelling recipe** — clear a city, carry one of its dishes into every other city. Beating Kolkata changes how Delhi plays. The meta expands instead of repeating.

**Session:** 8–12 min. A route = five stops down one street, ~45–58s each, boss at the end. Bail at any stop and bank half.

## Live ops
The festival calendar is the spine and it's native to the theme: Ganpati in Mumbai, Durga Puja in Kolkata, Baisakhi in Amritsar, Pongal in Chennai. Each drops a limited menu and a city-specific event wave. Free content structure that writes itself for a decade.

## Look and sound
Chunky, saturated, semi-2.5D top-down, and **daylight-bright** — sticker-book loud, modern India, not heritage-poster India and never a grim-dark street. Even the night city is lamplight and warm plum rather than black. The pavements are deliberately narrow so the playable lane owns the screen; the city is carried by palette, skyline, signage script and street furniture instead of width. Sizzle is the primary feedback layer: heat level *is* audible, so you can play the heat meter with your ears while watching the crowd.

// One hero, one story. The thela is not a health bar you defend — it is the
// thing Munna lost, and the thing the whole run is about earning back.

export const HERO = {
  id: 'munna',
  name: 'Munna',
  full: 'Munna Prasad',
  emoji: '\u{1F468}‍\u{1F373}',
  station: 'Dadi’s brass tawa',
  home: 'delhi',
  starter: 'vadapav',

  // Shown once, on the story card. Four beats, no more.
  story: [
    'Dadi ran a thela in Chandni Chowk for forty years. When she went, the lane went too — cleared out one morning, cart and all.',
    'All that came back to Munna was her brass tawa and an empty recipe book. The pages had been sold off, one to a halwai in every city she ever cooked in.',
    'So he slung the tawa across his back and started walking.',
    'Eight cities. Eight pages. And between him and every one of them, a street full of people who have not eaten yet.',
  ],
  hook: 'No cart. No stall. Just a tawa on his back and a country to feed.',

  stats: {
    moveSpeed: 192,
    hp: 120,
    heatMax: 100,
    heatRegen: 27,      // while stoking (standing still)
    idleRegen: 0.18,    // fraction of regen you keep while moving
    aromaCd: 6.5,
    aoeMult: 1,
    dmgMult: 1,
    fireRateMult: 1,
    heatCostMult: 1,
  },
};

export function heroStats() {
  return { ...HERO.stats };
}

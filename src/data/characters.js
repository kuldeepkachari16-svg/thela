// Vendors are defined by their cooking station, not a stat block.
// Munna and PK are playable in this build; the rest are the shipped roster.

export const CHARACTERS = {
  munna: {
    id: 'munna', name: 'Munna', emoji: '\u{1F468}', city: 'delhi',
    station: 'Chaat platter',
    tagline: 'Serves the whole queue at once. Weak on any single customer.',
    starter: 'panipuri',
    stats: { moveSpeed: 178, heatMax: 100, heatRegen: 21, aromaCd: 7, aoeMult: 1.35, dmgMult: 0.88 },
    playable: true,
  },
  pk: {
    id: 'pk', name: 'PK', emoji: '\u{1F468}‍\u{1F373}', city: 'mumbai',
    station: 'Kadhai',
    tagline: 'Fastest hands in Dadar. Cheap heat, relentless fire.',
    starter: 'vadapav',
    stats: { moveSpeed: 196, heatMax: 92, heatRegen: 24, aromaCd: 6.2, fireRateMult: 1.3, heatCostMult: 0.78 },
    playable: true,
  },
  bishu:     { id: 'bishu',     name: 'Bishu-da',  emoji: '\u{1F9D3}', city: 'kolkata',  station: 'Roll tawa',     tagline: 'Wraps pierce a line; sweets slow.',           playable: false },
  selvi:     { id: 'selvi',     name: 'Selvi',     emoji: '\u{1F469}', city: 'chennai',  station: 'Dosa griddle',  tagline: 'Pours batter as ground zones.',              playable: false },
  gurleen:   { id: 'gurleen',   name: 'Gurleen',   emoji: '\u{1F467}', city: 'amritsar', station: 'Tandoor',       tagline: 'Charge and release. Dairy shields.',          playable: false },
  rehana:    { id: 'rehana',    name: 'Rehana',    emoji: '\u{1F9D5}', city: 'lucknow',  station: 'Dum handi',     tagline: 'Damage ramps while the crowd holds.',         playable: false },
  jigar:     { id: 'jigar',     name: 'Jigar',     emoji: '\u{1F471}', city: 'ahmedabad',station: 'Steamer',       tagline: 'Weak hits, double money.',                    playable: false },
  fernandes: { id: 'fernandes', name: 'Fernandes', emoji: '\u{1F9D4}', city: 'goa',      station: 'Vinegar pan',   tagline: 'Stacking burn.',                              playable: false },
};

export const DEFAULT_STATS = {
  moveSpeed: 185, heatMax: 100, heatRegen: 21, aromaCd: 7,
  aoeMult: 1, dmgMult: 1, fireRateMult: 1, heatCostMult: 1,
};

export function statsFor(id) {
  return { ...DEFAULT_STATS, ...(CHARACTERS[id].stats || {}) };
}

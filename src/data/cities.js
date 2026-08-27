// A city is a rule change, not a skybox. Delhi and Mumbai are fully built;
// the rest are declared so the route select shows the real ladder.

export const CITIES = {
  delhi: {
    id: 'delhi', name: 'Delhi', area: 'Chandni Chowk', emoji: '\u{1F54C}',
    rule: 'Narrow lane. Barely any room to sidestep, and the strays never stop.',
    ruleShort: 'Tight lane · strays steal heat',
    playable: true,
    lane: { width: 300 },
    heatDrain: 0,          // no weather penalty
    cartFollow: 0.6,
    spawnRateMult: 1.0,
    patienceMult: 1.1,     // Dilli waits, a little
    payMult: 1.0,
    hazard: 'thieves',
    pantry: ['aloo', 'maida', 'imli', 'dahi', 'chana', 'cheeni', 'puri', 'pyaaz'],
    cravingWeights: [
      { w: 34, v: 'chaat' }, { w: 30, v: 'fried' }, { w: 18, v: 'sweet' },
      { w: 14, v: 'bread' }, { w: 4, v: 'drink' },
    ],
    spawnTable: [
      { w: 40, v: 'bhukkad' }, { w: 20, v: 'kid' }, { w: 12, v: 'aunty' },
      { w: 12, v: 'officeRush' }, { w: 6, v: 'influencer' }, { w: 10, v: 'dog' },
    ],
    palette: {
      sky: '#2a1408', road: '#3b2a1c', roadLine: '#6b503a',
      shopA: '#8d3b2a', shopB: '#b5762c', awning: '#d94f3d',
      accent: '#f2a13c', fog: 'rgba(255,180,90,0.06)',
    },
    stops: [
      { name: 'Paranthe Wali Gali', dur: 45 },
      { name: 'Dariba Kalan', dur: 48 },
      { name: 'Kinari Bazaar', dur: 52 },
      { name: 'Fatehpuri Chowk', dur: 56 },
      { name: 'Town Hall Steps', boss: 'lalaji' },
    ],
    boss: 'lalaji',
  },

  mumbai: {
    id: 'mumbai', name: 'Mumbai', area: 'Dadar, monsoon', emoji: '\u{1F327}',
    rule: 'Rain kills your tawa. Heat bleeds constantly and puddles drag the cart.',
    ruleShort: 'Rain drains heat · puddles slow the cart',
    playable: true,
    lane: { width: 396 },
    heatDrain: 6.5,        // the rain, always
    cartFollow: 0.72,
    spawnRateMult: 1.12,   // fastest waves in the game
    patienceMult: 0.92,    // nobody in Mumbai has time
    payMult: 1.15,
    hazard: 'puddles',
    pantry: ['aloo', 'pav', 'masala', 'chana', 'chai', 'cheeni', 'maida', 'puri', 'imli'],
    cravingWeights: [
      { w: 30, v: 'fried' }, { w: 26, v: 'bread' }, { w: 16, v: 'drink' },
      { w: 20, v: 'chaat' }, { w: 8, v: 'sweet' },
    ],
    spawnTable: [
      { w: 40, v: 'bhukkad' }, { w: 14, v: 'kid' }, { w: 8, v: 'aunty' },
      { w: 14, v: 'officeRush' }, { w: 8, v: 'influencer' }, { w: 8, v: 'rider' },
    ],
    palette: {
      sky: '#0b1620', road: '#25313a', roadLine: '#48606e',
      shopA: '#2f4a56', shopB: '#3d5f5a', awning: '#4f8fa8',
      accent: '#5fb4d8', fog: 'rgba(140,190,220,0.08)',
    },
    stops: [
      { name: 'Kabutarkhana', dur: 45 },
      { name: 'Ranade Road', dur: 48 },
      { name: 'Plaza Junction', dur: 52 },
      { name: 'Shivaji Park Gate 4', dur: 56 },
      { name: 'Sena Bhavan Circle', boss: 'aggregator' },
    ],
    boss: 'aggregator',
  },

  kolkata:   { id: 'kolkata',   name: 'Kolkata',   area: 'College Street', ruleShort: 'Trams sweep the lane · crowds never disperse', playable: false },
  chennai:   { id: 'chennai',   name: 'Chennai',   area: 'Marina',         ruleShort: 'No cover · sea wind bends your aroma',        playable: false },
  amritsar:  { id: 'amritsar',  name: 'Amritsar',  area: 'Hall Bazaar',    ruleShort: 'Everything tankier · dairy heals',            playable: false },
  lucknow:   { id: 'lucknow',   name: 'Lucknow',   area: 'Chowk at night', ruleShort: 'Dark · aroma is your only sight',             playable: false },
  ahmedabad: { id: 'ahmedabad', name: 'Ahmedabad', area: 'Manek Chowk',    ruleShort: 'Flips at midnight · double spawns and pay',   playable: false },
  goa:       { id: 'goa',       name: 'Goa',       area: 'Panjim',         ruleShort: 'Tourists pay double, wait half as long',      playable: false },
};

export const BOSSES = {
  lalaji: {
    id: 'lalaji', name: 'LALA JI’S HALWAI CHAIN', emoji: '\u{1F3EA}',
    subtitle: 'Forty outlets. One of you.',
    hp: 1000, r: 44, speed: 26,
    attacks: [
      { type: 'lob', cd: 2.4, dmg: 11, aoe: 74, telegraph: 0.9, emoji: '\u{1F36F}' },
      { type: 'spawn', cd: 7.0, table: [{ w: 60, v: 'bhukkad' }, { w: 40, v: 'kid' }], count: 4 },
    ],
  },
  aggregator: {
    id: 'aggregator', name: 'THE AGGREGATOR', emoji: '\u{1F69A}',
    subtitle: 'Ten minute delivery. Zero minute patience.',
    hp: 1250, r: 48, speed: 22,
    attacks: [
      { type: 'dash', cd: 5.2, dmg: 16, telegraph: 1.1 },
      { type: 'spawn', cd: 5.6, table: [{ w: 100, v: 'rider' }], count: 3 },
    ],
  },
};

export const ROUTE_ORDER = ['delhi', 'mumbai', 'kolkata', 'chennai', 'amritsar', 'lucknow', 'ahmedabad', 'goa'];

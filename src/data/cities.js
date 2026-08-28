// A city is a rule change AND a place. Each one owns its own rule modifiers,
// its own crowd, its own pantry, its own skyline and its own street furniture.
// All eight are playable — the ladder is the story, not a teaser.

/* Palette contract, so every city stays readable at a glance:
   skyTop/skyBot  distant haze behind the skyline
   far            skyline silhouette
   road/roadLine  the playable lane
   kerb           the strip between lane and shopfronts
   shopA/B/C      shopfront blocks, cycled
   awning/awning2 awning stripe pair
   accent         city signature colour (signboards, banners, trim)
   wash           a LIGHT tint over the frame — never a darkening fog     */

export const CITIES = {
  /* ------------------------------------------------------------- DELHI */
  delhi: {
    id: 'delhi', name: 'Delhi', area: 'Chandni Chowk', emoji: '\u{1F54C}',
    page: 'Page one — the aloo',
    rule: 'The lane is narrow and nothing here is yours for long. Monkeys and strays work the crowd while you cook.',
    ruleShort: 'Tight lane · monkeys and strays rob you blind',
    roadMark: 'dash',
    playable: true,
    lane: { width: 384 },
    mods: {
      heatDrain: 0, spawnRateMult: 1.0, patienceMult: 1.12, payMult: 1.0,
      toughMult: 1.0, aromaMult: 1, windX: 0, dark: 0, flipStop: null,
    },
    hazard: { patch: { effect: 'slow', skin: 'pothole', max: 2, label: 'GADDHA' } },
    pantry: ['aloo', 'maida', 'imli', 'dahi', 'chana', 'cheeni', 'puri', 'pyaaz'],
    cravingWeights: [
      { w: 34, v: 'chaat' }, { w: 30, v: 'fried' }, { w: 18, v: 'sweet' },
      { w: 14, v: 'bread' }, { w: 4, v: 'drink' },
    ],
    spawnTable: [
      { w: 34, v: 'bhukkad' }, { w: 18, v: 'kid' }, { w: 12, v: 'aunty' },
      { w: 12, v: 'officeRush' }, { w: 6, v: 'influencer' },
      { w: 10, v: 'dog' }, { w: 8, v: 'monkey' },
    ],
    palette: {
      skyTop: '#ffe6a8', skyBot: '#ffb45c', far: '#d9743f',
      road: '#bda079', roadLine: '#fff4d8', kerb: '#ffe9c2',
      shopA: '#ff8a4a', shopB: '#ffc93c', shopC: '#e94f5c',
      awning: '#e33f3f', awning2: '#fff2d8',
      accent: '#ff3d6e', wash: 'rgba(255,196,110,0.10)',
    },
    skyline: [
      { t: 'block', x: 0.10, w: 0.16, h: 44 }, { t: 'minar', x: 0.30, w: 12, h: 82 },
      { t: 'dome', x: 0.44, w: 74, h: 54 }, { t: 'minar', x: 0.58, w: 12, h: 82 },
      { t: 'block', x: 0.72, w: 0.14, h: 38 }, { t: 'block', x: 0.88, w: 0.18, h: 52 },
    ],
    props: ['\u{1F6FA}', '\u{1F412}', '\u{1F404}', '\u{1F9FA}', '\u{1F4FF}', '\u{1F3EE}'],
    skyProps: ['\u{1FA81}', '\u{1FA81}', '\u{1F426}'],
    signs: ['हलवाई', 'चाट', 'जलेबी', 'लस्सी', 'किराना', 'पान'],
    stops: [
      { name: 'Paranthe Wali Gali', dur: 45 },
      { name: 'Dariba Kalan', dur: 48 },
      { name: 'Kinari Bazaar', dur: 52 },
      { name: 'Fatehpuri Chowk', dur: 56 },
      { name: 'Town Hall Steps', boss: 'lalaji' },
    ],
    boss: 'lalaji',
  },

  /* ------------------------------------------------------------ MUMBAI */
  mumbai: {
    id: 'mumbai', name: 'Mumbai', area: 'Dadar, monsoon', emoji: '\u{1F327}',
    page: 'Page two — the pav',
    rule: 'Rain kills your tawa. Heat bleeds every second and the puddles drag your feet.',
    ruleShort: 'Rain drains heat · puddles slow you · fastest waves',
    roadMark: 'dash',
    playable: true,
    lane: { width: 402 },
    mods: {
      heatDrain: 5.0, spawnRateMult: 1.08, patienceMult: 0.9, payMult: 1.15,
      toughMult: 1.0, aromaMult: 1, windX: 0, dark: 0, flipStop: null,
    },
    hazard: { patch: { effect: 'slow', skin: 'puddle', max: 3, label: 'PAANI' }, rain: true },
    pantry: ['aloo', 'pav', 'masala', 'chana', 'chai', 'cheeni', 'maida', 'puri', 'imli'],
    cravingWeights: [
      { w: 30, v: 'fried' }, { w: 26, v: 'bread' }, { w: 16, v: 'drink' },
      { w: 20, v: 'chaat' }, { w: 8, v: 'sweet' },
    ],
    spawnTable: [
      { w: 40, v: 'bhukkad' }, { w: 14, v: 'kid' }, { w: 8, v: 'aunty' },
      { w: 14, v: 'officeRush' }, { w: 8, v: 'influencer' }, { w: 12, v: 'rider' },
    ],
    palette: {
      skyTop: '#cdefff', skyBot: '#8fd6e8', far: '#3f8fa8',
      road: '#7f96a2', roadLine: '#f2fbff', kerb: '#dbeaf0',
      shopA: '#ffd23f', shopB: '#3fb6a8', shopC: '#ef5b5b',
      awning: '#2e86ab', awning2: '#ffffff',
      accent: '#ff5d8f', wash: 'rgba(180,230,255,0.12)',
    },
    skyline: [
      { t: 'block', x: 0.08, w: 0.14, h: 58 }, { t: 'block', x: 0.24, w: 0.12, h: 76 },
      { t: 'spire', x: 0.38, w: 16, h: 92 }, { t: 'block', x: 0.52, w: 0.16, h: 46 },
      { t: 'block', x: 0.70, w: 0.13, h: 70 }, { t: 'wheel', x: 0.88, w: 34, h: 34 },
    ],
    props: ['\u{1F695}', '\u{1F68C}', '\u{2602}', '\u{1FAB7}', '\u{1F682}', '\u{1F6F5}'],
    skyProps: ['\u{1F426}', '\u{2602}'],
    signs: ['वडा पाव', 'उडुपी', 'चहा', 'मिसळ', 'भेळ', 'लॉन्ड्री'],
    stops: [
      { name: 'Kabutarkhana', dur: 45 },
      { name: 'Ranade Road', dur: 48 },
      { name: 'Plaza Junction', dur: 52 },
      { name: 'Shivaji Park Gate 4', dur: 56 },
      { name: 'Sena Bhavan Circle', boss: 'aggregator' },
    ],
    boss: 'aggregator',
  },

  /* ----------------------------------------------------------- KOLKATA */
  kolkata: {
    id: 'kolkata', name: 'Kolkata', area: 'College Street', emoji: '\u{1F4DA}',
    page: 'Page three — the mishti',
    rule: 'Nobody here is in a hurry and nobody here leaves. The crowd only ever gets denser — and the tram does not brake.',
    ruleShort: 'Endless patience, endless crowd · the tram cuts the lane',
    roadMark: 'tram',
    playable: true,
    lane: { width: 392 },
    mods: {
      heatDrain: 0, spawnRateMult: 1.2, patienceMult: 1.75, payMult: 0.92,
      toughMult: 1.0, aromaMult: 1.1, windX: 0, dark: 0, flipStop: null,
    },
    hazard: { sweeper: { emoji: '\u{1F68B}', every: 11, speed: 300, dmg: 11, warn: 1.4, label: 'TRAM!' } },
    pantry: ['maida', 'aloo', 'cheeni', 'dahi', 'chai', 'chana', 'masala', 'pyaaz'],
    cravingWeights: [
      { w: 30, v: 'sweet' }, { w: 24, v: 'fried' }, { w: 20, v: 'chaat' },
      { w: 14, v: 'drink' }, { w: 12, v: 'bread' },
    ],
    spawnTable: [
      { w: 30, v: 'bhukkad' }, { w: 24, v: 'student' }, { w: 14, v: 'aunty' },
      { w: 12, v: 'officeRush' }, { w: 10, v: 'influencer' }, { w: 10, v: 'kid' },
    ],
    palette: {
      skyTop: '#fff0cf', skyBot: '#ffc98a', far: '#b8563f',
      road: '#a89070', roadLine: '#fff6e0', kerb: '#f6e6c6',
      shopA: '#f4c430', shopB: '#d94f3d', shopC: '#5aa9a0',
      awning: '#1f6f6b', awning2: '#ffe9b0',
      accent: '#e8452f', wash: 'rgba(255,205,140,0.10)',
    },
    skyline: [
      { t: 'block', x: 0.08, w: 0.16, h: 48 }, { t: 'bridge', x: 0.42, w: 0.42, h: 66 },
      { t: 'block', x: 0.86, w: 0.20, h: 54 },
    ],
    props: ['\u{1F4DA}', '\u{1F695}', '\u{1F3A8}', '\u{1FA98}', '\u{1F375}', '\u{1F3AD}'],
    skyProps: ['\u{1F426}', '\u{1F54A}'],
    signs: ['মিষ্টি', 'বই', 'চা', 'রোল', 'কফি', 'ছাপা'],
    stops: [
      { name: 'Presidency Gate', dur: 46 },
      { name: 'Coffee House Lane', dur: 50 },
      { name: 'Bankim Chatterjee St', dur: 54 },
      { name: 'Mahabodhi Crossing', dur: 58 },
      { name: 'Bowbazar Junction', boss: 'tram' },
    ],
    boss: 'tram',
  },

  /* ----------------------------------------------------------- CHENNAI */
  chennai: {
    id: 'chennai', name: 'Chennai', area: 'Marina Beach', emoji: '\u{1F30A}',
    page: 'Page four — the podi',
    rule: 'Widest street you will ever cook on, and not one wall to put your back against. The sea wind drags your tadka sideways.',
    ruleShort: 'Wide open, no cover · sea wind bends your aroma',
    roadMark: 'sand',
    playable: true,
    lane: { width: 428 },
    mods: {
      heatDrain: 1.6, spawnRateMult: 1.06, patienceMult: 0.98, payMult: 1.05,
      toughMult: 1.0, aromaMult: 0.85, windX: 78, dark: 0, flipStop: null,
    },
    hazard: { patch: { effect: 'slow', skin: 'sand', max: 4, label: 'MANAL' } },
    pantry: ['maida', 'chana', 'masala', 'dahi', 'chai', 'cheeni', 'aloo', 'pyaaz'],
    cravingWeights: [
      { w: 30, v: 'fried' }, { w: 22, v: 'chaat' }, { w: 20, v: 'bread' },
      { w: 16, v: 'drink' }, { w: 12, v: 'sweet' },
    ],
    spawnTable: [
      { w: 32, v: 'bhukkad' }, { w: 20, v: 'kid' }, { w: 14, v: 'tourist' },
      { w: 14, v: 'officeRush' }, { w: 10, v: 'aunty' }, { w: 10, v: 'influencer' },
    ],
    palette: {
      skyTop: '#d9f6ff', skyBot: '#ffe9b5', far: '#e08b4c',
      road: '#d6bb85', roadLine: '#fffaf0', kerb: '#fff3d8',
      shopA: '#00b3a4', shopB: '#ff7a5c', shopC: '#ffd166',
      awning: '#e94f37', awning2: '#fff6e5',
      accent: '#0f9b8e', wash: 'rgba(255,235,180,0.12)',
    },
    skyline: [
      { t: 'lighthouse', x: 0.18, w: 18, h: 92 }, { t: 'gopuram', x: 0.42, w: 56, h: 72 },
      { t: 'block', x: 0.66, w: 0.16, h: 40 }, { t: 'palm', x: 0.84, w: 22, h: 62 },
      { t: 'palm', x: 0.93, w: 20, h: 54 },
    ],
    props: ['\u{1F965}', '\u{1F6B2}', '\u{1F41A}', '\u{1F388}', '\u{1F334}', '\u{1F41F}'],
    skyProps: ['\u{1F426}', '\u{1FA81}'],
    signs: ['டிபன்', 'தோசை', 'காபி', 'சுண்டல்', 'ஜூஸ்', 'கடை'],
    stops: [
      { name: 'Labour Statue', dur: 46 },
      { name: 'Gandhi Statue', dur: 50 },
      { name: 'Anna Samadhi', dur: 54 },
      { name: 'Lighthouse Stretch', dur: 58 },
      { name: 'Marina Loop Road', boss: 'filmunit' },
    ],
    boss: 'filmunit',
  },

  /* ---------------------------------------------------------- AMRITSAR */
  amritsar: {
    id: 'amritsar', name: 'Amritsar', area: 'Hall Bazaar', emoji: '\u{1F6D5}',
    page: 'Page five — the makkhan',
    rule: 'Everyone here eats twice and takes twice as long to fill. Stand in a langar patch and you get your strength back.',
    ruleShort: 'Everything tankier · langar patches heal you',
    roadMark: 'dash',
    playable: true,
    lane: { width: 398 },
    mods: {
      heatDrain: 0, spawnRateMult: 0.88, patienceMult: 1.3, payMult: 1.22,
      toughMult: 1.3, aromaMult: 1, windX: 0, dark: 0, flipStop: null,
    },
    hazard: { patch: { effect: 'heal', skin: 'langar', max: 2, label: 'LANGAR' } },
    pantry: ['aloo', 'maida', 'dahi', 'chana', 'cheeni', 'pyaaz', 'masala', 'chai'],
    cravingWeights: [
      { w: 30, v: 'bread' }, { w: 26, v: 'fried' }, { w: 18, v: 'sweet' },
      { w: 16, v: 'drink' }, { w: 10, v: 'chaat' },
    ],
    spawnTable: [
      { w: 30, v: 'bhukkad' }, { w: 22, v: 'pilgrim' }, { w: 18, v: 'aunty' },
      { w: 12, v: 'kid' }, { w: 10, v: 'officeRush' }, { w: 8, v: 'dog' },
    ],
    palette: {
      skyTop: '#fff6d6', skyBot: '#ffd071', far: '#c98f27',
      road: '#d3c5a4', roadLine: '#ffffff', kerb: '#fffaf0',
      shopA: '#ffb703', shopB: '#f4f1e8', shopC: '#e07a5f',
      awning: '#f77f00', awning2: '#ffffff',
      accent: '#e6a100', wash: 'rgba(255,225,150,0.12)',
    },
    skyline: [
      { t: 'block', x: 0.10, w: 0.16, h: 40 }, { t: 'dome', x: 0.34, w: 52, h: 44 },
      { t: 'dome', x: 0.52, w: 82, h: 64 }, { t: 'dome', x: 0.70, w: 52, h: 44 },
      { t: 'block', x: 0.88, w: 0.18, h: 38 },
    ],
    props: ['\u{1F95B}', '\u{1FA98}', '\u{1F404}', '\u{1F35B}', '\u{1F6FA}', '\u{1F9FA}'],
    skyProps: ['\u{1F54A}', '\u{1FA81}'],
    signs: ['ਕੁਲਚਾ', 'ਲੱਸੀ', 'ਢਾਬਾ', 'ਜਲੇਬੀ', 'ਪਕੌੜਾ', 'ਚਾਹ'],
    stops: [
      { name: 'Hall Gate', dur: 46 },
      { name: 'Katra Jaimal Singh', dur: 50 },
      { name: 'Gurbazar', dur: 54 },
      { name: 'Jallianwala Lane', dur: 58 },
      { name: 'Heritage Street', boss: 'langar' },
    ],
    boss: 'langar',
  },

  /* ----------------------------------------------------------- LUCKNOW */
  lucknow: {
    id: 'lucknow', name: 'Lucknow', area: 'Chowk, after dark', emoji: '\u{1FA94}',
    page: 'Page six — the dum',
    rule: 'Lamplight only. You cannot see the crowd until it is on you — the tadka is your torch.',
    ruleShort: 'Lamplit night · aroma is how you see',
    roadMark: 'dash',
    playable: true,
    lane: { width: 388 },
    mods: {
      heatDrain: 0, spawnRateMult: 1.08, patienceMult: 1.2, payMult: 1.18,
      toughMult: 1.05, aromaMult: 1.25, windX: 0, dark: 0.62, flipStop: null,
    },
    hazard: null,
    pantry: ['maida', 'masala', 'pyaaz', 'dahi', 'cheeni', 'chana', 'chai', 'aloo'],
    cravingWeights: [
      { w: 28, v: 'bread' }, { w: 26, v: 'fried' }, { w: 20, v: 'sweet' },
      { w: 14, v: 'chaat' }, { w: 12, v: 'drink' },
    ],
    spawnTable: [
      { w: 34, v: 'bhukkad' }, { w: 16, v: 'aunty' }, { w: 16, v: 'officeRush' },
      { w: 12, v: 'influencer' }, { w: 12, v: 'kid' }, { w: 10, v: 'rider' },
    ],
    palette: {
      skyTop: '#5b3a7a', skyBot: '#c2557a', far: '#f0a35e',
      road: '#5d4b66', roadLine: '#ffe8b8', kerb: '#9d86a0',
      shopA: '#ffb26b', shopB: '#f7f0e0', shopC: '#c56b8f',
      awning: '#8e3b6b', awning2: '#ffd9a0',
      accent: '#ffc46b', wash: 'rgba(255,190,120,0.10)',
    },
    skyline: [
      { t: 'block', x: 0.08, w: 0.14, h: 42 }, { t: 'arch', x: 0.28, w: 74, h: 78 },
      { t: 'dome', x: 0.50, w: 62, h: 52 }, { t: 'minar', x: 0.64, w: 11, h: 74 },
      { t: 'block', x: 0.80, w: 0.16, h: 46 }, { t: 'minar', x: 0.93, w: 11, h: 68 },
    ],
    props: ['\u{1FA94}', '\u{1F40E}', '\u{1F56F}', '\u{1F3EE}', '\u{1F6FA}', '\u{1F9F5}'],
    skyProps: ['\u{1F987}', '\u{1F319}'],
    signs: ['कबाब', 'ज़र्दा', 'चिकन', 'मलाई', 'इत्र', 'पान'],
    stops: [
      { name: 'Akbari Gate', dur: 46 },
      { name: 'Phool Wali Gali', dur: 50 },
      { name: 'Gol Darwaza', dur: 54 },
      { name: 'Nakhas Crossing', dur: 58 },
      { name: 'Rumi Darwaza', boss: 'nawab' },
    ],
    boss: 'nawab',
  },

  /* --------------------------------------------------------- AHMEDABAD */
  ahmedabad: {
    id: 'ahmedabad', name: 'Ahmedabad', area: 'Manek Chowk', emoji: '\u{1F48E}',
    page: 'Page seven — the farsan',
    rule: 'A jewellery market until midnight. Then the shutters drop, the tables come out, and the whole city arrives at once.',
    ruleShort: 'Flips at midnight · spawns and pay both double',
    roadMark: 'dash',
    playable: true,
    lane: { width: 404 },
    mods: {
      heatDrain: 0, spawnRateMult: 0.7, patienceMult: 1.05, payMult: 0.85,
      toughMult: 1.0, aromaMult: 1, windX: 0, dark: 0, flipStop: 2,
      flip: { spawnRateMult: 2.1, payMult: 2.2, dark: 0.34, label: 'MIDNIGHT — MANEK CHOWK IS OPEN' },
    },
    hazard: null,
    pantry: ['maida', 'chana', 'cheeni', 'dahi', 'masala', 'aloo', 'pav', 'chai'],
    cravingWeights: [
      { w: 28, v: 'fried' }, { w: 24, v: 'sweet' }, { w: 20, v: 'chaat' },
      { w: 16, v: 'bread' }, { w: 12, v: 'drink' },
    ],
    spawnTable: [
      { w: 32, v: 'bhukkad' }, { w: 20, v: 'kid' }, { w: 16, v: 'officeRush' },
      { w: 12, v: 'aunty' }, { w: 12, v: 'influencer' }, { w: 8, v: 'tourist' },
    ],
    palette: {
      skyTop: '#ffe8f0', skyBot: '#ffc2d4', far: '#c4526f',
      road: '#c4a892', roadLine: '#fff6ee', kerb: '#f8e6d8',
      shopA: '#f72585', shopB: '#ffd60a', shopC: '#4cc9a4',
      awning: '#7209b7', awning2: '#ffe66d',
      accent: '#f72585', wash: 'rgba(255,205,225,0.10)',
    },
    skyline: [
      { t: 'block', x: 0.10, w: 0.18, h: 44 }, { t: 'minar', x: 0.32, w: 13, h: 76 },
      { t: 'arch', x: 0.48, w: 66, h: 58 }, { t: 'minar', x: 0.64, w: 13, h: 76 },
      { t: 'block', x: 0.82, w: 0.20, h: 50 },
    ],
    props: ['\u{1F48E}', '\u{1FA81}', '\u{1F3AA}', '\u{1F6FA}', '\u{1F36B}', '\u{1F3EE}'],
    skyProps: ['\u{1FA81}', '\u{1FA81}', '\u{1F388}'],
    signs: ['ફાફડા', 'ખમણ', 'કુલ્ફી', 'ઢોકળા', 'ચા', 'સોની'],
    stops: [
      { name: 'Sonarani Pol', dur: 46 },
      { name: 'Bhusar Bazaar', dur: 48 },
      { name: 'Chowk Crossing', dur: 54 },
      { name: 'Rani no Hajiro', dur: 58 },
      { name: 'Gandhi Road End', boss: 'midnight' },
    ],
    boss: 'midnight',
  },

  /* --------------------------------------------------------------- GOA */
  goa: {
    id: 'goa', name: 'Goa', area: 'Panjim', emoji: '\u{1F334}',
    page: 'The last page — the recheado',
    rule: 'Tourists pay like tourists and wait like nobody. Serve fast or serve nobody.',
    ruleShort: 'Everyone pays double and waits half as long',
    roadMark: 'sand',
    playable: true,
    lane: { width: 416 },
    mods: {
      heatDrain: 0, spawnRateMult: 1.12, patienceMult: 0.72, payMult: 1.7,
      toughMult: 0.92, aromaMult: 1, windX: 34, dark: 0, flipStop: null,
    },
    hazard: { patch: { effect: 'slow', skin: 'sand', max: 3, label: 'SUSEGAD' } },
    pantry: ['pav', 'maida', 'masala', 'cheeni', 'chai', 'aloo', 'chana', 'imli'],
    cravingWeights: [
      { w: 28, v: 'bread' }, { w: 24, v: 'fried' }, { w: 20, v: 'drink' },
      { w: 16, v: 'sweet' }, { w: 12, v: 'chaat' },
    ],
    spawnTable: [
      { w: 26, v: 'tourist' }, { w: 26, v: 'bhukkad' }, { w: 10, v: 'rider' },
      { w: 14, v: 'kid' }, { w: 12, v: 'influencer' }, { w: 10, v: 'dog' },
    ],
    palette: {
      skyTop: '#c9f2ff', skyBot: '#ffe2b8', far: '#4aa3c4',
      road: '#cdb287', roadLine: '#fffaf2', kerb: '#fdf0d8',
      shopA: '#4361ee', shopB: '#ffd166', shopC: '#ef476f',
      awning: '#118ab2', awning2: '#ffffff',
      accent: '#ef476f', wash: 'rgba(255,235,200,0.12)',
    },
    skyline: [
      { t: 'palm', x: 0.08, w: 20, h: 56 }, { t: 'church', x: 0.30, w: 78, h: 84 },
      { t: 'block', x: 0.54, w: 0.16, h: 40 }, { t: 'palm', x: 0.72, w: 22, h: 62 },
      { t: 'block', x: 0.86, w: 0.16, h: 34 }, { t: 'palm', x: 0.96, w: 18, h: 48 },
    ],
    props: ['\u{1F3CD}', '\u{1F334}', '\u{1F379}', '\u{26F5}', '\u{1F99C}', '\u{1F33A}'],
    skyProps: ['\u{1F426}', '\u{1F54A}'],
    signs: ['BAR', 'PADARIA', 'FEIRA', 'CAFÉ', 'PEIXE', 'DOCE'],
    stops: [
      { name: 'Church Square', dur: 46 },
      { name: 'Fontainhas Lane', dur: 50 },
      { name: '18th June Road', dur: 54 },
      { name: 'Mandovi Promenade', dur: 58 },
      { name: 'Miramar Turn', boss: 'shack' },
    ],
    boss: 'shack',
  },
};

export const BOSSES = {
  lalaji: {
    id: 'lalaji', name: 'LALA JI’S HALWAI CHAIN', emoji: '\u{1F3EA}',
    subtitle: 'Forty outlets. One of you.',
    hp: 1000, r: 44, speed: 26,
    attacks: [
      { type: 'lob', cd: 2.4, dmg: 7, aoe: 74, telegraph: 0.9 },
      { type: 'spawn', cd: 7.0, table: [{ w: 60, v: 'bhukkad' }, { w: 40, v: 'kid' }], count: 4 },
    ],
  },
  aggregator: {
    id: 'aggregator', name: 'THE AGGREGATOR', emoji: '\u{1F69A}',
    subtitle: 'Ten minute delivery. Zero minute patience.',
    hp: 1250, r: 48, speed: 22,
    attacks: [
      { type: 'dash', cd: 5.2, dmg: 10, telegraph: 1.1 },
      { type: 'spawn', cd: 5.6, table: [{ w: 100, v: 'rider' }], count: 3 },
    ],
  },
  tram: {
    id: 'tram', name: 'THE 12:40 TRAM', emoji: '\u{1F68B}',
    subtitle: 'It has run this route since 1902. It is not stopping for you.',
    hp: 1400, r: 46, speed: 30,
    attacks: [
      { type: 'dash', cd: 4.2, dmg: 11, telegraph: 1.0 },
      { type: 'spawn', cd: 6.4, table: [{ w: 70, v: 'student' }, { w: 30, v: 'bhukkad' }], count: 4 },
    ],
  },
  filmunit: {
    id: 'filmunit', name: 'THE FILM UNIT', emoji: '\u{1F3AC}',
    subtitle: 'Shooting is going on. The whole beach is theirs.',
    hp: 1320, r: 46, speed: 24,
    attacks: [
      { type: 'lob', cd: 2.1, dmg: 8, aoe: 88, telegraph: 0.85 },
      { type: 'spawn', cd: 6.0, table: [{ w: 60, v: 'kid' }, { w: 40, v: 'tourist' }], count: 5 },
    ],
  },
  langar: {
    id: 'langar', name: 'THE LANGAR COMMITTEE', emoji: '\u{1F372}',
    subtitle: 'They have fed ten thousand today. They are not impressed.',
    hp: 1580, r: 52, speed: 18,
    attacks: [
      { type: 'lob', cd: 3.0, dmg: 10, aoe: 96, telegraph: 1.15 },
      { type: 'spawn', cd: 6.8, table: [{ w: 70, v: 'pilgrim' }, { w: 30, v: 'aunty' }], count: 4 },
    ],
  },
  nawab: {
    id: 'nawab', name: 'THE NAWAB’S KITCHEN', emoji: '\u{1F451}',
    subtitle: 'Six hours on dum. He will wait. You will not.',
    hp: 1360, r: 48, speed: 20,
    attacks: [
      { type: 'lob', cd: 3.4, dmg: 13, aoe: 112, telegraph: 1.35 },
      { type: 'spawn', cd: 7.4, table: [{ w: 60, v: 'bhukkad' }, { w: 40, v: 'aunty' }], count: 4 },
    ],
  },
  midnight: {
    id: 'midnight', name: 'THE MIDNIGHT MARKET', emoji: '\u{1F48E}',
    subtitle: 'Jewellers by day. By night it eats.',
    hp: 1560, r: 46, speed: 28,
    attacks: [
      { type: 'dash', cd: 4.6, dmg: 10, telegraph: 0.95 },
      { type: 'spawn', cd: 4.8, table: [{ w: 50, v: 'kid' }, { w: 30, v: 'bhukkad' }, { w: 20, v: 'officeRush' }], count: 5 },
    ],
  },
  shack: {
    id: 'shack', name: 'THE SHACK CARTEL', emoji: '\u{1F3D6}',
    subtitle: 'They own the sand, the music and the parking.',
    hp: 1540, r: 48, speed: 26,
    attacks: [
      { type: 'dash', cd: 4.8, dmg: 11, telegraph: 1.0 },
      { type: 'lob', cd: 2.8, dmg: 9, aoe: 84, telegraph: 0.9 },
      { type: 'spawn', cd: 6.2, table: [{ w: 60, v: 'tourist' }, { w: 40, v: 'rider' }], count: 4 },
    ],
  },
};

export const ROUTE_ORDER = ['delhi', 'mumbai', 'kolkata', 'chennai', 'amritsar', 'lucknow', 'ahmedabad', 'goa'];

/** Story beat shown when a city's boss goes down. */
export function pageFor(cityId) {
  const i = ROUTE_ORDER.indexOf(cityId);
  return { n: i + 1, of: ROUTE_ORDER.length, title: CITIES[cityId].page };
}

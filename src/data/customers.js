// Every "enemy" is a customer. Serving them is the kill.

export const CUSTOMERS = {
  bhukkad: {
    id: 'bhukkad', name: 'Bhukkad', emoji: '\u{1F60B}', r: 13,
    hp: 22, speed: 30, patience: 27, pay: 3, xp: 3, cravings: true,
  },
  kid: {
    id: 'kid', name: 'School Gang', emoji: '\u{1F9D2}', r: 11,
    hp: 13, speed: 52, patience: 17, pay: 2, xp: 2, cravings: true, swarm: 3,
  },
  aunty: {
    id: 'aunty', name: 'Aunty', emoji: '\u{1F475}', r: 16,
    hp: 70, speed: 17, patience: 36, pay: 9, xp: 8, cravings: true,
    strictOrder: true, // takes 15% damage from anything but her craving
  },
  officeRush: {
    id: 'officeRush', name: 'Lunch Rush', emoji: '\u{1F454}', r: 13,
    hp: 30, speed: 34, patience: 21, pay: 5, xp: 4, cravings: true, swarm: 3,
  },
  influencer: {
    id: 'influencer', name: 'Foodie', emoji: '\u{1F4F1}', r: 14,
    hp: 34, speed: 28, patience: 22, pay: 12, xp: 9, cravings: true,
    aura: { radius: 150, fireRatePenalty: 0.3 }, // bad-review aura while unserved
  },
  dog: {
    id: 'dog', name: 'Stray', emoji: '\u{1F415}', r: 12,
    hp: 20, speed: 66, pay: 0, xp: 2, cravings: false,
    thief: true, // cannot be fed; steals heat off the cart
  },
  rider: {
    id: 'rider', name: 'Rider', emoji: '\u{1F6F5}', r: 14,
    hp: 28, speed: 78, pay: 4, xp: 4, cravings: false,
    alwaysAngry: true, contact: 3.6,
  },
};

export const ANGRY_SPEED_MULT = 1.55;
export const ANGRY_CONTACT_DPS = 5.2;

// Global game configuration and tunable constants.
const CONFIG = {
  board: {
    width: 900,
    height: 500,
    rows: 5,
    cols: 9,
  },
  startingSun: 50,
  // Natural sky-sun drop interval (ms) and the value each drop gives.
  skySunInterval: 9000,
  sunValue: 25,
  // How far from the left edge zombies must reach to trigger a loss (px).
  houseLineX: 6,
};

// Derived grid metrics. The first column is reserved as the "house" margin
// so plants are placed starting a little inset from the left edge.
CONFIG.grid = {
  marginLeft: 40,
  marginTop: 40,
  get cellW() {
    return (CONFIG.board.width - this.marginLeft) / CONFIG.board.cols;
  },
  get cellH() {
    return (CONFIG.board.height - this.marginTop) / CONFIG.board.rows;
  },
};

// Plant catalog. `key` matches the seed card id.
const PLANT_TYPES = {
  sunflower: {
    key: "sunflower",
    name: "向日葵",
    emoji: "🌻",
    cost: 50,
    hp: 60,
    cooldown: 6000,
    produces: "sun",
    produceInterval: 7000,
  },
  peashooter: {
    key: "peashooter",
    name: "豌豆射手",
    emoji: "🌱",
    cost: 100,
    hp: 60,
    cooldown: 6000,
    shoots: true,
    fireInterval: 1600,
    damage: 20,
  },
  wallnut: {
    key: "wallnut",
    name: "坚果墙",
    emoji: "🥜",
    cost: 50,
    hp: 300,
    cooldown: 12000,
  },
  repeater: {
    key: "repeater",
    name: "双发射手",
    emoji: "🌿",
    cost: 200,
    hp: 60,
    cooldown: 8000,
    shoots: true,
    fireInterval: 1600,
    damage: 20,
    burst: 2,
  },
};

// Zombie catalog.
const ZOMBIE_TYPES = {
  normal: {
    key: "normal",
    name: "普通僵尸",
    emoji: "🧟",
    hp: 100,
    speed: 14, // px per second
    damage: 25, // bite damage per second to plants
  },
  cone: {
    key: "cone",
    name: "路障僵尸",
    emoji: "🧟‍♂️",
    hp: 200,
    speed: 14,
    damage: 25,
  },
  fast: {
    key: "fast",
    name: "快速僵尸",
    emoji: "🧟‍♀️",
    hp: 80,
    speed: 28,
    damage: 25,
  },
};

// Wave script. Each wave is a list of {type, row, delay} spawns where delay is
// milliseconds after the wave starts. Waves begin once the previous one is
// cleared (or after a max timeout).
const WAVES = [
  [
    { type: "normal", delay: 0 },
    { type: "normal", delay: 6000 },
    { type: "normal", delay: 12000 },
  ],
  [
    { type: "normal", delay: 0 },
    { type: "cone", delay: 4000 },
    { type: "normal", delay: 8000 },
    { type: "fast", delay: 12000 },
  ],
  [
    { type: "cone", delay: 0 },
    { type: "normal", delay: 3000 },
    { type: "fast", delay: 6000 },
    { type: "cone", delay: 9000 },
    { type: "normal", delay: 11000 },
    { type: "fast", delay: 13000 },
  ],
];

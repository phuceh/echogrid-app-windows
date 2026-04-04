import { C } from './theme';

export const ECHO_PAUSE        = 700;
export const ECHO_STEP         = 800;
export const ARROW_ECHO_STEP   = 180;
export const TRAIL_TTL         = 500;
export const TRAIL_FADE        = 500;
export const SWIPE_MIN         = 20;
export const FREE_LEVEL_LIMIT  = 35;
export const HINT_MAX          = 5;
export const HINT_REWARD_EVERY = 5;
export const IAP_PRICE         = '£1.99';
export const IAP_SKU           = 'echogrid_full_sequence';

export const ARROW_DIR = { '>': 'RIGHT', '<': 'LEFT', '^': 'UP', 'v': 'DOWN' };
export const DIR_ARROW = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };

export const TIER_TUTORIAL_LABEL = { 1: 'DO T1', 11: 'DO T2', 21: 'DO T3', 36: 'DO T4', 56: 'DO T5', 76: 'DO T6' };

export const TUTORIAL_GATES = { T1: null, T2: 10, T3: 20, T4: 35, T5: 55, T6: 75 };

export const TUTORIAL_LEVELS = [
  {
    id: 'T1', label: 'ECHO', movesPerTurn: 3, echoLast: 1,
    grid: [
      ['S', '.', '.'],
      ['.', '.', '.'],
      ['.', '.', 'G'],
    ],
    message: { title: 'MOVEMENT & ECHO', lines: [
      'You have a number of MOVES per turn.',
      'Use the d-pad or swipe to move.',
      'After your moves are spent, the ECHO replays your last move(s) automatically.',
      'Reach the ◈ goal to complete the level.',
    ]},
  },
  {
    id: 'T2', label: 'TELEPORT', movesPerTurn: 3, echoLast: 1,
    grid: [
      ['S', 'W', 'T1'],
      ['.', 'W', '.'],
      ['T1', 'W', 'G'],
    ],
    message: { title: 'TELEPORTERS', lines: [
      'Hexagonal tiles marked with a number are TELEPORTERS.',
      'Stepping on one instantly transports you to its paired tile.',
      'The ECHO will also use teleporters — plan accordingly.',
      'Matching numbers are always paired together.',
    ]},
  },
  {
    id: 'T3', label: 'CRUMBLE', movesPerTurn: 3, echoLast: 1,
    grid: [
      ['S', 'C', '.'],
      ['W', 'C', '.'],
      ['.', 'C', 'G'],
    ],
    message: { title: 'CRUMBLING TILES', lines: [
      'Red tiles marked ✕ are CRUMBLE tiles.',
      'They collapse the moment you step on them.',
      'The ECHO can also destroy crumble tiles.',
      'You can only step on them once. Stepping on a destroyed tile ends your run — plan your path carefully.',
    ]},
  },
  {
    id: 'T4', label: 'ARROWS', movesPerTurn: 3, echoLast: 1,
    grid: [
      ['S', '.', '.','v'],
      ['.', '.', '<','.'],
      ['^', '>', '.','.'],
      ['.', '.', '.','G'],
    ],
    message: { title: 'ARROW TILES', lines: [
      'Teal tiles with directional arrows will PUSH you one extra step.',
      'When you step on an arrow tile, you are immediately launched one cell further in that direction.',
      'The ECHO is also affected by arrow tiles.',
      'Beware — being pushed into a wall or void ends your run.',
    ]},
  },
  {
    id: 'T5', label: 'PRESSURE', movesPerTurn: 4, echoLast: 2,
    grid: [
      ['S', '.', 'P1', '.'],
      ['.', '.', '.',  '.'],
      ['.', '.', 'W',  'W'],
      ['.', '.', 'D1', 'G'],
    ],
    message: { title: 'PRESSURE PADS & DOORS', lines: [
      'Yellow tiles marked ⊕ are PRESSURE PADS.',
      'Stepping on a pad unlocks its matching DOOR — they share the same number.',
      'Doors block movement until their paired pad is activated.',
      'The ECHO can activate pads too — use this to your advantage.',
    ]},
  },
  {
    id: 'T6', label: 'PHASE', movesPerTurn: 3, echoLast: 1,
    grid: [
      ['S', '.', 'W', '.'],
      ['.', 'I', 'O', '.'],
      ['.', 'O', 'I', '.'],
      ['.', 'W', '.', 'G'],
    ],
    message: { title: 'PHASE TILES', lines: [
      'Phase tiles (~) flip between passable and blocked on every step.',
      'White = blocked solid wall. Translucent = passable gap.',
      'They are always in opposite states.',
      'Every step — player or echo — flips all phase tiles. Count carefully.',
    ]},
  },
];

export const PALETTE_TILES = [
  { tile: '.',    label: 'EMPTY',   bg: C.surface,      border: C.border,                    icon: '·',  tc: C.textDim          },
  { tile: 'S',    label: 'START',   bg: C.indigoDim,    border: C.indigo,                    icon: '◉',  tc: C.indigo           },
  { tile: 'G',    label: 'GOAL',    bg: C.winDim,       border: C.win+'cc',                  icon: '◈',  tc: C.win              },
  { tile: 'W',    label: 'WALL',    bg: C.wall,         border: C.wallBright,                icon: '',   tc: C.textDim          },
  { tile: 'C',    label: 'CRUMBLE', bg: C.crumbleDim,   border: 'rgba(244,63,94,0.6)',        icon: '✕',  tc: C.crumble          },
  { tile: 'I',    label: 'PHASE-I', bg: C.phaseOpen,    border: C.phaseOpenBorder,           icon: '~',  tc: C.phaseOpenText    },
  { tile: 'O',    label: 'PHASE-O', bg: C.phaseBlocked, border: C.phaseBlockedBorder,        icon: '~',  tc: C.phaseBlockedText },
  { tile: '>',    label: 'RIGHT →', bg: C.arrowDim,     border: 'rgba(0,212,200,0.6)',        icon: '▶',  tc: C.arrow            },
  { tile: '<',    label: 'LEFT ←',  bg: C.arrowDim,     border: 'rgba(0,212,200,0.6)',        icon: '◀',  tc: C.arrow            },
  { tile: '^',    label: 'UP ↑',    bg: C.arrowDim,     border: 'rgba(0,212,200,0.6)',        icon: '▲',  tc: C.arrow            },
  { tile: 'v',    label: 'DOWN ↓',  bg: C.arrowDim,     border: 'rgba(0,212,200,0.6)',        icon: '▼',  tc: C.arrow            },
  { tile: 'TELE', label: 'TELE',    bg: C.teleDim,      border: 'rgba(232,121,249,0.6)',      icon: '⬡',  tc: C.tele             },
  { tile: 'PAD',  label: 'PAD',     bg: C.plateDim,     border: 'rgba(234,179,8,0.6)',        icon: '⊕',  tc: C.plate            },
  { tile: 'DOOR', label: 'DOOR',    bg: C.doorDim,      border: 'rgba(234,179,8,0.6)',        icon: '▬',  tc: C.door             },
];
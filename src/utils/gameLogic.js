import * as Haptics from 'expo-haptics';
import { C } from '../constants/theme';

// ─── Phase tile helpers ───────────────────────────────────────────────────────
export function isIPassable(moveCount) { return moveCount % 2 === 0; }
export function isOPassable(moveCount) { return moveCount % 2 !== 0; }

// ─── Stars ───────────────────────────────────────────────────────────────────
export function calculateStars(turnCount, minTurns) {
  if (minTurns == null) return null;
  const d = turnCount - minTurns;
  if (d <= 0) return 3;
  if (d === 1) return 2;
  if (d === 2) return 1;
  return 0;
}

// ─── Haptics ─────────────────────────────────────────────────────────────────
export const haptic = {
  move:      () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);              } catch {} },
  echoStep:  () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);             } catch {} },
  win:       () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} },
  terminate: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);   } catch {} },
  undo:      () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);             } catch {} },
  hint:      () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);              } catch {} },
  teleport:  () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);              } catch {} },
  crumble:   () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);             } catch {} },
  arrow:     () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);              } catch {} },
  plate:     () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} },
  phase:     () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);              } catch {} },
};

// ─── Grid helpers ─────────────────────────────────────────────────────────────
export function makeEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill('.'));
}

export function countTilesInGrid(grid) {
  const tCounts = {};
  const pNums   = new Set();
  const dNums   = new Set();
  grid.forEach(row => row.forEach(cell => {
    if (typeof cell !== 'string') return;
    if (cell.startsWith('T') && cell.length >= 2) tCounts[cell] = (tCounts[cell] || 0) + 1;
    if (cell.startsWith('P') && cell.length >= 2) pNums.add(cell.slice(1));
    if (cell.startsWith('D') && cell.length >= 2) dNums.add(cell.slice(1));
  }));
  return { tCounts, pNums, dNums };
}

export function getNextSmartTile(paletteKey, grid) {
  const { tCounts, pNums, dNums } = countTilesInGrid(grid);
  if (paletteKey === 'TELE') {
    for (let n = 1; n <= 99; n++) {
      const key = `T${n}`;
      if ((tCounts[key] || 0) < 2) return key;
    }
    return 'T1';
  }
  if (paletteKey === 'PAD') {
    for (let n = 1; n <= 99; n++) {
      if (!pNums.has(String(n))) return `P${n}`;
    }
    return 'P1';
  }
  if (paletteKey === 'DOOR') {
    for (let n = 1; n <= 99; n++) {
      if (!dNums.has(String(n))) return `D${n}`;
    }
    return 'D1';
  }
  return paletteKey;
}

export function getSmartTileQueueLabel(paletteKey, grid) {
  if (!['TELE', 'PAD', 'DOOR'].includes(paletteKey)) return null;
  const next = getNextSmartTile(paletteKey, grid);
  const { tCounts } = countTilesInGrid(grid);
  if (paletteKey === 'TELE') {
    const cnt = tCounts[next] || 0;
    return cnt === 0 ? `${next}  FIRST` : `${next}  SECOND`;
  }
  if (paletteKey === 'PAD')  return `${next}`;
  if (paletteKey === 'DOOR') return `${next}`;
  return null;
}

export function validateLevel(grid) {
  const errors = [];
  let startCount = 0, goalCount = 0;
  const { tCounts, pNums, dNums } = countTilesInGrid(grid);

  grid.forEach(row => row.forEach(cell => {
    if (cell === 'S') startCount++;
    else if (cell === 'G') goalCount++;
  }));

  if (startCount === 0) errors.push('Place a START tile (S)');
  if (startCount > 1)   errors.push('Only one START tile allowed');
  if (goalCount === 0)  errors.push('Place a GOAL tile (G)');
  if (goalCount > 1)    errors.push('Only one GOAL tile allowed');

  Object.entries(tCounts).forEach(([k, v]) => {
    if (v === 1) errors.push(`${k}: teleporters must be placed in pairs — add a second ${k} tile`);
    if (v > 2)   errors.push(`${k}: too many tiles placed (max 2 per pair)`);
  });

  pNums.forEach(n => {
    if (!dNums.has(n)) errors.push(`P${n} has no matching door — place a D${n} tile`);
  });
  dNums.forEach(n => {
    if (!pNums.has(n)) errors.push(`D${n} has no matching pad — place a P${n} tile`);
  });

  return errors;
}

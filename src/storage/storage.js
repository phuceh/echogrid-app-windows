import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { IAP_SKU } from '../constants/game';

const { AmazonIAP } = NativeModules;

const PROGRESS_KEY = 'echogrid_progress';
const META_KEY     = 'echogrid_meta';

// Legacy keys — read-once for migration, never written again
const _LEGACY_COMPLETED = 'echogrid_completed';
const _LEGACY_STARS     = 'echogrid_stars';
const _LEGACY_BEST      = 'echogrid_bestturns';
const _LEGACY_TUTORIAL  = 'echogrid_tutorial_completed';
const _LEGACY_HINTS     = 'echogrid_hints';
const _LEGACY_PURCHASED = 'echogrid_purchased';
const _LEGACY_CUSTOM    = 'echogrid_custom';

// ─── Load ─────────────────────────────────────────────────────────────────────

export async function loadAllData() {
  try {
    // Initialise Amazon IAP on load
    if (AmazonIAP) {
      try { await AmazonIAP.initiate(); } catch {}
    }

    const [progressRaw, metaRaw] = await AsyncStorage.multiGet([PROGRESS_KEY, META_KEY]);
    const progress = progressRaw[1] ? JSON.parse(progressRaw[1]) : null;
    const meta     = metaRaw[1]     ? JSON.parse(metaRaw[1])     : null;

    if (progress && meta) {
      return {
        completed:         progress.completed         ?? [],
        stars:             progress.stars             ?? {},
        bestTurns:         progress.bestTurns         ?? {},
        tutorialCompleted: progress.tutorialCompleted ?? [],
        hints:             progress.hints             ?? 1,
        purchased:         meta.purchased             ?? false,
        customLevels:      meta.customLevels          ?? [],
      };
    }

    // Migration path — read legacy keys once and rewrite in new format
    const [c, s, b, t, h, p, cl] = await AsyncStorage.multiGet([
      _LEGACY_COMPLETED, _LEGACY_STARS, _LEGACY_BEST,
      _LEGACY_TUTORIAL, _LEGACY_HINTS, _LEGACY_PURCHASED, _LEGACY_CUSTOM,
    ]);
    const result = {
      completed:         c[1]  ? JSON.parse(c[1])   : (progress?.completed         ?? []),
      stars:             s[1]  ? JSON.parse(s[1])   : (progress?.stars             ?? {}),
      bestTurns:         b[1]  ? JSON.parse(b[1])   : (progress?.bestTurns         ?? {}),
      tutorialCompleted: t[1]  ? JSON.parse(t[1])   : (progress?.tutorialCompleted ?? []),
      hints:             h[1]  ? parseInt(h[1], 10) : (progress?.hints             ?? 1),
      purchased:         p[1]  === 'true'           || (meta?.purchased            ?? false),
      customLevels:      cl[1] ? JSON.parse(cl[1])  : (meta?.customLevels          ?? []),
    };
    await saveProgress(result);
    await saveMeta({ purchased: result.purchased, customLevels: result.customLevels });
    await AsyncStorage.multiRemove([
      _LEGACY_COMPLETED, _LEGACY_STARS, _LEGACY_BEST,
      _LEGACY_TUTORIAL, _LEGACY_HINTS, _LEGACY_PURCHASED, _LEGACY_CUSTOM,
    ]);
    return result;
  } catch {
    return { completed: [], stars: {}, bestTurns: {}, tutorialCompleted: [], hints: 1, purchased: false, customLevels: [] };
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

// All five progress fields in one write
export async function saveProgress({ completed, stars, bestTurns, tutorialCompleted, hints }) {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed, stars, bestTurns, tutorialCompleted, hints }));
  } catch {}
}

// purchased + customLevels together
export async function saveMeta({ purchased, customLevels }) {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ purchased, customLevels }));
  } catch {}
}

// ─── IAP ──────────────────────────────────────────────────────────────────────

export async function purchaseFullGame() {
  try {
    if (!AmazonIAP) {
      console.warn('AmazonIAP native module not available');
      return false;
    }
    const result = await AmazonIAP.purchaseItem(IAP_SKU);
    return result === true;
  } catch (e) {
    console.warn('purchaseFullGame error:', e);
    return false;
  }
}

export async function restoreFullGame() {
  try {
    if (!AmazonIAP) {
      console.warn('AmazonIAP native module not available');
      return false;
    }
    const result = await AmazonIAP.restorePurchases();
    return result === true;
  } catch (e) {
    console.warn('restoreFullGame error:', e);
    return false;
  }
}
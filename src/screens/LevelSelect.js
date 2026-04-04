import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT } from '../constants/theme';
import { FREE_LEVEL_LIMIT, TIER_TUTORIAL_LABEL, TUTORIAL_LEVELS, IAP_PRICE } from '../constants/game';
import { LEVELS } from '../../levels/levels';
import styles from '../styles/styles';

// ─── Star Display ─────────────────────────────────────────────────────────────
function StarDisplay({ stars, size = 20, style }) {
  if (stars == null) return null;
  return (
    <View style={[{ flexDirection: 'row', gap: 4 }, style]}>
      {[0,1,2].map(i => (
        <Text key={i} style={{
          fontSize: size,
          color: i < stars ? C.star : C.starDim,
          textShadowColor: i < stars ? 'rgba(245,158,11,0.53)' : 'transparent',
          textShadowRadius: i < stars ? 6 : 0,
        }}>★</Text>
      ))}
    </View>
  );
}

// ─── Level Select ─────────────────────────────────────────────────────────────
function LevelSelect({
  onBack, onSelect, onSelectTutorial, onReset, onUnlock,
  completed, tutorialCompleted, isUnlocked, isPaywalled,
  isTutorialUnlocked, levelStars, isPurchased,
}) {
  const [confirming, setConfirming] = useState(false);
  const insets = useSafeAreaInsets();
  const tutColor = '#94a3b8';

  const tutorialUnlockHint = {
    T1: null, T2: 'COMPLETE BEGINNER', T3: 'COMPLETE EASY',
    T4: 'COMPLETE MEDIUM', T5: 'COMPLETE HARD', T6: 'COMPLETE VERY HARD',
  };

  const tiers = [
    { label: 'BEGINNER',  range: [1,   10],  color: C.teal    },
    { label: 'EASY',      range: [11,  20],  color: '#38bdf8' },
    { label: 'MEDIUM',    range: [21,  35],  color: C.indigo  },
    { label: 'HARD',      range: [36,  55],  color: '#f59e0b' },
    { label: 'VERY HARD', range: [56,  75],  color: C.echo    },
    { label: 'EXPERT',    range: [76, 100],  color: C.warn    },
  ];

  const accessibleLevels  = useMemo(
    () => isPurchased ? LEVELS : LEVELS.filter(l => l.id <= FREE_LEVEL_LIMIT),
    [isPurchased]
  );
  const possibleStarTotal = useMemo(
    () => accessibleLevels.filter(l => l.minTurns != null).length * 3,
    [accessibleLevels]
  );
  const earnedStarTotal = useMemo(
    () => accessibleLevels.reduce((sum, l) => sum + (levelStars[l.id] ?? 0), 0),
    [accessibleLevels, levelStars]
  );
  const paywallTiers = useMemo(
    () => tiers.filter(t => t.range[0] > FREE_LEVEL_LIMIT),
    []
  );

  const renderLevelSquare = (lvl, tier, done, unlocked, paywalled, stars) => (
    <TouchableOpacity
      key={lvl.id}
      style={[
        styles.levelSquare,
        paywalled ? styles.levelSquarePaywall :
        unlocked  ? { borderColor: done ? tier.color : tier.color+'44', backgroundColor: done ? tier.color+'22' : C.raised }
                  : styles.levelSquareLocked,
      ]}
      onPress={() => (unlocked && !paywalled) && onSelect(lvl.id)}
      activeOpacity={(unlocked && !paywalled) ? 0.6 : 1}
      disabled={!unlocked || paywalled}
    >
      {paywalled ? (
        <Text style={styles.levelSquarePaywallLock}>⌀</Text>
      ) : done ? (
        <>
          <Text style={[styles.levelSquareCheck, { color: tier.color }]}>✓</Text>
          <Text style={[styles.levelSquareNumSmall, { color: tier.color+'aa' }]}>{lvl.id}</Text>
          {stars != null && (
            <View style={styles.levelSquareStarRow}>
              {[0,1,2].map(i => <Text key={i} style={[styles.levelSquareStar, { color: i < stars ? C.star : C.starDim }]}>★</Text>)}
            </View>
          )}
        </>
      ) : unlocked ? (
        <Text style={[styles.levelSquareText, { color: tier.color }]}>{lvl.id}</Text>
      ) : (
        <>
          <Text style={styles.levelSquareLock}>⌀</Text>
          <Text style={[styles.levelSquareNumSmall, { color: C.lockedText, fontSize: 6, textAlign: 'center' }]}>
            {TIER_TUTORIAL_LABEL[lvl.id] ?? String(lvl.id)}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}>
      <Text style={styles.screenTitle}>SELECT LEVEL</Text>
      <Text style={styles.screenSubtitle}>
        {completed.length} / {isPurchased ? LEVELS.length : FREE_LEVEL_LIMIT} COMPLETE
      </Text>
      {possibleStarTotal > 0 && (
        <View style={styles.starTotalRow}>
          <Text style={styles.starTotalStar}>★</Text>
          <Text style={styles.starTotalText}>{earnedStarTotal} / {possibleStarTotal}</Text>
        </View>
      )}

      <ScrollView style={{ width: '100%', flex: 1 }} contentContainerStyle={styles.levelScrollContent} showsVerticalScrollIndicator={false}>
        {/* Tutorial tier */}
        <View style={styles.tierSection}>
          <View style={[styles.tierHeader, { borderColor: tutColor+'55' }]}>
            <View style={[styles.tierDot, { backgroundColor: tutColor }]} />
            <Text style={[styles.tierLabel, { color: tutColor }]}>TUTORIAL</Text>
            <Text style={[styles.tierCount, { color: tutColor+'99' }]}>{tutorialCompleted.length}/{TUTORIAL_LEVELS.length}</Text>
          </View>
          <View style={styles.levelGrid}>
            {TUTORIAL_LEVELS.map(lvl => {
              const done = tutorialCompleted.includes(lvl.id);
              const unlocked = isTutorialUnlocked(lvl.id);
              return (
                <TouchableOpacity
                  key={lvl.id}
                  style={[styles.levelSquare,
                    unlocked ? { borderColor: done ? tutColor : tutColor+'44', backgroundColor: done ? tutColor+'22' : C.raised }
                             : styles.levelSquareLocked]}
                  onPress={() => unlocked && onSelectTutorial(lvl.id)}
                  activeOpacity={unlocked ? 0.6 : 1} disabled={!unlocked}
                >
                  {done ? (<>
                    <Text style={[styles.levelSquareCheck, { color: tutColor }]}>✓</Text>
                    <Text style={[styles.levelSquareNumSmall, { color: tutColor+'aa' }]}>{lvl.id}</Text>
                  </>) : unlocked ? (<>
                    <Text style={[styles.levelSquareText, { color: tutColor }]}>{lvl.id}</Text>
                    <Text
                      style={[styles.levelSquareNumSmall, { color: tutColor+'77' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >{lvl.label}</Text>
                  </>) : (<>
                    <Text style={styles.levelSquareLock}>⌀</Text>
                    <Text style={[styles.levelSquareNumSmall, { color: C.lockedText, fontSize: 6, textAlign: 'center' }]}>
                      {tutorialUnlockHint[lvl.id]}
                    </Text>
                  </>)}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Free tiers */}
        {tiers.filter(t => t.range[0] <= FREE_LEVEL_LIMIT).map(tier => {
          const tierLevels = LEVELS.filter(l => l.id >= tier.range[0] && l.id <= tier.range[1]);
          if (!tierLevels.length) return null;
          const tierCompleted = tierLevels.filter(l => completed.includes(l.id)).length;
          return (
            <View key={tier.label} style={styles.tierSection}>
              <View style={[styles.tierHeader, { borderColor: tier.color+'55' }]}>
                <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
                <Text style={[styles.tierCount, { color: tier.color+'99' }]}>{tierCompleted}/{tierLevels.length}</Text>
              </View>
              <View style={styles.levelGrid}>
                {tierLevels.map(lvl => renderLevelSquare(
                  lvl, tier,
                  completed.includes(lvl.id), isUnlocked(lvl.id), isPaywalled(lvl.id),
                  levelStars[lvl.id] ?? null,
                ))}
              </View>
            </View>
          );
        })}

        {/* Paywall banner */}
        {!isPurchased && (
          <TouchableOpacity style={styles.paywallBanner} onPress={onUnlock} activeOpacity={0.8}>
            <View style={styles.paywallBannerLeft}>
              <Text style={styles.paywallBannerTitle}>FULL SEQUENCE</Text>
              <Text style={styles.paywallBannerSub}>65 more levels  ·  Level Builder  ·  Unlimited hints</Text>
            </View>
            <View style={styles.paywallBannerRight}>
              <Text style={styles.paywallBannerPrice}>{IAP_PRICE}</Text>
              <Text style={styles.paywallBannerUnlock}>UNLOCK  ›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Paywalled tiers */}
        {paywallTiers.map(tier => {
          const tierLevels = LEVELS.filter(l => l.id >= tier.range[0] && l.id <= tier.range[1]);
          if (!tierLevels.length) return null;
          const tierCompleted = tierLevels.filter(l => completed.includes(l.id)).length;
          return (
            <View key={tier.label} style={[styles.tierSection, !isPurchased && { opacity: 0.35 }]}>
              <View style={[styles.tierHeader, { borderColor: isPurchased ? tier.color+'55' : tier.color+'33' }]}>
                <View style={[styles.tierDot, { backgroundColor: isPurchased ? tier.color : tier.color+'55' }]} />
                <Text style={[styles.tierLabel, { color: isPurchased ? tier.color : tier.color+'66' }]}>{tier.label}</Text>
                <Text style={[styles.tierCount, { color: isPurchased ? tier.color+'99' : tier.color+'44' }]}>
                  {isPurchased ? `${tierCompleted}/${tierLevels.length}` : `0/${tierLevels.length}`}
                </Text>
                {!isPurchased && <Text style={styles.tierLockedBadge}>⌀ LOCKED</Text>}
              </View>
              <View style={styles.levelGrid}>
                {tierLevels.map(lvl => !isPurchased ? (
                  <TouchableOpacity key={lvl.id} style={[styles.levelSquare, styles.levelSquarePaywall]}
                    onPress={() => onSelect(lvl.id)} activeOpacity={0.6}>
                    <Text style={styles.levelSquarePaywallLock}>⌀</Text>
                  </TouchableOpacity>
                ) : renderLevelSquare(
                  lvl, tier,
                  completed.includes(lvl.id), isUnlocked(lvl.id), false,
                  levelStars[lvl.id] ?? null,
                ))}
              </View>
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {!confirming ? (
        <TouchableOpacity style={styles.backButton} onPress={() => setConfirming(true)} activeOpacity={0.7}>
          <Text style={styles.resetProgressBtnText}>RESET PROGRESS</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.resetConfirm}>
          <Text style={styles.resetConfirmText}>RESET ALL PROGRESS?</Text>
          <View style={styles.resetConfirmRow}>
            <TouchableOpacity style={[styles.resetConfirmBtn, styles.resetConfirmBtnYes]}
              onPress={() => { onReset(); setConfirming(false); }} activeOpacity={0.7}>
              <Text style={styles.resetConfirmBtnYesText}>CONFIRM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.resetConfirmBtn, styles.resetConfirmBtnNo]}
              onPress={() => setConfirming(false)} activeOpacity={0.7}>
              <Text style={styles.resetConfirmBtnNoText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>‹ BACK</Text>
      </TouchableOpacity>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
    </View>
  );
}

export { StarDisplay, LevelSelect };
export default LevelSelect;
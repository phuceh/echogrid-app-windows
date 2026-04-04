import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { C, FONT } from '../constants/theme';
import { IAP_PRICE } from '../constants/game';
import styles from '../styles/styles';

function UnlockScreen({ onPurchase, onRestore, onBack, isPurchasing }) {
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.screen}>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
      <View style={styles.unlockTerminal}>
        <View style={styles.unlockTerminalBar}>
          <Text style={styles.unlockTerminalBarText}>▸ ACCESS RESTRICTED</Text>
        </View>
        <View style={styles.unlockBody}>
          <Animated.Text style={[styles.unlockIcon, { opacity: glowAnim }]}>⌀</Animated.Text>
          <Text style={styles.unlockTitle}>FULL SEQUENCE</Text>
          <Text style={styles.unlockSubtitle}>LOCKED</Text>
          <View style={styles.unlockDivider} />
          <Text style={styles.unlockDesc}>
            Unlock all 100 campaign levels, the level builder, and unlimited hints.
          </Text>
          <View style={styles.unlockFeatureList}>
            {[
              '65 additional campaign levels',
              'HARD · VERY HARD · EXPERT tiers',
              'Level builder — create & play custom grids',
              'Unlimited hints — use freely on any level',
            ].map((f, i) => (
              <View key={i} style={styles.unlockFeatureRow}>
                <Text style={styles.unlockFeatureDash}>—</Text>
                <Text style={styles.unlockFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={styles.unlockDivider} />
          <TouchableOpacity
            style={[styles.unlockBuyBtn, isPurchasing && { opacity: 0.5 }]}
            onPress={onPurchase} disabled={isPurchasing} activeOpacity={0.7}
          >
            <Text style={styles.unlockBuyBtnText}>
              {isPurchasing ? 'PROCESSING···' : `UNLOCK  ·  ${IAP_PRICE}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.unlockRestoreBtn} onPress={onRestore} disabled={isPurchasing} activeOpacity={0.7}>
            <Text style={styles.unlockRestoreBtnText}>RESTORE PURCHASE</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>‹ BACK</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────


export default UnlockScreen;

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { C, FONT } from '../constants/theme';
import styles from '../styles/styles';

function StartScreen({ onStart, onResetIAP, onUnlockAll }) {
  const glow = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1,   duration: 2200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.screen}>
      <View style={styles.startContent}>
        <Animated.Text style={[styles.startTitle, { opacity: glow }]}>ECHO</Animated.Text>
        <Text style={styles.startTitleSub}>GRID</Text>
        <Text style={styles.startTagline}>every move leaves a trace</Text>
        <View style={styles.startDivider} />
        <TouchableOpacity style={styles.startButton} onPress={onStart} activeOpacity={0.7}>
          <Text style={styles.startButtonText}>INITIALISE</Text>
        </TouchableOpacity>
      </View>

      {/* DEV ONLY — uncomment to re-enable dev buttons */}
      {/*
      <View style={styles.devBtnRow}>
        <TouchableOpacity style={styles.devResetBtn} onPress={onResetIAP} activeOpacity={0.7}>
          <Text style={styles.devResetBtnText}>⚡ RESET IAP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.devResetBtn, { borderColor: '#00ff9966' }]} onPress={onUnlockAll} activeOpacity={0.7}>
          <Text style={[styles.devResetBtnText, { color: '#00ff99aa' }]}>⚡ UNLOCK ALL</Text>
        </TouchableOpacity>
      </View>
      */}

      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </View>
  );
}

export default StartScreen;
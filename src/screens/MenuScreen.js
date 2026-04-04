import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C, FONT } from '../constants/theme';
import styles from '../styles/styles';

function MenuScreen({ onLevels, onBuilder, isPurchased }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>ECHO GRID</Text>
      <Text style={styles.screenSubtitle}>NAVIGATION</Text>

      <TouchableOpacity style={styles.menuButton} onPress={onLevels} activeOpacity={0.7}>
        <Text style={styles.menuButtonLabel}>LEVEL SELECT</Text>
        <Text style={styles.menuButtonArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={onBuilder} activeOpacity={0.7}>
        <View>
          <Text style={styles.menuButtonLabel}>LEVEL BUILDER</Text>
          {!isPurchased && (
            <Text style={[styles.diffSub, { color: 'rgba(0,212,200,0.67)' }]}>
              FULL SEQUENCE REQUIRED
            </Text>
          )}
        </View>
        <Text style={[styles.menuButtonArrow, !isPurchased && { color: 'rgba(0,212,200,0.53)' }]}>
          {isPurchased ? '✎' : '⌀'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </View>
  );
}


export default MenuScreen;

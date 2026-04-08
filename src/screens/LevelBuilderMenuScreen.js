import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C, FONT } from '../constants/theme';
import styles from '../styles/styles';

function LevelBuilderMenuScreen({ onBack, onCreate, onSaved, savedCount, atLimit }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>LEVEL BUILDER</Text>
      <Text style={styles.screenSubtitle}>CREATE · SAVE · PLAY</Text>
      <View style={styles.builderTaglineRow}>
        <Text style={styles.builderTagline}>Design custom grids with every mechanic.</Text>
        <Text style={styles.builderTagline}>Challenge your echo.</Text>
      </View>
      <TouchableOpacity
        style={[styles.menuButton, atLimit && { opacity: 0.45 }]}
        onPress={onCreate}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.menuButtonLabel}>CREATE NEW LEVEL</Text>
          <Text style={styles.diffSub}>
            {atLimit ? 'Level limit reached — delete a level to make room' : 'Open the grid editor'}
          </Text>
        </View>
        <Text style={[styles.menuButtonArrow, { fontSize: 22 }]}>
          {atLimit ? '⌀' : '+'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuButton} onPress={onSaved} activeOpacity={0.7}>
        <View>
          <Text style={styles.menuButtonLabel}>SAVED LEVELS</Text>
          <Text style={styles.diffSub}>
            {savedCount === 0 ? 'No levels saved yet' : `${savedCount} / 20 levels saved`}
          </Text>
        </View>
        <Text style={styles.menuButtonArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>‹ BACK</Text>
      </TouchableOpacity>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </View>
  );
}

// ─── Grid Thumbnail ───────────────────────────────────────────────────────────
function GridThumbnail({ grid, size = 54 }) {
  const rows = grid.length;
  const cols = grid[0].length;
  const cellSize = Math.floor(size / Math.max(rows, cols));
  const totalW = cellSize * cols;
  const totalH = cellSize * rows;

  const getCellColor = (cell) => {
    if (cell === 'W') return C.wallBright;
    if (cell === 'S') return C.indigo;
    if (cell === 'G') return C.win;
    if (cell === 'C') return C.crumble;
    if (cell === 'I' || cell === 'O') return '#94a3b8';
    if (cell === '>' || cell === '<' || cell === '^' || cell === 'v') return C.teal;
    if (typeof cell === 'string' && cell.startsWith('T') && cell.length >= 2) return C.tele;
    if (typeof cell === 'string' && cell.startsWith('P') && cell.length >= 2) return C.plate;
    if (typeof cell === 'string' && cell.startsWith('D') && cell.length >= 2) return C.door;
    return C.surface;
  };

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', backgroundColor: C.raised, borderWidth: 1, borderColor: C.border }}>
      <View style={{ width: totalW, height: totalH }}>
        {grid.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((cell, c) => (
              <View key={c} style={{ width: cellSize, height: cellSize, backgroundColor: getCellColor(cell) }} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Saved Levels Screen ──────────────────────────────────────────────────────

export default LevelBuilderMenuScreen;

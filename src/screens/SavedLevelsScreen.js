import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT } from '../constants/theme';
import { Overlay, Screen } from '../components/Overlay';
import GridThumbnail from '../components/GridThumbnail';
import styles from '../styles/styles';

function SavedLevelsScreen({ onBack, onPlay, onEdit, onDelete, onDeleteAll, customLevels }) {
  const [confirmDelete,    setConfirmDelete]    = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.void }}>
      <Screen style={[styles.screen, { justifyContent: 'flex-start', paddingTop: insets.top + 14, paddingBottom: insets.bottom + 8, paddingHorizontal: 12 }]}>
        <Text style={[styles.screenTitle, { marginBottom: 4, textAlign: 'center', width: '100%' }]}>SAVED LEVELS</Text>
        <Text style={styles.screenSubtitle}>{customLevels.length} / 20 CUSTOM LEVELS</Text>
        {customLevels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✎</Text>
            <Text style={styles.emptyStateText}>NO SAVED LEVELS</Text>
            <Text style={styles.emptyStateSub}>Build your first level in the editor</Text>
          </View>
        ) : (
          <ScrollView style={{ width: '100%', flex: 1 }} contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
            {customLevels.map(lvl => (
              <View key={lvl.id} style={styles.savedLevelRow}>
                <GridThumbnail grid={lvl.grid} size={54} />
                <View style={[styles.savedLevelInfo, { marginLeft: 10 }]}>
                  <Text style={styles.savedLevelName} >{lvl.name || 'UNTITLED'}</Text>
                  <Text style={styles.savedLevelMeta}>
                    {`${lvl.grid.length}×${lvl.grid[0].length}  ·  ${lvl.movesPerTurn} MOVES  ·  ECHO ${lvl.echoLast}${lvl.minTurns != null ? `  ·  PAR ${lvl.minTurns}` : ''}`}
                  </Text>
                </View>
                <View style={styles.savedLevelActions}>
                  <TouchableOpacity style={[styles.savedLevelBtn, { borderColor: C.win+'cc' }]} onPress={() => onPlay(lvl)} activeOpacity={0.7}>
                    <Text style={[styles.savedLevelBtnText, { color: C.win }]}>▶</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.savedLevelBtn, { borderColor: 'rgba(99,102,241,0.53)' }]} onPress={() => onEdit(lvl)} activeOpacity={0.7}>
                    <Text style={[styles.savedLevelBtnText, { color: C.indigo }]}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.savedLevelBtn, { borderColor: 'rgba(244,63,94,0.4)' }]} onPress={() => setConfirmDelete(lvl.id)} activeOpacity={0.7}>
                    <Text style={[styles.savedLevelBtnText, { color: C.warn }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
        {customLevels.length > 0 && (
          <TouchableOpacity
            style={[styles.backButton, { marginTop: 4 }]}
            onPress={() => setConfirmDeleteAll(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: 'rgba(244,63,94,0.6)' }]}>✕  DELETE ALL LEVELS</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ BACK</Text>
        </TouchableOpacity>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
      </Screen>
      <Overlay visible={confirmDelete !== null}>
        <View style={[styles.alertBanner, { borderColor: C.warn, width: Dimensions.get('window').width - 48 }]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>DELETE LEVEL?</Text>
            <Text style={styles.alertReason}>THIS CANNOT BE UNDONE</Text>
            <View style={styles.winButtonRow}>
              <TouchableOpacity style={styles.rowBtn} onPress={() => { onDelete(confirmDelete); setConfirmDelete(null); }} activeOpacity={0.7}>
                <Text style={styles.alertButtonText}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rowBtn, { borderColor: C.textDim }]} onPress={() => setConfirmDelete(null)} activeOpacity={0.7}>
                <Text style={[styles.alertButtonText, { color: C.textSecond }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Overlay>
      <Overlay visible={confirmDeleteAll}>
        <View style={[styles.alertBanner, { borderColor: C.warn, width: Dimensions.get('window').width - 48 }]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>DELETE ALL LEVELS?</Text>
            <Text style={styles.alertReason}>
              {`ALL ${customLevels.length} LEVEL${customLevels.length !== 1 ? 'S' : ''} WILL BE REMOVED`}
            </Text>
            <View style={styles.winButtonRow}>
              <TouchableOpacity style={styles.rowBtn} onPress={() => { onDeleteAll(); setConfirmDeleteAll(false); }} activeOpacity={0.7}>
                <Text style={styles.alertButtonText}>DELETE ALL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rowBtn, { borderColor: C.textDim }]} onPress={() => setConfirmDeleteAll(false)} activeOpacity={0.7}>
                <Text style={[styles.alertButtonText, { color: C.textSecond }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Overlay>
    </View>
  );
}

// ─── Level Editor ─────────────────────────────────────────────────────────────

export default SavedLevelsScreen;

import React, { memo } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { C, FONT } from '../constants/theme';
import { ARROW_DIR } from '../constants/game';
import { isIPassable, isOPassable } from '../utils/gameLogic';

const GridCell = memo(function GridCell({
  cell, r, c, cellSize, cellFont, subFont, showSubLabel,
  isPlayer, isEchoStep, gameOver,
  crumbled, activatedPlates, phaseMoveCount,
  trailEntry, trailIdx, trailLength, echoLast,
  getFadeAnim, shakeAnim,
}) {
  const isGoal          = cell === 'G' && !isPlayer;
  const isWall          = cell === 'W';
  const isVoid          = cell === 'X';
  const isTele          = typeof cell === 'string' && cell.startsWith('T') && cell.length >= 2 && !isPlayer;
  const isCrumbleTile   = cell === 'C' && !isPlayer;
  const isCrumbled_     = isCrumbleTile && crumbled.has(`${r},${c}`);
  const isIntactCrumble = isCrumbleTile && !isCrumbled_;
  const isArrowTile     = !!ARROW_DIR[cell] && !isPlayer;
  const isPlateTile     = typeof cell === 'string' && cell.startsWith('P') && cell.length >= 2 && !isPlayer;
  const isPlateActive   = isPlateTile && activatedPlates.has(cell);
  const isDoorTile      = typeof cell === 'string' && cell.startsWith('D') && cell.length >= 2 && !isPlayer;
  const isDoorOpen      = isDoorTile && activatedPlates.has(`P${cell.slice(1)}`);
  const isITile         = cell === 'I' && !isPlayer;
  const isOTile         = cell === 'O' && !isPlayer;
  const isIOpen         = isITile && isIPassable(phaseMoveCount);
  const isIBlocked      = isITile && !isIPassable(phaseMoveCount);
  const isOOpen         = isOTile && isOPassable(phaseMoveCount);
  const isOBlocked      = isOTile && !isOPassable(phaseMoveCount);
  const isTrail         = !isPlayer && !isWall && !isVoid && trailEntry !== null;
  const isEchoTrail     = isTrail && trailIdx >= trailLength - echoLast;
  const tileNeedsFade   = (isPlateTile && isPlateActive) || (isDoorTile && isDoorOpen);
  const tileFadeAnim    = tileNeedsFade ? getFadeAnim(cell) : null;

  const cellBase = { width: cellSize, height: cellSize, borderWidth: 1, justifyContent: 'center', alignItems: 'center' };

  return (
    <Animated.View style={[
      cellBase,
      { backgroundColor: C.surface, borderColor: C.border },
      isVoid          && { backgroundColor: 'transparent', borderColor: 'transparent' },
      isWall          && { backgroundColor: C.wall,        borderColor: C.wallBright },
      isGoal          && { backgroundColor: C.winDim,      borderColor: C.win+'cc' },
      isTele          && { backgroundColor: C.teleDim,     borderColor: 'rgba(232,121,249,0.6)' },
      isArrowTile     && { backgroundColor: C.arrowDim,    borderColor: 'rgba(0,212,200,0.6)' },
      isPlateTile     && { backgroundColor: C.plateDim,    borderColor: 'rgba(234,179,8,0.6)' },
      isDoorTile      && { backgroundColor: C.doorDim,     borderColor: 'rgba(234,179,8,0.6)' },
      isIntactCrumble && { backgroundColor: C.crumbleDim,  borderColor: 'rgba(244,63,94,0.6)' },
      isCrumbled_     && { backgroundColor: C.crumbleGone, borderColor: '#1a1208' },
      isIOpen    && { backgroundColor: C.phaseOpen,    borderColor: C.phaseOpenBorder },
      isIBlocked && { backgroundColor: C.phaseBlocked, borderColor: C.phaseBlockedBorder },
      isOOpen    && { backgroundColor: C.phaseOpen,    borderColor: C.phaseOpenBorder },
      isOBlocked && { backgroundColor: C.phaseBlocked, borderColor: C.phaseBlockedBorder },
      isPlayer && { backgroundColor: C.indigoDim, borderColor: C.indigo, shadowColor: C.indigo, shadowRadius: 8, shadowOpacity: 0.8 },
      isPlayer && isEchoStep && { backgroundColor: C.echoDim, borderColor: C.echo, shadowColor: C.echo, shadowRadius: 8, shadowOpacity: 0.8 },
      isPlayer && gameOver && { backgroundColor: C.warnDim, borderColor: C.warn },
      isPlayer && { transform: [{ translateX: shakeAnim }] },
      gameOver && !isWall && !isPlayer && !isVoid && { backgroundColor: '#100a0a', borderColor: '#1a0a0a' },
      tileFadeAnim !== null && { opacity: tileFadeAnim },
    ]}>
      {isTrail && (
        <Animated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: isEchoTrail ? 'rgba(167,139,250,0.35)' : 'rgba(99,102,241,0.25)',
          opacity: trailEntry.fadeAnim, justifyContent: 'center', alignItems: 'center',
        }]}>
          <Text style={{ fontSize: cellFont, color: isEchoTrail ? C.echo : C.indigo }}>·</Text>
        </Animated.View>
      )}
      {!isVoid && (isPlayer || isGoal) && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: cellFont, color: C.textPrimary, includeFontPadding: false }}>
            {isPlayer ? (gameOver ? '✕' : '◉') : '◈'}
          </Text>
        </View>
      )}
      {isTele && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: cellFont * 0.9, color: C.tele, includeFontPadding: false }}>⬡</Text>
          {showSubLabel && <Text style={{ fontSize: subFont, color: 'rgba(232,121,249,0.8)', fontFamily: FONT, fontWeight: '700', includeFontPadding: false }}>{cell.slice(1)}</Text>}
        </View>
      )}
      {isArrowTile && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: cellFont, color: C.arrow, includeFontPadding: false }}>
            {cell === '>' ? '▶' : cell === '<' ? '◀' : cell === '^' ? '▲' : '▼'}
          </Text>
        </View>
      )}
      {isPlateTile && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: cellFont * 0.9, color: C.plate, includeFontPadding: false }}>⊕</Text>
          {showSubLabel && <Text style={{ fontSize: subFont, color: 'rgba(234,179,8,0.8)', fontFamily: FONT, fontWeight: '700', includeFontPadding: false }}>{cell.slice(1)}</Text>}
        </View>
      )}
      {isDoorTile && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: cellFont * 0.9, color: C.door, includeFontPadding: false }}>▬</Text>
          {showSubLabel && <Text style={{ fontSize: subFont, color: 'rgba(234,179,8,0.8)', fontFamily: FONT, fontWeight: '700', includeFontPadding: false }}>{cell.slice(1)}</Text>}
        </View>
      )}
      {isIntactCrumble && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: cellFont, color: C.crumble, includeFontPadding: false }}>✕</Text>
        </View>
      )}
      {(isITile || isOTile) && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{
            fontSize: cellFont * 1.1, fontFamily: FONT, fontWeight: '900',
            includeFontPadding: false, letterSpacing: -2,
            color: isITile
              ? (isIBlocked ? C.phaseBlockedText : C.phaseOpenText)
              : (isOBlocked ? C.phaseBlockedText : C.phaseOpenText),
          }}>{'~'}</Text>
        </View>
      )}
    </Animated.View>
  );
});

export default GridCell;

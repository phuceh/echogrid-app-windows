import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { C, FONT } from '../constants/theme';
import {
  ECHO_PAUSE, ECHO_STEP, ARROW_ECHO_STEP,
  TRAIL_TTL, TRAIL_FADE, SWIPE_MIN,
  ARROW_DIR, DIR_ARROW, HINT_MAX, TUTORIAL_LEVELS,
} from '../constants/game';
import { LEVELS } from '../../levels/levels';
import { Overlay, Screen } from '../components/Overlay';
import GridCell from '../components/GridCell';
import StarDisplay from '../components/StarDisplay';
import { isIPassable, isOPassable, calculateStars, haptic } from '../utils/gameLogic';
import styles from '../styles/styles';

function GameScreen({ level, isTestMode, onBack, onMenu, onNext, onComplete, onSkipTutorial, hintsStored, isPurchased, onUseHint, onHintEmpty, bestTurns, parMsgDismissedRef }) {
  let levelData;
  if (level.type === 'custom')       levelData = level.data;
  else if (level.type === 'tutorial') levelData = TUTORIAL_LEVELS.find(l => l.id === level.id);
  else                                levelData = LEVELS.find(l => l.id === level.id);

  const { grid, movesPerTurn, echoLast } = levelData;
  const levelMinTurns = (level.type === 'campaign' || level.type === 'custom') ? (levelData.minTurns ?? null) : null;

  const parMsgKey              = level.type === 'campaign' ? level.id : null;
  const parMsgAlreadyDismissed = parMsgKey != null ? parMsgDismissedRef.current.has(parMsgKey) : true;

  const tutorialMessage = (level.type === 'tutorial' && levelData && levelData.message)
    ? levelData.message
    : null;
  const hasTutorialMessage = tutorialMessage !== null;

  const screenWidth  = Dimensions.get('window').width;
  const maxDim       = Math.max(grid.length, grid[0].length);
  const screenPadH   = maxDim >= 11 ? 0 : maxDim >= 10 ? 4 : maxDim >= 8 ? 10 : 16;
  const gridBudget   = screenWidth - screenPadH * 2;
  const cellSize     = Math.max(24, Math.floor(gridBudget / maxDim));
  const cellFont     = Math.max(8,  cellSize * 0.42);
  const subFont      = Math.max(7,  cellSize * 0.28);
  const showSubLabel = cellSize >= 26;
  const screenPadV   = maxDim >= 11 ? 8 : maxDim >= 10 ? 14 : 24;
  const gridMarginV  = maxDim >= 11 ? 2 : maxDim >= 10 ? 4  : 8;
  const bannerWidth  = Math.min(screenWidth - 32, 380);

  const findStart = () => {
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < grid[r].length; c++)
        if (grid[r][c] === 'S') return { r, c };
  };
  const start = findStart();

  // ─── Find goal position for the overlay pulse ────────────────────────────
  const goalPos = useMemo(() => {
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < grid[r].length; c++)
        if (grid[r][c] === 'G') return { r, c };
    return null;
  }, [grid]);

  const playerRef          = useRef(start);
  const historyRef         = useRef([]);
  const trailRef           = useRef([]);
  const trailKeyRef        = useRef(0);
  const trailTimersRef     = useRef([]);
  const echoTimersRef      = useRef([]);
  const moveTimersRef      = useRef([]);
  const isDeadRef          = useRef(false);
  const wonRef             = useRef(false);
  const undoSnapshotRef    = useRef(null);
  const crumbledRef        = useRef(new Set());
  const activatedPlatesRef = useRef(new Set());
  const moveCountRef       = useRef(0);
  const turnCountRef       = useRef(1);
  const movesLeftRef       = useRef(movesPerTurn);
  const echoLastRef        = useRef(echoLast);
  const movesPerTurnRef    = useRef(movesPerTurn);

  const echoAnim      = useRef(new Animated.Value(0)).current;
  const winAnim       = useRef(new Animated.Value(0)).current;
  const gameOverAnim  = useRef(new Animated.Value(0)).current;
  const shakeAnim     = useRef(new Animated.Value(0)).current;
  const startupPulse  = useRef(new Animated.Value(1)).current;
  const starPulseAnim = useRef(new Animated.Value(1)).current;

  const [player,            setPlayer]            = useState(start);
  const [trail,             setTrail]             = useState([]);
  const [movesLeft,         setMovesLeft]         = useState(movesPerTurn);
  const [isEchoing,         setIsEchoing]         = useState(false);
  const [isEchoStep,        setIsEchoStep]        = useState(false);
  const [echoStepIndex,     setEchoStepIndex]     = useState(0);
  const [echoStepTotal,     setEchoStepTotal]     = useState(0);
  const [won,               setWon]               = useState(false);
  const [gameOver,          setGameOver]          = useState(false);
  const [gameOverReason,    setGameOverReason]    = useState('');
  const [turnCount,         setTurnCount]         = useState(1);
  const [isEchoPending,     setIsEchoPending]     = useState(false);
  const [movesMadeThisTurn, setMovesMadeThisTurn] = useState(0);
  const [hasUsedUndo,       setHasUsedUndo]       = useState(false);
  const [showHint,          setShowHint]          = useState(false);
  const [isTeleporting,     setIsTeleporting]     = useState(false);
  const [crumbled,          setCrumbled]          = useState(new Set());
  const [activatedPlates,   setActivatedPlates]   = useState(new Set());
  const [showTutorialMsg,   setShowTutorialMsg]   = useState(hasTutorialMessage);
  const [showParMsg,        setShowParMsg]        = useState(
    level.type === 'campaign' && levelMinTurns != null && level.id <= 3 && !parMsgAlreadyDismissed
  );
  const [earnedStars,       setEarnedStars]       = useState(null);
  const [displayBestTurns,  setDisplayBestTurns]  = useState(null);
  const [phaseMoveCount,    setPhaseMoveCount]    = useState(0);
  const [showWinButtons,    setShowWinButtons]    = useState(false);
  const [hintAwarded,       setHintAwarded]       = useState(false);
  const [isPulsing,         setIsPulsing]         = useState(false);

  const isTutorial         = level.type === 'tutorial';
  const hintLabel          = isPurchased ? 'HINT ∞' : `HINT ×${hintsStored}`;
  const hintIcon           = isPurchased ? '◈' : (hintsStored === 0 ? '⌀' : '◈');
  const hintIconColor      = isPurchased ? C.hint : hintsStored === 0 ? 'rgba(0,212,200,0.53)' : C.hint;
  const hintBtnBorderColor = isPurchased ? 'rgba(245,158,11,0.4)' : hintsStored === 0 ? 'rgba(0,212,200,0.33)' : 'rgba(245,158,11,0.4)';
  const hintBtnBgColor     = isPurchased ? 'rgba(120,53,15,0.27)' : hintsStored === 0 ? 'rgba(0,144,122,0.07)' : 'rgba(120,53,15,0.27)';

  // Pre-build one Animated.Value per plate/door label so GridCell memo is never
  // broken by a new function reference. The Map is stable for the life of this level.
  const fadeAnimMap = useMemo(() => {
    const map = new Map();
    grid.forEach(row => row.forEach(cell => {
      if (typeof cell !== 'string') return;
      if (cell.startsWith('P') && cell.length >= 2) {
        map.set(cell, new Animated.Value(1));
        map.set(`D${cell.slice(1)}`, new Animated.Value(1));
      }
    }));
    return map;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getFadeAnim = useCallback((label) => {
    if (!fadeAnimMap.has(label)) fadeAnimMap.set(label, new Animated.Value(1));
    return fadeAnimMap.get(label);
  }, [fadeAnimMap]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderRelease: (_, { dx, dy }) => {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (Math.max(ax, ay) < SWIPE_MIN) return;
        if (ax > ay) handleMoveRef.current(dx > 0 ? 'RIGHT' : 'LEFT');
        else         handleMoveRef.current(dy > 0 ? 'DOWN' : 'UP');
      },
    })
  ).current;

  const handleMoveRef = useRef(null);

  const fireStartupPulse = useCallback(() => {
    startupPulse.setValue(1);
    setIsPulsing(true);
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(startupPulse, { toValue: 1.2,  duration: 160, useNativeDriver: true }),
        Animated.timing(startupPulse, { toValue: 1,    duration: 160, useNativeDriver: true }),
        Animated.timing(startupPulse, { toValue: 1.2,  duration: 160, useNativeDriver: true }),
        Animated.timing(startupPulse, { toValue: 1,    duration: 160, useNativeDriver: true }),
        Animated.timing(startupPulse, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.timing(startupPulse, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start(() => setIsPulsing(false));
    }, 350);
  }, [startupPulse]);

  useEffect(() => {
    return () => {
      trailTimersRef.current.forEach(clearTimeout);
      echoTimersRef.current.forEach(clearTimeout);
      moveTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => { movesLeftRef.current    = movesLeft;    }, [movesLeft]);
  useEffect(() => { echoLastRef.current     = echoLast;     }, []);
  useEffect(() => { movesPerTurnRef.current = movesPerTurn; }, []);

  useEffect(() => {
    if (!showTutorialMsg && !showParMsg) fireStartupPulse();
  }, [showTutorialMsg, showParMsg]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEchoStep) {
      Animated.sequence([
        Animated.timing(echoAnim, { toValue: 1,   duration: 150, useNativeDriver: true }),
        Animated.timing(echoAnim, { toValue: 0.6, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(echoAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [isEchoStep]);

  useEffect(() => {
    if (!won) return;
    haptic.win();
    // ── FIX: use levelData directly so custom levels with a par also get stars ──
    const stars = levelData?.minTurns != null ? calculateStars(turnCount, levelData.minTurns) : null;
    setEarnedStars(stars);
    if (level.type === 'campaign') {
      const prevBest = bestTurns?.[level.id] ?? null;
      setDisplayBestTurns(prevBest == null ? turnCount : Math.min(prevBest, turnCount));
    }
    if (level.type === 'custom' && levelData?.minTurns != null) {
      setDisplayBestTurns(turnCount);
    }
    Animated.spring(winAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      const awarded = onComplete(stars, turnCount);
      if (awarded) setHintAwarded(true);
      if (stars === 3) {
        starPulseAnim.setValue(1);
        Animated.sequence([
          Animated.delay(120),
          Animated.timing(starPulseAnim, { toValue: 1.35, duration: 180, useNativeDriver: true }),
          Animated.timing(starPulseAnim, { toValue: 0.9,  duration: 120, useNativeDriver: true }),
          Animated.timing(starPulseAnim, { toValue: 1.2,  duration: 120, useNativeDriver: true }),
          Animated.timing(starPulseAnim, { toValue: 1.0,  duration: 100, useNativeDriver: true }),
          Animated.delay(300),
        ]).start(() => setShowWinButtons(true));
      } else {
        setShowWinButtons(true);
      }
    });
  }, [won]);

  useEffect(() => {
    if (!gameOver) return;
    haptic.terminate();
    Animated.spring(gameOverAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [gameOver]);

  const activatePlate = (label) => {
    if (activatedPlatesRef.current.has(label)) return;
    activatedPlatesRef.current.add(label);
    setActivatedPlates(new Set(activatedPlatesRef.current));
    haptic.plate();
    Animated.timing(getFadeAnim(label), { toValue: 0.5, duration: 600, useNativeDriver: true }).start();
    Animated.timing(getFadeAnim(`D${label.slice(1)}`), { toValue: 0.5, duration: 600, useNativeDriver: true }).start();
  };

  const crumbleTile = (r, c) => {
    const key = `${r},${c}`;
    if (crumbledRef.current.has(key)) return;
    crumbledRef.current.add(key);
    setCrumbled(new Set(crumbledRef.current));
    haptic.crumble();
  };

  const teleportExitMap = useMemo(() => {
    const map = new Map();
    const pairs = {};
    grid.forEach((row, r) => row.forEach((cell, c) => {
      if (typeof cell === 'string' && cell.startsWith('T') && cell.length >= 2) {
        if (!pairs[cell]) pairs[cell] = [];
        pairs[cell].push({ r, c });
      }
    }));
    Object.entries(pairs).forEach(([label, positions]) => {
      if (positions.length === 2) {
        map.set(`${label}:${positions[0].r},${positions[0].c}`, positions[1]);
        map.set(`${label}:${positions[1].r},${positions[1].c}`, positions[0]);
      }
    });
    return map;
  }, [grid]);

  const findTeleportExit = (entryR, entryC, label) =>
    teleportExitMap.get(`${label}:${entryR},${entryC}`) ?? null;

  const isClosedDoor = (cell) => {
    if (typeof cell !== 'string' || !cell.startsWith('D') || cell.length < 2) return false;
    return !activatedPlatesRef.current.has(`P${cell.slice(1)}`);
  };

  const tickMoveCount = () => {
    moveCountRef.current += 1;
    setPhaseMoveCount(moveCountRef.current);
    return moveCountRef.current;
  };

  const triggerGameOver = (reason) => {
    if (wonRef.current) return;
    isDeadRef.current = true;
    setGameOver(true);
    setGameOverReason(reason);
    setIsEchoPending(false);
    setIsEchoing(false);
    setIsEchoStep(false);
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

  const addTrailCell = (pos) => {
    const key      = trailKeyRef.current++;
    const fadeAnim = new Animated.Value(1);
    const entry    = { ...pos, key, fadeAnim, timerId: null };
    trailRef.current.push(entry);
    setTrail([...trailRef.current]);
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: TRAIL_FADE, useNativeDriver: true }).start(() => {
        const idx = trailRef.current.findIndex(t => t.key === key);
        if (idx !== -1) trailRef.current.splice(idx, 1);
        setTrail([...trailRef.current]);
      });
      const tIdx = trailTimersRef.current.indexOf(timer);
      if (tIdx !== -1) trailTimersRef.current.splice(tIdx, 1);
    }, TRAIL_TTL);
    entry.timerId = timer;
    trailTimersRef.current.push(timer);
    return entry;
  };

  const undoMove = () => {
    if (hasUsedUndo || movesMadeThisTurn === 0 || isEchoing || isEchoPending || won || gameOver) return;
    const snapshot = undoSnapshotRef.current;
    if (!snapshot) return;
    haptic.undo();
    const { prevPos, trailEntry, prevMoveCount } = snapshot;
    if (trailEntry.timerId !== null) {
      clearTimeout(trailEntry.timerId);
      trailTimersRef.current = trailTimersRef.current.filter(id => id !== trailEntry.timerId);
    }
    const idx = trailRef.current.findIndex(t => t.key === trailEntry.key);
    if (idx !== -1) trailRef.current.splice(idx, 1);
    setTrail([...trailRef.current]);
    playerRef.current    = prevPos;
    moveCountRef.current = prevMoveCount;
    setPhaseMoveCount(prevMoveCount);
    setPlayer({ ...prevPos });
    historyRef.current = historyRef.current.slice(0, -1);
    setMovesLeft(m => m + 1);
    setMovesMadeThisTurn(n => n - 1);
    setHasUsedUndo(true);
    undoSnapshotRef.current = null;
  };

  const useHint = () => {
    if (won || gameOver) return;
    haptic.hint();
    if (isPurchased) { setShowHint(true); return; }
    if (hintsStored === 0) { onHintEmpty(); return; }
    onUseHint();
    setShowHint(true);
  };

  const startEcho = (history) => {
    const echoMoves = history.slice(-echoLastRef.current);
    if (!echoMoves.length) {
      const nextTurn = turnCountRef.current + 1;
      turnCountRef.current = nextTurn;
      setTurnCount(nextTurn);
      setMovesLeft(movesPerTurn);
      setHasUsedUndo(false);
      setMovesMadeThisTurn(0);
      undoSnapshotRef.current = null;
      return;
    }
    setIsEchoPending(true);
    undoSnapshotRef.current = null;

    const outerTimer = setTimeout(() => {
      if (isDeadRef.current) return;
      setIsEchoPending(false);
      setIsEchoing(true);

      // ── SIMULATE: walk the full echo path and record every action ──────────
      let simMoveCount = moveCountRef.current;
      const steps = [];
      let simPos = { ...playerRef.current };
      const simCrumbled = new Set(crumbledRef.current);
      const simPlates   = new Set(activatedPlatesRef.current);

      for (let i = 0; i < echoMoves.length; i++) {
        const dir = echoMoves[i];
        let { r, c } = simPos;
        if (dir === 'UP')    r--;
        if (dir === 'DOWN')  r++;
        if (dir === 'LEFT')  c--;
        if (dir === 'RIGHT') c++;

        simMoveCount += 1;

        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
          steps.push({ type: 'boundary', moveIndex: i }); break;
        }
        if (grid[r][c] === 'W') {
          steps.push({ type: 'wall', moveIndex: i }); break;
        }
        if (typeof grid[r][c] === 'string' && grid[r][c].startsWith('D') && grid[r][c].length >= 2 && !simPlates.has(`P${grid[r][c].slice(1)}`)) {
          steps.push({ type: 'door', moveIndex: i }); break;
        }
        if (simCrumbled.has(`${r},${c}`)) {
          steps.push({ type: 'crumbled', moveIndex: i }); break;
        }
        if (grid[r][c] === 'I' && !isIPassable(simMoveCount)) {
          steps.push({ type: 'phase', moveIndex: i }); break;
        }
        if (grid[r][c] === 'O' && !isOPassable(simMoveCount)) {
          steps.push({ type: 'phase', moveIndex: i }); break;
        }

        const cell = grid[r][c];
        if (typeof cell === 'string' && cell.startsWith('T') && cell.length >= 2) {
          const exit = findTeleportExit(r, c, cell);
          steps.push({ type: 'tele-entry', pos: { r, c }, moveIndex: i });
          if (exit) {
            steps.push({ type: 'tele-exit', pos: exit, moveIndex: i,
                         wins: grid[exit.r][exit.c] === 'G' });
            simPos = exit;
          } else {
            simPos = { r, c };
          }
        } else if (ARROW_DIR[cell]) {
          let chainR = r, chainC = c;
          let arrowTerminated = false;
          simMoveCount -= 1;
          while (ARROW_DIR[grid[chainR][chainC]]) {
            steps.push({ type: 'arrow-entry', pos: { r: chainR, c: chainC }, moveIndex: i });
            simMoveCount += 1;
            const pushDir = ARROW_DIR[grid[chainR][chainC]];
            let pr = chainR, pc = chainC;
            if (pushDir === 'UP')    pr--;
            if (pushDir === 'DOWN')  pr++;
            if (pushDir === 'LEFT')  pc--;
            if (pushDir === 'RIGHT') pc++;
            if (pr < 0 || pr >= grid.length || pc < 0 || pc >= grid[0].length) {
              steps.push({ type: 'boundary', moveIndex: i }); arrowTerminated = true; break;
            } else if (grid[pr][pc] === 'W') {
              steps.push({ type: 'wall', moveIndex: i }); arrowTerminated = true; break;
            } else if (simCrumbled.has(`${pr},${pc}`)) {
              steps.push({ type: 'crumbled', moveIndex: i }); arrowTerminated = true; break;
            } else if (grid[pr][pc] === 'I' && !isIPassable(simMoveCount)) {
              steps.push({ type: 'phase', moveIndex: i }); arrowTerminated = true; break;
            } else if (grid[pr][pc] === 'O' && !isOPassable(simMoveCount)) {
              steps.push({ type: 'phase', moveIndex: i }); arrowTerminated = true; break;
            } else {
              const pushCrumbles = grid[pr][pc] === 'C';
              const pushPlate    = typeof grid[pr][pc] === 'string' && grid[pr][pc].startsWith('P') && grid[pr][pc].length >= 2 ? grid[pr][pc] : null;
              const pushTele     = typeof grid[pr][pc] === 'string' && grid[pr][pc].startsWith('T') && grid[pr][pc].length >= 2 ? grid[pr][pc] : null;
              const pushWins     = grid[pr][pc] === 'G';
              steps.push({ type: 'arrow-exit', pos: { r: pr, c: pc }, moveIndex: i,
                           crumbles: pushCrumbles, plate: pushPlate, wins: pushWins });
              if (pushCrumbles) simCrumbled.add(`${pr},${pc}`);
              if (pushPlate)    simPlates.add(pushPlate);
              if (pushTele) {
                const teleExit = findTeleportExit(pr, pc, pushTele);
                steps.push({ type: 'tele-entry', pos: { r: pr, c: pc }, moveIndex: i });
                if (teleExit) {
                  steps.push({ type: 'tele-exit', pos: teleExit, moveIndex: i,
                               wins: grid[teleExit.r][teleExit.c] === 'G' });
                  simPos = teleExit;
                } else {
                  simPos = { r: pr, c: pc };
                }
                break;
              }
              if (pushWins) { simPos = { r: pr, c: pc }; break; }
              chainR = pr; chainC = pc;
              if (!ARROW_DIR[grid[chainR][chainC]]) { simPos = { r: chainR, c: chainC }; break; }
            }
          }
          if (arrowTerminated) break;
        } else {
          const isCrumbleTile = cell === 'C';
          const isPlate       = typeof cell === 'string' && cell.startsWith('P') && cell.length >= 2;
          const wins          = cell === 'G';
          steps.push({ type: 'move', pos: { r, c }, moveIndex: i,
                       crumbles: isCrumbleTile, plate: isPlate ? cell : null, wins });
          if (isCrumbleTile) simCrumbled.add(`${r},${c}`);
          if (isPlate)       simPlates.add(cell);
          simPos = { r, c };
        }
      }
      // ── END SIMULATION ──────────────────────────────────────────────────────

      setEchoStepTotal(echoMoves.length);
      const stepOffsets = [];
      let runningOffset = 0;
      steps.forEach(() => {
        runningOffset += ECHO_STEP;
        stepOffsets.push(runningOffset);
      });

      // ── PLAYBACK ─────────────────────────────────────────────────────────────
      steps.forEach((step, stepIdx) => {
        const timer = setTimeout(() => {
          if (isDeadRef.current) return;

          if (step.type === 'boundary') { triggerShake(); triggerGameOver('TRACE LOST  ·  OUT OF BOUNDS');       return; }
          if (step.type === 'wall')     { triggerShake(); triggerGameOver('SEQUENCE INTERRUPTED  ·  WALL COLLISION');  return; }
          if (step.type === 'crumbled') { triggerShake(); triggerGameOver('ECHO UNRAVELLED  ·  TILE COLLAPSED');  return; }
          if (step.type === 'door')     { triggerShake(); triggerGameOver('ACCESS DENIED  ·  DOOR BLOCKED');    return; }
          if (step.type === 'phase')    { triggerShake(); triggerGameOver('PHASE MISMATCH  ·  PHASE LOCKED');   return; }

          setIsEchoStep(true);
          setEchoStepIndex(step.moveIndex + 1);

          if (['move', 'tele-entry', 'arrow-entry'].includes(step.type)) tickMoveCount();

          if (step.type === 'move') {
            haptic.echoStep();
            addTrailCell({ ...playerRef.current });
            playerRef.current = step.pos;
            setPlayer({ ...step.pos });
            if (step.crumbles) crumbleTile(step.pos.r, step.pos.c);
            if (step.plate)    activatePlate(step.plate);
            if (step.wins) {
              wonRef.current = true;
              echoTimersRef.current.forEach(clearTimeout); echoTimersRef.current = [];
              setWon(true); setIsEchoing(false); setIsEchoStep(false); return;
            }
          } else if (step.type === 'tele-entry') {
            haptic.echoStep();
            addTrailCell({ ...playerRef.current });
            playerRef.current = step.pos;
            setPlayer({ ...step.pos });
          } else if (step.type === 'tele-exit') {
            haptic.teleport();
            playerRef.current = step.pos;
            setPlayer({ ...step.pos });
            if (step.wins) {
              wonRef.current = true;
              echoTimersRef.current.forEach(clearTimeout); echoTimersRef.current = [];
              setWon(true); setIsEchoing(false); setIsEchoStep(false); return;
            }
          } else if (step.type === 'arrow-entry') {
            haptic.echoStep();
            addTrailCell({ ...playerRef.current });
            playerRef.current = step.pos;
            setPlayer({ ...step.pos });
          } else if (step.type === 'arrow-exit') {
            haptic.arrow();
            playerRef.current = step.pos;
            setPlayer({ ...step.pos });
            if (step.crumbles) crumbleTile(step.pos.r, step.pos.c);
            if (step.plate)    activatePlate(step.plate);
            if (step.wins) {
              wonRef.current = true;
              echoTimersRef.current.forEach(clearTimeout); echoTimersRef.current = [];
              setWon(true); setIsEchoing(false); setIsEchoStep(false); return;
            }
          }

          if (stepIdx === steps.length - 1) {
            historyRef.current = historyRef.current.slice(-echoLastRef.current);
            const nextTurn = turnCountRef.current + 1;
            turnCountRef.current = nextTurn;
            movesLeftRef.current = movesPerTurnRef.current;
            setIsEchoing(false); setIsEchoStep(false);
            setEchoStepIndex(0); setEchoStepTotal(0);
            setTurnCount(nextTurn);
            setMovesLeft(movesPerTurnRef.current);
            setHasUsedUndo(false);
            setMovesMadeThisTurn(0);
          }
        }, stepOffsets[stepIdx]);
        echoTimersRef.current.push(timer);
      });
    }, ECHO_PAUSE);
    echoTimersRef.current.push(outerTimer);
  };

  const handleMove = useCallback((dir) => {
    if (isEchoing || isTeleporting || won || gameOver || movesLeftRef.current === 0) {
      triggerShake();
      return;
    }

    let { r, c } = playerRef.current;
    if (dir === 'UP')    r--;
    if (dir === 'DOWN')  r++;
    if (dir === 'LEFT')  c--;
    if (dir === 'RIGHT') c++;

    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
      triggerShake(); triggerGameOver('TRACE LOST  ·  OUT OF BOUNDS'); return;
    }
    if (grid[r][c] === 'W') {
      triggerShake(); triggerGameOver('SEQUENCE INTERRUPTED  ·  WALL COLLISION'); return;
    }
    if (crumbledRef.current.has(`${r},${c}`)) {
      triggerShake(); triggerGameOver('ECHO UNRAVELLED  ·  TILE COLLAPSED'); return;
    }
    if (isClosedDoor(grid[r][c])) {
      triggerShake(); triggerGameOver('ACCESS DENIED  ·  DOOR BLOCKED'); return;
    }

    const prevMoveCount = moveCountRef.current;
    const newMoveCount  = tickMoveCount();

    if (grid[r][c] === 'I' && !isIPassable(newMoveCount)) {
      moveCountRef.current = prevMoveCount;
      setPhaseMoveCount(prevMoveCount);
      triggerShake(); triggerGameOver('PHASE MISMATCH  ·  PHASE LOCKED'); return;
    }
    if (grid[r][c] === 'O' && !isOPassable(newMoveCount)) {
      moveCountRef.current = prevMoveCount;
      setPhaseMoveCount(prevMoveCount);
      triggerShake(); triggerGameOver('PHASE MISMATCH  ·  PHASE LOCKED'); return;
    }

    haptic.move();
    if (grid[r][c] === 'I' || grid[r][c] === 'O') haptic.phase();

    const prevPos    = { ...playerRef.current };
    const trailEntry = addTrailCell(prevPos);
    const entryPos   = { r, c };
    const cell       = grid[r][c];
    const isTele     = typeof cell === 'string' && cell.startsWith('T') && cell.length >= 2;
    const isArrow    = !!ARROW_DIR[cell];
    const exit       = isTele ? findTeleportExit(r, c, cell) : null;

    playerRef.current = entryPos;
    setPlayer({ ...entryPos });
    if (cell === 'C') crumbleTile(r, c);
    if (typeof cell === 'string' && cell.startsWith('P') && cell.length >= 2) activatePlate(cell);

    const commitMove = (finalPos) => {
      undoSnapshotRef.current = { prevPos, trailEntry, prevMoveCount };
      const newHistory   = [...historyRef.current, dir];
      historyRef.current = newHistory;
      const newMovesLeft = movesLeftRef.current - 1;
      movesLeftRef.current = newMovesLeft;
      setMovesLeft(newMovesLeft);
      setMovesMadeThisTurn(n => n + 1);
      if (grid[finalPos.r][finalPos.c] === 'G') {
        wonRef.current = true;
        setWon(true); return;
      }
      if (newMovesLeft === 0) startEcho(newHistory);
    };

    if (isTele && exit) {
      setIsTeleporting(true);
      const t = setTimeout(() => {
        haptic.teleport();
        playerRef.current = exit;
        setPlayer({ ...exit });
        setIsTeleporting(false);
        commitMove(exit);
      }, ECHO_STEP);
      moveTimersRef.current.push(t);
    } else if (isArrow) {
      setIsTeleporting(true);
      const followArrow = (curR, curC) => {
        const pushDir = ARROW_DIR[grid[curR][curC]];
        let pr = curR, pc = curC;
        if (pushDir === 'UP')    pr--;
        if (pushDir === 'DOWN')  pr++;
        if (pushDir === 'LEFT')  pc--;
        if (pushDir === 'RIGHT') pc++;
        const t = setTimeout(() => {
          setIsTeleporting(false);
          if (pr < 0 || pr >= grid.length || pc < 0 || pc >= grid[0].length) {
            triggerShake(); triggerGameOver('TRACE LOST  ·  OUT OF BOUNDS'); return;
          }
          if (grid[pr][pc] === 'W') {
            triggerShake(); triggerGameOver('SEQUENCE INTERRUPTED  ·  WALL COLLISION'); return;
          }
          if (crumbledRef.current.has(`${pr},${pc}`)) {
            triggerShake(); triggerGameOver('ECHO UNRAVELLED  ·  TILE COLLAPSED'); return;
          }
          if (grid[pr][pc] === 'I' && !isIPassable(moveCountRef.current)) {
            triggerShake(); triggerGameOver('PHASE MISMATCH  ·  PHASE LOCKED'); return;
          }
          if (grid[pr][pc] === 'O' && !isOPassable(moveCountRef.current)) {
            triggerShake(); triggerGameOver('PHASE MISMATCH  ·  PHASE LOCKED'); return;
          }
          haptic.arrow();
          const pushPos = { r: pr, c: pc };
          addTrailCell({ ...playerRef.current });
          playerRef.current = pushPos;
          setPlayer({ ...pushPos });
          if (grid[pr][pc] === 'C') crumbleTile(pr, pc);
          if (typeof grid[pr][pc] === 'string' && grid[pr][pc].startsWith('P') && grid[pr][pc].length >= 2)
            activatePlate(grid[pr][pc]);
          if (ARROW_DIR[grid[pr][pc]]) {
            setIsTeleporting(true);
            followArrow(pr, pc);
          } else if (typeof grid[pr][pc] === 'string' && grid[pr][pc].startsWith('T') && grid[pr][pc].length >= 2) {
            const teleExit = findTeleportExit(pr, pc, grid[pr][pc]);
            if (teleExit) {
              setIsTeleporting(true);
              const t2 = setTimeout(() => {
                haptic.teleport();
                playerRef.current = teleExit;
                setPlayer({ ...teleExit });
                setIsTeleporting(false);
                commitMove(teleExit);
              }, ECHO_STEP);
              moveTimersRef.current.push(t2);
            } else {
              commitMove(pushPos);
            }
          } else {
            commitMove(pushPos);
          }
        }, ECHO_STEP);
        moveTimersRef.current.push(t);
      };
      followArrow(r, c);
    } else {
      commitMove(entryPos);
    }
  }, [isEchoing, isTeleporting, won, gameOver, grid]);

  useEffect(() => { handleMoveRef.current = handleMove; }, [handleMove]);

  const resetLevel = () => {
    trailTimersRef.current.forEach(clearTimeout);
    echoTimersRef.current.forEach(clearTimeout);
    moveTimersRef.current.forEach(clearTimeout);
    trailTimersRef.current  = [];
    echoTimersRef.current   = [];
    moveTimersRef.current   = [];
    playerRef.current          = start;
    historyRef.current         = [];
    trailRef.current           = [];
    trailKeyRef.current        = 0;
    isDeadRef.current          = false;
    wonRef.current             = false;
    turnCountRef.current       = 1;
    moveCountRef.current       = 0;
    movesLeftRef.current       = movesPerTurnRef.current;
    undoSnapshotRef.current    = null;
    crumbledRef.current        = new Set();
    activatedPlatesRef.current = new Set();
    echoAnim.setValue(0);
    winAnim.setValue(0);
    gameOverAnim.setValue(0);
    shakeAnim.setValue(0);
    starPulseAnim.setValue(1);
    fadeAnimMap.forEach(a => a.setValue(1));
    setPlayer(start);
    setTrail([]);
    setMovesLeft(movesPerTurn);
    setIsEchoPending(false);
    setIsEchoing(false);
    setIsEchoStep(false);
    setEchoStepIndex(0);
    setEchoStepTotal(0);
    setWon(false);
    setGameOver(false);
    setGameOverReason('');
    setTurnCount(1);
    setHasUsedUndo(false);
    setMovesMadeThisTurn(0);
    setIsTeleporting(false);
    setCrumbled(new Set());
    setActivatedPlates(new Set());
    setShowHint(false);
    setPhaseMoveCount(0);
    setEarnedStars(null);
    setDisplayBestTurns(null);
    setShowWinButtons(false);
    setHintAwarded(false);
    setIsPulsing(false);
    fireStartupPulse();
  };

  const disabled     = isPulsing || isEchoing || isEchoPending || isTeleporting || showTutorialMsg || showParMsg || won || gameOver || movesLeft === 0;
  const undoDisabled = hasUsedUndo || movesMadeThisTurn === 0 || isEchoing || isEchoPending || isTeleporting || showTutorialMsg || showParMsg || won || gameOver;
  const starLabel = (s) => s === 3 ? 'PERFECT' : s === 2 ? 'GREAT' : s === 1 ? 'COMPLETE' : 'SOLVED';

  let nextLabel;
  if (isTestMode) {
    nextLabel = 'SAVE  ›';
  } else if (level.type === 'custom') {
    nextLabel = 'LEVEL LIST  ›';
  } else if (level.type === 'tutorial') {
    nextLabel = 'LEVELS  ›';
  } else {
    nextLabel = 'NEXT LEVEL  ›';
  }

  const trailMap = useMemo(() => {
    const map = new Map();
    trail.forEach((entry, idx) => { map.set(`${entry.r},${entry.c}`, { entry, idx }); });
    return map;
  }, [trail]);

  const pulseRingOpacity = startupPulse.interpolate({
    inputRange: [1, 1.01],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.void }}>
      <Screen style={[styles.screen, { paddingHorizontal: screenPadH, paddingVertical: screenPadV }]}>
        <View style={[styles.gameHeader, maxDim >= 11 && { marginBottom: 4 }]}>
          <Text style={styles.gameLevelLabel}>LEVEL</Text>
          <Text style={styles.gameLevelNumber}>
            {level.type === 'tutorial' ? level.id :
             level.type === 'custom'   ? (levelData.name ?? 'CUSTOM') :
             String(level.id).padStart(2, '0')}
          </Text>
          {isTestMode && (
            <Text style={[styles.gameLevelLabel, { marginLeft: 10, color: C.indigo }]}>TEST MODE</Text>
          )}
        </View>

        <View style={[styles.readout, maxDim >= 11 && { marginBottom: 4 }]}>
          <View style={styles.readoutCell}>
            <Text style={styles.readoutLabel}>TURN</Text>
            <Text style={styles.readoutValue}>{String(turnCount).padStart(2, '0')}</Text>
          </View>
          <View style={styles.readoutDivider} />
          <View style={styles.readoutCell}>
            <Text style={styles.readoutLabel}>{isEchoPending ? 'ECHO' : isEchoing ? 'ECHOING' : 'MOVES'}</Text>
            <Text style={[styles.readoutValue, (isEchoing || isEchoPending) && { color: C.echo }]}>
              {isEchoPending ? '···' : isEchoing ? `${echoStepIndex} / ${echoStepTotal}` : String(movesLeft).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.readoutDivider} />
          <View style={styles.readoutCell}>
            <Text style={styles.readoutLabel}>ECHO</Text>
            <Text style={[styles.readoutValue, { color: C.echo }]}>LAST {echoLast}</Text>
          </View>
          {levelMinTurns != null && (
            <>
              <View style={styles.readoutDivider} />
              <TouchableOpacity style={[styles.readoutCell, styles.readoutParCell]} onPress={() => setShowParMsg(true)} activeOpacity={0.7}>
                <Text style={styles.readoutLabel}>PAR</Text>
                <Text style={[styles.readoutValue, styles.readoutParValue]}>{String(levelMinTurns).padStart(2, '0')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Animated.View style={[styles.echoIndicator, { opacity: echoAnim, backgroundColor: C.echoDim, borderColor: C.echo }]}>
          <Text style={styles.echoIndicatorText}>⟳  ECHO  {echoStepIndex} / {echoStepTotal}</Text>
        </Animated.View>

        {/* ── Grid area ── */}
        <View style={[styles.gridOuter, { marginVertical: gridMarginV }]} {...panResponder.panHandlers}>
          <View style={[styles.gridContainer, gameOver && { borderColor: C.warn }]}>
            {grid.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                {row.map((cell, c) => {
                  const hit = trailMap.get(`${r},${c}`);
                  return (
                    <GridCell
                      key={c}
                      cell={cell} r={r} c={c}
                      cellSize={cellSize} cellFont={cellFont} subFont={subFont} showSubLabel={showSubLabel}
                      isPlayer={player.r === r && player.c === c}
                      isEchoStep={isEchoStep}
                      gameOver={gameOver}
                      crumbled={crumbled}
                      activatedPlates={activatedPlates}
                      phaseMoveCount={phaseMoveCount}
                      trailEntry={hit ? hit.entry : null}
                      trailIdx={hit ? hit.idx : -1}
                      trailLength={trail.length}
                      echoLast={echoLast}
                      getFadeAnim={getFadeAnim}
                      shakeAnim={shakeAnim}
                    />
                  );
                })}
              </View>
            ))}

            {/* ── Startup pulse overlays ── */}
            {!won && !gameOver && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View
                  style={{
                    position: 'absolute',
                    left:   player.c * cellSize,
                    top:    player.r * cellSize,
                    width:  cellSize,
                    height: cellSize,
                    backgroundColor: isEchoStep ? C.echoDim : C.indigoDim,
                    borderWidth: 1,
                    borderColor: isEchoStep ? C.echo : C.indigo,
                    opacity: pulseRingOpacity,
                    transform: [{ scale: startupPulse }],
                  }}
                />
                {goalPos && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left:   goalPos.c * cellSize,
                      top:    goalPos.r * cellSize,
                      width:  cellSize,
                      height: cellSize,
                      backgroundColor: C.winDim,
                      borderWidth: 1,
                      borderColor: C.win,
                      opacity: pulseRingOpacity,
                      transform: [{ scale: startupPulse }],
                    }}
                  />
                )}
              </View>
            )}
          </View>

          {/* ── Game Over banner ── */}
          {gameOver && (
            <View style={styles.bannerOverlay}>
              <Animated.View style={[styles.alertBanner, { width: bannerWidth, transform: [{ scale: gameOverAnim }], opacity: gameOverAnim }]}>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>TERMINATED</Text>
                  <Text style={styles.alertReason}>{gameOverReason}</Text>
                  <View style={styles.winButtonRow}>
                    <TouchableOpacity style={[styles.rowBtn, { borderColor: C.warn }]} onPress={resetLevel} activeOpacity={0.7}>
                      <Text style={styles.alertButtonText}>↺︎  RETRY</Text>
                    </TouchableOpacity>
                    {isTestMode && (
                      <TouchableOpacity style={[styles.rowBtn, { borderColor: C.indigo }]} onPress={onBack} activeOpacity={0.7}>
                        <Text style={[styles.alertButtonText, { color: C.indigo }]}>BUILDER</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Animated.View>
            </View>
          )}

          {/* ── Win banner ── */}
          {won && (
            <View style={styles.bannerOverlay}>
              <Animated.View style={[styles.winBanner, { width: bannerWidth, transform: [{ scale: winAnim }], opacity: winAnim }]}>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: C.win }]}>
                    {level.type === 'tutorial' ? 'TUTORIAL COMPLETE' : 'SEQUENCE COMPLETE'}
                  </Text>
                  {earnedStars != null && (
                    <>
                      <Animated.View style={{ transform: [{ scale: starPulseAnim }] }}>
                        <StarDisplay stars={earnedStars} size={30} style={{ marginBottom: 4 }} />
                      </Animated.View>
                      <Text style={styles.winStarLabel}>{starLabel(earnedStars)}</Text>
                    </>
                  )}
                  <Text style={styles.winTurnsText}>
                    COMPLETED IN {turnCount} {turnCount === 1 ? 'TURN' : 'TURNS'}
                  </Text>
                  {(level.type === 'campaign' || level.type === 'custom') && (() => {
                    const par  = levelData?.minTurns ?? null;
                    const best = displayBestTurns;
                    if (par == null && best == null) return null;
                    return (
                      <View style={styles.winStatsRow}>
                        {par != null && <View style={styles.winStatCell}><Text style={styles.winStatLabel}>PAR</Text><Text style={[styles.winStatValue, { color: C.win }]}>{par}</Text></View>}
                        {par != null && best != null && <View style={styles.winStatDivider} />}
                        {best != null && <View style={styles.winStatCell}><Text style={styles.winStatLabel}>BEST</Text><Text style={[styles.winStatValue, best <= (par ?? Infinity) && { color: C.win }]}>{best}</Text></View>}
                      </View>
                    );
                  })()}
                  {showWinButtons && (
                    <>
                      {hintAwarded && (
                        <View style={styles.hintAwardedBadge}>
                          <Text style={styles.hintAwardedText}>◈  +1 HINT AWARDED</Text>
                        </View>
                      )}
                      {isTestMode ? (
                        <View style={styles.winButtonRow}>
                          <TouchableOpacity style={styles.winRetryBtn} onPress={resetLevel} activeOpacity={0.7}>
                            <Text style={styles.winRetryBtnText}>↺︎  RETRY</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.rowBtn, { borderColor: C.indigo }]} onPress={onBack} activeOpacity={0.7}>
                            <Text style={[styles.alertButtonText, { color: C.indigo }]}>BUILDER</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.rowBtn, { backgroundColor: C.winDim, borderColor: C.win }]} onPress={onNext} activeOpacity={0.7}>
                            <Text style={[styles.alertButtonText, { color: C.win }]}>SAVE  ›</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.winButtonRow}>
                          <TouchableOpacity style={styles.winRetryBtn} onPress={resetLevel} activeOpacity={0.7}>
                            <Text style={styles.winRetryBtnText}>↺︎  RETRY</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.rowBtn, { backgroundColor: C.winDim, borderColor: C.win }]} onPress={onNext} activeOpacity={0.7}>
                            <Text style={[styles.alertButtonText, { color: C.win }]}>{nextLabel}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </Animated.View>
            </View>
          )}
        </View>

        <View style={[styles.dpad, maxDim >= 11 && { marginTop: 0 }]}>
          <TouchableOpacity style={[styles.dpadBtn, disabled && styles.dpadDisabled]} onPress={() => handleMove('UP')} disabled={disabled}>
            <Text style={styles.dpadText}>▲</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={[styles.dpadUtilBtn, styles.undoBtn, undoDisabled && styles.utilBtnDisabled, { marginRight: 12 }]}
              onPress={undoMove} disabled={undoDisabled} activeOpacity={0.7}>
              <Text style={[styles.utilBtnIcon, undoDisabled && styles.utilIconDisabled]}>↩︎</Text>
              <Text style={[styles.utilBtnLabel, undoDisabled && styles.utilLabelDisabled]}>UNDO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dpadBtn, disabled && styles.dpadDisabled]} onPress={() => handleMove('LEFT')} disabled={disabled}>
              <Text style={styles.dpadText}>◀</Text>
            </TouchableOpacity>
            <View style={styles.dpadGap} />
            <TouchableOpacity style={[styles.dpadBtn, disabled && styles.dpadDisabled]} onPress={() => handleMove('RIGHT')} disabled={disabled}>
              <Text style={styles.dpadText}>▶</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dpadUtilBtn, styles.hintBtn, (won || gameOver || isTutorial) && styles.utilBtnDisabled,
                      { borderColor: hintBtnBorderColor, backgroundColor: hintBtnBgColor, marginLeft: 12 }]}
              onPress={useHint} disabled={won || gameOver || isTutorial} activeOpacity={0.7}>
              <Text style={[styles.utilBtnIcon, { color: hintIconColor }, (won || gameOver || isTutorial) && styles.utilIconDisabled]}>{hintIcon}</Text>
              <Text style={[styles.utilBtnLabel, { color: hintIconColor }, (won || gameOver || isTutorial) && styles.utilLabelDisabled]}>{hintLabel}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.dpadBtn, disabled && styles.dpadDisabled]} onPress={() => handleMove('DOWN')} disabled={disabled}>
            <Text style={styles.dpadText}>▼</Text>
          </TouchableOpacity>
        </View>

        {hasTutorialMessage && (
          <TouchableOpacity style={[styles.utilBtn, { marginTop: 8 }]} onPress={() => setShowTutorialMsg(true)} activeOpacity={0.7}>
            <Text style={[styles.utilBtnIcon, { color: '#94a3b8' }]}>?</Text>
            <Text style={[styles.utilBtnLabel, { color: '#94a3b8' }]}>INFO</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.footerRow, maxDim >= 11 && { marginTop: 4 }]}>
          <TouchableOpacity style={styles.footerBtn} onPress={resetLevel}>
            <Text style={styles.footerBtnText}>↺︎  RESTART</Text>
          </TouchableOpacity>
          {isTestMode ? (
            <TouchableOpacity style={styles.footerBtn} onPress={onBack}>
              <Text style={[styles.footerBtnText, { color: C.indigo }]}>‹  BUILDER</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.footerBtn} onPress={onMenu}>
                <Text style={styles.footerBtnText}>⌂  MENU</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerBtn} onPress={onBack}>
                <Text style={styles.footerBtnText}>‹  LEVELS</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
      </Screen>

      <Overlay visible={hasTutorialMessage && showTutorialMsg}>
        <View style={[styles.tutorialBanner, { width: bannerWidth }]}>
          <View style={styles.alertContent}>
            <Text style={styles.tutorialTitle}>◈  {tutorialMessage ? tutorialMessage.title : ''}</Text>
            <View style={styles.tutorialLines}>
              {(tutorialMessage ? tutorialMessage.lines : []).map((line, i) => (
                <View key={i} style={styles.tutorialLineRow}>
                  <Text style={styles.tutorialBullet}>—</Text>
                  <Text style={styles.tutorialLineText}>{line}</Text>
                </View>
              ))}
            </View>
            <View style={styles.winButtonRow}>
              <TouchableOpacity style={[styles.rowBtn, { borderColor: '#94a3b8' }]} onPress={() => setShowTutorialMsg(false)} activeOpacity={0.7}>
                <Text style={[styles.alertButtonText, { color: '#94a3b8' }]}>GOT IT  ›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rowBtn, { borderColor: C.textDim }]} onPress={() => { setShowTutorialMsg(false); onSkipTutorial(); }} activeOpacity={0.7}>
                <Text style={[styles.alertButtonText, { color: C.textSecond }]}>SKIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Overlay>

      <Overlay visible={levelMinTurns != null && showParMsg}>
        <View style={[styles.tutorialBanner, { width: bannerWidth }]}>
          <View style={styles.alertContent}>
            <Text style={styles.tutorialTitle}>◈  LEVEL PAR</Text>
            <View style={styles.parMsgBody}>
              <Text style={styles.parMsgParNum}>{levelMinTurns}</Text>
              <Text style={styles.parMsgParLabel}>{levelMinTurns === 1 ? 'TURN' : 'TURNS'}</Text>
            </View>
            <View style={styles.tutorialLines}>
              <View style={styles.tutorialLineRow}>
                <Text style={styles.tutorialBullet}>—</Text>
                <Text style={styles.tutorialLineText}>
                  {levelMinTurns === 1
                    ? 'Complete this level in exactly 1 turn to earn 3 stars.'
                    : `Complete this level in ${levelMinTurns} turns or fewer to earn 3 stars.`}
                </Text>
              </View>
              <View style={styles.tutorialLineRow}>
                <Text style={styles.tutorialBullet}>—</Text>
                <Text style={styles.tutorialLineText}>+1 turn over par earns 2 stars. +2 earns 1 star.</Text>
              </View>
              <View style={styles.tutorialLineRow}>
                <Text style={styles.tutorialBullet}>—</Text>
                <Text style={styles.tutorialLineText}>Use the HINT button to reveal the first turn's moves if you get stuck.</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.rowBtn, { flex: undefined, alignSelf: 'stretch', borderColor: '#94a3b8', marginTop: 4 }]} onPress={() => {
              if (parMsgKey != null) parMsgDismissedRef.current.add(parMsgKey);
              setShowParMsg(false);
            }} activeOpacity={0.7}>
              <Text style={[styles.alertButtonText, { color: '#94a3b8' }]}>OK  ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Overlay>

      <Overlay visible={showHint}>
        <View style={[styles.hintBanner, { width: bannerWidth }]}>
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: C.hint }]}>HINT</Text>
            {levelData?.hint ? (
              <>
                <Text style={styles.hintSubText}>FIRST TURN</Text>
                <View style={styles.hintArrowRow}>
                  {(levelData.hint || []).map((dir, i) => (
                    <React.Fragment key={i}>
                      <View style={styles.hintArrowBox}><Text style={styles.hintArrowText}>{DIR_ARROW[dir]}</Text></View>
                      {i < levelData.hint.length - 1 && <Text style={styles.hintArrowSep}>·</Text>}
                    </React.Fragment>
                  ))}
                </View>
                {!isPurchased && <Text style={styles.hintSubText}>{hintsStored} / {HINT_MAX} HINTS REMAINING</Text>}
                {isPurchased  && <Text style={[styles.hintSubText, { color: 'rgba(245,158,11,0.53)' }]}>UNLIMITED HINTS</Text>}
              </>
            ) : (
              <Text style={styles.hintBodyText}>NO HINT AVAILABLE</Text>
            )}
            <TouchableOpacity style={[styles.rowBtn, { flex: undefined, alignSelf: 'stretch', borderColor: C.hint, marginTop: 12 }]} onPress={() => setShowHint(false)}>
              <Text style={[styles.alertButtonText, { color: C.hint }]}>DISMISS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Overlay>
    </View>
  );
}

export default GameScreen;
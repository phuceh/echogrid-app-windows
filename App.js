import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';

import { C, FONT } from './src/constants/theme';
import { FREE_LEVEL_LIMIT, HINT_MAX, HINT_REWARD_EVERY, TUTORIAL_GATES, TUTORIAL_LEVELS } from './src/constants/game';
import { LEVELS } from './levels/levels';
import { loadAllData, saveProgress, saveMeta, purchaseFullGame, restoreFullGame } from './src/storage/storage';
import styles from './src/styles/styles';

import StartScreen           from './src/screens/StartScreen';
import MenuScreen            from './src/screens/MenuScreen';
import UnlockScreen          from './src/screens/UnlockScreen';
import LevelSelect           from './src/screens/LevelSelect';
import LevelBuilderMenuScreen from './src/screens/LevelBuilderMenuScreen';
import SavedLevelsScreen     from './src/screens/SavedLevelsScreen';
import LevelEditorScreen     from './src/screens/LevelEditorScreen';
import GameScreen            from './src/screens/GameScreen';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('EchoGrid crash:', error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: C.void, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
        <Text style={{ color: C.warn, fontSize: 12, letterSpacing: 4, fontFamily: FONT, fontWeight: '700', marginBottom: 8 }}>
          SEQUENCE ERROR
        </Text>
        <Text style={{ color: C.textSecond, fontSize: 10, letterSpacing: 2, fontFamily: FONT, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>
          Something went wrong. Please restart the app.
        </Text>
        <TouchableOpacity
          style={{ borderWidth: 1, borderColor: C.warn, paddingVertical: 10, paddingHorizontal: 28 }}
          onPress={() => this.setState({ hasError: false, error: null })}
          activeOpacity={0.7}
        >
          <Text style={{ color: C.warn, fontSize: 10, letterSpacing: 4, fontFamily: FONT }}>↺︎  RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default function App() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function AppInner() {
  const [screen,             setScreen]            = useState('start');
  const [level,              setLevel]             = useState(null);
  const [completed,          setCompleted]         = useState([]);
  const [tutorialCompleted,  setTutorialCompleted] = useState([]);
  const [levelStars,         setLevelStars]        = useState({});
  const [bestTurns,          setBestTurns]         = useState({});
  const [customLevels,       setCustomLevels]      = useState([]);
  const [editingCustomLevel, setEditingCustomLevel] = useState(null);
  const [testingLevel,       setTestingLevel]       = useState(null);
  const [editorDraft,        setEditorDraft]        = useState(null);
  const [isPurchased,        setIsPurchased]       = useState(false);
  const [isPurchasing,       setIsPurchasing]      = useState(false);
  const [unlockReturnTo,     setUnlockReturnTo]    = useState('levels');
  const [hintsStored,        setHintsStored]       = useState(1);
  const [isLoading,          setIsLoading]         = useState(true);
  const loadingPulse = useRef(new Animated.Value(0.3)).current;
  const [justUnlocked,        setJustUnlocked]       = useState(false);
  const unlockFadeAnim        = useRef(new Animated.Value(0)).current;
  const justUnlockedTimerRef  = useRef(null);

  const completedRef         = useRef([]);
  const levelStarsRef        = useRef({});
  const bestTurnsRef         = useRef({});
  const tutorialCompletedRef = useRef([]);
  const hintsRef             = useRef(1);
  const isPurchasedRef       = useRef(false);
  const customLevelsRef      = useRef([]);
  useEffect(() => { completedRef.current         = completed;         }, [completed]);
  useEffect(() => { levelStarsRef.current        = levelStars;        }, [levelStars]);
  useEffect(() => { bestTurnsRef.current         = bestTurns;         }, [bestTurns]);
  useEffect(() => { tutorialCompletedRef.current = tutorialCompleted; }, [tutorialCompleted]);
  useEffect(() => { hintsRef.current             = hintsStored;       }, [hintsStored]);
  useEffect(() => { isPurchasedRef.current       = isPurchased;       }, [isPurchased]);
  useEffect(() => { customLevelsRef.current      = customLevels;      }, [customLevels]);

  const triggerUnlockConfirm = useCallback(() => {
    if (justUnlockedTimerRef.current) clearTimeout(justUnlockedTimerRef.current);
    unlockFadeAnim.setValue(0);
    setJustUnlocked(true);
    requestAnimationFrame(() => {
      Animated.sequence([
        Animated.timing(unlockFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(unlockFadeAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start(() => setJustUnlocked(false));
    });
  }, [unlockFadeAnim]);

  const parMsgDismissedRef = useRef(new Set());

  const completionQueueRef = useRef([]);
  const isDrainingRef      = useRef(false);

  const drainCompletionQueue = useCallback(async () => {
    if (isDrainingRef.current) return;
    isDrainingRef.current = true;
    while (completionQueueRef.current.length > 0) {
      const job = completionQueueRef.current.shift();
      await job();
    }
    isDrainingRef.current = false;
  }, []);

  const enqueueCompletion = useCallback((job) => {
    completionQueueRef.current.push(job);
    drainCompletionQueue();
  }, [drainCompletionQueue]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    loadAllData().then(({ completed, stars, bestTurns, tutorialCompleted, hints, purchased, customLevels }) => {
      setCompleted(completed);
      setLevelStars(stars);
      setBestTurns(bestTurns);
      setCustomLevels(customLevels);
      setIsPurchased(purchased);
      setTutorialCompleted(tutorialCompleted);
      setHintsStored(hints);
      setIsLoading(false);
    });

    return () => {
      if (justUnlockedTimerRef.current) clearTimeout(justUnlockedTimerRef.current);
    };
  }, []);

  const markTutorialCompleted = async (id) => {
    if (tutorialCompletedRef.current.includes(id)) return;
    const next = [...tutorialCompletedRef.current, id];
    tutorialCompletedRef.current = next;
    setTutorialCompleted(next);
    await saveProgress({
      completed: completedRef.current,
      stars: levelStarsRef.current,
      bestTurns: bestTurnsRef.current,
      tutorialCompleted: next,
      hints: hintsRef.current,
    });
  };

  const resetProgress = async () => {
    setCompleted([]);
    setLevelStars({});
    setBestTurns({});
    setTutorialCompleted([]);
    setHintsStored(1);
    parMsgDismissedRef.current = new Set();
    await saveProgress({ completed: [], stars: {}, bestTurns: {}, tutorialCompleted: [], hints: 1 });
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const success = await purchaseFullGame();
      if (success) {
        await saveMeta({ purchased: true, customLevels: customLevelsRef.current });
        setIsPurchased(true);
        triggerUnlockConfirm();
        if (unlockReturnTo === 'game')         setScreen('game');
        else if (unlockReturnTo === 'builder') setScreen('menu');
        else                                   setScreen('levels');
      } else {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } catch {
      Alert.alert('Purchase Error', 'Could not complete purchase. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const restored = await restoreFullGame();
      if (restored) {
        await saveMeta({ purchased: true, customLevels: customLevelsRef.current });
        setIsPurchased(true);
        setScreen('levels');
        triggerUnlockConfirm();
      } else {
        Alert.alert('Nothing to Restore', 'No previous purchase found for this account.');
      }
    } catch { Alert.alert('Restore Error', 'Could not restore purchase. Please try again.'); }
    finally { setIsPurchasing(false); }
  };

  const requirePurchase = (returnTo, action) => {
    if (isPurchased) { action(); return; }
    setUnlockReturnTo(returnTo);
    setScreen('unlock');
  };

  const CUSTOM_LEVEL_LIMIT = 20;

  const handleSaveCustomLevel = async (levelData) => {
    const isEdit = !!editingCustomLevel;
    if (!isEdit && customLevels.length >= CUSTOM_LEVEL_LIMIT) {
      Alert.alert(
        'Level Limit Reached',
        `You can save up to ${CUSTOM_LEVEL_LIMIT} custom levels. Delete an existing level to make room.`
      );
      return;
    }
    setEditorDraft(null);
    setCustomLevels(prev => {
      const next = isEdit
        ? prev.map(l => l.id === levelData.id ? levelData : l)
        : [...prev, levelData];
      saveMeta({ purchased: isPurchasedRef.current, customLevels: next });
      return next;
    });
    setEditingCustomLevel(null);
    setScreen('savedlevels');
  };

  const handleDeleteCustomLevel = (id) => {
    setCustomLevels(prev => {
      const next = prev.filter(l => l.id !== id);
      saveMeta({ purchased: isPurchasedRef.current, customLevels: next });
      return next;
    });
  };

  const handleDeleteAllCustomLevels = () => {
    setCustomLevels([]);
    saveMeta({ purchased: isPurchasedRef.current, customLevels: [] });
  };

  const isTutorialUnlocked = (tutId) => {
    const gate = TUTORIAL_GATES[tutId];
    if (gate === null) return true;
    return completed.includes(gate);
  };

  const TIER_TUTORIAL_GATE = { 1: 'T1', 11: 'T2', 21: 'T3', 36: 'T4', 56: 'T5', 76: 'T6' };

  const isUnlocked = (id) => {
    if (completed.includes(id)) return true;
    if (TIER_TUTORIAL_GATE[id]) return tutorialCompleted.includes(TIER_TUTORIAL_GATE[id]);
    return completed.includes(id - 1);
  };

  const isPaywalled = (id) => id > FREE_LEVEL_LIMIT && !isPurchased;

  const handleResetIAP = async () => {
    try {
      await saveMeta({ purchased: false, customLevels: customLevelsRef.current });
      await saveProgress({ completed: completedRef.current, stars: levelStarsRef.current, bestTurns: bestTurnsRef.current, tutorialCompleted: [], hints: hintsRef.current });
      setIsPurchased(false);
      setTutorialCompleted([]);
      setJustUnlocked(false);
      Alert.alert('DEV', 'IAP + tutorial progress reset.');
    } catch { Alert.alert('Error', 'Could not reset IAP.'); }
  };

  const handleUnlockAll = async () => {
    const allLevelIds    = LEVELS.map(l => l.id);
    const allTutorialIds = TUTORIAL_LEVELS.map(l => l.id);
    setCompleted(allLevelIds);
    setTutorialCompleted(allTutorialIds);
    setIsPurchased(true);
    await Promise.all([
      saveProgress({ completed: allLevelIds, stars: levelStarsRef.current, bestTurns: bestTurnsRef.current, tutorialCompleted: allTutorialIds, hints: hintsRef.current }),
      saveMeta({ purchased: true, customLevels: customLevelsRef.current }),
    ]);
    Alert.alert('DEV', 'All levels unlocked.');
  };

  const handleNext = useCallback(async () => {
    await drainCompletionQueue();
    if (level.type === 'custom')   { setScreen('savedlevels'); return; }
    if (level.type === 'tutorial') { setScreen('levels');      return; }

    const nextBandTutorial = TIER_TUTORIAL_GATE[level.id + 1];
    if (nextBandTutorial) {
      setLevel({ type: 'tutorial', id: nextBandTutorial });
      return;
    }

    const next = LEVELS.find(l => l.id === level.id + 1);
    if (next) {
      if (isPaywalled(next.id)) { setUnlockReturnTo('levels'); setScreen('unlock'); }
      else setLevel({ type: 'campaign', id: next.id });
    } else {
      await drainCompletionQueue();
      setScreen('levels');
    }
  }, [level, drainCompletionQueue, isPaywalled]);

  const renderScreen = () => {
    if (screen === 'start')
      return <StartScreen onStart={() => setScreen('menu')} onResetIAP={handleResetIAP} onUnlockAll={handleUnlockAll} />;

    if (screen === 'menu')
      return (
        <MenuScreen
          onLevels={() => setScreen('levels')}
          onBuilder={() => requirePurchase('builder', () => setScreen('builder'))}
          isPurchased={isPurchased}
        />
      );

    if (screen === 'unlock')
      return (
        <UnlockScreen
          onPurchase={handlePurchase}
          onRestore={handleRestore}
          onBack={() => {
            if (unlockReturnTo === 'builder') setScreen('menu');
            else if (unlockReturnTo === 'game') setScreen('game');
            else setScreen('levels');
          }}
          isPurchasing={isPurchasing}
        />
      );

    if (screen === 'levels')
      return (
        <LevelSelect
          onBack={() => setScreen('menu')}
          completed={completed}
          tutorialCompleted={tutorialCompleted}
          isUnlocked={isUnlocked}
          isPaywalled={isPaywalled}
          isTutorialUnlocked={isTutorialUnlocked}
          onReset={resetProgress}
          levelStars={levelStars}
          isPurchased={isPurchased}
          onUnlock={() => { setUnlockReturnTo('levels'); setScreen('unlock'); }}
          onSelect={(lvl) => {
            if (isPaywalled(lvl)) { setUnlockReturnTo('levels'); setScreen('unlock'); return; }
            setLevel({ type: 'campaign', id: lvl });
            setScreen('game');
          }}
          onSelectTutorial={(id) => { setLevel({ type: 'tutorial', id }); setScreen('game'); }}
        />
      );

    if (screen === 'builder')
      return (
        <LevelBuilderMenuScreen
          onBack={() => setScreen('menu')}
          onCreate={() => {
            if (customLevels.length >= CUSTOM_LEVEL_LIMIT) {
              Alert.alert(
                'Level Limit Reached',
                `You can save up to ${CUSTOM_LEVEL_LIMIT} custom levels. Delete a level from Saved Levels to make room.`
              );
              return;
            }
            setEditingCustomLevel(null);
            setScreen('editor');
          }}
          onSaved={() => setScreen('savedlevels')}
          savedCount={customLevels.length}
          atLimit={customLevels.length >= CUSTOM_LEVEL_LIMIT}
        />
      );

    if (screen === 'editor')
      return (
        <LevelEditorScreen
          key={editingCustomLevel?.id ?? 'new'}
          onBack={() => { setEditingCustomLevel(null); setEditorDraft(null); setScreen(editingCustomLevel ? 'savedlevels' : 'builder'); }}
          initialLevel={editingCustomLevel}
          draft={editorDraft}
          onDraftChange={setEditorDraft}
          onSave={handleSaveCustomLevel}
          onTest={(lvlData, draft) => { setEditorDraft(draft); setTestingLevel(lvlData); setLevel({ type: 'custom', data: lvlData }); setScreen('testgame'); }}
        />
      );

    if (screen === 'savedlevels')
      return (
        <SavedLevelsScreen
          onBack={() => setScreen('builder')}
          customLevels={customLevels}
          onPlay={(lvl) => { setLevel({ type: 'custom', data: lvl }); setScreen('game'); }}
          onEdit={(lvl) => { setEditingCustomLevel(lvl); setScreen('editor'); }}
          onDelete={handleDeleteCustomLevel}
          onDeleteAll={handleDeleteAllCustomLevels}
        />
      );

    if (screen === 'testgame')
      return (
        <GameScreen
          key={`test-${testingLevel?.id}`}
          level={{ type: 'custom', data: testingLevel }}
          isTestMode={true}
          onBack={() => { setScreen('editor'); }}
          onMenu={() => { setScreen('editor'); }}
          bestTurns={{}}
          hintsStored={99}
          isPurchased={true}
          onUseHint={() => {}}
          onHintEmpty={() => {}}
          onSkipTutorial={() => {}}
          onComplete={() => false}
          onNext={() => {
            setEditorDraft(d => ({ ...(d ?? {}), _openSave: true }));
            setScreen('editor');
          }}
          parMsgDismissedRef={parMsgDismissedRef}
        />
      );

    if (screen === 'game')
      return (
        <GameScreen
          key={
            level.type === 'tutorial' ? `tutorial-${level.id}` :
            level.type === 'campaign' ? level.id :
            `custom-${level.data.id}`
          }
          level={level}
          isTestMode={false}
          onBack={() => setScreen(level.type === 'custom' ? 'savedlevels' : 'levels')}
          onMenu={() => setScreen('menu')}
          bestTurns={bestTurns}
          hintsStored={hintsStored}
          isPurchased={isPurchased}
          onUseHint={() => {
            const next = Math.max(0, hintsStored - 1);
            setHintsStored(next);
            saveProgress({ completed: completedRef.current, stars: levelStarsRef.current, bestTurns: bestTurnsRef.current, tutorialCompleted: tutorialCompletedRef.current, hints: next });
          }}
          onHintEmpty={() => { setUnlockReturnTo('game'); setScreen('unlock'); }}
          onSkipTutorial={() => {
            if (level.type === 'tutorial') markTutorialCompleted(level.id);
            setScreen('levels');
          }}
          onComplete={(stars, turns) => {
            let awarded = false;
            if (level.type === 'campaign') {
              enqueueCompletion(async () => {
                const newCompleted = completedRef.current.includes(level.id)
                  ? completedRef.current
                  : [...completedRef.current, level.id];
                completedRef.current = newCompleted;
                setCompleted(newCompleted);

                const newStars = stars != null && (levelStarsRef.current[level.id] == null || stars > levelStarsRef.current[level.id])
                  ? { ...levelStarsRef.current, [level.id]: stars }
                  : levelStarsRef.current;
                levelStarsRef.current = newStars;
                setLevelStars(newStars);

                const newBestTurns = turns != null && (bestTurnsRef.current[level.id] == null || turns < bestTurnsRef.current[level.id])
                  ? { ...bestTurnsRef.current, [level.id]: turns }
                  : bestTurnsRef.current;
                bestTurnsRef.current = newBestTurns;
                setBestTurns(newBestTurns);

                await saveProgress({
                  completed: newCompleted,
                  stars: newStars,
                  bestTurns: newBestTurns,
                  tutorialCompleted: tutorialCompletedRef.current,
                  hints: hintsRef.current,
                });
              });
              if (!isPurchased) {
                const willBeTotal = completed.includes(level.id) ? completed.length : completed.length + 1;
                if (willBeTotal % HINT_REWARD_EVERY === 0 && hintsStored < HINT_MAX) {
                  const newHints = Math.min(hintsStored + 1, HINT_MAX);
                  setHintsStored(newHints);
                  saveProgress({ completed: completedRef.current, stars: levelStarsRef.current, bestTurns: bestTurnsRef.current, tutorialCompleted: tutorialCompletedRef.current, hints: newHints });
                  awarded = true;
                }
              }
            }
            if (level.type === 'tutorial') enqueueCompletion(() => markTutorialCompleted(level.id));
            return awarded;
          }}
          onNext={handleNext}
          parMsgDismissedRef={parMsgDismissedRef}
        />
      );

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.void }}>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.Text style={{ fontSize: 36, fontWeight: '900', color: C.teal, letterSpacing: 16, fontFamily: FONT, opacity: loadingPulse }}>
            ECHO
          </Animated.Text>
          <Text style={{ fontSize: 18, fontWeight: '300', color: C.textSecond, letterSpacing: 24, fontFamily: FONT, marginTop: -4 }}>
            GRID
          </Text>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      ) : (
        <>
          {renderScreen()}
          {justUnlocked && <UnlockToast fadeAnim={unlockFadeAnim} />}
        </>
      )}
    </View>
  );
}

// ─── Unlock Toast ─────────────────────────────────────────────────────────────
function UnlockToast({ fadeAnim }) {
  return (
    <Animated.View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      elevation: 99999,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
      opacity: fadeAnim,
    }}>
      <View style={styles.unlockToast}>
        <Text style={styles.unlockToastText}>✓  FULL SEQUENCE UNLOCKED</Text>
      </View>
    </Animated.View>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions, PanResponder, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT } from '../constants/theme';
import { PALETTE_TILES } from '../constants/game';
import { Overlay, Screen } from '../components/Overlay';
import {
  makeEmptyGrid, validateLevel, getNextSmartTile,
  getSmartTileQueueLabel,
} from '../utils/gameLogic';
import styles from '../styles/styles';

const DIR_ICON  = { UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' };
const DIR_LABEL = { UP: 'UP', DOWN: 'DN', LEFT: 'LT', RIGHT: 'RT' };

function LevelEditorScreen({ onBack, onSave, onTest, initialLevel, draft, onDraftChange }) {
  const insets = useSafeAreaInsets();

  const initRows = draft?.rows ?? (initialLevel ? initialLevel.grid.length    : 5);
  const initCols = draft?.cols ?? (initialLevel ? initialLevel.grid[0].length : 5);
  const initGrid = draft?.grid ?? (initialLevel ? initialLevel.grid.map(r => [...r]) : makeEmptyGrid(5, 5));

  const [rows,           setRows]         = useState(initRows);
  const [cols,           setCols]         = useState(initCols);
  const [grid,           setGrid]         = useState(initGrid);
  const [selectedTile,   setSelectedTile] = useState(draft?.selectedTile ?? 'S');
  const [movesPerTurn,   setMovesPerTurn] = useState(draft?.movesPerTurn ?? initialLevel?.movesPerTurn ?? 3);
  const [echoLast,       setEchoLast]     = useState(draft?.echoLast     ?? initialLevel?.echoLast     ?? 1);
  const [showSaveDialog, setShowSaveDialog] = useState(draft?._openSave ?? false);
  const [saveMinTurns,   setSaveMinTurns]   = useState(draft?._openSave ? (initialLevel?.minTurns ?? null) : null);
  const [saveHint,       setSaveHint]       = useState(initialLevel?.hint ?? []);
  const [showHintBuilder,setShowHintBuilder] = useState(!!(initialLevel?.hint?.length));
  const [levelName,      setLevelName]    = useState(initialLevel?.name ?? '');
  const [errors,         setErrors]       = useState([]);
  const [showErrors,     setShowErrors]   = useState(false);
  const [showClearConfirm,   setShowClearConfirm]   = useState(false);
  const [resizeWarning,      setResizeWarning]       = useState(null);
  const [lastTouchedCell,    setLastTouchedCell]     = useState(null);
  const tileHistoryRef = useRef([]);

  useEffect(() => {
    if (draft?._openSave) {
      const errs = validateLevel(grid);
      if (errs.length) {
        setErrors(errs);
        setShowErrors(true);
        setShowSaveDialog(false);
      }
      onDraftChange(prev => ({ ...(prev ?? {}), _openSave: false }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const screenWidth  = Dimensions.get('window').width;
  const maxDim       = Math.max(rows, cols);
  const gridBudget   = screenWidth - 24;
  const cellSize     = Math.max(20, Math.floor(gridBudget / maxDim));
  const cellFont     = Math.max(7,  cellSize * 0.38);
  const showSubLabel = cellSize >= 28;

  const handleResizeRows = (delta) => {
    const n = Math.max(3, Math.min(11, rows + delta));
    if (n === rows) return;
    if (n < rows) {
      const willLose = grid.slice(n).some(row => row.some(cell => cell !== '.'));
      if (willLose) { setResizeWarning({ type: 'row', n }); return; }
    }
    applyResizeRows(n);
  };
  const handleResizeCols = (delta) => {
    const n = Math.max(3, Math.min(11, cols + delta));
    if (n === cols) return;
    if (n < cols) {
      const willLose = grid.some(row => row.slice(n).some(cell => cell !== '.'));
      if (willLose) { setResizeWarning({ type: 'col', n }); return; }
    }
    applyResizeCols(n);
  };
  const applyResizeRows = (n) => {
    setRows(n);
    setGrid(prev => n > prev.length
      ? [...prev, ...Array.from({ length: n - prev.length }, () => Array(cols).fill('.'))]
      : prev.slice(0, n));
    setResizeWarning(null);
  };
  const applyResizeCols = (n) => {
    setCols(n);
    setGrid(prev => prev.map(row => n > row.length ? [...row, ...Array(n - row.length).fill('.')] : row.slice(0, n)));
    setResizeWarning(null);
  };

  const lastPaintedRef = useRef(null);
  const isDraggingRef  = useRef(false);
  const gridLayoutRef  = useRef({ x: 0, y: 0 });

  const resolveTile = (currentCell, grid) => {
    let tileToPlace = selectedTile;
    if (['TELE', 'PAD', 'DOOR'].includes(selectedTile)) {
      tileToPlace = getNextSmartTile(selectedTile, grid);
    }
    const erases = (() => {
      if (selectedTile === 'TELE') return typeof currentCell === 'string' && currentCell.startsWith('T') && currentCell.length >= 2;
      if (selectedTile === 'PAD')  return typeof currentCell === 'string' && currentCell.startsWith('P') && currentCell.length >= 2;
      if (selectedTile === 'DOOR') return typeof currentCell === 'string' && currentCell.startsWith('D') && currentCell.length >= 2;
      return currentCell === selectedTile;
    })();
    if (erases && !isDraggingRef.current) return '.';
    return tileToPlace;
  };

  const placeTile = (r, c, fromDrag = false) => {
    setLastTouchedCell({ r, c });
    setGrid(prev => {
      const g = prev.map(row => [...row]);
      const currentCell = g[r][c];
      const tileToPlace = resolveTile(currentCell, g);

      if (fromDrag && g[r][c] === tileToPlace) return prev;

      const prevCell = g[r][c];
      const extras = [];
      if (tileToPlace === 'S') {
        g.forEach((row, gr) => row.forEach((v, gc) => {
          if (v === 'S' && !(gr === r && gc === c)) extras.push({ r: gr, c: gc, prev: 'S' });
        }));
      }
      if (tileToPlace === 'G') {
        g.forEach((row, gr) => row.forEach((v, gc) => {
          if (v === 'G' && !(gr === r && gc === c)) extras.push({ r: gr, c: gc, prev: 'G' });
        }));
      }
      if (tileToPlace === 'S') g.forEach(row => row.forEach((v,i) => { if (v==='S') row[i]='.'; }));
      if (tileToPlace === 'G') g.forEach(row => row.forEach((v,i) => { if (v==='G') row[i]='.'; }));
      g[r][c] = tileToPlace;
      tileHistoryRef.current.push([{ r, c, prev: prevCell }, ...extras]);
      return g;
    });
  };

  const gridViewRef = useRef(null);

  const gridPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = false;
        lastPaintedRef.current = null;
        const { pageX, pageY } = evt.nativeEvent;
        const localX = pageX - gridLayoutRef.current.x;
        const localY = pageY - gridLayoutRef.current.y;
        const r = Math.floor(localY / cellSizeRef.current);
        const c = Math.floor(localX / cellSizeRef.current);
        if (r >= 0 && c >= 0 && r < rowsRef.current && c < colsRef.current) {
          lastPaintedRef.current = `${r},${c}`;
          paintRef.current(r, c, false);
        }
      },
      onPanResponderMove: (evt) => {
        isDraggingRef.current = true;
        const { pageX, pageY } = evt.nativeEvent;
        const localX = pageX - gridLayoutRef.current.x;
        const localY = pageY - gridLayoutRef.current.y;
        const r = Math.floor(localY / cellSizeRef.current);
        const c = Math.floor(localX / cellSizeRef.current);
        if (r < 0 || c < 0 || r >= rowsRef.current || c >= colsRef.current) return;
        const key = `${r},${c}`;
        if (key === lastPaintedRef.current) return;
        lastPaintedRef.current = key;
        paintRef.current(r, c, true);
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        lastPaintedRef.current = null;
      },
    })
  ).current;

  const cellSizeRef = useRef(cellSize);
  const rowsRef     = useRef(rows);
  const colsRef     = useRef(cols);
  const paintRef    = useRef(placeTile);
  useEffect(() => { cellSizeRef.current = cellSize; }, [cellSize]);
  useEffect(() => { rowsRef.current = rows; },         [rows]);
  useEffect(() => { colsRef.current = cols; },         [cols]);
  useEffect(() => { paintRef.current = placeTile; });

  const undoTile = () => {
    if (tileHistoryRef.current.length === 0) return;
    const snapshot = tileHistoryRef.current.pop();
    setGrid(prev => {
      const g = prev.map(row => [...row]);
      snapshot.forEach(({ r, c, prev: was }) => { g[r][c] = was; });
      return g;
    });
  };

  const clearGrid = () => {
    tileHistoryRef.current = [];
    setGrid(makeEmptyGrid(rows, cols));
    setShowClearConfirm(false);
  };

  const getTileVisual = (cell) => {
    if (cell === 'S') return { bg: C.indigoDim,  border: C.indigo,              icon: '◉', tc: C.indigo,          sub: null };
    if (cell === 'G') return { bg: C.winDim,     border: C.win+'cc',            icon: '◈', tc: C.win,             sub: null };
    if (cell === 'W') return { bg: C.wall,       border: C.wallBright,          icon: '',  tc: C.textDim,         sub: null };
    if (cell === 'C') return { bg: C.crumbleDim, border: 'rgba(244,63,94,0.6)', icon: '✕', tc: C.crumble,         sub: null };
    if (cell === 'I') return { bg: C.phaseOpen,    border: C.phaseOpenBorder,    icon: '~', tc: C.phaseOpenText,   sub: null };
    if (cell === 'O') return { bg: C.phaseBlocked, border: C.phaseBlockedBorder, icon: '~', tc: C.phaseBlockedText,sub: null };
    if (cell === '>') return { bg: C.arrowDim,   border: 'rgba(0,212,200,0.6)', icon: '▶', tc: C.arrow,           sub: null };
    if (cell === '<') return { bg: C.arrowDim,   border: 'rgba(0,212,200,0.6)', icon: '◀', tc: C.arrow,           sub: null };
    if (cell === '^') return { bg: C.arrowDim,   border: 'rgba(0,212,200,0.6)', icon: '▲', tc: C.arrow,           sub: null };
    if (cell === 'v') return { bg: C.arrowDim,   border: 'rgba(0,212,200,0.6)', icon: '▼', tc: C.arrow,           sub: null };
    if (typeof cell === 'string' && cell.startsWith('T') && cell.length >= 2)
      return { bg: C.teleDim,  border: 'rgba(232,121,249,0.6)', icon: '⬡', tc: C.tele,  sub: cell.slice(1) };
    if (typeof cell === 'string' && cell.startsWith('P') && cell.length >= 2)
      return { bg: C.plateDim, border: 'rgba(234,179,8,0.6)',   icon: '⊕', tc: C.plate, sub: cell.slice(1) };
    if (typeof cell === 'string' && cell.startsWith('D') && cell.length >= 2)
      return { bg: C.doorDim,  border: 'rgba(234,179,8,0.6)',   icon: '▬', tc: C.door,  sub: cell.slice(1) };
    return { bg: C.surface, border: C.border, icon: '', tc: C.textDim, sub: null };
  };

  const buildDraft = () => ({ rows, cols, grid: grid.map(r => [...r]), selectedTile, movesPerTurn, echoLast, levelName });

  const handleSave = () => {
    const errs = validateLevel(grid);
    if (errs.length) { setErrors(errs); setShowErrors(true); return; }
    setErrors([]);
    setSaveMinTurns(initialLevel?.minTurns ?? null);
    setSaveHint(initialLevel?.hint ?? []);
    setShowHintBuilder(!!(initialLevel?.hint?.length));
    setShowSaveDialog(true);
  };

  const handleTest = () => {
    const errs = validateLevel(grid);
    if (errs.length) { setErrors(errs); setShowErrors(true); return; }
    const lvlData = {
      id: initialLevel?.id ?? 'test-preview',
      name: levelName.trim().toUpperCase() || 'TEST',
      grid, movesPerTurn, echoLast,
      createdAt: initialLevel?.createdAt ?? Date.now(),
    };
    onTest(lvlData, buildDraft());
  };

  const confirmSave = () => {
    const name = levelName.trim();
    if (!name) return;
    onSave({
      id: initialLevel?.id ?? Date.now().toString(),
      name: name.toUpperCase(),
      grid, movesPerTurn, echoLast,
      minTurns: saveMinTurns,
      hint: saveHint.length > 0 ? saveHint : undefined,
      createdAt: initialLevel?.createdAt ?? Date.now(),
    });
  };

  const addHintDir = (dir) => {
    if (saveHint.length >= movesPerTurn) return;
    setSaveHint(prev => [...prev, dir]);
  };
  const removeLastHintDir = () => {
    setSaveHint(prev => prev.slice(0, -1));
  };
  const clearHint = () => { setSaveHint([]); setShowHintBuilder(false); };

  const activePalette = PALETTE_TILES.find(p => p.tile === selectedTile) ?? PALETTE_TILES[0];
  const smartQueueLabel = ['TELE', 'PAD', 'DOOR'].includes(selectedTile)
    ? getSmartTileQueueLabel(selectedTile, grid)
    : null;
  const placingLabel = smartQueueLabel
    ? `${activePalette.label}  ·  NEXT: ${smartQueueLabel}`
    : activePalette.label;

  const tilesPerRow     = 7;
  const palettePad      = 12 * 2;
  const tileGap         = 3;
  const paletteTileSize = Math.floor((screenWidth - palettePad - tileGap * (tilesPerRow - 1)) / tilesPerRow);
  const paletteFontSize  = Math.max(13, paletteTileSize * 0.40);
  const paletteLabelSize = Math.max(8,  paletteTileSize * 0.19);
  const rows7 = [];
  for (let i = 0; i < PALETTE_TILES.length; i += tilesPerRow)
    rows7.push(PALETTE_TILES.slice(i, i + tilesPerRow));

  return (
    <View style={{ flex: 1, backgroundColor: C.void }}>
      <Screen style={[styles.screen, { justifyContent: 'flex-start', paddingTop: insets.top + 14, paddingBottom: insets.bottom + 8, paddingHorizontal: 12 }]}>

        <Text style={[styles.screenTitle, { marginBottom: 10, textAlign: 'center', width: '100%' }]}>
          {initialLevel ? 'EDIT LEVEL' : 'CREATE NEW LEVEL'}
        </Text>

        <View style={styles.editorHeaderRow}>
          <View style={styles.editorSettings}>
            {[
              { label: 'ROWS',  val: rows,         onDec: () => handleResizeRows(-1), onInc: () => handleResizeRows(1) },
              { label: 'COLS',  val: cols,         onDec: () => handleResizeCols(-1), onInc: () => handleResizeCols(1) },
              { label: 'MOVES', val: movesPerTurn, onDec: () => setMovesPerTurn(m => Math.max(2, m-1)), onInc: () => setMovesPerTurn(m => Math.min(6, m+1)) },
              { label: 'ECHO',  val: echoLast,     onDec: () => setEchoLast(e => Math.max(1, e-1)),     onInc: () => setEchoLast(e => Math.min(movesPerTurn, e+1)) },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <View style={styles.editorSetting}>
                  <Text style={styles.editorSettingLabel}>{s.label}</Text>
                  <View style={styles.editorCounter}>
                    <TouchableOpacity style={styles.editorCounterBtn} onPress={s.onDec}><Text style={styles.editorCounterBtnText}>−</Text></TouchableOpacity>
                    <Text style={styles.editorCounterValue}>{s.val}</Text>
                    <TouchableOpacity style={styles.editorCounterBtn} onPress={s.onInc}><Text style={styles.editorCounterBtnText}>+</Text></TouchableOpacity>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={styles.editorSettingDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={[styles.editorPlacingBar, { borderColor: activePalette.tc+'99', backgroundColor: activePalette.bg }]}>
          <Text style={styles.editorPlacingBarLabel}>PLACING</Text>
          <Text style={[styles.editorPlacingBarTile, { color: activePalette.tc }]}>
            {activePalette.icon}  {placingLabel}
          </Text>
        </View>

        <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <View
            ref={gridViewRef}
            style={styles.editorGrid}
            onLayout={() => {
              if (gridViewRef.current) {
                gridViewRef.current.measure((_x, _y, _w, _h, pageX, pageY) => {
                  gridLayoutRef.current = { x: pageX, y: pageY };
                });
              }
            }}
            {...gridPanResponder.panHandlers}
          >
            {grid.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                {row.map((cell, c) => {
                  const vis = getTileVisual(cell);
                  const isLast = lastTouchedCell?.r === r && lastTouchedCell?.c === c;
                  return (
                    <View key={c}
                      style={{ width: cellSize, height: cellSize, borderWidth: 1, borderColor: isLast ? activePalette.tc : vis.border, backgroundColor: vis.bg, justifyContent: 'center', alignItems: 'center' }}>
                      {isLast && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: activePalette.tc+'66', backgroundColor: activePalette.tc+'11' }} pointerEvents="none" />
                      )}
                      {vis.sub && showSubLabel ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: cellFont, color: vis.tc, lineHeight: cellFont*1.15 }}>{vis.icon}</Text>
                          <Text style={{ fontSize: cellFont*0.55, color: vis.tc+'cc', fontFamily: FONT, fontWeight: '700', marginTop: -2 }}>{vis.sub}</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: cellFont, color: vis.tc, fontFamily: FONT, fontWeight: '700' }}>{vis.icon}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {(() => {
          const canUndo    = tileHistoryRef.current.length > 0;
          const hasContent = grid.some(row => row.some(cell => cell !== '.'));
          return (
            <View style={styles.editorUtilRow}>
              <TouchableOpacity
                style={[styles.editorUtilBtn, !canUndo && styles.editorUtilBtnDisabled]}
                onPress={undoTile} disabled={!canUndo} activeOpacity={0.7}
              >
                <Text style={[styles.editorUtilBtnText, !canUndo && { color: C.textDim }]}>↩︎  UNDO</Text>
              </TouchableOpacity>
              {hasContent && (
                <TouchableOpacity
                  style={[styles.editorUtilBtn, { borderColor: 'rgba(244,63,94,0.4)' }]}
                  onPress={() => setShowClearConfirm(true)} activeOpacity={0.7}
                >
                  <Text style={[styles.editorUtilBtnText, { color: C.warn }]}>✕  CLEAR GRID</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        <View style={[styles.paletteWrapper, { marginTop: 8 }]}>
          {rows7.map((rowTiles, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: tileGap }}>
              {rowTiles.map((p, tileIdx) => {
                const isActive = selectedTile === p.tile;
                const smartSub = ['TELE', 'PAD', 'DOOR'].includes(p.tile) && isActive
                  ? getSmartTileQueueLabel(p.tile, grid)
                  : null;
                return (
                  <TouchableOpacity
                    key={p.tile}
                    onPress={() => setSelectedTile(p.tile)}
                    activeOpacity={0.7}
                    style={{
                      width: paletteTileSize, height: paletteTileSize,
                      marginRight: tileIdx < rowTiles.length - 1 ? tileGap : 0,
                      backgroundColor: p.bg,
                      borderColor: isActive ? p.tc : p.border,
                      borderWidth: isActive ? 2 : 1,
                      opacity: isActive ? 1 : 0.7,
                      justifyContent: 'center', alignItems: 'center', paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: paletteFontSize, color: p.tc, includeFontPadding: false, textAlign: 'center' }}>
                      {p.icon}
                    </Text>
                    {smartSub ? (
                      <Text style={{ fontSize: paletteLabelSize, color: p.tc, fontFamily: FONT, fontWeight: '700', marginTop: 1, textAlign: 'center', width: '100%' }}>
                        {smartSub}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: paletteLabelSize, color: isActive ? p.tc : C.textSecond, fontFamily: FONT, fontWeight: '700', marginTop: 1, textAlign: 'center' }}>
                        {p.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.editorFooterRow}>
          <TouchableOpacity style={[styles.footerBtn, styles.editorFooterBtnFlex]} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.footerBtnText}>‹  BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, styles.editorFooterBtnFlex, { borderColor: 'rgba(99,102,241,0.53)', backgroundColor: 'rgba(63,63,138,0.13)' }]} onPress={handleTest} activeOpacity={0.7}>
            <Text style={[styles.footerBtnText, { color: C.indigo, letterSpacing: 3 }]}>▶  TEST</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, styles.editorFooterBtnFlex, { borderColor: 'rgba(0,212,200,0.53)', backgroundColor: 'rgba(0,144,122,0.13)' }]} onPress={handleSave} activeOpacity={0.7}>
            <Text style={[styles.footerBtnText, { color: C.teal, letterSpacing: 4 }]}>SAVE  ›</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
      </Screen>

      {/* ── Errors overlay ── */}
      <Overlay visible={showErrors}>
        <View style={[styles.alertBanner, { borderColor: C.warn, width: screenWidth - 48 }]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>FIX BEFORE CONTINUING</Text>
            {errors.map((e, i) => <Text key={i} style={[styles.alertReason, { marginBottom: 4, textAlign: 'left' }]}>· {e}</Text>)}
            <TouchableOpacity style={[styles.rowBtn, { flex: undefined, alignSelf: 'stretch', marginTop: 8 }]} onPress={() => setShowErrors(false)} activeOpacity={0.7}>
              <Text style={styles.alertButtonText}>FIX ERRORS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Overlay>

      {/* ── Resize warning overlay ── */}
      <Overlay visible={resizeWarning !== null}>
        <View style={[styles.alertBanner, { borderColor: C.warn, width: screenWidth - 48 }]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>REMOVE TILES?</Text>
            <Text style={styles.alertReason}>
              {resizeWarning?.type === 'row' ? 'THE BOTTOM ROW CONTAINS TILES' : 'THE RIGHT COLUMN CONTAINS TILES'}
            </Text>
            <View style={styles.winButtonRow}>
              <TouchableOpacity
                style={[styles.rowBtn, { borderColor: C.warn }]}
                onPress={() => resizeWarning?.type === 'row' ? applyResizeRows(resizeWarning.n) : applyResizeCols(resizeWarning.n)}
                activeOpacity={0.7}
              >
                <Text style={styles.alertButtonText}>SHRINK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rowBtn, { borderColor: C.textDim }]} onPress={() => setResizeWarning(null)} activeOpacity={0.7}>
                <Text style={[styles.alertButtonText, { color: C.textSecond }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Overlay>

      {/* ── Clear grid confirm overlay ── */}
      <Overlay visible={showClearConfirm}>
        <View style={[styles.alertBanner, { borderColor: C.warn, width: screenWidth - 48 }]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>CLEAR GRID?</Text>
            <Text style={styles.alertReason}>ALL TILES WILL BE REMOVED</Text>
            <View style={styles.winButtonRow}>
              <TouchableOpacity style={[styles.rowBtn, { borderColor: C.warn }]} onPress={clearGrid} activeOpacity={0.7}>
                <Text style={styles.alertButtonText}>CLEAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rowBtn, { borderColor: C.textDim }]} onPress={() => setShowClearConfirm(false)} activeOpacity={0.7}>
                <Text style={[styles.alertButtonText, { color: C.textSecond }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Overlay>

      {/* ── Save dialog overlay ── */}
      <Overlay visible={showSaveDialog} fullHeight>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20, paddingBottom: 280 }}
        >
          <View style={[styles.tutorialBanner, { width: screenWidth - 48 }]}>
            <View style={styles.alertContent}>
              <Text style={styles.tutorialTitle}>NAME YOUR LEVEL</Text>

              <TextInput
                style={styles.levelNameInput}
                value={levelName}
                onChangeText={setLevelName}
                placeholder="ENTER NAME"
                placeholderTextColor={C.textDim}
                maxLength={20}
                autoCapitalize="characters"
                autoFocus
                selectionColor={C.teal}
              />
              <Text style={styles.levelNameHint}>{levelName.trim().length}/20</Text>

              <View style={[styles.saveParRow, { justifyContent: 'center' }]}>
                <Text style={styles.saveParLabel}>PAR</Text>
                <Text style={styles.saveParSub}>optional · sets star rating</Text>
              </View>
              {saveMinTurns === null ? (
                <View style={[styles.saveParControls, { justifyContent: 'center' }]}>
                  <TouchableOpacity
                    style={[styles.tutorialDismiss, { borderColor: 'rgba(148,163,184,0.4)', paddingHorizontal: 24 }]}
                    onPress={() => setSaveMinTurns(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tutorialDismissText}>+ SET PAR</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.saveParControls, { justifyContent: 'center' }]}>
                  <TouchableOpacity style={[styles.saveParBtn, { borderColor: 'rgba(148,163,184,0.4)' }]} onPress={() => setSaveMinTurns(n => Math.max(1, n - 1))} activeOpacity={0.7}>
                    <Text style={[styles.saveParBtnText, { color: '#94a3b8' }]}>−</Text>
                  </TouchableOpacity>
                  <View style={[styles.saveParValueBox, { borderColor: 'rgba(148,163,184,0.27)', alignItems: 'center' }]}>
                    <Text style={[styles.saveParValue, { color: '#e2e8f0' }]}>{saveMinTurns}</Text>
                    <Text style={[styles.saveParTurnLabel, { color: '#94a3b8' }]}>{saveMinTurns === 1 ? 'TURN' : 'TURNS'}</Text>
                  </View>
                  <TouchableOpacity style={[styles.saveParBtn, { borderColor: 'rgba(148,163,184,0.4)' }]} onPress={() => setSaveMinTurns(n => n + 1)} activeOpacity={0.7}>
                    <Text style={[styles.saveParBtnText, { color: '#94a3b8' }]}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ marginLeft: 8, borderWidth: 1, borderColor: 'rgba(244,63,94,0.4)', backgroundColor: 'rgba(127,29,46,0.2)', paddingVertical: 7, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setSaveMinTurns(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: C.warn, fontSize: 8, fontFamily: FONT, letterSpacing: 2 }}>✕  NO PAR</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.saveParRow, { justifyContent: 'center', marginTop: 14 }]}>
                <Text style={styles.saveParLabel}>HINT</Text>
                <Text style={styles.saveParSub}>optional · first-turn moves</Text>
              </View>

              {!showHintBuilder ? (
                <View style={[styles.saveParControls, { justifyContent: 'center' }]}>
                  <TouchableOpacity
                    style={[styles.tutorialDismiss, { borderColor: 'rgba(148,163,184,0.4)', paddingHorizontal: 24 }]}
                    onPress={() => setShowHintBuilder(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tutorialDismissText}>+ SET HINT</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    minHeight: 40, marginBottom: 8, gap: 6, flexWrap: 'wrap',
                  }}>
                    {saveHint.length === 0 ? (
                      <Text style={{ color: C.textDim, fontSize: 10, fontFamily: FONT, letterSpacing: 2 }}>
                        TAP DIRECTIONS BELOW
                      </Text>
                    ) : (
                      saveHint.map((dir, i) => (
                        <React.Fragment key={i}>
                          <View style={{
                            width: 34, height: 34,
                            borderWidth: 1, borderColor: C.hint + '99',
                            backgroundColor: C.hintDim + '66',
                            justifyContent: 'center', alignItems: 'center',
                          }}>
                            <Text style={{ fontSize: 16, color: C.hint }}>{DIR_ICON[dir]}</Text>
                          </View>
                          {i < saveHint.length - 1 && (
                            <Text style={{ color: C.hint + '55', fontSize: 12, fontFamily: FONT }}>·</Text>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </View>

                  <View style={{ alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <TouchableOpacity
                      style={[hintDirBtn, saveHint.length >= movesPerTurn && hintDirBtnDisabled]}
                      onPress={() => addHintDir('UP')}
                      disabled={saveHint.length >= movesPerTurn}
                      activeOpacity={0.7}
                    >
                      <Text style={hintDirText}>▲</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        style={[hintDirBtn, saveHint.length >= movesPerTurn && hintDirBtnDisabled]}
                        onPress={() => addHintDir('LEFT')}
                        disabled={saveHint.length >= movesPerTurn}
                        activeOpacity={0.7}
                      >
                        <Text style={hintDirText}>◀</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[hintDirBtn, { borderColor: C.warn + '66', backgroundColor: C.warnDim + '33' }]}
                        onPress={removeLastHintDir}
                        activeOpacity={0.7}
                      >
                        <Text style={[hintDirText, { color: C.warn, fontSize: 14 }]}>⌫</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[hintDirBtn, saveHint.length >= movesPerTurn && hintDirBtnDisabled]}
                        onPress={() => addHintDir('RIGHT')}
                        disabled={saveHint.length >= movesPerTurn}
                        activeOpacity={0.7}
                      >
                        <Text style={hintDirText}>▶</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[hintDirBtn, saveHint.length >= movesPerTurn && hintDirBtnDisabled]}
                      onPress={() => addHintDir('DOWN')}
                      disabled={saveHint.length >= movesPerTurn}
                      activeOpacity={0.7}
                    >
                      <Text style={hintDirText}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={clearHint}
                    activeOpacity={0.7}
                    style={{ borderWidth: 1, borderColor: 'rgba(244,63,94,0.4)', backgroundColor: 'rgba(127,29,46,0.2)', paddingVertical: 7, paddingHorizontal: 20, marginBottom: 2 }}
                  >
                    <Text style={{ color: C.warn, fontSize: 9, fontFamily: FONT, letterSpacing: 3 }}>
                      ✕  NO HINT
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={[styles.winButtonRow, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.rowBtn, { borderColor: '#94a3b8', opacity: levelName.trim() ? 1 : 0.4 }]}
                  onPress={confirmSave} disabled={!levelName.trim()} activeOpacity={0.7}
                >
                  <Text style={[styles.alertButtonText, { color: '#94a3b8' }]}>SAVE  ›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rowBtn, { borderColor: C.textDim }]}
                  onPress={() => setShowSaveDialog(false)} activeOpacity={0.7}
                >
                  <Text style={[styles.alertButtonText, { color: C.textSecond }]}>CANCEL</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </ScrollView>
      </Overlay>
    </View>
  );
}

// ── Hint d-pad button styles ──
const hintDirBtn = {
  width: 44, height: 44,
  borderWidth: 1,
  borderColor: 'rgba(245,158,11,0.4)',
  backgroundColor: 'rgba(120,53,15,0.2)',
  justifyContent: 'center',
  alignItems: 'center',
};
const hintDirBtnDisabled = { opacity: 0.25 };
const hintDirText = { fontSize: 18, color: 'rgba(245,158,11,0.9)' };

export default LevelEditorScreen;
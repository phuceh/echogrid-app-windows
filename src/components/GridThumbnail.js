import React from 'react';
import { View } from 'react-native';
import { C } from '../constants/theme';

function getCellColor(cell) {
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
}

export default function GridThumbnail({ grid, size = 54 }) {
  const rows = grid.length;
  const cols = grid[0].length;
  const cellSize = Math.floor(size / Math.max(rows, cols));
  const totalW = cellSize * cols;
  const totalH = cellSize * rows;

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

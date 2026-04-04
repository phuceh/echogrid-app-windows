import React from 'react';
import { View, Text } from 'react-native';
import { C } from '../constants/theme';

export default function StarDisplay({ stars, size = 20, style }) {
  if (stars == null) return null;
  return (
    <View style={[{ flexDirection: 'row', gap: 4 }, style]}>
      {[0, 1, 2].map(i => (
        <Text key={i} style={{
          fontSize: size,
          color: i < stars ? C.star : C.starDim,
          textShadowColor: i < stars ? 'rgba(245,158,11,0.53)' : 'transparent',
          textShadowRadius: i < stars ? 6 : 0,
        }}>★</Text>
      ))}
    </View>
  );
}

import React from 'react';
import { View, Modal } from 'react-native';

export function Overlay({ visible, children, contentStyle, fullHeight }) {
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{
        flex: 1, backgroundColor: 'rgba(6,6,15,0.93)',
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
      }}>
        {fullHeight ? (
          <View style={{ flex: 1, width: '100%' }}>
            {children}
          </View>
        ) : (
          <View style={[{ width: '100%', maxWidth: 360 }, contentStyle]}>
            {children}
          </View>
        )}
      </View>
    </Modal>
  );
}

export function Screen({ style, children }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={[{ flex: 1 }, style]}>
        {children}
      </View>
    </View>
  );
}
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, fonts} from '../theme';

/** 자리표시용 화면 — 갤러리 UI는 추후 작업. */
export default function GalleryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>갤러리</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
});

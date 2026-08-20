import React from 'react';
import {Image, Pressable, StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {images} from '../assets';
import type {CaptureNavigation} from '../navigation/types';
import {colors, fonts, fontSize} from '../theme';

/**
 * 가로형 레이아웃을 고르면 거치는 화면. (SR-04)
 *
 * 원래는 기기가 가로로 돌아간 걸 감지해 자동으로 촬영으로 넘어가야 하는데,
 * 방향 감지는 네이티브 의존성이 필요해 M7 로 미뤄져 있다.
 * 그때까지는 화면을 눌러서 넘어간다.
 */
export default function RotateGuideScreen() {
  const navigation = useNavigation<CaptureNavigation>();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="기기를 돌려주세요. 눌러서 촬영으로 이동"
      onPress={() => navigation.navigate('Capture')}
      style={styles.container}>
      <Image source={images.refresh} style={styles.icon} resizeMode="contain" />
      <Text style={styles.title}>기기를 돌려주세요!</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  icon: {
    width: 66,
    height: 66,
    tintColor: colors.textPrimary,
  },
  title: {
    fontSize: fontSize.calloutTitle,
    lineHeight: fontSize.calloutTitle * 1.2,
    fontWeight: '900',
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
});

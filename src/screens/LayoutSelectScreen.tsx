import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import BackButton from '../components/BackButton';
import LayoutCard from '../components/LayoutCard';
import type {CaptureNavigation} from '../navigation/types';
import {useCaptureSession, type CaptureLayout} from '../state/CaptureSessionContext';
import {colors} from '../theme';

/**
 * 촬영 방향(세로형/가로형)만 고른다 — 구체적인 디자인 프레임은 촬영 후
 * 인쇄·저장 화면에서 고른다. 방향에 따라 사진 장수·배치가 달라지므로
 * 촬영 전에 확정해야 한다.
 */
export default function LayoutSelectScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const {selectLayout} = useCaptureSession();

  // 가로형은 기기를 눕혀야 촬영할 수 있으므로 회전 안내를 한 번 거친다. (SR-04)
  const choose = (layout: CaptureLayout) => {
    selectLayout(layout);
    navigation.navigate(layout === 'portrait' ? 'Capture' : 'RotateGuide');
  };

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top, paddingBottom: insets.bottom + 16},
      ]}>
      <View style={styles.header}>
        {/* 첫 화면이라 goBack 이 촬영 플로우 자체를 닫고 탭으로 돌아간다. */}
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.cards}>
        <LayoutCard
          layout="portrait"
          label="세로형"
          onPress={() => choose('portrait')}
        />
        <LayoutCard
          layout="landscape"
          label="가로형"
          onPress={() => choose('landscape')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
  },
  cards: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
});

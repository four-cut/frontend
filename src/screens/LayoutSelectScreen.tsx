import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchFrames, type FrameSummary} from '../api/frames';
import BackButton from '../components/BackButton';
import LayoutCard from '../components/LayoutCard';
import type {CaptureNavigation} from '../navigation/types';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors, fonts, fontSize} from '../theme';

export default function LayoutSelectScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const {selectFrame} = useCaptureSession();

  const [frames, setFrames] = useState<FrameSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setFrames(null);
    fetchFrames()
      .then(setFrames)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 가로형은 기기를 눕혀야 촬영할 수 있으므로 회전 안내를 한 번 거친다. (SR-04)
  const choose = (frame: FrameSummary) => {
    selectFrame(frame);
    navigation.navigate(
      frame.orientation === 'PORTRAIT' ? 'Capture' : 'RotateGuide',
    );
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
        {frames === null && !failed && (
          <View style={styles.status}>
            <ActivityIndicator color={colors.textPrimary} />
          </View>
        )}

        {failed && (
          <View style={styles.status}>
            <Text style={styles.statusText}>
              프레임 목록을 불러오지 못했습니다
            </Text>
            <Pressable onPress={load} style={styles.retry}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        )}

        {frames !== null &&
          !failed &&
          frames.map(frame => (
            <LayoutCard
              key={frame.frameId}
              layout={frame.orientation === 'PORTRAIT' ? 'portrait' : 'landscape'}
              label={frame.name}
              previewImageUrl={frame.previewImageUrl}
              onPress={() => choose(frame)}
            />
          ))}
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
  status: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.black,
  },
  retryText: {
    color: colors.white,
    fontSize: fontSize.button,
    fontWeight: '700',
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
});

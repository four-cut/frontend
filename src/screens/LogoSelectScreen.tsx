import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {composeStrip} from '../capture/composeStrip';
import {STRIP_ASPECT} from '../capture/stripLayout';
import HomeButton from '../components/HomeButton';
import PrimaryButton from '../components/PrimaryButton';
import type {CaptureNavigation, RootNavigation} from '../navigation/types';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors, fonts} from '../theme';

/** 시안(Frame-3)에서 시트가 화면 폭을 차지하는 비율 */
const SHEET_WIDTH_RATIO = 0.52;

/**
 * SR-07 로고 선택 · 출력.
 *
 * 지금은 합성된 시트를 보여주는 데까지다. 커스텀 로고 선택과
 * 인쇄·저장은 M6 에서 붙인다.
 */
export default function LogoSelectScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const {width} = useWindowDimensions();
  const {layout, shots, selection} = useCaptureSession();

  const [strip, setStrip] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!layout) {
      return;
    }
    let cancelled = false;
    const photos = selection.map(index => shots[index]);

    composeStrip(layout, photos)
      .then(uri => {
        if (!cancelled) {
          setStrip(uri);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [layout, selection, shots]);

  const goHome = () => {
    navigation.getParent<RootNavigation>()?.navigate('MainTabs', {
      screen: 'Shoot',
      params: {screen: 'Home'},
    });
  };

  const sheetWidth = width * SHEET_WIDTH_RATIO;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <HomeButton onPress={goHome} />
      </View>

      <View style={styles.previewArea}>
        <View
          style={[
            styles.sheet,
            {width: sheetWidth, height: sheetWidth * STRIP_ASPECT},
          ]}>
          {strip ? (
            <Image
              source={{uri: strip}}
              style={styles.sheetImage}
              resizeMode="contain"
            />
          ) : failed ? (
            <Text style={styles.status}>합성에 실패했습니다</Text>
          ) : (
            <ActivityIndicator color={colors.textPrimary} />
          )}
        </View>
      </View>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        <Text style={styles.sectionLabel}>커스텀 로고 선택</Text>
        <Text style={styles.pending}>로고 선택과 인쇄·저장은 준비 중입니다</Text>
        <PrimaryButton label="인쇄하기" disabled onPress={() => {}} />
        <PrimaryButton
          label="사진, 영상 저장하기"
          disabled
          onPress={() => {}}
          style={styles.secondAction}
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
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetImage: {
    width: '100%',
    height: '100%',
  },
  status: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  actions: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  pending: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  secondAction: {
    marginTop: 0,
  },
});

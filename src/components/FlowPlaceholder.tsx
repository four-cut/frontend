import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import PrimaryButton from './PrimaryButton';
import {colors, fonts, fontSize} from '../theme';

type Props = {
  /** 요구사항 정의서의 화면 ID — docs/requirements.md */
  screenId: string;
  title: string;
  /** 세션 상태가 제대로 넘어왔는지 눈으로 확인하기 위한 줄 */
  detail?: string;
  actionLabel: string;
  onPress: () => void;
};

/**
 * 아직 구현되지 않은 촬영 플로우 화면의 자리표시자.
 * 플로우를 끝까지 통과시켜 네비게이션 구조를 검증하는 용도이고,
 * 해당 화면이 구현되면 지운다.
 */
export default function FlowPlaceholder({
  screenId,
  title,
  detail,
  actionLabel,
  onPress,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top, paddingBottom: insets.bottom + 16},
      ]}>
      <View style={styles.body}>
        <Text style={styles.screenId}>{screenId}</Text>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={actionLabel} onPress={onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  screenId: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  title: {
    fontSize: fontSize.calloutTitle,
    fontWeight: '900',
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  detail: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  actions: {
    paddingHorizontal: 16,
  },
});

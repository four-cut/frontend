/**
 * 스낵바. (UI-V2)
 *
 * 저장 결과를 화면 안에 글로 넣으면 문장이 나타날 때마다 아래 버튼들이
 * 밀려서, 누르려던 곳이 눌리지 않는다. 결과 알림은 레이아웃을 밀지 않는
 * 자리에 띄우고 스스로 사라지게 한다. (Material snackbar)
 *
 * 화면을 덮지 않으므로 하던 일을 계속할 수 있다. 되돌릴 수 없는 실패처럼
 * 반드시 읽어야 하는 것은 스낵바 대신 화면 안에 남겨 둔다.
 */
import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet} from 'react-native';

import {Text} from '../AppText';
import {
  colorsV2,
  fontsV2,
  lineV2,
  radiusV2,
  sizeV2,
  spaceV2,
} from '../../theme/uiV2';

/** 읽고 사라지기까지. Material 이 권하는 4초. */
const VISIBLE_MS = 4000;

type Props = {
  message: string | null;
  onDismiss: () => void;
  /** 오른쪽에 붙는 동작 (예: 설정 열기) */
  action?: {label: string; onPress: () => void};
};

export default function Snackbar({message, onDismiss, action}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      return;
    }
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    // 동작이 붙어 있으면 누를 시간을 줘야 하므로 자동으로 닫지 않는다.
    if (action) {
      return;
    }
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, action, onDismiss, opacity]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View style={[styles.bar, {opacity}]} pointerEvents="box-none">
      <Text style={styles.message}>{message}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={styles.action}>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorsV2.inverseSurface,
    borderRadius: radiusV2.card,
    paddingVertical: spaceV2.md,
    paddingLeft: spaceV2.lg,
    paddingRight: spaceV2.sm,
    gap: spaceV2.sm,
  },
  message: {
    flex: 1,
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
    color: colorsV2.onInverseSurface,
    includeFontPadding: false,
  },
  action: {
    paddingHorizontal: spaceV2.md,
    paddingVertical: spaceV2.sm,
  },
  actionLabel: {
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.semibold,
    color: colorsV2.accent,
    includeFontPadding: false,
  },
});

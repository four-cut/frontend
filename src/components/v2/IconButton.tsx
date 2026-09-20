/**
 * 상단 바에 놓는 아이콘 버튼. (UI-V2)
 *
 * 인쇄·공유처럼 늘 필요하지는 않은 동작을 아래 버튼 더미에서 빼내 여기로
 * 올린다. 아이콘은 24 로 그리고 터치 영역만 48 로 넓힌다 —
 * Material 48dp, HIG 44pt 를 둘 다 만족한다.
 */
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet} from 'react-native';

import {colorsV2, radiusV2, touchV2} from '../../theme/uiV2';
import VectorIcon, {type IconName} from './VectorIcon';

type Props = {
  name: IconName;
  /** 아이콘만 있는 버튼은 읽어 줄 이름이 없다. 반드시 넣는다. */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
};

export default function IconButton({
  name,
  accessibilityLabel,
  onPress,
  disabled,
  busy,
}: Props) {
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{disabled: !!inactive, busy: !!busy}}
      disabled={inactive}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
      ]}>
      {busy ? (
        <ActivityIndicator color={colorsV2.textPrimary} />
      ) : (
        <VectorIcon name={name} color={colorsV2.textPrimary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touchV2.min,
    height: touchV2.min,
    borderRadius: radiusV2.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colorsV2.surfaceMuted,
  },
  // Material 은 비활성 요소를 38% 로 흐린다. 완전히 지우면 있었는지조차
  // 알 수 없어서, 자리는 남기고 누를 수 없다는 것만 보인다.
  inactive: {
    opacity: 0.38,
  },
});

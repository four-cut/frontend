/**
 * 위계가 있는 버튼. (UI-V2)
 *
 * 지금은 모든 동작이 같은 검정 풀폭 버튼이라 무엇이 주된 행동인지 알 수 없고,
 * 버튼만 다섯 개까지 쌓여 결과물이 밀려난다. Material 의 filled/tonal/text
 * 세 단계를 그대로 가져와서, 한 화면에 filled 는 하나만 둔다.
 */
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet} from 'react-native';

import {Text} from '../AppText';
import {
  colorsV2,
  fontsV2,
  radiusV2,
  sizeV2,
  spaceV2,
  touchV2,
} from '../../theme/uiV2';

type Variant = 'filled' | 'tonal' | 'text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  busy?: boolean;
};

export default function ActionButton({
  label,
  onPress,
  variant = 'filled',
  disabled,
  busy,
}: Props) {
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: !!inactive, busy: !!busy}}
      disabled={inactive}
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        variant === 'filled' && styles.filled,
        variant === 'tonal' && styles.tonal,
        variant === 'text' && styles.text,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
      ]}>
      {busy ? (
        <ActivityIndicator
          color={variant === 'filled' ? colorsV2.white : colorsV2.textPrimary}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'filled' ? styles.labelOnDark : styles.labelOnLight,
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radiusV2.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spaceV2.xl,
  },
  filled: {
    height: touchV2.buttonPrimary,
    backgroundColor: colorsV2.black,
  },
  tonal: {
    height: touchV2.buttonSecondary,
    backgroundColor: colorsV2.surfaceMuted,
  },
  text: {
    height: touchV2.buttonSecondary,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  inactive: {
    opacity: 0.38,
  },
  label: {
    fontSize: sizeV2.button,
    fontFamily: fontsV2.semibold,
    includeFontPadding: false,
  },
  labelOnDark: {
    color: colorsV2.white,
  },
  labelOnLight: {
    color: colorsV2.textPrimary,
  },
});

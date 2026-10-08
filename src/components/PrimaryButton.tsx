import React from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {Text} from './AppText';

import {colors, fonts, fontSize} from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export default function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
  labelStyle,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.3,
  },
  label: {
    color: colors.white,
    fontSize: fontSize.button,
    // 서체가 바뀌어도(언어 전환) 라벨 상자 높이가 같도록 고정한다.
    lineHeight: 24,
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
});

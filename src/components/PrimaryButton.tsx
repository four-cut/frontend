import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {colors, fonts, fontSize} from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function PrimaryButton({label, onPress, style}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.button, pressed && styles.pressed, style]}>
      <Text style={styles.label}>{label}</Text>
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
  label: {
    color: colors.white,
    fontSize: fontSize.button,
    fontWeight: '700',
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
});

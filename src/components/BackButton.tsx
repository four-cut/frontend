import React from 'react';
import {Image, Pressable, StyleSheet} from 'react-native';

import {images} from '../assets';
import {useT} from '../i18n';
import {colors} from '../theme';

type Props = {
  onPress: () => void;
};

export default function BackButton({onPress}: Props) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.common.back}
      hitSlop={14}
      onPress={onPress}
      style={({pressed}) => [styles.button, pressed && styles.pressed]}>
      <Image
        source={images.chevronBack}
        style={styles.icon}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: colors.textPrimary,
  },
});

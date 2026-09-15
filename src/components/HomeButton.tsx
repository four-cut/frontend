import React from 'react';
import {Image, Pressable, StyleSheet} from 'react-native';

import {images} from '../assets';
import {useT} from '../i18n';
import {colors} from '../theme';

type Props = {
  onPress: () => void;
};

/** 촬영 플로우를 끝내고 홈으로 돌아가는 버튼. (SR-06 / SR-07) */
export default function HomeButton({onPress}: Props) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.common.home}
      hitSlop={14}
      onPress={onPress}
      style={({pressed}) => [styles.button, pressed && styles.pressed]}>
      <Image source={images.home} style={styles.icon} resizeMode="contain" />
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
    width: 26,
    height: 26,
    tintColor: colors.textPrimary,
  },
});

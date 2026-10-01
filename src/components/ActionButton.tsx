import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {Text} from './AppText';

import type {IconName} from '../assets/icons';
import {colors, fonts} from '../theme';
import SvgIcon from './SvgIcon';

type Props = {
  label: string;
  icon?: IconName;
  /** filled 는 검정 바탕(주요 동작), outline 은 흰 바탕 + 검은 테두리. */
  variant?: 'filled' | 'outline';
  onPress?: () => void;
  disabled?: boolean;
  /**
   * 라벨 글꼴만 바꿔 끼울 자리. (UI-V2)
   *
   * 결과 화면에서 Pretendard 를 시험하는데 라벨이 이 컴포넌트 안에 갇혀
   * 있었다. 안 넘기면 지금까지와 똑같이 그린다.
   */
  labelStyle?: StyleProp<TextStyle>;
};

const ICON_SIZE = 20;

/**
 * 결과 화면의 인쇄·저장·QR 버튼. 셋을 한 줄에 나란히 두는 알약형이다.
 *
 * 문구나 아이콘이 바뀌면(저장 → 저장됨 → 공유) 살짝 튀어오르게 해서 바뀐 걸
 * 알아채게 한다. 같은 자리에서 조용히 글자만 바뀌면 눈치채기 어렵다.
 */
export default function ActionButton({
  label,
  icon,
  variant = 'outline',
  onPress,
  disabled,
  labelStyle,
}: Props) {
  const filled = variant === 'filled';
  const foreground = filled ? colors.white : colors.black;

  const scale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const mounted = useRef(false);

  useEffect(() => {
    // 처음 그릴 때는 튀지 않는다 — 바뀔 때만 알린다.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    scale.setValue(0.88);
    contentOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [label, icon, scale, contentOpacity]);

  return (
    <Animated.View style={[styles.slot, {transform: [{scale}]}]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{disabled: !!disabled}}
        disabled={disabled}
        onPress={onPress}
        style={({pressed}) => [
          styles.button,
          filled ? styles.filled : styles.outline,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}>
        <Animated.View style={[styles.content, {opacity: contentOpacity}]}>
          {icon ? (
            <SvgIcon name={icon} size={ICON_SIZE} color={foreground} />
          ) : null}
          <Text
            style={[styles.label, labelStyle, {color: foreground}]}
            numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  button: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  filled: {
    backgroundColor: colors.black,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.3,
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
});

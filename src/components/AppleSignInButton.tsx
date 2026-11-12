import React from 'react';
import {Pressable, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import {Text} from './AppText';

import {useT} from '../i18n';
import {colors, CONTENT_MAX_WIDTH, fonts, fontSize} from '../theme';

/**
 * 버튼 높이. 카카오·구글 버튼(PrimaryButton)과 같아야 한다 — 애플 지침이
 * "Make a Sign in with Apple button no smaller than other sign-in buttons" 라
 * 더 작게 둘 수 없다.
 */
const HEIGHT = 60;

/**
 * 글자 크기. 카카오·구글 버튼과 같은 값을 쓴다.
 *
 * 애플 지침은 글자 크기를 버튼 높이의 43%(여기서는 26pt)로 두라고 한다.
 * 그대로 따르면 이 버튼만 글자가 커져서 나란히 놓인 세 버튼이 따로 놀았다.
 * 높이를 줄여 비율을 맞추는 방법도 안 된다 — 애플 로그인 버튼을 다른 로그인
 * 버튼보다 작게 둘 수 없다.
 *
 * 그래서 비율 대신 다른 버튼과의 통일을 택했다. 바꾸면 안 되는 것(문구,
 * 색, 모양, 최소 크기)은 그대로 지켰으므로 버튼이 애플 것으로 읽히는 데는
 * 문제가 없다. 심사에서 지적되면 이 값만 Math.round(HEIGHT * 0.43) 으로
 * 되돌리면 된다.
 */
const FONT_SIZE = fontSize.button;

/** 글자와 오른쪽 가장자리 사이 최소 여백은 버튼 폭의 8% 이상이어야 한다. */
const SIDE_PADDING_RATIO = 0.08;

type Props = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Apple 로그인 버튼.
 *
 * 애플이 주는 네이티브 버튼(AppleButton)은 글자와 서체를 바꿀 수 없어서
 * 이 앱의 다른 버튼과 서체가 달라 보였다. 애플은 커스텀 버튼을 허용하고
 * 바꿔도 되는 것을 명시해 뒀다 — "Title font. You can also adjust the font's
 * weight and size."
 *
 * 대신 바꾸면 안 되는 것이 있다. 지키는 선에서만 손댔다.
 *
 * - 문구는 「Apple로 계속하기」 계열 셋 중 하나만 쓴다. 번역도 애플이 쓰는 말로 둔다.
 * - 로고와 글자는 순수 검정 아니면 흰색만. 브랜드 색을 섞을 수 없다.
 * - 로고+글자 버튼은 항상 직사각형이다.
 *
 * 커스텀 버튼은 심사에서 따로 본다 — "App Review evaluates all custom Sign in
 * with Apple buttons". 비율과 문구를 벗어나지 않게 상수로 묶어 뒀다.
 */
export default function AppleSignInButton({onPress, disabled, style}: Props) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.login.apple}
      accessibilityState={{disabled: !!disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {/* U+F8FF 는 애플 기기의 시스템 서체가 가진 애플 로고다. 직접 그린 것이
          아니므로 "never create a custom Apple logo" 에 걸리지 않는다. 다만
          애플이 권하는 건 Apple Design Resources 에서 받은 자산이라, 그 파일을
          받으면 이 Text 를 Image 로 바꾸는 게 낫다. */}
      <Text style={styles.logo} fixedSize>
        {''}
      </Text>
      {/* 태블릿에서 글자만 커지면 43% 비율이 깨진다. 버튼 높이는 고정이므로
          글자도 고정한다. */}
      <Text style={styles.label} fixedSize numberOfLines={1}>
        {t.login.apple}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // PrimaryButton 과 같은 폭·높이·모서리.
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    height: HEIGHT,
    borderRadius: 12,
    // 카카오·구글 버튼과 같은 색. 애플은 바탕이 "black or white" 로 읽히기만
    // 하면 된다고 하므로 순검정보다 살짝 누그러뜨린 이 값도 된다.
    backgroundColor: colors.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CONTENT_MAX_WIDTH * SIDE_PADDING_RATIO,
    gap: 8,
  },
  logo: {
    color: colors.white,
    fontSize: FONT_SIZE,
    lineHeight: FONT_SIZE * 1.2,
    includeFontPadding: false,
  },
  label: {
    color: colors.white,
    fontSize: FONT_SIZE,
    lineHeight: FONT_SIZE * 1.2,
    fontFamily: fonts.display,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.3,
  },
});

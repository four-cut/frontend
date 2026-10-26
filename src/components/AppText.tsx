import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  useWindowDimensions,
} from 'react-native';

import {useLocale} from '../i18n';
import {isTabletSize, localeFontFamily, TABLET_TEXT_SCALE} from '../theme';

/**
 * 언어에 맞는 서체로 그려 주는 Text.
 *
 * 화면마다 StyleSheet.create 로 잡아 둔 fontFamily 는 모듈이 처음 로드될 때
 * 값이 굳어서, 언어를 바꿔도 다시 계산되지 않는다. 그렇다고 스타일 50여
 * 군데를 전부 훅으로 바꾸면 화면 파일을 다 건드려야 한다. 대신 Text 를 한
 * 겹 감싸 그릴 때마다 서체만 갈아 끼운다 — 화면 파일은 import 한 줄만
 * 바뀌고, 언어를 바꾸면 그 자리에서 서체까지 따라 바뀐다.
 *
 * 스타일에 fontFamily 가 아예 없는 Text 는 건드리지 않는다. 프레임 편집기의
 * 텍스트 요소처럼 일부러 시스템 서체 + fontWeight 로 그리는 자리가 있는데,
 * 거기에 fontFamily 를 끼얹으면 (typography.ts 에 적어 둔 대로) 안드로이드가
 * 굵기를 못 찾고 조용히 기본 고딕으로 되돌아간다.
 */
export function Text({
  style,
  fixedSize,
  ...rest
}: TextProps & {
  /**
   * 태블릿에서도 글자를 키우지 않는다. 프레임 캔버스의 텍스트처럼 둘레
   * 크기에 맞춰 계산한 글자에 쓴다 — 키우면 결과물과 크기가 달라진다.
   */
  fixedSize?: boolean;
}) {
  const locale = useLocale();
  const {width, height} = useWindowDimensions();
  // 태블릿은 글자를 조금 키운다(theme/screen.ts). 화면마다 따로 잡지 않고
  // 여기서 한 번에 키워야 화면 안의 글자끼리 비율이 그대로 남는다.
  const scale =
    !fixedSize && isTabletSize(width, height) ? TABLET_TEXT_SCALE : 1;
  if (locale === 'ko' && scale === 1) {
    return <RNText style={style} {...rest} />;
  }
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const override: {
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
  } = {};
  if (locale !== 'ko' && flat?.fontFamily) {
    override.fontFamily = localeFontFamily(locale, flat.fontFamily);
  }
  if (scale !== 1 && flat?.fontSize) {
    override.fontSize = flat.fontSize * scale;
    if (flat.lineHeight) {
      override.lineHeight = flat.lineHeight * scale;
    }
  }
  return (
    <RNText
      style={Object.keys(override).length > 0 ? [style, override] : style}
      {...rest}
    />
  );
}

/**
 * Text 와 같은 이유로 감싼 TextInput.
 *
 * 프레임 편집기가 방금 만든 입력칸에 바로 포커스를 주려고 ref 를 잡으므로
 * forwardRef 로 넘겨준다.
 */
export const TextInput = React.forwardRef<
  React.ComponentRef<typeof RNTextInput>,
  TextInputProps
>(function AppTextInput({style, ...rest}, ref) {
  const locale = useLocale();
  const flat =
    locale === 'ko'
      ? undefined
      : (StyleSheet.flatten(style) as TextStyle | undefined);
  return (
    <RNTextInput
      ref={ref}
      style={
        flat?.fontFamily
          ? [style, {fontFamily: localeFontFamily(locale, flat.fontFamily)}]
          : style
      }
      {...rest}
    />
  );
});

import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import {useLocale} from '../i18n';
import {LOCALE_FONT} from '../theme';

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
export function Text({style, ...rest}: TextProps) {
  const locale = useLocale();
  if (locale === 'ko') {
    return <RNText style={style} {...rest} />;
  }
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (!flat?.fontFamily) {
    return <RNText style={style} {...rest} />;
  }
  return (
    <RNText style={[style, {fontFamily: LOCALE_FONT[locale]}]} {...rest} />
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
        flat?.fontFamily ? [style, {fontFamily: LOCALE_FONT[locale]}] : style
      }
      {...rest}
    />
  );
});

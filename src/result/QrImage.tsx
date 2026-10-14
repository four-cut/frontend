import React, {useState} from 'react';
import {ActivityIndicator, Image, Pressable, StyleSheet, View} from 'react-native';

import {Text} from '../components/AppText';
import {useT} from '../i18n';
import {colors} from '../theme';
import {fontsV2, lineV2, sizeV2} from '../theme/typographyV2';

type Props = {uri: string; size: number};

/**
 * 서버가 만든 QR 이미지.
 *
 * 받아 오는 동안이나 실패했을 때 전에는 빈 흰 칸만 보였다. 손님은 QR 이
 * 원래 없는 건지 기다려야 하는지 알 수 없다. 불러오는 중이면 표시를 띄우고,
 * 실패하면 다시 불러올 수 있게 한다.
 */
export default function QrImage({uri, size}: Props) {
  const t = useT();
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>(
    'loading',
  );
  // key 를 바꿔 Image 를 새로 만들어야 같은 주소를 다시 받아 온다.
  const [attempt, setAttempt] = useState(0);

  return (
    <View style={[styles.box, {width: size, height: size}]}>
      {state === 'failed' ? (
        <View style={styles.center}>
          <Text style={styles.message}>{t.result.qrImageFailed}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setState('loading');
              setAttempt(n => n + 1);
            }}
            style={styles.retry}>
            <Text style={styles.retryText}>{t.result.qrImageRetry}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Image
            key={attempt}
            source={{uri}}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityLabel={t.result.qrTitle}
            onLoad={() => setState('loaded')}
            onError={() => setState('failed')}
          />
          {state === 'loading' ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.textPrimary} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  message: {
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
    color: colors.textMuted,
    textAlign: 'center',
    includeFontPadding: false,
  },
  retry: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryText: {
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.semibold,
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    includeFontPadding: false,
  },
});

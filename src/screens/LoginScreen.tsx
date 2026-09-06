import React, {useCallback} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {images} from '../assets';
import {useSocialSignIn} from '../auth';
import PrimaryButton from '../components/PrimaryButton';
import type {AuthGateTarget, RootNavigation, RootStackParamList} from '../navigation/types';
import {colors, fonts, fontSize} from '../theme';

/**
 * 로그인 화면.
 *
 * 촬영·프레임 만들기·갤러리는 로그인해야 들어갈 수 있다. 그 동작을 누르면
 * 이 화면이 뜨고, 로그인을 마치면 원래 가려던 곳으로 이어 간다.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Login'>>();
  const {start, pending, error} = useSocialSignIn();

  const next = route.params?.next;

  /** 로그인을 마치고 원래 가려던 곳으로 보낸다. */
  const goNext = useCallback(
    (target: AuthGateTarget | undefined) => {
      switch (target) {
        case 'Guide':
          navigation.replace('MainTabs', {
            screen: 'Shoot',
            params: {screen: 'Guide'},
          });
          return;
        case 'FrameBuilder':
          navigation.replace('FrameBuilder');
          return;
        case 'Gallery':
          navigation.replace('MainTabs', {screen: 'Gallery'});
          return;
        default:
          navigation.goBack();
      }
    },
    [navigation],
  );

  const signIn = useCallback(
    async (provider: 'kakao' | 'google') => {
      const result = await start(provider);
      // 취소하면 null 이 온다 — 화면을 그대로 두고 다시 고를 수 있게 한다.
      if (result) {
        goNext(next);
      }
    },
    [start, goNext, next],
  );

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16},
      ]}>
      <View style={styles.hero}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.wordmark}>찍고갈래?</Text>
        <Text style={styles.guide}>로그인하고 시작해요</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={pending === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
          onPress={() => signIn('kakao')}
        />
        <PrimaryButton
          label={pending === 'google' ? '연결 중…' : '구글로 시작하기'}
          onPress={() => signIn('google')}
          style={styles.secondAction}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 240,
    height: 232,
  },
  wordmark: {
    fontSize: fontSize.wordmark,
    lineHeight: fontSize.wordmark * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  guide: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  actions: {
    paddingHorizontal: 16,
  },
  secondAction: {
    marginTop: 10,
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#D8342B',
    textAlign: 'center',
  },
});

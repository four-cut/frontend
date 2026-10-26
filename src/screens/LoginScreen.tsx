import React, {useCallback, useState} from 'react';
import {Image, Linking, Pressable, StyleSheet, View} from 'react-native';
import {Text} from '../components/AppText';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {images} from '../assets';
import {useSocialSignIn} from '../auth';
import PrimaryButton from '../components/PrimaryButton';
import {PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL} from '../config/legal';
import {LOCALES, LOCALE_LABEL, setLocale, useLocale, useT} from '../i18n';
import type {
  AuthGateTarget,
  RootNavigation,
  RootStackParamList,
} from '../navigation/types';
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
  const t = useT();
  const locale = useLocale();

  const next = route.params?.next;

  // 처리방침에 "만 14세 미만은 가입할 수 없다"고 적었다. 적어 두기만 하면
  // 지켜지지 않으므로, 로그인 전에 나이와 약관 동의를 확인받는다.
  const [agreed, setAgreed] = useState(false);
  const legalLinks = [
    {label: t.settings.terms, url: TERMS_OF_SERVICE_URL},
    {label: t.settings.privacy, url: PRIVACY_POLICY_URL},
  ].filter((item): item is {label: string; url: string} => item.url !== null);

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
        case 'AlbumFlow':
          navigation.replace('CaptureFlow', {
            screen: 'LayoutSelect',
            params: {source: 'album'},
          });
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
      {/* 일본어 기기라면 자동으로 일본어로 떠 있지만, 로그인 전에도 바꿀 수
          있어야 한다 — 로그인하고 나서야 설정에 닿을 수 있으면 늦다. */}
      <View style={styles.localeRow}>
        {LOCALES.map(option => {
          const selected = option === locale;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              accessibilityLabel={LOCALE_LABEL[option]}
              onPress={() => setLocale(option)}
              hitSlop={6}
              style={[styles.localeChip, selected && styles.localeChipActive]}>
              <Text
                style={[
                  styles.localeChipText,
                  selected && styles.localeChipTextActive,
                ]}>
                {LOCALE_LABEL[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.hero}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        {/* HomeScreen 과 같은 워드마크 — 언어마다 정해 둔 브랜드명. */}
        <Text style={styles.wordmark}>{t.common.wordmark}</Text>
        <Text style={styles.guide}>{t.login.guide}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{checked: agreed}}
          accessibilityLabel={t.login.consent}
          onPress={() => setAgreed(value => !value)}
          hitSlop={6}
          style={styles.consentRow}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.consentText}>{t.login.consent}</Text>
        </Pressable>
        {legalLinks.length > 0 ? (
          <View style={styles.legalRow}>
            {legalLinks.map(item => (
              <Pressable
                key={item.url}
                accessibilityRole="link"
                onPress={() => Linking.openURL(item.url)}
                hitSlop={6}>
                <Text style={styles.legalLink}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <PrimaryButton
          label={pending === 'kakao' ? t.login.connecting : t.login.kakao}
          disabled={!agreed}
          onPress={() => signIn('kakao')}
        />
        <PrimaryButton
          label={pending === 'google' ? t.login.connecting : t.login.google}
          disabled={!agreed}
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
  localeRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 16,
  },
  localeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  localeChipActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  localeChipText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  localeChipTextActive: {
    color: colors.background,
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.textPrimary,
  },
  checkmark: {
    color: colors.background,
    fontSize: 14,
    lineHeight: 18,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  legalRow: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 32,
    marginBottom: 14,
  },
  legalLink: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#D8342B',
    textAlign: 'center',
  },
});

import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, View, Text as RNText} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {images} from '../assets';
import LanguageSheet from '../components/LanguageSheet';
import PrimaryButton from '../components/PrimaryButton';
import type {RootNavigation, ShootNavigation} from '../navigation/types';
import {useT} from '../i18n';
import {useAuthGate} from '../navigation/useAuthGate';
import {colors, fonts, fontSize} from '../theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ShootNavigation>();
  const gate = useAuthGate();
  const t = useT();
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.settings.open}
          hitSlop={14}
          onPress={() => setLanguageOpen(true)}
          style={({pressed}) => [styles.settings, pressed && styles.pressed]}>
          <Image
            source={images.settings}
            style={styles.settingsIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        {/* 워드마크는 브랜드명이라 일본어에서도 한국어 그대로 둔다.
            Zen Maru Gothic 에는 한글이 없어서 react-native 의 Text 로 그린다. */}
        <RNText style={styles.wordmark}>찍고갈래?</RNText>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={t.home.shoot}
          onPress={() => gate('Guide', () => navigation.navigate('Guide'))}
        />
        <PrimaryButton
          label={t.home.makeFrame}
          onPress={() =>
            gate('FrameBuilder', () =>
              navigation.getParent<RootNavigation>()?.navigate('FrameBuilder'),
            )
          }
          style={styles.secondAction}
        />
      </View>

      <LanguageSheet
        visible={languageOpen}
        onClose={() => setLanguageOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  settings: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
  settingsIcon: {
    width: 26,
    height: 26,
    tintColor: colors.textMuted,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 310,
    height: 300,
  },
  wordmark: {
    fontSize: fontSize.wordmark,
    lineHeight: fontSize.wordmark * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  secondAction: {
    marginTop: 10,
  },
});

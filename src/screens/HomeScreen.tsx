import React, {useEffect, useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {Text} from '../components/AppText';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {prefetchBasicFramePreviews} from '../api/frames';
import {images} from '../assets';
import LanguageDialog from '../components/LanguageDialog';
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

  // 베이직 프레임 썸네일은 처음 그릴 때 몇 초 걸린다. 촬영을 마치고 프레임을
  // 고를 때 그리면 사진 합성과 겹쳐서 목록이 한참 늦게 뜨므로, 홈이 뜨고
  // 화면이 자리 잡은 뒤에 미리 그려 둔다. 앱이 켜져 있는 동안 한 번만 그린다.
  useEffect(() => {
    const timer = setTimeout(prefetchBasicFramePreviews, 1500);
    return () => clearTimeout(timer);
  }, []);

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
        {/* 워드마크는 언어마다 정해 둔 브랜드명을 쓴다(한국어 "찍고갈래?",
            일본어 「撮ってく？」). 서체는 AppText 가 언어에 맞게 고른다. */}
        <Text style={styles.wordmark}>{t.common.wordmark}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={t.home.shoot}
          onPress={() => gate('Guide', () => navigation.navigate('Guide'))}
        />
        <PrimaryButton
          label={t.home.fromAlbum}
          onPress={() =>
            gate('AlbumFlow', () =>
              navigation.getParent<RootNavigation>()?.navigate('CaptureFlow', {
                screen: 'LayoutSelect',
                params: {source: 'album'},
              }),
            )
          }
          style={styles.secondAction}
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

      <LanguageDialog
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

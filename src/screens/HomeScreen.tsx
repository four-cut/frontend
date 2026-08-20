import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {images} from '../assets';
import PrimaryButton from '../components/PrimaryButton';
import {colors, fonts, fontSize} from '../theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.hero}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.wordmark}>찍고갈래?</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="촬영하기" onPress={() => {}} />
        <PrimaryButton
          label="프레임 만들기"
          onPress={() => {}}
          style={styles.secondAction}
        />
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
    width: 310,
    height: 300,
  },
  wordmark: {
    fontSize: fontSize.wordmark,
    lineHeight: fontSize.wordmark * 1.2,
    fontWeight: '900',
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

import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import HomeButton from '../components/HomeButton';
import PrimaryButton from '../components/PrimaryButton';
import StripPreview from '../components/StripPreview';
import type {CaptureNavigation, RootNavigation} from '../navigation/types';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors, fonts, fontSize} from '../theme';

/** 시트가 화면 폭에서 차지하는 비율. 시안(Frame-2)에서 가져왔다. */
const SHEET_WIDTH_RATIO = 0.34;
const THUMB_HEIGHT = 96;

export default function PhotoSelectScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const {width} = useWindowDimensions();
  const {layout, cutCount, shots, selection, toggleSelection} =
    useCaptureSession();

  if (!layout) {
    return null;
  }

  const chosen = selection.map(index => shots[index]);
  const complete = selection.length === cutCount;
  const thumbWidth = layout === 'portrait' ? THUMB_HEIGHT * 0.66 : THUMB_HEIGHT * 1.6;

  const goHome = () => {
    navigation.getParent<RootNavigation>()?.navigate('MainTabs', {
      screen: 'Shoot',
      params: {screen: 'Home'},
    });
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <HomeButton onPress={goHome} />
      </View>

      <Text style={styles.title}>사진을 선택해주세요</Text>

      <View style={styles.previewArea}>
        <StripPreview
          layout={layout}
          photos={chosen}
          width={width * SHEET_WIDTH_RATIO}
        />
      </View>

      <Text style={styles.counter}>
        사진 선택 ({selection.length}/{cutCount})
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbs}>
        {shots.map((uri, index) => {
          const order = selection.indexOf(index);
          const picked = order >= 0;

          return (
            <Pressable
              key={uri}
              accessibilityRole="button"
              accessibilityLabel={`촬영본 ${index + 1}${picked ? `, ${order + 1}번으로 선택됨` : ''}`}
              accessibilityState={{selected: picked}}
              onPress={() => toggleSelection(index)}
              style={[
                styles.thumb,
                {width: thumbWidth, height: THUMB_HEIGHT},
                picked && styles.thumbPicked,
              ]}>
              <Image source={{uri}} style={styles.thumbImage} resizeMode="cover" />
              {picked ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>{order + 1}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        <PrimaryButton
          label="다음"
          disabled={!complete}
          onPress={() => navigation.navigate('LogoSelect')}
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
  header: {
    paddingHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: fontSize.screenTitle,
    lineHeight: fontSize.screenTitle * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  thumbs: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumb: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.slot,
  },
  thumbPicked: {
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});

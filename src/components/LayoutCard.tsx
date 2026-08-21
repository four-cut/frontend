import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {CUT_COUNT, type CaptureLayout} from '../state/CaptureSessionContext';
import {colors, fonts, fontSize} from '../theme';

// 시안(Frame-8)의 카드 안에는 출력물을 축소한 흰 시트가 들어간다.
// 시트는 레이아웃과 무관하게 세로이고, 사진 방향만 달라진다.
const SHEET_WIDTH = 118;
const SHEET_HEIGHT = 214;
const SHEET_PADDING = 8;
const SLOT_GAP = 3;
const CONTENT_WIDTH = SHEET_WIDTH - SHEET_PADDING * 2;

/** 세로 사진 2×2 */
const PORTRAIT_SLOT_WIDTH = (CONTENT_WIDTH - SLOT_GAP) / 2;
const PORTRAIT_SLOT_HEIGHT = PORTRAIT_SLOT_WIDTH / 0.66;

/** 가로 사진 3단 적층 */
const LANDSCAPE_SLOT_HEIGHT = CONTENT_WIDTH / 2.25;

type Props = {
  layout: CaptureLayout;
  label: string;
  onPress: () => void;
};

export default function LayoutCard({layout, label, onPress}: Props) {
  const isPortrait = layout === 'portrait';
  const slots = Array.from({length: CUT_COUNT[layout]}, (_, index) => index);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 레이아웃`}
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.sheet}>
        <View style={isPortrait ? styles.portraitSlots : styles.landscapeSlots}>
          {slots.map(index => (
            <View
              key={index}
              style={isPortrait ? styles.portraitSlot : styles.landscapeSlot}
            />
          ))}
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.black,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
  },
  pressed: {
    opacity: 0.85,
  },
  sheet: {
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
    backgroundColor: colors.white,
    padding: SHEET_PADDING,
  },
  portraitSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SLOT_GAP,
  },
  portraitSlot: {
    width: PORTRAIT_SLOT_WIDTH,
    height: PORTRAIT_SLOT_HEIGHT,
    backgroundColor: colors.slot,
  },
  landscapeSlots: {
    gap: SLOT_GAP,
  },
  landscapeSlot: {
    width: CONTENT_WIDTH,
    height: LANDSCAPE_SLOT_HEIGHT,
    backgroundColor: colors.slot,
  },
  label: {
    color: colors.white,
    fontSize: fontSize.cardLabel,
    fontWeight: '700',
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
});

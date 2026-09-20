/**
 * 프레임 고르기 바텀시트. (UI-V2)
 *
 * 전에는 결과 화면 아래에 가로 스크롤 줄로 붙어 있었다. 자리를 계속 차지하면서도
 * 썸네일이 작아 눌러 보기 전에는 어떤 모양인지 알 수 없었고, 고른 뒤에도
 * 표시가 약해 바뀐 줄 모르는 문제가 있었다.
 *
 * Material 의 modal bottom sheet(= iOS 의 medium detent 시트)로 옮겨서
 * 평소에는 자리를 안 먹고, 열었을 때는 넓게 본다.
 * - 3열 그리드. 썸네일은 실제 스트립 비율로 두고, 미리보기가 없는 프레임은
 *   슬롯 모양을 그려서 눌러 보지 않아도 형태를 알 수 있게 한다.
 * - 고른 항목은 강조색 테두리와 체크 배지로 확실히 구분한다.
 */
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Text} from '../AppText';
import {
  colorsV2,
  fontsV2,
  lineV2,
  radiusV2,
  sizeV2,
  spaceV2,
  touchV2,
} from '../../theme/uiV2';
import {STRIP_ASPECT} from '../../capture/stripLayout';
import type {FrameSummary} from '../../api/frames';
import type {CaptureLayout} from '../../state/CaptureSessionContext';
import VectorIcon from './VectorIcon';

type Props = {
  visible: boolean;
  onClose: () => void;
  frames: FrameSummary[] | null;
  selectedId: number | null;
  onSelect: (frame: FrameSummary) => void;
  layout: CaptureLayout;
  title: string;
  emptyLabel: string;
  closeLabel: string;
  /** "베이직 세로형 프레임 적용" 같은 읽어 줄 문구 */
  itemA11yLabel: (name: string) => string;
};

/** 미리보기 이미지가 없을 때 그리는 슬롯 자리. 촬영 방향에 따라 2×2 / 3단. */
function SlotShape({layout}: {layout: CaptureLayout}) {
  if (layout === 'portrait') {
    return (
      <View style={styles.slotBody}>
        {[0, 1].map(row => (
          <View key={row} style={styles.slotRow}>
            <View style={styles.slotCell} />
            <View style={styles.slotCell} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.slotBody}>
      {[0, 1, 2].map(row => (
        <View key={row} style={[styles.slotRow, styles.slotRowWide]}>
          <View style={styles.slotCell} />
        </View>
      ))}
    </View>
  );
}

export default function FrameSheet({
  visible,
  onClose,
  frames,
  selectedId,
  onSelect,
  layout,
  title,
  emptyLabel,
  closeLabel,
  itemA11yLabel,
}: Props) {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();

  // 3열. 스트립은 세로로 긴 비율(1:1.8)이라 2열로 두면 썸네일 하나가
  // 화면을 거의 다 먹어서 한 번에 한 개밖에 못 본다.
  const COLUMNS = 3;
  const columnWidth =
    (width - spaceV2.lg * 2 - spaceV2.md * (COLUMNS - 1)) / COLUMNS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      {/* 시트 밖을 누르면 닫힌다. 시트 자체는 눌러도 닫히면 안 된다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        style={styles.scrim}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {maxHeight: height * 0.7, paddingBottom: insets.bottom + spaceV2.lg},
        ]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={styles.closeButton}>
            <VectorIcon name="close" color={colorsV2.textPrimary} size={20} />
          </Pressable>
        </View>

        {frames === null ? (
          <ActivityIndicator
            color={colorsV2.textPrimary}
            style={styles.loading}
          />
        ) : frames.length === 0 ? (
          <Text style={styles.empty}>{emptyLabel}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {frames.map(item => {
              const selected = item.frameId === selectedId;
              return (
                <Pressable
                  key={item.frameId}
                  accessibilityRole="button"
                  accessibilityLabel={itemA11yLabel(item.name)}
                  accessibilityState={{selected}}
                  onPress={() => onSelect(item)}
                  style={[styles.item, {width: columnWidth}]}>
                  <View
                    style={[
                      styles.thumb,
                      {height: columnWidth * STRIP_ASPECT},
                      selected && styles.thumbSelected,
                    ]}>
                    {item.previewImageUrl ? (
                      <Image
                        source={{uri: item.previewImageUrl}}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <SlotShape layout={layout} />
                    )}

                    {selected ? (
                      <View style={styles.badge}>
                        <VectorIcon
                          name="check"
                          color={colorsV2.onAccent}
                          size={16}
                          strokeWidth={2.5}
                        />
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[styles.label, selected && styles.labelSelected]}
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colorsV2.scrim,
  },
  sheet: {
    backgroundColor: colorsV2.background,
    borderTopLeftRadius: radiusV2.sheet,
    borderTopRightRadius: radiusV2.sheet,
    paddingHorizontal: spaceV2.lg,
  },
  // 끌어 내릴 수 있다는 것을 알려 주는 손잡이. 실제 제스처는 Modal 이 맡는다.
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: radiusV2.pill,
    backgroundColor: colorsV2.imageBorder,
    marginTop: spaceV2.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spaceV2.lg,
    marginBottom: spaceV2.md,
  },
  title: {
    fontSize: sizeV2.sectionTitle,
    lineHeight: lineV2.sectionTitle,
    fontFamily: fontsV2.bold,
    color: colorsV2.textPrimary,
    includeFontPadding: false,
  },
  closeButton: {
    width: touchV2.min,
    height: touchV2.min,
    alignItems: 'center',
    justifyContent: 'center',
    // 터치 영역은 48 이지만 아이콘은 오른쪽 끝에 맞춘다.
    marginRight: -spaceV2.md,
  },
  loading: {
    marginVertical: spaceV2.xxl,
  },
  empty: {
    fontSize: sizeV2.body,
    lineHeight: lineV2.body,
    fontFamily: fontsV2.regular,
    color: colorsV2.textMuted,
    textAlign: 'center',
    marginVertical: spaceV2.xxl,
    includeFontPadding: false,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spaceV2.md,
    paddingBottom: spaceV2.lg,
  },
  item: {},
  thumb: {
    borderRadius: radiusV2.card,
    borderWidth: 1,
    borderColor: colorsV2.imageBorder,
    backgroundColor: colorsV2.white,
    overflow: 'hidden',
  },
  thumbSelected: {
    borderWidth: 2,
    borderColor: colorsV2.accent,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  slotBody: {
    flex: 1,
    padding: spaceV2.sm,
    gap: spaceV2.xs,
  },
  slotRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spaceV2.xs,
  },
  // 가로형은 한 줄에 한 칸이라 폭을 다 쓴다.
  slotRowWide: {
    flexDirection: 'column',
  },
  slotCell: {
    flex: 1,
    borderRadius: spaceV2.xs,
    backgroundColor: colorsV2.slot,
  },
  badge: {
    position: 'absolute',
    top: spaceV2.sm,
    right: spaceV2.sm,
    width: 24,
    height: 24,
    borderRadius: radiusV2.pill,
    backgroundColor: colorsV2.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: spaceV2.sm,
    fontSize: sizeV2.caption,
    lineHeight: lineV2.caption,
    fontFamily: fontsV2.regular,
    color: colorsV2.textMuted,
    includeFontPadding: false,
  },
  labelSelected: {
    fontFamily: fontsV2.semibold,
    color: colorsV2.textPrimary,
  },
});

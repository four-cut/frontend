import React, {useState} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from '../components/AppText';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useOrientation} from 'react-native-vision-camera';

import HomeButton from '../components/HomeButton';
import PrimaryButton from '../components/PrimaryButton';
import StripPreview from '../components/StripPreview';
import {useT} from '../i18n';
import type {CaptureNavigation} from '../navigation/types';
import {useGuardLeaveFlow} from '../navigation/useGuardLeaveFlow';
import {STRIP_ASPECT} from '../capture/stripLayout';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors, fonts, fontSize} from '../theme';

/** 시트가 화면 폭에서 차지하는 비율. 시안(Frame-2)에서 가져왔다. */
const SHEET_WIDTH_RATIO = 0.34;
const THUMB_HEIGHT = 96;

export default function PhotoSelectScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const {width, height} = useWindowDimensions();
  // 가로로 찍었으면 사용자는 폰을 눕힌 채로 넘어온다. 화면은 세로로 고정돼
  // 있으니(Info.plist) 촬영 화면과 같은 방식으로 내용을 돌려 준다.
  const deviceOrientation = useOrientation('device');
  const {layout, cutCount, shots, selection, toggleSelection} =
    useCaptureSession();
  const t = useT();

  // 뒤로가기·스와이프·홈 버튼 모두 확인을 거쳐 홈으로 나간다.
  // 훅이라 아래 조기 반환보다 앞에 둔다.
  const {leave: goHome} = useGuardLeaveFlow(true, t.leaveFlow.bodyShots);
  const [previewAreaHeight, setPreviewAreaHeight] = useState(0);

  if (!layout) {
    return null;
  }

  const sideways =
    layout === 'landscape' &&
    (deviceOrientation === 'left' || deviceOrientation === 'right');
  const rotation = deviceOrientation === 'left' ? 90 : -90;

  // 빈 자리는 undefined 로 둔다 — StripPreview 가 그 자리를 비워 그린다.
  const chosen = selection.map(index => (index == null ? undefined : shots[index]));
  const pickedCount = selection.filter(index => index != null).length;
  const complete = pickedCount === cutCount;
  const thumbWidth =
    layout === 'portrait' ? THUMB_HEIGHT * 0.66 : THUMB_HEIGHT * 1.6;
  let sheetWidth: number;
  if (sideways) {
    // 눕히면 세로로 쓸 수 있는 길이가 화면의 짧은 변이 된다. 시트가 항상
    // 세로라(STRIP_ASPECT) 높이에 맞춰야 잘리지 않는다.
    sheetWidth = Math.min(width * 0.62, (width - 40) / STRIP_ASPECT);
  } else {
    // 폭으로만 잡으면 태블릿처럼 넓은 화면에서 시트가 남은 높이를 넘쳐
    // 제목과 겹친다. 실측한 영역 높이 안에 들어오게 줄인다 (결과 화면과 같다).
    sheetWidth = width * SHEET_WIDTH_RATIO;
    const maxSheetHeight = previewAreaHeight * 0.96;
    if (maxSheetHeight > 0 && sheetWidth * STRIP_ASPECT > maxSheetHeight) {
      sheetWidth = maxSheetHeight / STRIP_ASPECT;
    }
  }

  const preview = (
    <StripPreview
      layout={layout}
      photos={chosen}
      width={sheetWidth}
      showSlotNumbers
    />
  );

  const counter = (
    <Text style={styles.counter}>
      {t.photoSelect.count(pickedCount, cutCount)}
    </Text>
  );

  const thumbs = (
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
            accessibilityLabel={t.photoSelect.shotA11y(
              index + 1,
              picked ? order + 1 : null,
            )}
            accessibilityState={{selected: picked}}
            onPress={() => toggleSelection(index)}
            style={[styles.thumb, {width: thumbWidth, height: THUMB_HEIGHT}]}>
            <Image source={{uri}} style={styles.thumbImage} resizeMode="cover" />
            {picked ? (
              <>
                <View pointerEvents="none" style={styles.thumbPicked} />
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>{order + 1}</Text>
                </View>
              </>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const next = (
    <PrimaryButton
      label={t.common.next}
      disabled={!complete}
      onPress={() => navigation.navigate('LogoSelect')}
    />
  );

  if (sideways) {
    // 눕힌 방향에 따라 노치(화면 위)와 홈 인디케이터(화면 아래)가 사용자의
    // 왼쪽·오른쪽 중 어디로 가는지가 뒤바뀐다. 그쪽만 그만큼 더 띄운다.
    const padLeft = rotation === 90 ? insets.top : insets.bottom;
    const padRight = rotation === 90 ? insets.bottom : insets.top;

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.rotator,
            {
              width: height,
              height: width,
              left: (width - height) / 2,
              top: (height - width) / 2,
              transform: [{rotate: `${rotation}deg`}],
            },
          ]}>
          <View
            style={[
              styles.landscapeBody,
              {paddingLeft: padLeft + 20, paddingRight: padRight + 20},
            ]}>
            <View style={styles.landscapePreview}>{preview}</View>

            <View style={styles.landscapeSide}>
              <View style={styles.landscapeHeader}>
                <HomeButton onPress={goHome} />
                <Text style={styles.landscapeTitle} numberOfLines={1}>
                  {t.photoSelect.title}
                </Text>
              </View>
              {counter}
              {thumbs}
              <View style={styles.landscapeActions}>{next}</View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <HomeButton onPress={goHome} />
      </View>

      <Text style={styles.title}>{t.photoSelect.title}</Text>

      <View
        style={styles.previewArea}
        onLayout={event =>
          setPreviewAreaHeight(event.nativeEvent.layout.height)
        }>
        {preview}
      </View>

      {counter}
      {thumbs}

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        {next}
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
  // 테두리는 썸네일 스타일에 직접 붙였다 떼지 않고 위에 덮는 뷰로 그린다.
  // 안드로이드는 borderWidth 가 빠지면 NaN 으로 되돌리는데, overflow: hidden 이
  // 그 값으로 자르는 영역을 계산해 0 크기가 되면서 사진이 통째로 잘려 나간다.
  thumbPicked: {
    ...StyleSheet.absoluteFill,
    borderRadius: 8,
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
  // 화면은 세로로 고정돼 있고 기기만 눕는다. 내용을 통째로 돌려 채운다.
  rotator: {
    position: 'absolute',
  },
  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 16,
  },
  landscapePreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeSide: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  landscapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  landscapeTitle: {
    flex: 1,
    fontSize: fontSize.calloutTitle,
    lineHeight: fontSize.calloutTitle * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  landscapeActions: {
    paddingTop: 4,
  },
});

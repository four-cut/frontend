import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {stripGeometry} from '../capture/stripLayout';
import {CUT_COUNT, type CaptureLayout} from '../state/CaptureSessionContext';
import {colors, fonts} from '../theme';
import {Text} from './AppText';

type Props = {
  layout: CaptureLayout;
  /** 슬롯 순서대로 채운다. 빈 자리는 undefined 로 두면 그대로 비워 그린다. */
  photos: (string | undefined)[];
  /** 시트 폭. 높이는 비율로 정해진다. */
  width: number;
  /**
   * 슬롯마다 1, 2, 3… 번호를 띄운다.
   *
   * 사진을 고르는 화면에서만 쓴다. 고른 것을 빼면 뒤 사진이 앞으로 당겨져서
   * 겉보기에는 "맨 뒤가 사라진" 것처럼 보이는데, 번호가 있으면 어느 자리가
   * 비었고 다음 사진이 어디로 들어갈지가 보인다.
   */
  showSlotNumbers?: boolean;
};

/**
 * 출력 시트를 화면 크기로 줄여 보여준다. (SR-06 / SR-07)
 * 인쇄용 합성과 같은 stripGeometry 를 쓰므로 배치가 어긋나지 않는다.
 */
export default function StripPreview({
  layout,
  photos,
  width,
  showSlotNumbers = false,
}: Props) {
  const geometry = stripGeometry(layout, width);
  const slots = Array.from(
    {length: CUT_COUNT[layout]},
    (_, index) => photos[index],
  );

  // flexWrap 은 한 줄이 딱 맞아떨어질 때 부동소수점 오차로 줄바꿈해버린다.
  // 합성(composeStrip)과 같은 행/열 계산을 써서 직접 묶는다.
  const rows: (string | undefined)[][] = [];
  for (let index = 0; index < slots.length; index += geometry.columns) {
    rows.push(slots.slice(index, index + geometry.columns));
  }

  // 시트가 작게 그려질 때도 읽히도록 슬롯 크기에 맞춰 키운다.
  const badgeSize = Math.round(
    Math.min(geometry.slotWidth, geometry.slotHeight) * 0.3,
  );

  return (
    <View
      style={[
        styles.sheet,
        {
          width: geometry.width,
          height: geometry.height,
          padding: geometry.padding,
        },
      ]}>
      <View style={{gap: geometry.gap}}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={[styles.row, {gap: geometry.gap}]}>
            {row.map((uri, columnIndex) => {
              const slotNumber = rowIndex * geometry.columns + columnIndex + 1;
              return (
                <View
                  key={columnIndex}
                  style={[
                    styles.slot,
                    {width: geometry.slotWidth, height: geometry.slotHeight},
                  ]}>
                  {uri ? (
                    <Image
                      source={{uri}}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : null}
                  {showSlotNumbers ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          width: badgeSize,
                          height: badgeSize,
                          borderRadius: badgeSize / 2,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.badgeLabel,
                          {fontSize: badgeSize * 0.62},
                        ]}>
                        {slotNumber}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.textPrimary,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  slot: {
    backgroundColor: colors.slot,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  // 사진 위에도 빈 슬롯 위에도 읽혀야 해서 어두운 바탕에 흰 글씨로 둔다.
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  badgeLabel: {
    fontFamily: fonts.bold,
    color: colors.white,
    includeFontPadding: false,
  },
});

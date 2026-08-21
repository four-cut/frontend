import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {stripGeometry} from '../capture/stripLayout';
import {CUT_COUNT, type CaptureLayout} from '../state/CaptureSessionContext';
import {colors} from '../theme';

type Props = {
  layout: CaptureLayout;
  /** 슬롯 순서대로 채운다. 모자라면 나머지는 빈 슬롯으로 남는다. */
  photos: string[];
  /** 시트 폭. 높이는 비율로 정해진다. */
  width: number;
};

/**
 * 출력 시트를 화면 크기로 줄여 보여준다. (SR-06 / SR-07)
 * 인쇄용 합성과 같은 stripGeometry 를 쓰므로 배치가 어긋나지 않는다.
 */
export default function StripPreview({layout, photos, width}: Props) {
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
            {row.map((uri, columnIndex) => (
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
              </View>
            ))}
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
});

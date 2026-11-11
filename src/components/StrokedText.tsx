import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {Text} from './AppText';
import {colors} from '../theme';

/**
 * 외곽선을 깔 여덟 방향.
 *
 * 상하좌우 넷만으로는 글자의 사선 모서리에서 테두리가 얇아져 끊겨 보인다.
 * 대각선까지 넣어야 둘레가 고르게 둘러진다.
 */
const DIRECTIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

type Props = {
  children: React.ReactNode;
  /** 본 글자의 스타일. 깔개도 색만 빼고 같은 값을 쓴다. */
  style?: StyleProp<TextStyle>;
  /** 외곽선 두께(pt). 글자 크기에 맞춰 호출부가 정한다. */
  width?: number;
  /** 외곽선 색. */
  color?: string;
  /**
   * 바깥 상자의 스타일. 회전처럼 글자 전체에 걸어야 하는 변형은 여기에
   * 준다 — style 에 transform 을 주면 깔개를 미는 transform 과 부딪친다.
   */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * 글자에 외곽선을 두른 Text.
 *
 * 카메라 미리보기 위에 얹는 글자는 배경이 매 순간 달라져 한 가지 색으로는
 * 읽히지 않는다. 밝은 장면에서는 흰 글자가, 어두운 장면에서는 검은 글자가
 * 사라진다.
 *
 * React Native 의 Text 에는 외곽선 속성이 없다. textShadow 는 번지는 그림자라
 * 테두리가 되지 않고, 반투명 판을 깔면 미리보기를 가린다. 그래서 같은 글자를
 * 여덟 방향으로 조금씩 밀어 외곽선 색으로 깔고 그 위에 본 글자를 얹는다.
 *
 * 크기는 흐름에 놓인 본 글자가 정한다. 깔개는 절대 배치라 상자 크기에
 * 끼어들지 않으므로, 바깥에서 보면 Text 하나와 똑같이 자리를 차지한다.
 */
export default function StrokedText({
  children,
  style,
  width = 3,
  color = colors.black,
  containerStyle,
}: Props) {
  return (
    <View style={containerStyle}>
      {DIRECTIONS.map(([dx, dy]) => (
        <Text
          key={`${dx},${dy}`}
          // 같은 글자가 아홉 번 읽히지 않게 깔개는 접근성에서 숨긴다.
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[
            style,
            styles.outline,
            {
              color,
              transform: [
                {translateX: dx * width},
                {translateY: dy * width},
              ],
            },
          ]}>
          {children}
        </Text>
      ))}
      <Text style={style}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 본 글자와 같은 지점에서 시작해 transform 으로만 밀어 둔다.
  outline: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

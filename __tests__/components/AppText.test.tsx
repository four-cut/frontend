/**
 * 태블릿에서 공용 Text 가 글자를 키우는지 본다.
 *
 * - 폰은 그대로, 태블릿(짧은 변 600 이상)은 TABLET_TEXT_SCALE 배.
 * - 줄 높이도 같은 비율로 키운다. 안 키우면 큰 글자가 잘린다.
 * - fixedSize 는 키우지 않는다(둘레 크기에 맞춰 계산한 글자).
 */
import React from 'react';
import * as ReactNative from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import {Text} from '../../src/components/AppText';
import {TABLET_TEXT_SCALE} from '../../src/theme';

// react-native 의 useWindowDimensions 는 getter 로 이 모듈을 꺼내 준다.
// jest 기본 화면(750×1334)은 짧은 변이 600 을 넘어 태블릿으로 잡히므로
// 크기를 직접 정해 준다.
const mockSize = {width: 400, height: 860};
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({...mockSize, scale: 2, fontScale: 1}),
}));

function renderAt(
  width: number,
  height: number,
  element: React.ReactElement,
): ReactNative.TextStyle {
  mockSize.width = width;
  mockSize.height = height;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  const node = renderer.root.findByType(ReactNative.Text);
  return ReactNative.StyleSheet.flatten(node.props.style);
}

const STYLE = {fontSize: 20, lineHeight: 24};

test('폰은 그대로', () => {
  const style = renderAt(400, 860, <Text style={STYLE}>가</Text>);
  expect(style.fontSize).toBe(20);
  expect(style.lineHeight).toBe(24);
});

test('태블릿은 글자와 줄 높이를 같은 비율로 키운다', () => {
  const style = renderAt(900, 1440, <Text style={STYLE}>가</Text>);
  expect(style.fontSize).toBeCloseTo(20 * TABLET_TEXT_SCALE);
  expect(style.lineHeight).toBeCloseTo(24 * TABLET_TEXT_SCALE);
});

test('fixedSize 는 태블릿에서도 그대로', () => {
  const style = renderAt(
    900,
    1440,
    <Text fixedSize style={STYLE}>
      가
    </Text>,
  );
  expect(style.fontSize).toBe(20);
});

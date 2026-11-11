/**
 * 외곽선 글자가 제대로 깔리는지 본다.
 *
 * - 본 글자 하나 + 여덟 방향 깔개 = Text 아홉 개.
 * - 깔개는 절대 배치라 상자 크기에 끼어들지 않는다. 이게 깨지면 글자가
 *   자리를 두 배로 차지해 레이아웃이 밀린다.
 * - 깔개는 외곽선 색, 본 글자만 원래 색.
 * - 같은 글자가 아홉 번 읽히지 않게 깔개는 접근성에서 숨긴다.
 */
import React from 'react';
import * as ReactNative from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import StrokedText from '../../src/components/StrokedText';

const STYLE = {fontSize: 72, color: '#FFFFFF'};

function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer.root.findAllByType(ReactNative.Text);
}

function flatten(node: ReactTestRenderer.ReactTestInstance) {
  return ReactNative.StyleSheet.flatten(node.props.style);
}

test('본 글자 하나에 깔개 여덟 개를 깐다', () => {
  const texts = render(<StrokedText style={STYLE}>3</StrokedText>);
  expect(texts).toHaveLength(9);
  // 전부 같은 글자를 그린다 — 하나라도 다르면 외곽선이 어긋난다.
  for (const text of texts) {
    expect(text.props.children).toBe('3');
  }
});

test('깔개는 절대 배치라 상자 크기에 끼어들지 않는다', () => {
  const texts = render(<StrokedText style={STYLE}>3</StrokedText>);
  const outlines = texts.slice(0, 8);
  const fill = texts[8];

  for (const outline of outlines) {
    expect(flatten(outline).position).toBe('absolute');
  }
  expect(flatten(fill).position).toBeUndefined();
});

test('깔개만 외곽선 색으로 그린다', () => {
  const texts = render(
    <StrokedText style={STYLE} color="#000000">
      3
    </StrokedText>,
  );
  for (const outline of texts.slice(0, 8)) {
    expect(flatten(outline).color).toBe('#000000');
  }
  expect(flatten(texts[8]).color).toBe('#FFFFFF');
});

test('두께만큼 여덟 방향으로 밀어 둔다', () => {
  const texts = render(
    <StrokedText style={STYLE} width={3}>
      3
    </StrokedText>,
  );
  const moved = texts.slice(0, 8).map(node => {
    const {transform} = flatten(node) as {
      transform: [{translateX: number}, {translateY: number}];
    };
    return [transform[0].translateX, transform[1].translateY];
  });

  expect(moved).toEqual([
    [-3, -3],
    [0, -3],
    [3, -3],
    [-3, 0],
    [3, 0],
    [-3, 3],
    [0, 3],
    [3, 3],
  ]);
});

test('깔개는 접근성에서 숨긴다', () => {
  const texts = render(<StrokedText style={STYLE}>3</StrokedText>);
  for (const outline of texts.slice(0, 8)) {
    expect(outline.props.accessible).toBe(false);
    expect(outline.props.importantForAccessibility).toBe('no');
  }
  expect(texts[8].props.accessible).toBeUndefined();
});

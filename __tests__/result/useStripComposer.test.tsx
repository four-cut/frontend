/**
 * 결과 화면 합성 순서.
 *
 * - 합성은 한 번에 하나만 돈다. 프레임을 연달아 누르면 중간 것은 건너뛴다.
 * - 실패하면 이전 프레임 결과를 지운다 — 남아 있으면 그게 저장·인쇄된다.
 * - 다시 시도하면 같은 조건으로 다시 합성한다.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import type {FrameDesign} from '../../src/frameBuilder/types';
import {useStripComposer} from '../../src/result/useStripComposer';

type Call = {
  design: FrameDesign | undefined;
  resolve: (uri: string) => void;
  reject: (error: Error) => void;
};
const mockCalls: Call[] = [];

jest.mock('../../src/capture/composeStrip', () => ({
  composeStrip: (_layout: string, _photos: string[], design?: FrameDesign) =>
    new Promise<string>((resolve, reject) => {
      mockCalls.push({design, resolve, reject});
    }),
}));

const PHOTOS = ['file:///a.jpg', 'file:///b.jpg'];
const trackTempFile = jest.fn();
const design = (name: string) => ({backgroundColor: name} as FrameDesign);
const names = () => mockCalls.map(call => call.design?.backgroundColor);

type Result = ReturnType<typeof useStripComposer>;

async function mount(initial: FrameDesign) {
  const result = {} as {current: Result};
  function Probe({d}: {d: FrameDesign}) {
    result.current = useStripComposer({
      layout: 'portrait',
      photos: PHOTOS,
      design: d,
      ready: true,
      trackTempFile,
    });
    return null;
  }
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe d={initial} />);
  });
  return {
    result,
    rerender: (d: FrameDesign) =>
      ReactTestRenderer.act(async () => {
        renderer.update(<Probe d={d} />);
      }),
    act: (fn: () => void) =>
      ReactTestRenderer.act(async () => {
        fn();
      }),
  };
}

beforeEach(() => {
  mockCalls.length = 0;
  trackTempFile.mockClear();
});

test('연달아 바꾸면 돌던 것이 끝난 뒤 마지막 것만 합성한다', async () => {
  const view = await mount(design('A'));
  expect(names()).toEqual(['A']);

  await view.rerender(design('B'));
  await view.rerender(design('C'));
  // A 가 끝나기 전에는 아무것도 새로 시작하지 않는다.
  expect(names()).toEqual(['A']);
  expect(view.result.current.composing).toBe(true);

  await view.act(() => mockCalls[0].resolve('file:///A.jpg'));
  // B 는 건너뛰고 C 만 그린다.
  expect(names()).toEqual(['A', 'C']);
  // A 결과는 화면에 안 쓰지만 파일은 생겼으니 정리 대상이다.
  expect(trackTempFile).toHaveBeenCalledWith('file:///A.jpg');
  expect(view.result.current.strip).toBeNull();

  await view.act(() => mockCalls[1].resolve('file:///C.jpg'));
  expect(view.result.current.strip).toBe('file:///C.jpg');
  expect(view.result.current.composing).toBe(false);
});

test('실패하면 이전 결과를 지우고, 다시 시도하면 같은 프레임으로 합성한다', async () => {
  const view = await mount(design('A'));
  await view.act(() => mockCalls[0].resolve('file:///A.jpg'));
  expect(view.result.current.strip).toBe('file:///A.jpg');

  await view.rerender(design('B'));
  await view.act(() => mockCalls[1].reject(new Error('boom')));
  expect(view.result.current.strip).toBeNull();
  expect(view.result.current.failed).toBe(true);

  await view.act(() => view.result.current.retry());
  expect(view.result.current.failed).toBe(false);
  expect(names()).toEqual(['A', 'B', 'B']);

  await view.act(() => mockCalls[2].resolve('file:///B.jpg'));
  expect(view.result.current.strip).toBe('file:///B.jpg');
});

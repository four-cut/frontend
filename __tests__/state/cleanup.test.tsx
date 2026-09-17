/**
 * 촬영 플로우를 벗어날 때 세션이 만든 캐시 파일을 지우는지 본다. (NFR-04)
 *
 * 정리는 Provider 가 언마운트될 때 한 번 일어난다. 화면 없이 Provider 만
 * 띄우고, 안쪽에서 세션을 채운 뒤 언마운트해서 네이티브 호출을 확인한다.
 */
import React, {useEffect} from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  CaptureSessionProvider,
  useCaptureSession,
} from '../../src/state/CaptureSessionContext';

const mockDeleteFiles = jest.fn((_: string[]) => Promise.resolve(0));

jest.mock('../../src/specs/NativeMediaFile', () => ({
  __esModule: true,
  default: {deleteFiles: (uris: string[]) => mockDeleteFiles(uris)},
}));

type Setup = (session: ReturnType<typeof useCaptureSession>) => void;

function Fill({setup}: {setup: Setup}) {
  const session = useCaptureSession();
  useEffect(() => {
    setup(session);
    // 한 번만 채운다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

async function mountAndLeave(setup: Setup) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <CaptureSessionProvider>
        <Fill setup={setup} />
      </CaptureSessionProvider>,
    );
  });
  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
}

beforeEach(() => {
  mockDeleteFiles.mockClear();
});

test('촬영본·영상·합성본을 모두 지운다', async () => {
  await mountAndLeave(session => {
    session.selectLayout('portrait');
    for (let i = 0; i < 8; i++) {
      session.addShot(`file:///cache/shot_${i}.jpg`);
    }
    session.toggleSelection(0);
    session.toggleSelection(1);
    session.trackTempFile('file:///cache/raw.mp4');
    session.setVideo('file:///cache/speed.mp4');
    // 프레임을 바꿔 두 번 합성한 경우
    session.trackTempFile('file:///cache/strip_1.png');
    session.trackTempFile('file:///cache/strip_2.png');
  });

  expect(mockDeleteFiles).toHaveBeenCalledTimes(1);
  const deleted = mockDeleteFiles.mock.calls[0][0];
  expect(new Set(deleted)).toEqual(
    new Set([
      ...Array.from({length: 8}, (_, i) => `file:///cache/shot_${i}.jpg`),
      'file:///cache/raw.mp4',
      'file:///cache/speed.mp4',
      'file:///cache/strip_1.png',
      'file:///cache/strip_2.png',
    ]),
  );
});

test('배속이 실패해 원본이 그대로 쓰여도 한 번만 넘긴다', async () => {
  await mountAndLeave(session => {
    session.trackTempFile('file:///cache/raw.mp4');
    session.setVideo('file:///cache/raw.mp4');
  });

  expect(mockDeleteFiles).toHaveBeenCalledWith(['file:///cache/raw.mp4']);
});

test('만든 파일이 없으면 네이티브를 부르지 않는다', async () => {
  await mountAndLeave(() => {});

  expect(mockDeleteFiles).not.toHaveBeenCalled();
});

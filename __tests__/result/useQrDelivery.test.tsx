/**
 * QR 발급 흐름.
 *
 * - 사진만으로도 QR 을 만든다.
 * - 기다리다 취소하면 오류 없이 처음으로 돌아가고, 만든 세션은 다시 쓴다.
 * - 업로드가 시간 초과로 끊기면 인터넷 문구를 띄운다.
 * - 프레임을 바꾸면 사진만 다시 올린다.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import ko from '../../src/i18n/ko';
import {
  PHOTO_UPLOAD_TIMEOUT_MS,
  useQrDelivery,
} from '../../src/result/useQrDelivery';

const mockCreateSession = jest.fn();
const mockUploadImage = jest.fn();
const mockUploadVideo = jest.fn();
jest.mock('../../src/api/frames', () => ({
  fetchRemoteFrames: async () => [{frameId: 1}],
}));
jest.mock('../../src/api/photoSession', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  uploadCompositeImage: (...args: unknown[]) => mockUploadImage(...args),
  uploadVideo: (...args: unknown[]) => mockUploadVideo(...args),
}));

function abortError() {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

type Props = {strip: string | null; video: string | null};
type Result = ReturnType<typeof useQrDelivery>;

async function mount(initial: Props) {
  const result = {} as {current: Result};
  function Probe({strip, video}: Props) {
    result.current = useQrDelivery(strip, video);
    return null;
  }
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe {...initial} />);
  });
  return {
    result,
    rerender: (props: Props) =>
      ReactTestRenderer.act(async () => {
        renderer.update(<Probe {...props} />);
      }),
    act: (fn: () => unknown) =>
      ReactTestRenderer.act(async () => {
        await fn();
      }),
  };
}

beforeEach(() => {
  mockCreateSession.mockReset().mockResolvedValue({sessionId: 's1'});
  mockUploadImage.mockReset();
  mockUploadVideo.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

test('사진만으로 QR 을 만들고, 업로드에 시간 제한과 취소 신호를 건다', async () => {
  mockUploadImage.mockResolvedValue({qrCodeUrl: 'https://qr/1'});
  const view = await mount({strip: 'file:///A.jpg', video: null});

  await view.act(view.result.current.start);
  const [, , options] = mockUploadImage.mock.calls[0];
  expect(options.timeoutMs).toBe(PHOTO_UPLOAD_TIMEOUT_MS);
  expect(options.signal).toBeDefined();
  expect(view.result.current.status).toBe('ready');
  expect(view.result.current.open).toBe(true);
  expect(view.result.current.deliversCurrentStrip).toBe(true);
});

test('기다리다 취소하면 오류 없이 돌아가고, 세션은 다시 쓴다', async () => {
  mockUploadImage.mockImplementationOnce(
    (_id: string, _uri: string, {signal}: {signal: AbortSignal}) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(abortError())),
      ),
  );
  const view = await mount({strip: 'file:///A.jpg', video: null});

  let pending!: Promise<void>;
  await view.act(() => {
    pending = view.result.current.start();
  });
  expect(view.result.current.status).toBe('preparing');

  await view.act(() => view.result.current.cancel());
  await view.act(() => pending);
  expect(view.result.current.status).toBe('idle');
  expect(view.result.current.error).toBeNull();

  mockUploadImage.mockResolvedValue({qrCodeUrl: 'https://qr/1'});
  await view.act(view.result.current.start);
  expect(view.result.current.status).toBe('ready');
  expect(mockCreateSession).toHaveBeenCalledTimes(1);
});

test('업로드가 시간 초과로 끊기면 인터넷 문구', async () => {
  mockUploadImage.mockRejectedValue(abortError());
  mockUploadVideo.mockRejectedValue(abortError());
  const view = await mount({strip: 'file:///A.jpg', video: 'file:///v.mp4'});

  await view.act(view.result.current.start);
  expect(view.result.current.status).toBe('failed');
  expect(view.result.current.error).toBe(ko.result.qrOffline);
});

test('프레임을 바꾸면 사진만 다시 올리고 같은 세션을 쓴다', async () => {
  mockUploadImage.mockResolvedValue({qrCodeUrl: 'https://qr/1'});
  mockUploadVideo.mockResolvedValue({qrCodeUrl: 'https://qr/1'});
  const view = await mount({strip: 'file:///A.jpg', video: 'file:///v.mp4'});
  await view.act(view.result.current.start);
  expect(mockUploadVideo).toHaveBeenCalledTimes(1);

  await view.rerender({strip: 'file:///B.jpg', video: 'file:///v.mp4'});
  expect(view.result.current.deliversCurrentStrip).toBe(false);

  await view.act(view.result.current.start);
  expect(mockUploadImage).toHaveBeenLastCalledWith(
    's1',
    'file:///B.jpg',
    expect.anything(),
  );
  expect(mockUploadVideo).toHaveBeenCalledTimes(1);
  expect(mockCreateSession).toHaveBeenCalledTimes(1);
  expect(view.result.current.deliversCurrentStrip).toBe(true);
});

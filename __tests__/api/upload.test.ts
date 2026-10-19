/**
 * 업로드에 끝이 있는지 본다.
 *
 * 전에는 업로드에 시간 제한이 없어서, 부스 와이파이가 중간에 끊기면 QR 이
 * "생성 중" 에서 영원히 멈췄다. 시간이 지나거나 사용자가 취소하면 끊겨야 한다.
 */
import {apiUpload} from '../../src/api/client';

const mockAuthFetch = jest.fn();
jest.mock('../../src/auth', () => ({
  authFetch: (path: string, init: RequestInit) => mockAuthFetch(path, init),
}));

/** 응답을 주지 않다가 끊기면 fetch 처럼 AbortError 로 실패한다. */
function hangUntilAborted(_: string, init: RequestInit) {
  return new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
}

const FILE = {
  uri: 'file:///cache/strip.jpg',
  name: 'strip.jpg',
  type: 'image/jpeg',
};

beforeEach(() => {
  mockAuthFetch.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('응답이 없으면 정한 시간 뒤에 끊는다', async () => {
  mockAuthFetch.mockImplementation(hangUntilAborted);
  let settled = false;
  const outcome = apiUpload('/upload', FILE, {timeoutMs: 1000}).then(
    () => null,
    (error: Error) => error,
  );
  outcome.finally(() => {
    settled = true;
  });

  jest.advanceTimersByTime(999);
  await Promise.resolve();
  expect(settled).toBe(false);

  jest.advanceTimersByTime(1);
  expect(await outcome).toMatchObject({name: 'AbortError'});
});

test('부른 쪽이 취소하면 바로 끊는다', async () => {
  mockAuthFetch.mockImplementation(hangUntilAborted);
  const controller = new AbortController();
  const outcome = apiUpload('/upload', FILE, {signal: controller.signal}).then(
    () => null,
    (error: Error) => error,
  );
  controller.abort();
  expect(await outcome).toMatchObject({name: 'AbortError'});
});

test('제때 끝나면 응답을 그대로 돌려준다', async () => {
  mockAuthFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({qrCodeUrl: 'https://qr'}),
  });
  await expect(apiUpload('/upload', FILE)).resolves.toEqual({
    qrCodeUrl: 'https://qr',
  });
});

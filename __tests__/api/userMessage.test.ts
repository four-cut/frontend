/**
 * 오류를 화면용 문구로 바꾸는 규칙.
 *
 * 개발용 원문(API 경로, JSON, 영어 네트워크 오류)이 손님에게 보이지 않는지,
 * 우리가 고른 문구는 그대로 통과하는지 본다.
 */
import {ApiError} from '../../src/api/client';
import {toUserMessage} from '../../src/api/userMessage';
import ko from '../../src/i18n/ko';

const FALLBACK = '실패했어요';

test('연결이 없으면 오프라인 문구', () => {
  const error = new TypeError('Network request failed');
  expect(toUserMessage(error, {fallback: FALLBACK})).toBe(ko.errors.offline);
});

test('응답이 늦어 끊으면 오프라인 문구 — 화면별 문구가 있으면 그쪽', () => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  expect(toUserMessage(error, {fallback: FALLBACK, offline: '인터넷 필요'})).toBe(
    '인터넷 필요',
  );
});

test('서버 5xx 는 API 경로와 JSON 을 숨기고 서버 문구', () => {
  const error = new ApiError(
    500,
    '/api/sessions/abc/video',
    '/api/sessions/abc/video 요청이 실패했습니다 (500 {"code":"X"})',
  );
  const message = toUserMessage(error, {fallback: FALLBACK});
  expect(message).toBe(ko.errors.server);
  expect(message).not.toContain('/api/');
});

test('4xx 같은 나머지는 화면이 정한 기본 문구', () => {
  const error = new ApiError(404, '/api/x', '/api/x 요청이 실패했습니다 (404)');
  expect(toUserMessage(error, {fallback: FALLBACK})).toBe(FALLBACK);
});

test('우리가 고른 문구는 그대로 통과', () => {
  const error = new Error(ko.errors.noSavePermission);
  expect(
    toUserMessage(error, {
      fallback: FALLBACK,
      known: [ko.errors.noSavePermission],
    }),
  ).toBe(ko.errors.noSavePermission);
});

test('모르는 원문은 통과시키지 않는다', () => {
  const error = new Error('E_UNABLE_TO_SAVE: PHPhotosErrorDomain 3302');
  expect(toUserMessage(error, {fallback: FALLBACK})).toBe(FALLBACK);
});

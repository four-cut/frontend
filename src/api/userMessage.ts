import {getStrings} from '../i18n';
import {ApiError} from './client';

type Options = {
  /** 아래 어느 경우에도 해당하지 않을 때 보여 줄 문구 */
  fallback: string;
  /** 인터넷이 끊겼거나 응답이 늦을 때. 없으면 공용 문구를 쓴다. */
  offline?: string;
  /**
   * 우리가 직접 던진, 이미 사람에게 보여 줄 수 있는 문구들.
   * 이 목록에 있는 메시지만 그대로 통과시킨다.
   */
  known?: string[];
};

/**
 * 오류를 화면에 띄울 문구로 바꾼다.
 *
 * 전에는 error.message 를 그대로 띄워서, QR 이나 저장이 실패하면
 * "Network request failed"(영어)나 "/api/sessions/… 요청이 실패했습니다
 * (500 {"code":…})" 처럼 API 경로와 JSON 이 손님에게 보였다.
 *
 * 그대로 보여 줘도 되는 건 우리가 직접 고른 문구(known)뿐이다. 나머지는
 * 원인별로 묶어서 "무엇을 하면 되는지" 를 말해 준다. 원문은 개발 빌드
 * 로그에만 남긴다.
 */
export function toUserMessage(error: unknown, options: Options): string {
  if (__DEV__) {
    console.warn('[toUserMessage]', error);
  }
  const strings = getStrings();

  if (error instanceof Error && options.known?.includes(error.message)) {
    return error.message;
  }
  if (isConnectionProblem(error)) {
    return options.offline ?? strings.errors.offline;
  }
  if (error instanceof ApiError && error.status >= 500) {
    return strings.errors.server;
  }
  return options.fallback;
}

/**
 * 네트워크 문제인지.
 *
 * RN 의 fetch 는 연결이 없으면 TypeError("Network request failed") 를 던지고,
 * 우리 클라이언트는 응답이 늦으면 AbortController 로 끊는다(AbortError).
 * 사용자 입장에서는 둘 다 "인터넷이 안 된다" 로 같다.
 */
function isConnectionProblem(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === 'AbortError' || /network request failed/i.test(error.message)
  );
}

import {authFetch} from '../auth';
import {getStrings} from '../i18n';

/**
 * 서버 API 호출부.
 *
 * 주소는 `src/config/api.ts` 한 곳에만 둔다. 여기서 다시 정의하면
 * 서버 주소가 바뀔 때 한쪽만 고치는 사고가 난다.
 *
 * 요청은 authFetch 로 보낸다. 촬영 세션 API 자체는 인증이 필요 없지만,
 * 로그인 상태면 헤더가 붙고 401 이면 토큰을 갱신해 재시도해 준다.
 * 로그아웃 상태에서도 그대로 동작한다.
 */

/** 응답이 없을 때 언제까지 기다릴지. */
const TIMEOUT_MS = 8000;

/** 서버가 에러를 돌려줬을 때. status 로 분기할 수 있게 담아 둔다. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly path: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parse<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.text();
      if (body) {
        detail = body.slice(0, 300);
      }
    } catch {
      // 본문을 못 읽어도 status 만으로 충분하다.
    }
    throw new ApiError(
      response.status,
      path,
      getStrings().errors.requestFailed(path, response.status, detail),
    );
  }

  // 204 No Content 는 본문이 없다.
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** 타임아웃을 걸어 요청을 보낸다. 업로드는 오래 걸릴 수 있어 따로 다룬다. */
async function send(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await authFetch(path, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await send(path), path);
}

export async function apiSend<T>(
  method: 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await send(path, {
    method,
    headers:
      body === undefined ? undefined : {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(response, path);
}

/** 업로드를 언제까지 기다릴지. 호출하는 쪽이 파일 크기에 맞춰 바꾼다. */
export const UPLOAD_TIMEOUT_MS = 60_000;

export type UploadOptions = {
  /** 이만큼 지나도 안 끝나면 끊는다. */
  timeoutMs?: number;
  /** 사용자가 취소하면 끊는다. */
  signal?: AbortSignal;
};

/**
 * 파일 업로드.
 *
 * Content-Type 을 직접 넣으면 안 된다. multipart 경계 문자열을
 * RN 이 만들어 붙여야 해서, 지정하는 순간 서버가 본문을 못 읽는다.
 *
 * 사진·영상은 8초 안에 못 올릴 수 있어 일반 요청보다 길게 기다린다. 그래도
 * 끝은 있어야 한다 — 전에는 제한이 없어서 부스 와이파이가 중간에 끊기면
 * "QR 생성 중" 에서 영원히 멈췄다.
 */
export async function apiUpload<T>(
  path: string,
  file: {uri: string; name: string; type: string},
  options: UploadOptions = {},
): Promise<T> {
  const form = new FormData();
  // RN 의 FormData 는 {uri, name, type} 형태를 파일로 취급한다.
  form.append('file', file as unknown as Blob);

  // 시간 초과와 사용자 취소를 신호 하나로 합친다. 둘 다 AbortError 로 끝나서,
  // 어느 쪽이었는지는 부른 쪽이 자기 신호를 보고 가린다.
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, options.timeoutMs ?? UPLOAD_TIMEOUT_MS);
  const {signal} = options;
  if (signal?.aborted) {
    abort();
  }
  signal?.addEventListener('abort', abort);
  try {
    const response = await authFetch(path, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    return await parse<T>(response, path);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

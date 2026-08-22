/**
 * 백엔드 주소.
 *
 * 아직 https 가 아니라서 릴리스 빌드에서는 Android 가 평문 통신을 막는다.
 * 디버그 빌드는 usesCleartextTraffic 이 켜져 있어 그대로 동작한다.
 * 배포 전에 https 로 바꾸거나 network security config 를 넣어야 한다.
 */
export const API_BASE_URL = 'http://fourcut.duckdns.org:8080';

/** 서버가 에러를 돌려줬을 때. status 로 분기할 수 있게 담아 둔다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function toError(response: Response, path: string): Promise<ApiError> {
  let detail = response.statusText;
  try {
    const body = await response.text();
    if (body) {
      detail = body.slice(0, 300);
    }
  } catch {
    // 본문을 못 읽어도 status 만으로 충분하다.
  }
  return new ApiError(response.status, path, `${response.status} ${detail}`);
}

async function parse<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    throw await toError(response, path);
  }
  // 204 No Content 는 본문이 없다.
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  return parse<T>(response, path);
}

export async function apiSend<T>(
  method: 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(response, path);
}

/**
 * 파일 업로드.
 *
 * Content-Type 을 직접 넣으면 안 된다. multipart 경계 문자열을
 * RN 이 만들어 붙여야 해서, 지정하는 순간 서버가 본문을 못 읽는다.
 */
export async function apiUpload<T>(
  path: string,
  file: {uri: string; name: string; type: string},
): Promise<T> {
  const form = new FormData();
  // RN 의 FormData 는 {uri, name, type} 형태를 파일로 취급한다.
  form.append('file', file as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
  });
  return parse<T>(response, path);
}

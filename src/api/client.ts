import {Platform} from 'react-native';

/**
 * fourcutbackend 서버 주소.
 *
 * 에뮬레이터에서 호스트 머신은 10.0.2.2 로 접근한다(안드로이드 표준).
 * iOS 시뮬레이터는 호스트와 네트워크를 공유해서 localhost 로 바로 닿는다.
 * 실기기로 테스트할 땐 이 값을 배포된 서버 주소로 바꿔야 한다.
 */
export const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TIMEOUT_MS = 8000;

export async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiError(response.status, `${path} 요청이 실패했습니다 (${response.status})`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

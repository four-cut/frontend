import {API_BASE_URL} from '../config/api';
import type {
  LoginResponse,
  Member,
  Provider,
  SocialLoginRequest,
  TokenResponse,
} from './types';

/** 인증 관련 요청이 실패했을 때. status 로 분기할 수 있게 담아 둔다. */
export class AuthError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
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
    throw new AuthError(response.status, path, `${response.status} ${detail}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  return parse<T>(response, path);
}

/** 소셜 토큰을 우리 서버 JWT 로 교환한다. */
export function socialLogin(
  provider: Provider,
  request: SocialLoginRequest,
): Promise<LoginResponse> {
  return post<LoginResponse>(`/api/auth/login/${provider}`, request);
}

/**
 * 리프레시 토큰으로 새 토큰 쌍을 받는다.
 *
 * 서버가 재사용을 감지하면 해당 회원의 토큰을 전부 무효화한다.
 * 그래서 이 함수는 반드시 session.ts 의 단일 실행 경로로만 호출해야 한다.
 */
export function reissue(refreshToken: string): Promise<TokenResponse> {
  return post<TokenResponse>('/api/auth/reissue', {refreshToken});
}

/** 서버 쪽 리프레시 토큰을 무효화한다. 이미 없는 토큰이어도 성공한다. */
export function logout(refreshToken: string): Promise<void> {
  return post<void>('/api/auth/logout', {refreshToken});
}

/** 인증이 필요한 요청. 토큰은 호출부가 넘긴다. */
export async function fetchMe(accessToken: string): Promise<Member> {
  const path = '/api/members/me';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return parse<Member>(response, path);
}

/** 회원 탈퇴. 앱스토어 심사(5.1.1(v))상 앱 안에서 완결돼야 한다. */
export async function deleteMe(accessToken: string): Promise<void> {
  const path = '/api/members/me';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return parse<void>(response, path);
}

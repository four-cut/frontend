import {reissue} from './authApi';
import {clearSession, loadSession, saveSession} from './tokenStore';
import type {LoginResponse, Session, TokenResponse} from './types';

/**
 * 세션의 단일 소유자.
 *
 * 화면과 API 호출부가 여기를 거쳐서만 토큰을 얻는다. 이유는 재발급 때문이다.
 * 서버가 리프레시 토큰 재사용을 감지하면 그 회원의 토큰을 전부 무효화하므로,
 * 재발급 요청이 동시에 두 번 나가면 두 번째가 이미 폐기된 토큰을 쓰게 되고
 * 사용자가 통째로 로그아웃된다. 그래서 재발급은 반드시 한 번에 하나만
 * 진행돼야 한다 (아래 refreshing 변수).
 */

/** 만료 몇 ms 전부터 미리 갱신할지. 요청 왕복 시간을 감안한 여유분이다. */
const REFRESH_MARGIN_MS = 60_000;

let current: Session | null = null;
/** 진행 중인 재발급. 동시 호출자는 이 하나를 같이 기다린다. */
let refreshing: Promise<Session> | null = null;

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener(current);
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSession(): Session | null {
  return current;
}

/**
 * expiresIn 을 만료 시각으로 바꾼다.
 *
 * 단위는 OAuth 관례대로 초로 가정한다. 서버가 ms 로 준다면 만료 판정이
 * 어긋나지만, 그래도 인증이 깨지지는 않는다. authFetch 의 401 재시도가
 * 안전망이라 미리 갱신이 안 되면 한 박자 늦게 갱신될 뿐이다.
 * TODO: 백엔드에 expiresIn 단위 확인.
 */
function toExpiresAt(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}

/** 앱 시작 시 저장소에서 복원한다. */
export async function restore(): Promise<Session | null> {
  current = await loadSession();
  emit();
  return current;
}

/** 로그인 성공 결과를 세션으로 받아들인다. */
export async function adopt(response: LoginResponse): Promise<Session> {
  const session: Session = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: toExpiresAt(response.expiresIn),
    member: response.member,
  };
  current = session;
  await saveSession(session);
  emit();
  return session;
}

/** 세션을 버린다. 서버 호출은 하지 않는다. */
export async function drop(): Promise<void> {
  current = null;
  refreshing = null;
  await clearSession();
  emit();
}

/** 회원 정보만 갱신한다 (닉네임 변경 등). */
export async function updateMember(member: Session['member']): Promise<void> {
  if (!current) {
    return;
  }
  current = {...current, member};
  await saveSession(current);
  emit();
}

async function runRefresh(session: Session): Promise<Session> {
  let tokens: TokenResponse;
  try {
    tokens = await reissue(session.refreshToken);
  } catch (error) {
    // 재발급 실패는 되돌릴 방법이 없다. 세션을 버리고 로그아웃 상태로 만든다.
    await drop();
    throw error;
  }
  const next: Session = {
    ...session,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: toExpiresAt(tokens.expiresIn),
  };
  current = next;
  await saveSession(next);
  emit();
  return next;
}

/**
 * 재발급을 한 번에 하나만 실행한다.
 *
 * 이미 진행 중이면 그 약속을 그대로 돌려준다. 동시에 401 을 맞은 요청
 * 여러 개가 각자 재발급을 쏘는 것을 막는 장치다.
 */
export function refresh(): Promise<Session> {
  if (refreshing) {
    return refreshing;
  }
  const session = current;
  if (!session) {
    return Promise.reject(new Error('세션이 없어 재발급할 수 없다'));
  }
  refreshing = runRefresh(session).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * 바로 쓸 수 있는 액세스 토큰을 준다. 만료가 임박했으면 먼저 갱신한다.
 * 로그인 상태가 아니면 null.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (!current) {
    return null;
  }
  if (Date.now() < current.expiresAt - REFRESH_MARGIN_MS) {
    return current.accessToken;
  }
  const refreshed = await refresh();
  return refreshed.accessToken;
}

import {login, logout, unlink} from '@react-native-seoul/kakao-login';

import type {SocialLoginRequest} from '../types';
import {SignInCancelled} from './errors';

/**
 * 카카오 로그인.
 *
 * login() 은 카카오톡이 깔려 있으면 앱으로, 아니면 웹 계정 로그인으로
 * 알아서 넘어간다. 백엔드가 요구하는 건 액세스 토큰이다.
 * (Swagger: "token 은 카카오는 액세스 토큰, 구글은 ID 토큰입니다")
 */
export async function getKakaoLoginRequest(): Promise<SocialLoginRequest> {
  try {
    const token = await login();
    return {token: token.accessToken};
  } catch (error) {
    if (isCancelled(error)) {
      throw new SignInCancelled();
    }
    throw error;
  }
}

/** 카카오 세션을 끊는다. 우리 서버 로그아웃과는 별개다. */
export async function kakaoSignOut(): Promise<void> {
  await logout();
}

/**
 * 카카오 연결 끊기. 회원 탈퇴 시 함께 호출해야
 * 사용자의 카카오 계정에서 이 앱 연결이 사라진다.
 */
export async function kakaoUnlink(): Promise<void> {
  await unlink();
}

/**
 * 취소인지 판별한다.
 *
 * 라이브러리가 모든 실패를 "RNKakaoLogins" 코드 하나로 뭉뚱그려 reject 하고
 * 카카오 SDK 의 원본 메시지만 그대로 넘긴다. 그래서 코드로는 구분할 수 없고
 * 메시지를 볼 수밖에 없다. iOS 와 Android 모두 취소 시 메시지에 Cancel 이
 * 들어가는 것에 기대는 휴리스틱이라, SDK 문구가 바뀌면 취소가 일반 에러로
 * 보일 수 있다. 그때도 로그인 자체는 정상 동작한다.
 */
function isCancelled(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /cancel/i.test(message);
}

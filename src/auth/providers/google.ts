import {Platform} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

import {GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID} from '../../config/google';
import type {SocialLoginRequest} from '../types';
import {SignInCancelled} from './errors';

let configured = false;

/**
 * configure 는 signIn 전에 한 번은 불려야 한다. 동기 함수라 앱 시작 시점에
 * 미리 부를 필요 없이, 실제로 로그인할 때 한 번만 부른다.
 */
function ensureConfigured() {
  if (configured) {
    return;
  }
  GoogleSignin.configure({
    // 서버가 ID 토큰의 aud 로 확인하는 값이라 반드시 넘겨야 한다.
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  configured = true;
}

/**
 * 구글 로그인.
 *
 * 백엔드가 요구하는 건 ID 토큰이다.
 * (Swagger: "token 은 카카오는 액세스 토큰, 구글은 ID 토큰입니다")
 */
export async function getGoogleLoginRequest(): Promise<SocialLoginRequest> {
  ensureConfigured();

  // Play 서비스가 없거나 낡은 기기를 거른다. iOS 에는 해당 없다.
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  }

  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') {
    throw new SignInCancelled();
  }

  const {idToken} = response.data;
  if (!idToken) {
    // webClientId 가 비어 있거나 콘솔 설정이 어긋나면 여기로 온다.
    throw new Error(
      '구글이 ID 토큰을 주지 않았다. 웹 클라이언트 ID 설정을 확인해야 한다',
    );
  }
  return {token: idToken};
}

/** 구글 세션을 끊는다. 우리 서버 로그아웃과는 별개다. */
export async function googleSignOut(): Promise<void> {
  ensureConfigured();
  await GoogleSignin.signOut();
}

/** 구글 연결 끊기. 회원 탈퇴 시 함께 호출한다. */
export async function googleUnlink(): Promise<void> {
  ensureConfigured();
  await GoogleSignin.revokeAccess();
}

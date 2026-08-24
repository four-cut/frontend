import * as Keychain from 'react-native-keychain';

import type {Session} from './types';

/**
 * 세션을 기기 보안 저장소(iOS Keychain / Android Keystore)에 보관한다.
 *
 * AsyncStorage 를 쓰지 않는 이유는 리프레시 토큰 때문이다. 액세스 토큰과 달리
 * 수명이 길어서, 평문으로 남으면 기기를 확보한 쪽이 계정을 오래 쓸 수 있다.
 *
 * Keychain 은 항목 하나에 문자열 하나만 담으므로 세션 전체를 JSON 으로 넣는다.
 */
const SERVICE = 'com.fourcut.app.auth';

export async function saveSession(session: Session): Promise<void> {
  await Keychain.setGenericPassword('session', JSON.stringify(session), {
    service: SERVICE,
  });
}

export async function loadSession(): Promise<Session | null> {
  const stored = await Keychain.getGenericPassword({service: SERVICE});
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored.password) as Session;
  } catch {
    // 저장 형식이 바뀌었거나 값이 깨진 경우. 지우고 로그아웃 취급한다.
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
}

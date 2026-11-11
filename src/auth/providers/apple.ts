import {Platform} from 'react-native';
import {appleAuth} from '@invertase/react-native-apple-authentication';

import type {SocialLoginRequest} from '../types';
import {SignInCancelled} from './errors';
import {getStrings} from '../../i18n';

/**
 * 애플 로그인.
 *
 * 심사 지침 4.8 때문에 필요하다 — 카카오·구글로 주 계정을 만드는 앱은
 * 이메일을 숨길 수 있는 로그인 수단을 함께 제공해야 하고, 사실상 이것뿐이다.
 *
 * iOS 전용이다. 안드로이드에서도 쓰려면 Services ID 와 웹 리다이렉트,
 * 그걸 받아 줄 백엔드 콜백이 더 필요한데, 4.8 이 요구하는 건 App Store 뿐이라
 * 지금은 붙이지 않는다. 그래서 애플로 가입한 사람은 안드로이드에서
 * 같은 계정으로 들어올 수 없다.
 */
export async function getAppleLoginRequest(): Promise<SocialLoginRequest> {
  if (Platform.OS !== 'ios') {
    throw new Error(getStrings().login.appleIosOnly);
  }

  let response;
  try {
    response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      // 이름은 서버가 보관해야 한다 — 아래 name 주석 참고.
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });
  } catch (error) {
    // 카카오와 달리 코드로 구분할 수 있다 — 메시지를 넘겨짚지 않아도 된다.
    if (isCancelled(error)) {
      throw new SignInCancelled();
    }
    throw error;
  }

  const {identityToken, authorizationCode, fullName} = response;
  if (!identityToken) {
    // 취소는 performRequest 가 던지므로 여기까지 오면 진짜 실패다.
    throw new Error(getStrings().login.failed);
  }

  return {
    token: identityToken,
    // 탈퇴할 때 서버가 애플 쪽 토큰을 폐기하려면 이 코드가 있어야 한다.
    // 카카오·구글과 달리 providerId 만으로는 연결을 끊을 수 없다.
    authorizationCode: authorizationCode ?? undefined,
    // 애플은 이름을 최초 1회 인증에서만 내려준다. identityToken 안에도
    // 없다. 이때 서버로 넘기지 않으면 영영 받을 수 없다.
    name: joinName(fullName),
  };
}

/** 사용자가 애플 로그인 창을 닫았는지. */
function isCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as {code?: unknown}).code === appleAuth.Error.CANCELED
  );
}

/**
 * 애플이 준 이름을 한 줄로 합친다.
 *
 * 둘 다 없으면 undefined 를 돌려준다 — 두 번째 로그인부터는 이름이 안 와서
 * 빈 문자열을 보내면 서버가 저장해 둔 이름을 지울 수 있다.
 */
function joinName(
  fullName: {givenName?: string | null; familyName?: string | null} | null,
): string | undefined {
  if (!fullName) {
    return undefined;
  }
  // 한국어·일본어는 성이 앞이고 영어는 뒤다. 애플이 지역을 알려 주지 않아
  // 어느 쪽인지 고를 수 없으므로, 받은 두 조각을 그대로 띄어 붙인다.
  const joined = [fullName.familyName, fullName.givenName]
    .filter(part => !!part)
    .join(' ')
    .trim();
  return joined.length > 0 ? joined : undefined;
}

/**
 * 애플은 앱 쪽에서 끊을 세션이 없다.
 *
 * 카카오·구글은 SDK 가 기기에 로그인 상태를 들고 있어 따로 끊어 줘야 하지만,
 * 애플은 인증할 때마다 시스템이 처리하고 앱에는 아무것도 남지 않는다.
 * 호출부가 제공자를 가리지 않게 빈 함수로 둔다.
 */
export async function appleSignOut(): Promise<void> {}

/**
 * 애플 연결 끊기.
 *
 * 앱에서 할 수 있는 일이 없다. 연결을 실제로 끊으려면 로그인할 때 받은
 * authorizationCode 로 서버가 애플의 revoke 를 불러야 한다. 탈퇴 요청을
 * 받은 서버가 하는 일이라, 여기서는 아무것도 하지 않는다.
 */
export async function appleUnlink(): Promise<void> {}

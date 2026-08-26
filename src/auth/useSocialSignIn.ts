import {useCallback, useState} from 'react';

import {useAuth} from './AuthContext';
import {getGoogleLoginRequest, googleSignOut, googleUnlink} from './providers/google';
import {getKakaoLoginRequest, kakaoSignOut, kakaoUnlink} from './providers/kakao';
import {SignInCancelled} from './providers/errors';
import type {Provider} from './types';

/**
 * provider SDK 로 소셜 토큰을 받아 우리 서버 로그인까지 이어 준다.
 *
 * AuthContext 는 provider SDK 를 모르는 채로 두고 싶어서 이 훅이 사이를
 * 잇는다. 구글·애플을 붙일 때도 여기만 늘어난다.
 */
export function useSocialSignIn() {
  const {signIn, signOut, member} = useAuth();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (provider: Provider) => {
      setPending(provider);
      setError(null);
      try {
        const request = await requestFor(provider);
        return await signIn(provider, request);
      } catch (caught) {
        // 취소는 실패가 아니다. 에러 표시 없이 원래 상태로 돌아간다.
        if (caught instanceof SignInCancelled) {
          return null;
        }
        setError(caught instanceof Error ? caught.message : '로그인에 실패했다');
        return null;
      } finally {
        setPending(null);
      }
    },
    [signIn],
  );

  /**
   * 우리 서버와 provider 양쪽에서 로그아웃한다.
   *
   * provider 쪽 실패는 삼킨다. 서버 세션만 끊겨도 앱 입장에서는
   * 로그아웃이고, 여기서 막히면 사용자가 로그아웃을 못 하게 된다.
   */
  const signOutEverywhere = useCallback(async () => {
    try {
      if (member?.provider === 'KAKAO') {
        await kakaoSignOut();
      } else if (member?.provider === 'GOOGLE') {
        await googleSignOut();
      }
    } catch {
      // 무시. 아래에서 우리 세션은 확실히 지운다.
    }
    await signOut();
  }, [member, signOut]);

  return {start, signOutEverywhere, pending, error};
}

/** 회원 탈퇴 시 provider 연결도 끊는다. */
export async function unlinkProvider(provider: Provider): Promise<void> {
  if (provider === 'kakao') {
    await kakaoUnlink();
  } else if (provider === 'google') {
    await googleUnlink();
  }
}

function requestFor(provider: Provider) {
  switch (provider) {
    case 'kakao':
      return getKakaoLoginRequest();
    case 'google':
      return getGoogleLoginRequest();
    case 'apple':
      // Apple Developer Program 이 없어 보류 중이다. types.ts 참고.
      return Promise.reject(new Error('애플 로그인은 아직 준비되지 않았다'));
  }
}

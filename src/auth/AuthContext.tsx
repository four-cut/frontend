import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as authApi from './authApi';
import * as session from './session';
import type {Member, Provider, SocialLoginRequest} from './types';

type Status = 'loading' | 'authenticated' | 'anonymous';

type AuthValue = {
  status: Status;
  member: Member | null;
  /** 소셜 토큰으로 로그인한다. 신규 가입 여부를 돌려준다. */
  signIn: (
    provider: Provider,
    request: SocialLoginRequest,
  ) => Promise<{newMember: boolean}>;
  signOut: () => Promise<void>;
  /** 회원 탈퇴. 성공하면 로컬 세션도 함께 지운다. */
  deleteAccount: () => Promise<void>;
  /** 서버에서 회원 정보를 다시 읽어 온다. */
  reloadMember: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [current, setCurrent] = useState(() => session.getSession());
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    // 저장소 복원보다 구독을 먼저 걸어야 그 사이 변화를 놓치지 않는다.
    const unsubscribe = session.subscribe(setCurrent);
    session.restore().finally(() => setRestoring(false));
    return unsubscribe;
  }, []);

  const signIn = useCallback(
    async (provider: Provider, request: SocialLoginRequest) => {
      const response = await authApi.socialLogin(provider, request);
      await session.adopt(response);
      return {newMember: response.newMember};
    },
    [],
  );

  const signOut = useCallback(async () => {
    const active = session.getSession();
    if (active) {
      try {
        await authApi.logout(active.refreshToken);
      } catch {
        // 서버 무효화에 실패해도 로컬은 지운다.
        // 남겨 두면 사용자가 로그아웃했다고 믿는 채로 토큰이 살아 있게 된다.
      }
    }
    await session.drop();
  }, []);

  const deleteAccount = useCallback(async () => {
    const token = await session.getValidAccessToken();
    if (!token) {
      throw new Error('로그인 상태가 아니다');
    }
    await authApi.deleteMe(token);
    await session.drop();
  }, []);

  const reloadMember = useCallback(async () => {
    const token = await session.getValidAccessToken();
    if (!token) {
      return;
    }
    const member = await authApi.fetchMe(token);
    await session.updateMember(member);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status: restoring ? 'loading' : current ? 'authenticated' : 'anonymous',
      member: current?.member ?? null,
      signIn,
      signOut,
      deleteAccount,
      reloadMember,
    }),
    [restoring, current, signIn, signOut, deleteAccount, reloadMember],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있다');
  }
  return value;
}

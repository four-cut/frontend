/**
 * 재발급이 한 번에 하나만 나가는지 검증한다.
 *
 * 서버가 리프레시 토큰 재사용을 감지하면 그 회원의 토큰을 전부 무효화하므로,
 * 동시 요청이 각자 재발급을 쏘면 사용자가 통째로 로그아웃된다.
 * 조용히 깨지는 종류의 버그라 테스트로 못을 박아 둔다.
 */

const keychainStore: {value: string | null} = {value: null};

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(async (_user: string, password: string) => {
    keychainStore.value = password;
    return true;
  }),
  getGenericPassword: jest.fn(async () =>
    keychainStore.value ? {password: keychainStore.value} : false,
  ),
  resetGenericPassword: jest.fn(async () => {
    keychainStore.value = null;
    return true;
  }),
}));

jest.mock('../../src/auth/authApi', () => ({
  reissue: jest.fn(),
  socialLogin: jest.fn(),
  logout: jest.fn(),
  fetchMe: jest.fn(),
  deleteMe: jest.fn(),
  AuthError: class extends Error {},
}));

import * as authApi from '../../src/auth/authApi';
import * as session from '../../src/auth/session';
import type {LoginResponse} from '../../src/auth/types';

const reissue = authApi.reissue as jest.MockedFunction<typeof authApi.reissue>;

const loginResponse: LoginResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  // 이미 만료된 상태로 시작해 첫 요청부터 갱신이 필요하게 만든다.
  expiresIn: -1,
  newMember: false,
  member: {memberId: 1, provider: 'KAKAO', nickname: '테스터'},
};

beforeEach(async () => {
  keychainStore.value = null;
  reissue.mockReset();
  await session.drop();
});

test('만료된 토큰으로 동시에 여러 요청이 와도 재발급은 한 번만 나간다', async () => {
  await session.adopt(loginResponse);

  let resolveReissue: (v: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }) => void = () => {};
  reissue.mockImplementation(
    () =>
      new Promise(resolve => {
        resolveReissue = resolve;
      }),
  );

  // 다섯 갈래가 동시에 토큰을 요구한다.
  const pending = Promise.all([
    session.getValidAccessToken(),
    session.getValidAccessToken(),
    session.getValidAccessToken(),
    session.getValidAccessToken(),
    session.getValidAccessToken(),
  ]);

  // 마이크로태스크를 흘려보내 다섯 호출이 모두 재발급 지점에 도달하게 한다.
  await Promise.resolve();
  await Promise.resolve();

  resolveReissue({
    accessToken: 'access-2',
    refreshToken: 'refresh-2',
    expiresIn: 3600,
  });

  const tokens = await pending;

  expect(reissue).toHaveBeenCalledTimes(1);
  expect(reissue).toHaveBeenCalledWith('refresh-1');
  expect(tokens).toEqual([
    'access-2',
    'access-2',
    'access-2',
    'access-2',
    'access-2',
  ]);
});

test('재발급에 성공하면 새 리프레시 토큰으로 교체된다', async () => {
  await session.adopt(loginResponse);
  reissue.mockResolvedValue({
    accessToken: 'access-2',
    refreshToken: 'refresh-2',
    expiresIn: 3600,
  });

  await session.getValidAccessToken();

  expect(session.getSession()?.refreshToken).toBe('refresh-2');
  // 회원 정보는 재발급 응답에 없으므로 유지돼야 한다.
  expect(session.getSession()?.member.memberId).toBe(1);
});

test('재발급에 실패하면 세션을 버려 로그아웃 상태가 된다', async () => {
  await session.adopt(loginResponse);
  reissue.mockRejectedValue(new Error('401 만료된 리프레시 토큰'));

  await expect(session.getValidAccessToken()).rejects.toThrow();

  expect(session.getSession()).toBeNull();
  expect(keychainStore.value).toBeNull();
});

test('아직 유효한 토큰이면 재발급하지 않는다', async () => {
  await session.adopt({...loginResponse, expiresIn: 3600});

  const token = await session.getValidAccessToken();

  expect(token).toBe('access-1');
  expect(reissue).not.toHaveBeenCalled();
});

test('로그아웃 상태에서는 토큰이 null 이고 재발급도 하지 않는다', async () => {
  const token = await session.getValidAccessToken();

  expect(token).toBeNull();
  expect(reissue).not.toHaveBeenCalled();
});

test('앱을 다시 켜면 저장소에서 세션이 복원된다', async () => {
  await session.adopt({...loginResponse, expiresIn: 3600});
  // 메모리 상태만 날리고 저장소는 남긴다 (앱 재시작 흉내).
  const saved = keychainStore.value;
  await session.drop();
  keychainStore.value = saved;

  const restored = await session.restore();

  expect(restored?.accessToken).toBe('access-1');
  expect(restored?.member.nickname).toBe('테스터');
});

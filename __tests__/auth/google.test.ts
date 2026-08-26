/**
 * 구글 어댑터가 백엔드가 요구하는 형태(ID 토큰)를 만들어 주는지,
 * 취소를 실패와 구분하는지 확인한다.
 */

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
    revokeAccess: jest.fn().mockResolvedValue(null),
  },
}));

import {GoogleSignin} from '@react-native-google-signin/google-signin';

import {getGoogleLoginRequest} from '../../src/auth/providers/google';
import {SignInCancelled} from '../../src/auth/providers/errors';

const signIn = GoogleSignin.signIn as jest.MockedFunction<
  typeof GoogleSignin.signIn
>;

beforeEach(() => {
  signIn.mockReset();
});

test('로그인에 성공하면 ID 토큰을 담아 돌려준다', async () => {
  signIn.mockResolvedValue({
    type: 'success',
    data: {idToken: 'google-id-token', user: {}, scopes: []},
  } as never);

  await expect(getGoogleLoginRequest()).resolves.toEqual({
    token: 'google-id-token',
  });
});

test('사용자가 취소하면 SignInCancelled 로 구분된다', async () => {
  signIn.mockResolvedValue({type: 'cancelled', data: null} as never);

  await expect(getGoogleLoginRequest()).rejects.toBeInstanceOf(SignInCancelled);
});

test('ID 토큰이 없으면 설정 문제임을 알 수 있는 에러를 낸다', async () => {
  // webClientId 가 비어 있거나 콘솔 설정이 어긋나면 이 상태가 된다.
  signIn.mockResolvedValue({
    type: 'success',
    data: {idToken: null, user: {}, scopes: []},
  } as never);

  await expect(getGoogleLoginRequest()).rejects.toThrow(/웹 클라이언트 ID/);
});

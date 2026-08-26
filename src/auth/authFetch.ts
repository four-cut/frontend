import {API_BASE_URL} from '../config/api';
import {getSession, getValidAccessToken, refresh} from './session';

/**
 * 인증 헤더를 붙여 주는 fetch.
 *
 * 로그인 상태가 아니면 헤더 없이 그냥 보낸다. 촬영 세션 API 는 인증이
 * 필요 없어서, 로그아웃 상태에서도 앱이 그대로 동작해야 하기 때문이다.
 *
 * 401 이 오면 한 번만 토큰을 갱신하고 재시도한다. 미리 갱신하는 로직이
 * 있는데도 이 경로가 필요한 이유는, 서버가 토큰을 조기 폐기했거나
 * expiresIn 해석이 어긋난 경우를 여기서 흡수하기 때문이다.
 */
export async function authFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = async (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(`${API_BASE_URL}${path}`, {...init, headers});
  };

  const token = await getValidAccessToken();
  const response = await send(token);

  // 로그인 상태가 아니었다면 재시도할 근거가 없다.
  if (response.status !== 401 || !token || !getSession()) {
    return response;
  }

  // refresh() 는 동시 호출을 하나로 합쳐 준다.
  const retried = await refresh().then(
    session => send(session.accessToken),
    () => response, // 갱신 실패 시 원래 401 을 그대로 돌려준다.
  );
  return retried;
}

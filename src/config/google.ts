/**
 * 구글 OAuth 클라이언트 ID.
 *
 * 구글 콘솔에서 플랫폼별로 클라이언트를 따로 만들어야 하고, 셋 다 필요하다.
 *
 * - iOS 클라이언트: 앱에서 로그인 창을 띄울 때 쓴다 (iosClientId)
 * - Android 클라이언트: 패키지명 + SHA-1 로 앱을 검증한다.
 *   ID 를 코드에 넣지는 않지만 콘솔에 등록돼 있어야 로그인이 성공한다.
 * - 웹 클라이언트: 서버가 ID 토큰을 검증할 때 aud 로 확인하는 값이다.
 *   앱에서도 webClientId 로 넘겨야 이 값이 담긴 ID 토큰이 발급된다.
 *   백엔드와 같은 값을 써야 한다.
 *
 * 웹 클라이언트 ID 는 비밀값이 아니다. 시크릿은 서버만 갖는다.
 */
export const GOOGLE_WEB_CLIENT_ID = '';
export const GOOGLE_IOS_CLIENT_ID = '';

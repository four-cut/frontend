/**
 * 백엔드 주소.
 *
 * TODO: 서버 HTTPS 전환 후 https 주소로 교체한다.
 * 지금은 평문이라 릴리스 빌드에서 iOS ATS 와 Android 가 차단한다.
 * 인증 토큰이 오가므로 출시 전 반드시 해결해야 한다.
 *
 * 팀원 브랜치(feat/capture-flow-skeleton)의 src/api/client.ts 에도
 * 같은 상수가 있다. 그쪽이 머지되면 이 파일 하나로 합칠 것.
 */
export const API_BASE_URL = 'http://fourcut.duckdns.org:8080';

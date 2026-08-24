/**
 * 백엔드 주소.
 *
 * 2026-08-24 HTTPS 로 전환됐다. 이전 주소(http://fourcut.duckdns.org:8080)는
 * 더 이상 응답하지 않으므로 되돌리면 앱이 서버에 붙지 못한다.
 *
 * 인증서는 Let's Encrypt, TLS 1.3 협상이라 iOS ATS 예외 설정이 필요 없다.
 *
 * 팀원 브랜치(feat/capture-flow-skeleton)의 src/api/client.ts 에도
 * 같은 상수가 옛 주소로 남아 있다. 머지될 때 이 파일 하나로 합쳐야 한다.
 */
export const API_BASE_URL = 'https://fourcut.duckdns.org';

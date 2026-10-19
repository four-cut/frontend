/**
 * QR 다운로드 링크가 살아 있는 날수.
 *
 * 서버 설정(`fourcut.download.expiry-days`, 환경변수 DOWNLOAD_LINK_EXPIRY_DAYS,
 * 기본 7)과 같은 값이어야 한다. 업로드 응답에 만료 시각이 실려 오지 않아서
 * 앱이 따로 들고 있다 — 서버 값을 바꾸면 여기도 바꾼다.
 */
export const DOWNLOAD_LINK_DAYS = 7;

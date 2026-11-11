/**
 * jest 환경에는 네이티브 모듈이 없고, 이 패키지는 트랜스파일되지 않은 ESM 으로
 * 배포돼 import 만으로도 "Cannot use import statement outside a module" 이 난다.
 *
 * 애플 로그인 자체는 실기기에서만 확인할 수 있다 — 시뮬레이터에서는
 * getCredentialStateForUser 가 항상 던진다. 테스트에서는 import 만 통과시킨다.
 *
 * node_modules 패키지의 수동 목은 이 위치에 두면 jest 가 자동으로 쓴다.
 * (jest.mock 호출이 필요 없다)
 */
const AppleButton = 'AppleButton';
AppleButton.Style = {BLACK: 2, WHITE: 0, WHITE_OUTLINE: 1};
AppleButton.Type = {CONTINUE: 1, SIGN_IN: 0, SIGN_UP: 2};

module.exports = {
  AppleButton,
  appleAuth: {
    Operation: {LOGIN: 1, LOGOUT: 2, REFRESH: 3, IMPLICIT: 0},
    Scope: {FULL_NAME: 1, EMAIL: 0},
    Error: {UNKNOWN: '1000', CANCELED: '1001'},
    performRequest: jest.fn(),
    getCredentialStateForUser: jest.fn(),
  },
};

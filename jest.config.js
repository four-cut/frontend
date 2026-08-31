const preset = require('@react-native/jest-preset');

module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    // 프리셋의 에셋 변환 목록에는 이미지·영상만 있고 폰트가 없다. 그대로 두면
    // require('...ttf') 를 jest 가 JS 로 파싱하려다 깨진다. 이미지와 같은
    // 변환기에 태워 런타임처럼 불투명한 asset id 로 돌려받는다.
    ...preset.transform,
    '^.+\\.(ttf|otf|woff|woff2)$':
      preset.transform['^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$'],
  },
  // 구글 로그인 SDK 는 import 시점에 네이티브 모듈을 강제로 조회해서
  // (TurboModuleRegistry.getEnforcing) 테스트 환경에서 바로 터진다.
  // 라이브러리가 제공하는 목을 먼저 깔아 준다.
  setupFiles: [
    '<rootDir>/node_modules/@react-native-google-signin/google-signin/jest/build/jest/setup.js',
  ],
  // RN 생태계 패키지들은 트랜스파일되지 않은 ESM 으로 배포되는 경우가 많아
  // jest 가 그대로 읽으면 "Cannot use import statement outside a module" 이 난다.
  // 패키지를 하나씩 나열하면 의존성을 추가할 때마다 빠뜨리므로 접두사로 묶는다.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native[^/]*|@react-navigation|@shopify/react-native-[^/]*|react-native[^/]*)/)',
  ],
};

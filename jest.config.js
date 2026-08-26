module.exports = {
  preset: '@react-native/jest-preset',
  // RN 생태계 패키지들은 트랜스파일되지 않은 ESM 으로 배포되는 경우가 많아
  // jest 가 그대로 읽으면 "Cannot use import statement outside a module" 이 난다.
  // 패키지를 하나씩 나열하면 의존성을 추가할 때마다 빠뜨리므로 접두사로 묶는다.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native[^/]*|@react-navigation|@shopify/react-native-[^/]*|react-native[^/]*)/)',
  ],
};

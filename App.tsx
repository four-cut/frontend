import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import {AuthProvider} from './src/auth';
import {initLocale} from './src/i18n';
import {colors} from './src/theme';

/**
 * 네비게이터가 화면 뒤에 까는 바탕. 기본 테마는 #F2F2F2 라서 화면 전환 중이나
 * 화면이 다 덮지 못한 틈으로 다른 회색이 비친다. 앱 바탕색에 맞춘다.
 */
const navigationTheme = {
  ...DefaultTheme,
  colors: {...DefaultTheme.colors, background: colors.background},
};

export default function App() {
  // 저장해 둔 언어를 읽기 전에 화면을 그리면, 일본어 기기에서 한국어가
  // 한 번 번쩍였다가 바뀐다. 읽는 동안은 네이티브 스플래시가 그대로 떠 있다.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initLocale().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

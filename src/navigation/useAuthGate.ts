import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';

import {useAuth} from '../auth';
import type {AuthGateTarget, RootNavigation} from './types';

/**
 * 로그인이 필요한 동작을 감싼다.
 *
 * 로그인 상태면 그대로 실행하고, 아니면 로그인 화면을 띄운다. 로그인에
 * 성공하면 화면 쪽에서 target 으로 이어 간다.
 */
export function useAuthGate() {
  const {status} = useAuth();
  const navigation = useNavigation<RootNavigation>();

  return useCallback(
    (target: AuthGateTarget, run: () => void) => {
      if (status === 'authenticated') {
        run();
        return;
      }
      // 저장된 세션을 읽는 중이면 아직 판단할 수 없다. 키체인 조회라 금방
      // 끝나므로, 잘못 로그인 화면을 띄우기보다 이 탭을 흘려보낸다.
      if (status === 'loading') {
        return;
      }
      navigation.navigate('Login', {next: target});
    },
    [status, navigation],
  );
}

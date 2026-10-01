import {useCallback, useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {
  useIsFocused,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';

import {useT} from '../i18n';
import type {CaptureNavigation, RootNavigation} from './types';

/**
 * 촬영 도중에 플로우를 벗어나지 못하게 막는다.
 *
 * 오프라인 테스트에서 촬영 중이나 사진을 고르다 뒤로가기를 누르면 이전
 * 화면으로 그냥 돌아가 버렸다. 카메라로 되돌아가는 건 의미가 없고, 찍은
 * 사진도 같이 사라진다.
 *
 * 그렇다고 아예 무시하면 사용자는 버튼이 고장 난 줄 안다. Material 과 HIG
 * 모두 되돌릴 수 없는 이탈은 확인을 받으라고 한다. 그래서 막되 묻는다 —
 * "계속하기" 면 그대로 두고, "그만두기" 면 홈으로 나간다. 직전 화면이 아니라
 * 홈인 이유는 위와 같다. 플로우 중간으로 돌아가 봐야 쓸 데가 없다.
 *
 * 안드로이드 하드웨어 뒤로가기, iOS 스와이프, 화면의 홈 버튼이 전부 같은
 * 길로 들어온다. native-stack 이 막는 동안 iOS 스와이프도 꺼 준다
 * (preventNativeDismiss).
 *
 * @param guarding 지금 잃을 것이 있는지. 거짓이면 아무것도 막지 않는다.
 *   예) 아직 한 장도 안 찍었거나, 결과를 이미 저장했을 때.
 * @param body 확인창 본문. 무엇이 사라지는지 화면마다 다르다.
 * @returns `leave` — 홈으로 나가는 함수. 홈 버튼에 물리면 같은 확인을 거친다.
 *   `confirming` — 확인창이 떠 있는지. 촬영 화면은 이 동안 타이머를 멈춰야 한다.
 *   안 그러면 사용자가 나갈지 고민하는 사이에 확인창 뒤에서 사진이 계속
 *   찍히고, 8장이 차면 다음 화면으로 넘어가 버린다.
 */
export function useGuardLeaveFlow(guarding: boolean, body: string) {
  const navigation = useNavigation<CaptureNavigation>();
  const t = useT();
  const [allowed, setAllowed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // 지금 보고 있는 화면만 막는다. 홈으로 나가면 플로우의 화면이 한꺼번에
  // 제거되는데, 결과 화면에서 저장을 마쳐 막지 않기로 했어도 그 아래 깔린
  // 사진 고르기 화면이 붙잡아서 엉뚱한 문구("찍은 사진이 사라집니다")로
  // 다시 묻는 일이 있었다.
  const isFocused = useIsFocused();

  const exitToHome = useCallback(() => {
    // navigate 는 CaptureFlow 를 걷어내지 않고 홈을 위에 쌓는다. popTo 를 쓴다.
    navigation.getParent<RootNavigation>()?.popTo('MainTabs', {
      screen: 'Shoot',
      params: {screen: 'Home'},
    });
  }, [navigation]);

  usePreventRemove(guarding && isFocused && !allowed, () => {
    setConfirming(true);
    Alert.alert(
      t.leaveFlow.title,
      body,
      [
        {
          text: t.leaveFlow.stay,
          style: 'cancel',
          onPress: () => setConfirming(false),
        },
        {
          text: t.leaveFlow.leave,
          style: 'destructive',
          onPress: () => {
            setConfirming(false);
            setAllowed(true);
          },
        },
      ],
      // 안드로이드에서 바깥을 누르거나 뒤로가기로 닫으면 "계속하기" 와 같다.
      {cancelable: true, onDismiss: () => setConfirming(false)},
    );
  });

  // 허락한 뒤 렌더에서야 막는 게 풀린다. 그다음에 나가야 다시 걸리지 않는다.
  useEffect(() => {
    if (allowed) {
      exitToHome();
    }
  }, [allowed, exitToHome]);

  return {leave: exitToHome, confirming};
}

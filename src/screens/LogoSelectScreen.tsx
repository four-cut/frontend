import React from 'react';
import {useNavigation} from '@react-navigation/native';

import FlowPlaceholder from '../components/FlowPlaceholder';
import type {CaptureNavigation, RootNavigation} from '../navigation/types';

/** SR-07 자리표시자 — 로고 선택과 저장·인쇄는 M6 에서 만든다. */
export default function LogoSelectScreen() {
  const navigation = useNavigation<CaptureNavigation>();

  // 촬영 플로우를 걷어내는 것만으로는 안내사항으로 돌아간다.
  // 홈까지 가려면 찰칵 탭 스택도 Home 으로 되돌려야 한다. (SR-06 / SR-07)
  const goHome = () => {
    navigation.getParent<RootNavigation>()?.navigate('MainTabs', {
      screen: 'Shoot',
      params: {screen: 'Home'},
    });
  };

  return (
    <FlowPlaceholder
      screenId="SR-07"
      title="로고 선택"
      detail="인쇄하기 · 사진, 영상 저장하기"
      actionLabel="홈으로 (임시)"
      onPress={goHome}
    />
  );
}

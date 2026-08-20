import React from 'react';
import {useNavigation} from '@react-navigation/native';

import FlowPlaceholder from '../components/FlowPlaceholder';
import type {CaptureNavigation} from '../navigation/types';
import {SHOT_COUNT, useCaptureSession} from '../state/CaptureSessionContext';

/** SR-06 자리표시자 — 선택 UI 는 M5 에서 만든다. */
export default function PhotoSelectScreen() {
  const navigation = useNavigation<CaptureNavigation>();
  const {cutCount} = useCaptureSession();

  return (
    <FlowPlaceholder
      screenId="SR-06"
      title="사진 선택"
      detail={`${SHOT_COUNT}장 중 ${cutCount}장 선택`}
      actionLabel="다음 (임시)"
      onPress={() => navigation.navigate('LogoSelect')}
    />
  );
}

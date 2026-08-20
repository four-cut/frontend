import React from 'react';
import {useNavigation} from '@react-navigation/native';

import FlowPlaceholder from '../components/FlowPlaceholder';
import type {CaptureNavigation} from '../navigation/types';
import {SHOT_COUNT, useCaptureSession} from '../state/CaptureSessionContext';

/** SR-05 자리표시자 — 카메라는 M4 에서 붙인다. */
export default function CaptureScreen() {
  const navigation = useNavigation<CaptureNavigation>();
  const {layout, cutCount} = useCaptureSession();

  const layoutLabel = layout === 'portrait' ? '세로형' : '가로형';

  return (
    <FlowPlaceholder
      screenId="SR-05"
      title="촬영"
      detail={`${layoutLabel} · ${cutCount}컷 · ${SHOT_COUNT}장 촬영`}
      actionLabel="다음 (임시)"
      onPress={() => navigation.navigate('PhotoSelect')}
    />
  );
}

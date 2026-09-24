/**
 * 아이콘. (UI-V2)
 *
 * 인쇄·공유 아이콘이 에셋에 없다. PNG 를 새로 만들면 배수별로 네 벌씩
 * 관리해야 하고, 아이콘 라이브러리를 새로 들이면 네이티브 재빌드가 필요하다.
 * Skia 는 합성에 이미 쓰고 있으므로, SVG 경로를 그대로 그려서 해결한다.
 *
 * 경로는 24x24 격자 기준이다(Material Symbols 와 같은 격자).
 */
import React, {useMemo} from 'react';
import {Canvas, Path, Skia} from '@shopify/react-native-skia';

import {touchV2} from '../../theme/uiV2';

export type IconName = 'print' | 'share' | 'check' | 'close';

/** 선으로 그리는 아이콘의 경로. 채우기가 아니라 획으로 그린다. */
const PATHS: Record<IconName, string> = {
  // 프린터: 본체 + 급지 + 출력지
  print:
    'M7 8V3h10v5 M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M7 14h10v7H7z',
  // 공유: 점 세 개와 연결선
  share:
    'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
  check: 'M4 12.5l5 5 11-11',
  close: 'M5 5l14 14 M19 5L5 19',
};

type Props = {
  name: IconName;
  color: string;
  /** 아이콘 자체 크기. 터치 영역은 부모가 책임진다. */
  size?: number;
  strokeWidth?: number;
};

export default function VectorIcon({
  name,
  color,
  size = touchV2.icon,
  strokeWidth = 2,
}: Props) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(PATHS[name]), [name]);
  if (!path) {
    return null;
  }

  // 24 격자를 요청한 크기로 맞춘다. 획 두께도 같은 비율로 줄여야
  // 크기를 바꿔도 굵기 인상이 유지된다.
  const scale = size / 24;

  return (
    <Canvas style={{width: size, height: size}} pointerEvents="none">
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={strokeWidth / scale}
        strokeCap="round"
        strokeJoin="round"
        transform={[{scale}]}
      />
    </Canvas>
  );
}

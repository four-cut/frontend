import React, {useMemo} from 'react';
import {Canvas, Group, ImageSVG, Skia} from '@shopify/react-native-skia';

import {icons, type IconName} from '../assets/icons';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

/** 아이콘 원본 SVG 의 크기. 전부 24×24 viewBox 다. */
const SOURCE_SIZE = 24;

/**
 * assets/icons 의 SVG 를 Skia 로 그린다. react-native-svg 를 따로 들이지
 * 않으려고 이미 합성에 쓰는 Skia 를 쓴다. 원본의 검은색을 color 로 바꿔 칠한다.
 *
 * 원본 루트에 width="24" height="24" 가 박혀 있어서 ImageSVG 에 작은
 * width/height 를 줘도 24×24 로 그려지고 넘친 오른쪽·아래가 잘린다.
 * 원본 크기로 그린 뒤 캔버스 크기에 맞게 통째로 줄인다.
 */
export default function SvgIcon({name, size = 20, color = '#000000'}: Props) {
  const svg = useMemo(
    () => Skia.SVG.MakeFromString(icons[name].replace(/black/g, color)),
    [name, color],
  );
  const scale = size / SOURCE_SIZE;

  return (
    <Canvas style={{width: size, height: size}} pointerEvents="none">
      <Group transform={[{scale}]}>
        <ImageSVG
          svg={svg}
          x={0}
          y={0}
          width={SOURCE_SIZE}
          height={SOURCE_SIZE}
        />
      </Group>
    </Canvas>
  );
}

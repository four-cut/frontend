import {ImageFormat, Skia} from '@shopify/react-native-skia';

import type {CaptureLayout} from '../state/CaptureSessionContext';
import {coverCrop, EXPORT_WIDTH, stripGeometry} from './stripLayout';

/**
 * 고른 사진들을 출력 시트 한 장으로 합친다. (SR-07)
 *
 * 화면을 캡처하는 방식이면 결과물이 화면 해상도에 묶여 인쇄 품질(NFR-02)을
 * 낼 수 없다. 그래서 오프스크린 서피스에 직접 그린다.
 *
 * @returns PNG data URI
 */
export async function composeStrip(
  layout: CaptureLayout,
  photoUris: string[],
): Promise<string> {
  const geometry = stripGeometry(layout, EXPORT_WIDTH);
  const surface = Skia.Surface.MakeOffscreen(
    Math.round(geometry.width),
    Math.round(geometry.height),
  );
  if (!surface) {
    throw new Error('스트립을 그릴 오프스크린 서피스를 만들지 못했습니다.');
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('white'));
  const paint = Skia.Paint();

  for (let index = 0; index < photoUris.length; index++) {
    const data = await Skia.Data.fromURI(photoUris[index]);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) {
      continue;
    }

    const column = index % geometry.columns;
    const row = Math.floor(index / geometry.columns);
    const x = geometry.padding + column * (geometry.slotWidth + geometry.gap);
    const y = geometry.padding + row * (geometry.slotHeight + geometry.gap);

    // 원본과 슬롯의 비율이 다르면 가운데를 기준으로 잘라 꽉 채운다.
    const crop = coverCrop(
      image.width(),
      image.height(),
      geometry.slotWidth,
      geometry.slotHeight,
    );

    canvas.drawImageRect(
      image,
      Skia.XYWHRect(crop.x, crop.y, crop.width, crop.height),
      Skia.XYWHRect(x, y, geometry.slotWidth, geometry.slotHeight),
      paint,
    );
  }

  // 로고는 M6 에서 이 아래 여백에 그린다.
  const snapshot = surface.makeImageSnapshot();
  return `data:image/png;base64,${snapshot.encodeToBase64(ImageFormat.PNG, 100)}`;
}

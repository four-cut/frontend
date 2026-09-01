import {ImageFormat, Skia} from '@shopify/react-native-skia';

import {
  drawBackgroundImage,
  drawStickerElements,
  drawTextElements,
} from '../frameBuilder/drawDesignElements';
import type {FrameDesign} from '../frameBuilder/types';
import MediaFile from '../specs/NativeMediaFile';
import type {CaptureLayout} from '../state/CaptureSessionContext';
import {coverCrop, EXPORT_WIDTH, stripGeometry} from './stripLayout';

/**
 * 고른 사진들을 출력 시트 한 장으로 합친다. (SR-07)
 *
 * 화면을 캡처하는 방식이면 결과물이 화면 해상도에 묶여 인쇄 품질(NFR-02)을
 * 낼 수 없다. 그래서 오프스크린 서피스에 직접 그린다.
 *
 * design을 주면 프레임 만들기에서 만든 배경·스티커·텍스트도 같이 그린다 —
 * 스티커는 사진 밑(배경), 텍스트는 사진 위(장식)에 놓는다.
 *
 * @returns 합성 결과의 `file://` 경로. 네이티브 모듈이 없는 환경에서는
 *   미리보기용 data URI 를 돌려주며, 이 경우 앨범 저장과 인쇄는 할 수 없다.
 */
export async function composeStrip(
  layout: CaptureLayout,
  photoUris: string[],
  design?: FrameDesign,
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
  canvas.clear(Skia.Color(design?.backgroundColor ?? 'white'));

  if (design?.backgroundImageUri) {
    await drawBackgroundImage(
      canvas,
      geometry.width,
      geometry.height,
      design.backgroundImageUri,
    );
  }

  if (design?.stickerElements.length) {
    await drawStickerElements(
      canvas,
      geometry.width,
      geometry.height,
      design.stickerElements,
    );
  }

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

  if (design?.textElements.length) {
    await drawTextElements(
      canvas,
      geometry.width,
      geometry.height,
      design.textElements,
    );
  }

  // 로고는 아래 여백에 그린다. (담당자 작업 중)
  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);

  // 앨범 저장과 인쇄가 모두 파일 경로를 받으므로 한 번 떨군다.
  if (MediaFile) {
    return await MediaFile.writeBase64(base64, 'png');
  }
  return `data:image/png;base64,${base64}`;
}

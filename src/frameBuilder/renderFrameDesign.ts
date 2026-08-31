import {ImageFormat, Skia} from '@shopify/react-native-skia';

import {computeSlotRects, EXPORT_WIDTH, stripGeometry} from '../capture/stripLayout';
import {
  drawBackgroundImage,
  drawSlotMasks,
  drawStickerElements,
  drawTextElements,
} from './drawDesignElements';
import type {StickerElement, TextElement} from './types';
import MediaFile from '../specs/NativeMediaFile';
import type {CaptureLayout} from '../state/CaptureSessionContext';

/**
 * 배경(색·사진)과 스티커·텍스트가 있는 시트를 그린다 (SR-09 프레임 만들기).
 *
 * composeStrip과 캔버스 크기·좌표계를 맞춰야 나중에 실제 촬영본을 합성할 때
 * 슬롯 위치가 어긋나지 않는다. 아직 사진이 없는 상태라, 실제 촬영본이 들어갈
 * 슬롯 자리는 슬롯색으로 가려서 최종 결과물과 최대한 비슷하게 미리 보여준다.
 */
export async function renderFrameDesign(
  layout: CaptureLayout,
  backgroundColor: string,
  textElements: TextElement[],
  stickerElements: StickerElement[] = [],
  backgroundImageUri: string | null = null,
): Promise<string> {
  const geometry = stripGeometry(layout, EXPORT_WIDTH);
  const surface = Skia.Surface.MakeOffscreen(
    Math.round(geometry.width),
    Math.round(geometry.height),
  );
  if (!surface) {
    throw new Error('디자인을 그릴 오프스크린 서피스를 만들지 못했습니다.');
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color(backgroundColor));

  if (backgroundImageUri) {
    await drawBackgroundImage(canvas, geometry.width, geometry.height, backgroundImageUri);
  }

  // 스티커를 먼저 그려서 나중에 그리는 텍스트가 항상 위에 보이게 한다.
  await drawStickerElements(canvas, geometry.width, geometry.height, stickerElements);

  // 실제로는 이 자리에 촬영본이 들어간다 — 배경/스티커가 비쳐 보이면
  // 편집 중에 헷갈리므로 슬롯색으로 가린다.
  drawSlotMasks(canvas, computeSlotRects(layout, geometry));

  await drawTextElements(canvas, geometry.width, geometry.height, textElements);

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);

  if (MediaFile) {
    return await MediaFile.writeBase64(base64, 'png');
  }
  return `data:image/png;base64,${base64}`;
}

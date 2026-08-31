import {Image} from 'react-native';
import {Skia, type SkCanvas, type SkTypeface} from '@shopify/react-native-skia';

import {coverCrop, type SlotRect} from '../capture/stripLayout';
import {colors} from '../theme';
import type {StickerElement, TextElement} from './types';

// Skia의 FontMgr.System()이 노출하는 시스템 폰트 목록(33개)엔 한글이 포함된
// 패밀리가 하나도 없어서(sans-serif 등은 전부 라틴 전용) drawText가 두부(tofu)
// 박스로만 그려진다. 앱에 이미 번들된 한글 폰트(Jua-Regular)를 직접 로드해서 쓴다.
const JUA_FONT_ASSET = require('../../assets/fonts/Jua-Regular.ttf');

let juaTypefacePromise: Promise<SkTypeface | null> | null = null;

function loadJuaTypeface(): Promise<SkTypeface | null> {
  if (!juaTypefacePromise) {
    juaTypefacePromise = (async () => {
      const uri = Image.resolveAssetSource(JUA_FONT_ASSET)!.uri;
      const data = await Skia.Data.fromURI(uri);
      return Skia.Typeface.MakeFreeTypeFaceFromData(data);
    })();
  }
  return juaTypefacePromise;
}

/**
 * 배경을 사진으로 채운다. 캔버스와 비율이 다르면 가운데 기준으로 잘라
 * 꽉 채운다 (사진 슬롯에 넣을 때와 같은 cover 방식).
 */
export async function drawBackgroundImage(
  canvas: SkCanvas,
  canvasWidth: number,
  canvasHeight: number,
  uri: string,
): Promise<void> {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    return;
  }
  const crop = coverCrop(image.width(), image.height(), canvasWidth, canvasHeight);
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(crop.x, crop.y, crop.width, crop.height),
    Skia.XYWHRect(0, 0, canvasWidth, canvasHeight),
    Skia.Paint(),
  );
}

/**
 * 실제 촬영본은 항상 슬롯 자리를 완전히 덮으므로, 편집 중 미리보기에서도
 * 그 자리를 슬롯색으로 가려야 배경/스티커가 사진에 가려질지 아닐지
 * 헷갈리지 않는다. composeStrip에서 사진을 그리기 직전 자리와 정확히 같다.
 */
export function drawSlotMasks(canvas: SkCanvas, slots: SlotRect[]): void {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(colors.slot));
  for (const slot of slots) {
    canvas.drawRect(Skia.XYWHRect(slot.x, slot.y, slot.width, slot.height), paint);
  }
}

/**
 * 프레임 만들기(renderFrameDesign)와 실제 합성(composeStrip)이 같은 로직으로
 * 스티커·텍스트를 그리게 하려고 뽑아냈다 — 둘 중 하나만 고치고 나머지를
 * 잊어버리는 사고를 막는다.
 */
export async function drawStickerElements(
  canvas: SkCanvas,
  canvasWidth: number,
  canvasHeight: number,
  stickers: StickerElement[],
): Promise<void> {
  for (const sticker of stickers) {
    const data = await Skia.Data.fromURI(sticker.uri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) {
      continue;
    }
    const width = sticker.widthRatio * canvasWidth;
    const height = width / sticker.aspectRatio;
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(
        sticker.xRatio * canvasWidth,
        sticker.yRatio * canvasHeight,
        width,
        height,
      ),
      Skia.Paint(),
    );
  }
}

export async function drawTextElements(
  canvas: SkCanvas,
  canvasWidth: number,
  canvasHeight: number,
  textElements: TextElement[],
): Promise<void> {
  const typeface = await loadJuaTypeface();
  for (const element of textElements) {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(element.color));
    paint.setAntiAlias(true);

    const font = Skia.Font(typeface ?? undefined, element.fontSize);
    canvas.drawText(
      element.content,
      element.xRatio * canvasWidth,
      element.yRatio * canvasHeight,
      paint,
      font,
    );
  }
}

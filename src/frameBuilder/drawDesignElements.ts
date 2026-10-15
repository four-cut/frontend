import {Image} from 'react-native';
import {Skia, type SkCanvas, type SkTypeface} from '@shopify/react-native-skia';

import {coverCrop, type SlotRect} from '../capture/stripLayout';
import {colors} from '../theme';
import {
  splitTextRuns,
  TEXT_FONT_FILES,
  type TextFontFamily,
} from './textFonts';
import type {StickerElement, TextElement} from './types';

// Skia의 FontMgr.System()이 노출하는 시스템 폰트 목록(33개)엔 한글이 포함된
// 패밀리가 하나도 없어서(sans-serif 등은 전부 라틴 전용) 텍스트가 두부(tofu)
// 박스로만 그려진다. 앱에 번들된 서체 파일을 직접 읽어 쓴다. 어느 글자를 어느
// 서체로 그릴지는 편집 화면과 똑같이 textFonts 가 정한다.
const typefaceCache = new Map<TextFontFamily, Promise<SkTypeface | null>>();

function loadTypeface(family: TextFontFamily): Promise<SkTypeface | null> {
  let cached = typefaceCache.get(family);
  if (!cached) {
    cached = (async () => {
      const uri = Image.resolveAssetSource(TEXT_FONT_FILES[family])!.uri;
      const data = await Skia.Data.fromURI(uri);
      return Skia.Typeface.MakeFreeTypeFaceFromData(data);
    })();
    // 실패를 붙잡고 있으면 다음 저장 때도 계속 서체 없이 그려진다.
    cached.catch(() => typefaceCache.delete(family));
    typefaceCache.set(family, cached);
  }
  return cached;
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
  const crop = coverCrop(
    image.width(),
    image.height(),
    canvasWidth,
    canvasHeight,
  );
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(crop.x, crop.y, crop.width, crop.height),
    Skia.XYWHRect(0, 0, canvasWidth, canvasHeight),
    Skia.Paint(),
  );
}

/**
 * 실제 촬영본은 항상 슬롯 자리를 완전히 덮으므로, 편집 중 미리보기에서도
 * 그 자리를 슬롯색으로 가려야 배경이 사진에 가려질지 아닐지 헷갈리지
 * 않는다. 스티커·텍스트는 사진 위에 오므로 이 다음에 그린다.
 * composeStrip에서 사진을 그리는 자리와 정확히 같다.
 */
export function drawSlotMasks(canvas: SkCanvas, slots: SlotRect[]): void {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(colors.slot));
  for (const slot of slots) {
    canvas.drawRect(
      Skia.XYWHRect(slot.x, slot.y, slot.width, slot.height),
      paint,
    );
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

/**
 * 텍스트를 편집 화면과 같은 서체·같은 자리에 그린다.
 *
 * (xRatio, yRatio)는 편집 화면에서 글자 상자의 왼쪽 위다. drawText 는 y 를
 * 글자의 기준선(밑줄 자리)으로 받아서, 저장하면 글자가 한 줄 높이만큼 위로
 * 올라가 있었다. Paragraph 는 줄의 맨 위를 기준으로 그리고 RN Text 처럼
 * 글자 사이 간격(커닝)도 적용해서, 편집 화면과 같은 자리·같은 폭으로 나온다.
 */
export async function drawTextElements(
  canvas: SkCanvas,
  canvasWidth: number,
  canvasHeight: number,
  textElements: TextElement[],
): Promise<void> {
  const runsByElement = textElements.map(element =>
    splitTextRuns(element.content, element.fontWeight),
  );

  // 쓰이는 서체만 읽는다 — 한 글자도 안 쓰는 서체를 3MB씩 읽을 이유가 없다.
  const families = [
    ...new Set(runsByElement.flat().map(run => run.fontFamily)),
  ];
  const provider = Skia.TypefaceFontProvider.Make();
  await Promise.all(
    families.map(async family => {
      const typeface = await loadTypeface(family);
      if (typeface) {
        provider.registerFont(typeface, family);
      }
    }),
  );

  textElements.forEach((element, index) => {
    const builder = Skia.ParagraphBuilder.Make({}, provider);
    for (const run of runsByElement[index]) {
      builder.pushStyle({
        color: Skia.Color(element.color),
        fontSize: element.fontSize,
        fontFamilies: [run.fontFamily],
      });
      builder.addText(run.text);
      builder.pop();
    }
    const paragraph = builder.build();
    // 한 줄짜리라 줄바꿈이 일어나지 않게 폭을 넉넉히 준다.
    paragraph.layout(canvasWidth * 10);
    paragraph.paint(
      canvas,
      element.xRatio * canvasWidth,
      element.yRatio * canvasHeight,
    );
  });
}

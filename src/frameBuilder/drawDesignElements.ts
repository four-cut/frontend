import {Image} from 'react-native';
import {Skia, type SkCanvas, type SkTypeface} from '@shopify/react-native-skia';

import {coverCrop, type SlotRect} from '../capture/stripLayout';
import {getLocale} from '../i18n';
import {colors} from '../theme';
import type {StickerElement, TextElement} from './types';

// Skia의 FontMgr.System()이 노출하는 시스템 폰트 목록(33개)엔 한글이 포함된
// 패밀리가 하나도 없어서(sans-serif 등은 전부 라틴 전용) drawText가 두부(tofu)
// 박스로만 그려진다. 앱에 이미 번들된 폰트를 직접 로드해서 쓴다.
//
// 그리고 Skia의 drawText는 글리프가 없어도 다른 폰트로 대체해 주지 않는다.
// RN의 Text는 OS가 글자마다 대체해 주지만 여기는 아니라서, Jua 하나로 그리면
// 일본어를 입력한 프레임이 통째로 두부로 저장된다. 글자를 보고 맞는 폰트를
// 고른다.
const FONT_ASSETS: Record<TextScript, number> = {
  ko: require('../../assets/fonts/Jua-Regular.ttf'),
  ja: require('../../assets/fonts/ZenMaruGothic-Regular.ttf'),
};

type TextScript = 'ko' | 'ja';

const HANGUL = /[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/;
// 가나와 CJK 한자. 한자는 한국어 한자와 겹치므로 한글을 먼저 본다.
const JAPANESE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f]/;

/** 이 문자열을 어느 폰트로 그릴지. 라틴·숫자뿐이면 앱 언어를 따른다. */
function scriptOf(text: string): TextScript {
  if (HANGUL.test(text)) {
    return 'ko';
  }
  if (JAPANESE.test(text)) {
    return 'ja';
  }
  return getLocale();
}

const typefaceCache: Partial<Record<TextScript, Promise<SkTypeface | null>>> =
  {};

function loadTypeface(script: TextScript): Promise<SkTypeface | null> {
  let cached = typefaceCache[script];
  if (!cached) {
    cached = (async () => {
      const uri = Image.resolveAssetSource(FONT_ASSETS[script])!.uri;
      const data = await Skia.Data.fromURI(uri);
      return Skia.Typeface.MakeFreeTypeFaceFromData(data);
    })();
    typefaceCache[script] = cached;
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
 * 그 자리를 슬롯색으로 가려야 배경/스티커가 사진에 가려질지 아닐지
 * 헷갈리지 않는다. composeStrip에서 사진을 그리기 직전 자리와 정확히 같다.
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

export async function drawTextElements(
  canvas: SkCanvas,
  canvasWidth: number,
  canvasHeight: number,
  textElements: TextElement[],
): Promise<void> {
  // 쓰이는 폰트만 미리 받아 둔다 — 한 글자도 안 쓰는 폰트를 3.8MB씩 읽을
  // 이유가 없다.
  const scripts = [...new Set(textElements.map(e => scriptOf(e.content)))];
  const typefaces = new Map<TextScript, SkTypeface | null>(
    await Promise.all(
      scripts.map(
        async script =>
          [script, await loadTypeface(script)] as [
            TextScript,
            SkTypeface | null,
          ],
      ),
    ),
  );

  for (const element of textElements) {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(element.color));
    paint.setAntiAlias(true);

    const typeface = typefaces.get(scriptOf(element.content));
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

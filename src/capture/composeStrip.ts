import {ImageFormat, Skia} from '@shopify/react-native-skia';

import {
  drawBackgroundImage,
  drawStickerElements,
  drawTextElements,
} from '../frameBuilder/drawDesignElements';
import type {FrameDesign} from '../frameBuilder/types';
import MediaFile from '../specs/NativeMediaFile';
import type {CaptureLayout} from '../state/CaptureSessionContext';
import {drawImageSmooth} from './drawImageSmooth';
import {coverCrop, EXPORT_WIDTH, stripGeometry} from './stripLayout';
import {getStrings} from '../i18n';

/**
 * 출력 배율. 1200×2176 → 2400×4352.
 *
 * 1200 은 4×6인치 300dpi 인쇄 기준(NFR-02)이라 인쇄에는 충분했지만, 폰에
 * 저장한 사진을 확대하면 컷 한 장이 503px 폭이라 금방 뭉개졌다. 2배면 컷이
 * 약 1006px 폭이 된다. 촬영본은 UHD(약 1200만 화소)라 원본은 충분하다.
 *
 * 서피스는 약 42MB(RGBA)다. 사진은 한 장씩 풀고 바로 놓아서 동시에 들고
 * 있는 양을 줄인다.
 */
export const OUTPUT_SCALE = 2;

/** 저장용 JPEG 품질 (0~100). */
const JPEG_QUALITY = 92;

/** 합성 결과의 MIME. 공유·업로드에서 같은 값을 쓴다. */
export const STRIP_MIME = 'image/jpeg';

/**
 * 고른 사진들을 출력 시트 한 장으로 합친다. (SR-07)
 *
 * 화면을 캡처하는 방식이면 결과물이 화면 해상도에 묶여 인쇄 품질(NFR-02)을
 * 낼 수 없다. 그래서 오프스크린 서피스에 직접 그린다.
 *
 * design을 주면 프레임 만들기에서 만든 배경·스티커·텍스트도 같이 그린다 —
 * 배경은 사진 밑, 스티커와 텍스트는 사진 위에 놓는다. 스티커가 사진에
 * 가려지는 것보다 사진 위에 붙어 있는 쪽이 자연스럽다고 정했다.
 *
 * 해상도: 좌표는 EXPORT_WIDTH(1200) 기준 그대로 두고, 그릴 때만 OUTPUT_SCALE
 * 배로 키운다. 서버 프레임 좌표·글자 크기(절대값)·스티커 위치가 모두 1200
 * 기준이라, 캔버스 폭 자체를 바꾸면 글자가 작아지는 식으로 하나씩 틀어진다.
 * 배율만 걸면 전부 그대로 커지고, 사진은 원본에서 다시 뽑아 오므로 더
 * 선명해진다.
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
    Math.round(geometry.width * OUTPUT_SCALE),
    Math.round(geometry.height * OUTPUT_SCALE),
  );
  if (!surface) {
    throw new Error(getStrings().errors.surfaceFailed);
  }

  const canvas = surface.getCanvas();
  // clear 는 배율과 무관하게 서피스 전체를 칠한다.
  canvas.clear(Skia.Color(design?.backgroundColor ?? 'white'));
  canvas.scale(OUTPUT_SCALE, OUTPUT_SCALE);

  if (design?.backgroundImageUri) {
    await drawBackgroundImage(
      canvas,
      geometry.width,
      geometry.height,
      design.backgroundImageUri,
    );
  }

  for (let index = 0; index < photoUris.length; index++) {
    const data = await Skia.Data.fromURI(photoUris[index]);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) {
      // 조용히 건너뛰면 사진이 한 장도 없는 흰 종이가 결과로 나와서
      // 원인을 짚기가 어렵다. 실패로 끊어 화면이 알 수 있게 한다.
      throw new Error(getStrings().errors.photoUnreadable(photoUris[index]));
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

    drawImageSmooth(
      canvas,
      image,
      Skia.XYWHRect(crop.x, crop.y, crop.width, crop.height),
      Skia.XYWHRect(x, y, geometry.slotWidth, geometry.slotHeight),
    );
    // 촬영본 한 장을 풀면 수십 MB 다. 다음 장을 읽기 전에 바로 놓아 준다.
    image.dispose();
  }

  if (design?.stickerElements.length) {
    await drawStickerElements(
      canvas,
      geometry.width,
      geometry.height,
      design.stickerElements,
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
  // PNG 는 무손실이라 사진에는 맞지 않는다. 2배 해상도에서는 10MB 를 넘겨
  // 앨범 용량과 QR 업로드 시간을 크게 잡아먹는다. 눈으로 구분되지 않는
  // 품질(92)의 JPEG 로 저장한다.
  const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, JPEG_QUALITY);
  snapshot.dispose();

  // 앨범 저장과 인쇄가 모두 파일 경로를 받으므로 한 번 떨군다.
  if (MediaFile) {
    return await MediaFile.writeBase64(base64, 'jpg');
  }
  return `data:image/jpeg;base64,${base64}`;
}

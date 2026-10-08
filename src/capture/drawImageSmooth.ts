import {
  FilterMode,
  MipmapMode,
  type SkCanvas,
  type SkImage,
  type SkRect,
} from '@shopify/react-native-skia';

/**
 * 사진을 크기를 바꿔 그릴 때 쓰는 공용 함수.
 *
 * Skia 의 drawImageRect 는 샘플링을 지정하지 않으면 SkSamplingOptions() —
 * 최근접(nearest) 에 밉맵 없음 — 으로 그린다 (react-native-skia
 * cpp/api/JsiSkCanvas.h). 1200만 화소 촬영본을 컷 한 칸 크기로 줄이면
 * 원본 픽셀을 듬성듬성 건너뛰며 골라 오기 때문에 글자·가장자리가 계단처럼
 * 깨지고 화면 전체가 자글자글해진다. 확대해 보면 바로 드러난다.
 *
 * 밉맵 + 선형(트라이리니어) 으로 그리면 축소 배율에 맞는 단계의 이미지에서
 * 주변 픽셀을 섞어 오므로 계단이 사라진다. 래스터 이미지는 Skia 가 필요할 때
 * 밉맵을 만들어 준다(원본의 1/3 정도 메모리가 잠깐 더 든다).
 */
export function drawImageSmooth(
  canvas: SkCanvas,
  image: SkImage,
  src: SkRect,
  dest: SkRect,
): void {
  canvas.drawImageRectOptions(
    image,
    src,
    dest,
    FilterMode.Linear,
    MipmapMode.Linear,
  );
}

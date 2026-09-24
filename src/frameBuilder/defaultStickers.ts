import {Image} from 'react-native';

import {images} from '../assets';
import type {Strings} from '../i18n';
import MediaFile from '../specs/NativeMediaFile';

export type DefaultSticker = {
  id: string;
  /** 이름은 사전 키로 들고 있는다 — 이 목록은 모듈 로드 때 한 번만 만들어진다. */
  labelKey: keyof Strings['stickers'];
  uri: string;
  aspectRatio: number;
};

const logoSource = Image.resolveAssetSource(images.logo)!;

/**
 * 프레임 만들기 "스티커" 시트의 기본 스티커 목록.
 *
 * 지금은 앱 로고 하나뿐이다 — 커스텀 일러스트 에셋이 생기면 여기 추가하면 된다.
 * width/height는 Metro가 번들 시점에 실제 파일에서 읽어 채워주므로 따로
 * 재지 않아도 된다.
 *
 * uri는 RN Image 컴포넌트(썸네일 미리보기)용이다 — 릴리즈 빌드에서는 파일
 * 경로가 아니라 안드로이드 리소스 이름뿐이라(예: "src_assets_images_logo"),
 * Skia로 그릴 때는 resolveStickerUri로 한 번 더 file:// 경로로 바꿔야 한다.
 */
export const DEFAULT_STICKERS: DefaultSticker[] = [
  {
    id: 'logo',
    labelKey: 'logo',
    uri: logoSource.uri,
    aspectRatio: (logoSource.width ?? 1) / (logoSource.height ?? 1),
  },
];

/**
 * 기본 스티커의 uri를 Skia가 읽을 수 있는 file:// 경로로 바꾼다.
 *
 * 개발 모드(Metro)에서는 uri가 이미 http:// 라 그대로 통하지만, 릴리즈
 * 빌드에서는 번들 이미지의 uri가 안드로이드 리소스 이름뿐이라(URI가 아님)
 * Skia.Data.fromURI가 못 연다 — 앨범 사진의 content:// 를 캐시 파일로
 * 바꾸던 것과 같은 이유로, 여기서도 네이티브에서 파일로 한 번 떠준다.
 */
const resolvedUriCache = new Map<string, Promise<string>>();

export function resolveStickerUri(uri: string): Promise<string> {
  // 개발 모드에서는 Metro 가 http:// 로 내려준다. 주석대로 Skia 가 그대로 읽을
  // 수 있는데, 여기서 걸러내지 않으면 copyToCacheFile 로 넘어간다. 네이티브는
  // ContentResolver 로 여는지라 http 를 못 열고 예외가 난다. 그 예외가
  // getBasicFrameDesign 까지 올라가서 "프레임을 불러오지 못했습니다" 로 끝난다
  // — 디버그 빌드에서 베이직 프레임이 아예 적용되지 않던 원인이다.
  const passthrough =
    uri.startsWith('file://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://');
  if (passthrough || !MediaFile) {
    return Promise.resolve(uri);
  }
  let cached = resolvedUriCache.get(uri);
  if (!cached) {
    cached = MediaFile.copyToCacheFile(uri);
    resolvedUriCache.set(uri, cached);
  }
  return cached;
}

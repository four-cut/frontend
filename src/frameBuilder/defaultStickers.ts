import {Image} from 'react-native';

import {images} from '../assets';
import {stickerImages} from '../assets/stickerImages';
import type {Strings} from '../i18n';
import MediaFile from '../specs/NativeMediaFile';

export type DefaultSticker = {
  id: string;
  /** 이름은 사전 키로 들고 있는다 — 이 목록은 모듈 로드 때 한 번만 만들어진다. */
  labelKey: keyof Strings['stickers'];
  /**
   * 같은 종류가 여럿일 때 붙이는 번호 ("고양이 3"). 하나뿐인 종류는 없다.
   * 화면에서 읽어 줄 때 서로 구분이 돼야 해서 붙인다.
   */
  labelIndex?: number;
  uri: string;
  aspectRatio: number;
};

/** 시트에서 잘라 낸 스티커들. 시트에 놓인 순서(읽는 순서) 그대로다. */
const SHEET: {id: string; labelKey: keyof Strings['stickers']; labelIndex?: number}[] = [
  {id: 'bear-1', labelKey: 'bear', labelIndex: 1},
  {id: 'cat-1', labelKey: 'cat', labelIndex: 1},
  {id: 'heart-1', labelKey: 'heart', labelIndex: 1},
  {id: 'cat-2', labelKey: 'cat', labelIndex: 2},
  {id: 'bear-2', labelKey: 'bear', labelIndex: 2},
  {id: 'sparkle-1', labelKey: 'sparkle', labelIndex: 1},
  {id: 'cat-3', labelKey: 'cat', labelIndex: 3},
  {id: 'bear-3', labelKey: 'bear', labelIndex: 3},
  {id: 'sparkle-2', labelKey: 'sparkle', labelIndex: 2},
  {id: 'star-1', labelKey: 'star', labelIndex: 1},
  {id: 'flower-1', labelKey: 'flower', labelIndex: 1},
  {id: 'cherry-1', labelKey: 'cherry', labelIndex: 1},
  {id: 'note-1', labelKey: 'note'},
  {id: 'cool-1', labelKey: 'cool'},
  {id: 'brokenHeart-1', labelKey: 'brokenHeart'},
  {id: 'bear-4', labelKey: 'bear', labelIndex: 4},
  {id: 'fire-1', labelKey: 'fire'},
  {id: 'paw-1', labelKey: 'paw', labelIndex: 1},
  {id: 'cat-4', labelKey: 'cat', labelIndex: 4},
  {id: 'speech-1', labelKey: 'speech'},
  {id: 'lightning-1', labelKey: 'lightning', labelIndex: 1},
  {id: 'duo-1', labelKey: 'duo'},
  {id: 'crown-1', labelKey: 'crown'},
  {id: 'bear-5', labelKey: 'bear', labelIndex: 5},
  {id: 'sparkle-3', labelKey: 'sparkle', labelIndex: 3},
  {id: 'star-2', labelKey: 'star', labelIndex: 2},
  {id: 'cat-5', labelKey: 'cat', labelIndex: 5},
  {id: 'skull-1', labelKey: 'skull', labelIndex: 1},
  {id: 'bear-6', labelKey: 'bear', labelIndex: 6},
  {id: 'love-1', labelKey: 'love'},
  {id: 'cat-6', labelKey: 'cat', labelIndex: 6},
  {id: 'heart-2', labelKey: 'heart', labelIndex: 2},
  {id: 'bow-1', labelKey: 'bow'},
  {id: 'bear-7', labelKey: 'bear', labelIndex: 7},
  {id: 'cat-7', labelKey: 'cat', labelIndex: 7},
  {id: 'sparkle-4', labelKey: 'sparkle', labelIndex: 4},
  {id: 'paw-2', labelKey: 'paw', labelIndex: 2},
  {id: 'bear-8', labelKey: 'bear', labelIndex: 8},
  {id: 'mood-1', labelKey: 'mood'},
  {id: 'lightning-2', labelKey: 'lightning', labelIndex: 2},
  {id: 'cat-8', labelKey: 'cat', labelIndex: 8},
  {id: 'cherry-2', labelKey: 'cherry', labelIndex: 2},
  {id: 'star-3', labelKey: 'star', labelIndex: 3},
  {id: 'bear-9', labelKey: 'bear', labelIndex: 9},
  {id: 'flower-2', labelKey: 'flower', labelIndex: 2},
  {id: 'skull-2', labelKey: 'skull', labelIndex: 2},
];

const logoSource = Image.resolveAssetSource(images.logo)!;

/**
 * 프레임 만들기 "스티커" 시트의 기본 스티커 목록.
 *
 * 앱 로고를 맨 앞에 두고, 그 뒤로 스티커 시트에서 잘라 낸 것들이 온다.
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
  ...SHEET.map(item => {
    const source = Image.resolveAssetSource(
      stickerImages[item.id as keyof typeof stickerImages],
    )!;
    return {
      ...item,
      uri: source.uri,
      aspectRatio: (source.width ?? 1) / (source.height ?? 1),
    };
  }),
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
  // 개발 모드의 Metro http:// 주소는 Skia가 바로 읽는다. 네이티브 복사는
  // ContentResolver라 http를 못 열고 FileNotFoundException이 난다.
  if (/^(file|https?):\/\//.test(uri) || !MediaFile) {
    return Promise.resolve(uri);
  }
  let cached = resolvedUriCache.get(uri);
  if (!cached) {
    cached = MediaFile.copyToCacheFile(uri);
    resolvedUriCache.set(uri, cached);
  }
  return cached;
}

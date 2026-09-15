import {images} from '../assets';
import type {Strings} from '../i18n';

export type TabName = 'Shoot' | 'Gallery';

/**
 * requiresAuth 인 탭은 로그인 전에는 로그인 화면으로 보낸다.
 *
 * 라벨은 문구 대신 사전의 키만 들고 있는다 — 이 배열은 모듈이 로드될 때 한
 * 번만 만들어져서, 여기에 문구를 넣어 두면 언어를 바꿔도 그대로 남는다.
 */
export const TABS = [
  {
    name: 'Shoot' as const,
    labelKey: 'shoot' as keyof Strings['tab'],
    icon: images.tabCamera,
    requiresAuth: false,
  },
  {
    name: 'Gallery' as const,
    labelKey: 'gallery' as keyof Strings['tab'],
    icon: images.tabGallery,
    requiresAuth: true,
  },
];

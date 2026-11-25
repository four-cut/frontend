import {images} from '../assets';
import type {Strings} from '../i18n';

export type TabName = 'Shoot' | 'MyFrames' | 'Gallery';

/**
 * requiresAuth 인 탭은 로그인 전에는 로그인 화면으로 보낸다.
 *
 * 라벨은 문구 대신 사전의 키만 들고 있는다 — 이 배열은 모듈이 로드될 때 한
 * 번만 만들어져서, 여기에 문구를 넣어 두면 언어를 바꿔도 그대로 남는다.
 *
 * requiresAuth 는 as const 로 true/false 를 그대로 둔다. boolean 으로 넓어지면
 * 탭바가 requiresAuth 로 걸러도 tab.name 이 좁혀지지 않아서, 찰칵 탭까지
 * gate 에 넘기는 것으로 보고 타입 검사가 깨진다. 좁혀 두면 로그인이 필요한
 * 탭을 AuthGateTarget 에 빠뜨렸을 때 타입 검사가 잡아 준다.
 */
export const TABS = [
  {
    name: 'Shoot' as const,
    labelKey: 'shoot' as keyof Strings['tab'],
    icon: images.tabCamera,
    requiresAuth: false as const,
  },
  {
    // 프레임은 기기에만 저장되지만 로그인한 사람이 만든 것이다. 로그인 없이
    // 열리면 로그아웃·탈퇴한 뒤에도 그 사람이 만든 프레임이 그대로 보인다.
    // iOS 는 로그인을 요구하지 않아 게이트가 그냥 통과시킨다. (loginPolicy)
    name: 'MyFrames' as const,
    labelKey: 'myFrames' as keyof Strings['tab'],
    icon: images.tabFrame,
    requiresAuth: true as const,
  },
  {
    name: 'Gallery' as const,
    labelKey: 'gallery' as keyof Strings['tab'],
    icon: images.tabGallery,
    requiresAuth: true as const,
  },
];

import {images} from '../assets';

export type TabName = 'Shoot' | 'Gallery';

/** requiresAuth 인 탭은 로그인 전에는 로그인 화면으로 보낸다. */
export const TABS = [
  {
    name: 'Shoot' as const,
    label: '찰칵',
    icon: images.tabCamera,
    requiresAuth: false,
  },
  {
    name: 'Gallery' as const,
    label: '갤러리',
    icon: images.tabGallery,
    requiresAuth: true,
  },
];

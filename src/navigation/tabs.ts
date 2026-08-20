import {images} from '../assets';

export type TabName = 'Shoot' | 'Gallery';

export const TABS = [
  {name: 'Shoot' as const, label: '찰칵', icon: images.tabCamera},
  {name: 'Gallery' as const, label: '갤러리', icon: images.tabGallery},
];

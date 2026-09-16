import {useSyncExternalStore} from 'react';

import {getLocale, getStrings, subscribeLocale, type Locale} from './locale';
import type {Strings} from './ko';

/**
 * 지금 언어. 스토어가 전역이라 Provider 로 감쌀 필요가 없다 — 언어를 쓰는
 * 컴포넌트만 각자 구독하고, 바뀌면 그 컴포넌트만 다시 그려진다.
 */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale);
}

/** 화면에서 쓰는 문자열 묶음. `const t = useT();` 처럼 받아 `t.home.shoot` 로 쓴다. */
export function useT(): Strings {
  return useSyncExternalStore(subscribeLocale, getStrings, getStrings);
}

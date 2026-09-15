import {Settings} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ko from './ko';
import ja from './ja';
import type {Strings} from './ko';

export type Locale = 'ko' | 'ja';

export const LOCALES: Locale[] = ['ko', 'ja'];

/** 언어 선택 화면에 쓰는 이름 — 각 언어를 그 언어로 적는다. */
export const LOCALE_LABEL: Record<Locale, string> = {
  ko: '한국어',
  ja: '日本語',
};

const TABLES: Record<Locale, Strings> = {ko, ja};

const STORAGE_KEY = 'fourcut.locale';

/**
 * 지금 언어를 모듈 수준에 들고 있는다.
 *
 * 화면 밖(스트립 합성, API 호출)에서 던지는 오류 문구도 번역해야 하는데
 * 거기서는 훅을 쓸 수 없다. React 바깥에서도 읽을 수 있게 단순한 스토어로
 * 두고, 화면 쪽은 useSyncExternalStore 로 구독한다.
 */
let current: Locale = 'ko';
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

/** React 바깥에서 문자열이 필요할 때 쓴다. 화면 안에서는 useT() 를 쓸 것. */
export function getStrings(): Strings {
  return TABLES[current];
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function apply(locale: Locale) {
  if (locale === current) {
    return;
  }
  current = locale;
  listeners.forEach(listener => listener());
}

/** 사용자가 고른 언어. 저장까지 한다. */
export async function setLocale(locale: Locale): Promise<void> {
  apply(locale);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // 저장에 실패해도 이번 실행 동안은 고른 언어로 쓴다.
  }
}

function normalize(tag: string | undefined | null): Locale | null {
  if (!tag) {
    return null;
  }
  // "ja_JP", "ja-JP", "ja" 를 모두 받는다.
  const lang = tag.replace('_', '-').split('-')[0].toLowerCase();
  return lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : null;
}

/**
 * 기기 언어를 읽는다. react-native-localize 를 더 넣지 않는다.
 *
 * NativeModules.SettingsManager.settings 를 읽는 흔한 방법은 이 앱에서 쓸 수
 * 없다 — 신 아키텍처(브리지리스)에서는 모듈은 보이는데 constants 가 안 실려서
 * settings 가 통째로 undefined 다. 시뮬레이터를 ja_JP 로 띄워 직접 찍어 본
 * 결과는 이랬다.
 *
 *   SettingsManager=true
 *   settings.AppleLocale=undefined        ← 못 씀
 *   Settings.get(AppleLocale)=ja_JP       ← 됨 (iOS 전용 API)
 *   Intl.DateTimeFormat locale=ja-JP      ← 됨 (양쪽 플랫폼)
 *
 * 그래서 Hermes 가 들고 있는 Intl 을 먼저 본다. iOS 는 Settings 로 한 번 더
 * 받쳐 두고, 둘 다 안 되면 한국어로 둔다.
 */
export function detectDeviceLocale(): Locale {
  try {
    const fromIntl = normalize(Intl.DateTimeFormat().resolvedOptions().locale);
    if (fromIntl) {
      return fromIntl;
    }
  } catch {
    // Intl 이 없는 환경이면 아래로 내려간다.
  }

  try {
    const languages = Settings.get('AppleLanguages');
    return (
      normalize(Settings.get('AppleLocale')) ??
      normalize(Array.isArray(languages) ? languages[0] : undefined) ??
      'ko'
    );
  } catch {
    return 'ko';
  }
}

/**
 * 앱이 뜰 때 한 번 부른다. 저장해 둔 선택이 있으면 그걸, 없으면 기기 언어를
 * 따른다. 일본어 기기에서 처음 켰을 때 한국어로 보이면 안 된다.
 */
export async function initLocale(): Promise<Locale> {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    // 못 읽으면 기기 언어로 간다.
  }
  const resolved = normalize(saved) ?? detectDeviceLocale();
  apply(resolved);
  return resolved;
}

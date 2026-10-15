import type {TextElement} from './types';

/**
 * 프레임 텍스트를 그릴 서체.
 *
 * 편집 화면(RN Text)과 저장·합성(Skia)이 반드시 같은 서체로 같은 자리에
 * 그려야 저장 전후 모습이 같다. 두 쪽 모두 이 파일만 보고 서체를 고른다.
 *
 * - 한글·라틴·숫자는 Pretendard. 한글 11,172자를 전부 갖고 있다. 예전에
 *   쓰던 Jua 는 2,367자뿐이라 '쀠'·'뛔' 같은 쌍자음·겹모음 글자가 저장
 *   결과에서 빈 네모로 깨졌다.
 * - 가나·한자·전각 기호는 Pretendard 에 없어서 일본어 서체로 그린다.
 *   RN 은 없는 글자를 OS 서체로 알아서 바꿔 그리지만 Skia 는 그러지 않아서,
 *   어느 글자를 어느 서체로 그릴지를 여기서 정해 양쪽에 똑같이 넘긴다.
 *
 * 굵기는 서체 파일마다 하나라 세 단계(보통·중간·굵게)만 있다.
 */

/** 굵기 선택지. 서체 파일이 세 굵기뿐이라 이 셋만 고를 수 있다. */
export const TEXT_WEIGHTS = [400, 600, 700] as const;
export type TextWeight = (typeof TEXT_WEIGHTS)[number];

/** 예전에 저장된 500 은 서체 파일이 없어 600 으로 그린다. */
export function normalizeWeight(weight: TextElement['fontWeight']): TextWeight {
  if (weight <= 400) {
    return 400;
  }
  return weight >= 700 ? 700 : 600;
}

export const TEXT_FONT_FAMILIES = {
  ko: {
    400: 'Pretendard-Regular',
    600: 'Pretendard-SemiBold',
    700: 'Pretendard-Bold',
  },
  ja: {
    400: 'ShinRetroMaruGothic-Regular',
    600: 'ShinRetroMaruGothic-Medium',
    700: 'ShinRetroMaruGothic-Bold',
  },
} as const;

export type TextFontFamily =
  (typeof TEXT_FONT_FAMILIES)[keyof typeof TEXT_FONT_FAMILIES][TextWeight];

/** Skia 가 서체 파일을 직접 읽어야 해서 패밀리 이름과 파일을 짝지어 둔다. */
export const TEXT_FONT_FILES: Record<TextFontFamily, number> = {
  'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.ttf'),
  'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.ttf'),
  'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.ttf'),
  'ShinRetroMaruGothic-Regular': require('../../assets/fonts/ShinRetroMaruGothic-Regular.ttf'),
  'ShinRetroMaruGothic-Medium': require('../../assets/fonts/ShinRetroMaruGothic-Medium.ttf'),
  'ShinRetroMaruGothic-Bold': require('../../assets/fonts/ShinRetroMaruGothic-Bold.ttf'),
};

/**
 * Pretendard 에 없는 글자: CJK 기호·구두점, 가나, 한자, 전각·반각 형태.
 * 한글 호환 자모(ㄱ~ㅣ, U+3131~318E)는 Pretendard 에 있으므로 빼야 한다.
 */
const JA_FONT_CHAR =
  /[　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿＀-￯]/;

export type TextRun = {text: string; fontFamily: TextFontFamily};

/**
 * 글자마다 서체를 정해 같은 서체끼리 이어 붙인 조각으로 나눈다.
 * 편집 화면은 조각마다 <Text> 를, Skia 는 조각마다 스타일을 하나씩 쓴다.
 */
export function splitTextRuns(
  content: string,
  weight: TextElement['fontWeight'],
): TextRun[] {
  const normalized = normalizeWeight(weight);
  const runs: TextRun[] = [];
  // for…of 는 코드 포인트 단위라 이모지 같은 서로게이트 쌍을 쪼개지 않는다.
  for (const char of content) {
    const fontFamily =
      TEXT_FONT_FAMILIES[JA_FONT_CHAR.test(char) ? 'ja' : 'ko'][normalized];
    const last = runs[runs.length - 1];
    if (last && last.fontFamily === fontFamily) {
      last.text += char;
    } else {
      runs.push({text: char, fontFamily});
    }
  }
  return runs;
}

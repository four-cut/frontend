/**
 * 임시 폰트다.
 *
 * 시안의 둥근 고딕이 어떤 서체인지 확정되지 않아, 인상이 가장 가까운
 * Jua(SIL OFL, 상업적 사용 가능)를 Google Fonts 에서 받아 넣어 뒀다.
 * 시스템 폰트로 두면 나중에 진짜 서체를 넣을 때 자간·행간이 달라져
 * 모든 화면 레이아웃을 다시 잡아야 하므로, 비슷한 폰트라도 미리 깔아 둔다.
 *
 * 교체할 때는 assets/fonts 에 파일을 넣고 `npx react-native-asset` 을 돌린 뒤
 * 아래 값만 바꾸면 앱 전체에 반영된다.
 *
 * Jua 는 굵기가 하나뿐이라 regular·bold·display 가 모두 같은 파일을 가리킨다.
 *
 * ⚠️ fontFamily 와 fontWeight 를 함께 쓰면 안 된다.
 * 굵기가 하나뿐인 폰트에 fontWeight 를 주면 Android 가 맞는 굵기를 못 찾고
 * 경고 없이 시스템 폰트로 되돌아간다. 화면에는 그냥 기본 고딕으로 보여서
 * 적용된 줄 알기 쉽다. 굵기가 여럿인 폰트로 교체할 때 다시 검토할 것.
 */
const TEMPORARY_FONT = 'Jua-Regular';

/**
 * 일본어 서체 — 新レトロ丸ゴシック(Shin Retro Maru Gothic, SIL OFL) 세 굵기.
 * 文字魚/Typographish 가 BOOTH 에서 배포하는 둥근 고딕으로, Jua 의 둥근
 * 인상과 잘 맞는다.
 *
 * Jua·Pretendard 에는 가나·한자가 한 글자도 없다. 일본어를 그대로 그리면 OS 가
 * 글자마다 시스템 고딕으로 대체해서 화면마다 서체가 섞여 보인다. 그래서
 * 일본어일 때는 components/AppText 가 서체를 통째로 갈아 끼운다.
 *
 * 굵기는 Regular·Medium·Bold 뿐이라 SemiBold 자리에는 Medium 을 쓴다.
 * 배포본 둘 중 "for_adobe" 를 넣었다 — 파일 이름이 PostScript 이름과 같아야
 * 안드로이드(파일 이름)와 iOS(PostScript 이름)에서 같은 문자열로 잡힌다.
 *
 * 한자는 JIS 제1·2수준(약 7,800자)까지다. 화면의 Text 는 그 밖의 글자를
 * OS 가 다른 서체로 대체해 주지만, 프레임 합성(Skia drawText)은 대체가 없어서
 * 사용자가 프레임에 넣은 글자가 그 밖이면 빈 네모로 저장된다.
 *
 * 워드마크도 언어를 따른다 — 한국어 "찍고갈래?"는 Jua, 일본어 「撮ってく？」는
 * 이 서체의 Bold 로 그린다.
 */
const JA_FONT = {
  regular: 'ShinRetroMaruGothic-Regular',
  semibold: 'ShinRetroMaruGothic-Medium',
  bold: 'ShinRetroMaruGothic-Bold',
} as const;

/**
 * 한국어 서체 이름을 일본어일 때 쓸 서체로 바꾼다.
 *
 * 굵기가 있는 서체(Pretendard)는 같은 굵기로 맞춘다. 그래야 굵기로 만든
 * 위계가 일본어에서도 그대로 남는다.
 *
 * Jua 는 파일 이름이 Regular 지만 획이 두꺼운 서체다. Regular 로 보내면
 * 한국어에서 굵게 보이던 제목·버튼이 일본어에서만 가늘어진다 — 앱 글자의
 * 대부분이 Jua 라서 화면 전체가 얇아 보인다. 눈에 보이는 굵기가 가까운
 * Bold 로 보낸다.
 */
export function localeFontFamily(locale: 'ko' | 'ja', source: string): string {
  if (locale === 'ko') {
    return source;
  }
  if (source === TEMPORARY_FONT) {
    return JA_FONT.bold;
  }
  if (source.endsWith('-SemiBold')) {
    return JA_FONT.semibold;
  }
  if (source.endsWith('-Bold')) {
    return JA_FONT.bold;
  }
  return JA_FONT.regular;
}

export const fonts = {
  regular: TEMPORARY_FONT as string | undefined,
  bold: TEMPORARY_FONT as string | undefined,
  /**
   * 로고 워드마크용. 한국어 "찍고갈래?"는 Jua 로, 일본어 「撮ってく？」는
   * components/AppText 가 일본어 서체로 갈아 끼워 그린다.
   */
  display: TEMPORARY_FONT as string | undefined,
};

export const fontSize = {
  tabLabel: 13,
  button: 18,
  wordmark: 54,
  /** 화면 제목 — "안내사항", "사진을 선택해주세요" */
  screenTitle: 34,
  /** 회전 안내처럼 제목만 있는 화면 */
  calloutTitle: 28,
  /** 안내사항 번호 목록 */
  listItem: 21,
  /** 레이아웃 카드 라벨 — "세로형", "가로형" */
  cardLabel: 18,
  /** 촬영 화면 카운트다운 숫자 */
  countdown: 72,
  /** 촬영 진행 카운터 — "5/8" */
  progress: 30,
} as const;

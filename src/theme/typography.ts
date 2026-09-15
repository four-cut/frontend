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
 * 언어별 본문 서체.
 *
 * Jua 에는 가나·한자가 한 글자도 없다(코드포인트 2521개, 전부 한글·라틴).
 * 일본어를 Jua 로 그리면 OS 가 글자마다 시스템 고딕으로 대체해서, 둥근
 * 인상이 사라지고 화면마다 서체가 섞여 보인다. 인상이 가장 가까운
 * Zen Maru Gothic(SIL OFL, 둥근 고딕)을 같이 번들해서 일본어일 때 쓴다.
 *
 * 워드마크("찍고갈래?")는 한국어 그대로 두기로 했으므로 언어와 무관하게
 * 항상 Jua 다 — Zen Maru Gothic 에는 한글이 없다.
 */
export const LOCALE_FONT: Record<'ko' | 'ja', string> = {
  ko: TEMPORARY_FONT,
  ja: 'ZenMaruGothic-Regular',
};

export const fonts = {
  regular: TEMPORARY_FONT as string | undefined,
  bold: TEMPORARY_FONT as string | undefined,
  /**
   * 로고 워드마크("찍고갈래?")용. 언어를 바꿔도 이 값은 바뀌지 않는다 —
   * 워드마크만은 항상 한글이라 Jua 로 그려야 한다. 이 폰트를 쓰는 Text 는
   * components/AppText 가 아니라 react-native 의 Text 를 그대로 써서
   * 언어별 서체 치환을 피한다.
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

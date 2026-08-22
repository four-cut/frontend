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

export const fonts = {
  regular: TEMPORARY_FONT as string | undefined,
  bold: TEMPORARY_FONT as string | undefined,
  /** 로고 워드마크("찍고갈래?")용 라운드 계열 폰트 */
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

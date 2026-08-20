/**
 * 커스텀 폰트는 나중에 추가 예정.
 * assets/fonts 에 파일을 넣고 `npx react-native-asset` 실행한 뒤
 * 아래 값만 실제 폰트 패밀리명으로 바꾸면 앱 전체에 반영된다.
 */
export const fonts = {
  regular: undefined as string | undefined,
  bold: undefined as string | undefined,
  /** 로고 워드마크("찍고갈래?")용 라운드 계열 폰트 */
  display: undefined as string | undefined,
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
} as const;

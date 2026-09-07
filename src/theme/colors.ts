export const colors = {
  background: '#FFFFFF',
  black: '#000000',
  white: '#FFFFFF',
  /** 활성 탭 / 본문 텍스트 */
  textPrimary: '#111111',
  /** 비활성 탭 라벨, 아이콘 */
  textMuted: '#9AA0AC',
  /** 탭바 상단 구분선 */
  divider: '#EDEEF0',
  /**
   * 결과물 이미지의 테두리.
   *
   * 스트립은 배경이 흰색이라 흰 화면 위에 놓으면 경계가 사라져 떠 보인다.
   * 구분선(divider)이나 그보다 살짝 진한 정도로는 1px 로도 거의 안 보여서,
   * 형태가 확실히 잡히는 값으로 잡았다.
   */
  imageBorder: '#C9CDD3',
  /** 아직 사진이 안 들어간 빈 슬롯 — 레이아웃 미리보기, 사진 선택 화면 */
  slot: '#D9D9D9',
} as const;

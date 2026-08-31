export type TextElement = {
  id: string;
  content: string;
  /** 캔버스 폭·높이 대비 비율(0~1). 화면 크기와 무관하게 위치를 저장하려고 절대 좌표 대신 비율을 쓴다. */
  xRatio: number;
  yRatio: number;
  /** EXPORT_WIDTH(1200px) 기준 크기. 화면에는 캔버스 폭에 맞춰 축소해서 그린다. */
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  color: string;
};

export type StickerElement = {
  id: string;
  /** 앨범에서 고른 원본 이미지 경로 (file:// 또는 content://). */
  uri: string;
  /** 원본 이미지의 가로/세로 비율 — 캔버스에 그릴 때 비율이 안 틀어지게 유지한다. */
  aspectRatio: number;
  xRatio: number;
  yRatio: number;
  /** 캔버스 폭 대비 스티커 폭 비율(0~1). */
  widthRatio: number;
};

/**
 * 프레임 만들기에서 완성한 디자인. FrameDetail.design으로 저장돼서
 * 인쇄·저장 화면(composeStrip)에서 촬영본과 합성할 때 그대로 쓰인다.
 */
export type FrameDesign = {
  backgroundColor: string;
  /** 배경을 색 대신 사진으로 채울 때. 있으면 backgroundColor 위에 꽉 채워 덮는다. */
  backgroundImageUri: string | null;
  textElements: TextElement[];
  stickerElements: StickerElement[];
};

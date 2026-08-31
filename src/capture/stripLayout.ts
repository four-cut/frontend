import type {CaptureLayout} from '../state/CaptureSessionContext';

/**
 * 출력 시트의 세로/가로 비율.
 * 레이아웃과 무관하게 시트는 항상 세로다. 시안(Frame-8)의 흰 시트
 * 118 x 214 에서 가져왔다.
 */
export const STRIP_ASPECT = 214 / 118;

/** 시트 폭을 1 로 봤을 때의 비율. 미리보기와 합성이 같은 값을 쓴다. */
const RATIO = {
  padding: 8 / 118,
  gap: 3 / 118,
};

/** 컷 한 장의 가로세로비(w/h). 세로형은 세로 사진, 가로형은 가로 사진. */
const SLOT_ASPECT: Record<CaptureLayout, number> = {
  portrait: 0.66,
  landscape: 2.25,
};

/** 인쇄 기준 폭 — 4x6인치 300dpi. (NFR-02) */
export const EXPORT_WIDTH = 1200;

export type StripGeometry = {
  width: number;
  height: number;
  padding: number;
  gap: number;
  /** 한 행에 들어가는 컷 수 */
  columns: number;
  slotWidth: number;
  slotHeight: number;
};

/** 레이아웃별 슬롯(사진) 개수. CaptureSessionContext의 CUT_COUNT와 같은 값을 유지해야 한다. */
const SLOT_COUNT: Record<CaptureLayout, number> = {
  portrait: 4,
  landscape: 3,
};

export type SlotRect = {x: number; y: number; width: number; height: number};

/**
 * 슬롯(사진이 들어갈 자리)의 픽셀 좌표. composeStrip이 사진을 그리는 위치와
 * 정확히 같은 계산이라, 프레임 만들기 편집 화면·미리보기에서 이 자리를
 * 배경/스티커/텍스트로부터 가려서(마스킹) 실제 결과물과 똑같이 보여줄 수 있다.
 */
export function computeSlotRects(
  layout: CaptureLayout,
  geometry: StripGeometry,
): SlotRect[] {
  return Array.from({length: SLOT_COUNT[layout]}, (_, index) => {
    const column = index % geometry.columns;
    const row = Math.floor(index / geometry.columns);
    return {
      x: geometry.padding + column * (geometry.slotWidth + geometry.gap),
      y: geometry.padding + row * (geometry.slotHeight + geometry.gap),
      width: geometry.slotWidth,
      height: geometry.slotHeight,
    };
  });
}

/**
 * 시트 폭을 주면 나머지 치수를 계산한다.
 * 화면 미리보기는 작은 폭으로, 인쇄용 합성은 EXPORT_WIDTH 로 부른다.
 */
export function stripGeometry(
  layout: CaptureLayout,
  width: number,
): StripGeometry {
  const padding = width * RATIO.padding;
  const gap = width * RATIO.gap;
  const content = width - padding * 2;
  const columns = layout === 'portrait' ? 2 : 1;
  const slotWidth = columns === 2 ? (content - gap) / 2 : content;

  return {
    width,
    height: width * STRIP_ASPECT,
    padding,
    gap,
    columns,
    slotWidth,
    slotHeight: slotWidth / SLOT_ASPECT[layout],
  };
}

/**
 * 원본 사진을 슬롯에 꽉 채워 넣기 위한 잘라내기 영역(cover).
 * 비율이 다르면 가운데를 기준으로 넘치는 쪽을 잘라낸다.
 */
export function coverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    // 원본이 더 넓다 — 좌우를 자른다
    const cropWidth = sourceHeight * targetAspect;
    return {
      x: (sourceWidth - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: sourceHeight,
    };
  }

  // 원본이 더 높다 — 위아래를 자른다
  const cropHeight = sourceWidth / targetAspect;
  return {
    x: 0,
    y: (sourceHeight - cropHeight) / 2,
    width: sourceWidth,
    height: cropHeight,
  };
}

import {apiGet} from './client';
import {EXPORT_WIDTH, stripGeometry} from '../capture/stripLayout';
import type {FrameDesign} from '../frameBuilder/types';

/** 백엔드 FrameOrientation과 맞춘 값. */
export type FrameOrientation = 'PORTRAIT' | 'LANDSCAPE';

/** GET /api/frames 응답 항목. */
export type FrameSummary = {
  frameId: number;
  name: string;
  orientation: FrameOrientation;
  requiredShotCount: number;
  slotCount: number;
  previewImageUrl: string;
};

export type FrameSlot = {
  slotIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** GET /api/frames/{frameId} 응답. */
export type FrameDetail = {
  frameId: number;
  name: string;
  orientation: FrameOrientation;
  canvasWidth: number;
  canvasHeight: number;
  requiredShotCount: number;
  previewImageUrl: string;
  slots: FrameSlot[];
  /** 배경색·텍스트·스티커. 베이직 프레임처럼 없으면 무배경(흰색)으로 합성한다. */
  design?: FrameDesign;
};

/**
 * 실제 프레임 디자인이 팀 내에서 아직 정해지지 않아, 서버(fourcutbackend)
 * 없이도 로컬 목업으로 개발/테스트할 수 있게 해둔 스위치.
 * fourcutbackend의 data.sql 시드와 값을 맞춰뒀다 — 프레임이 정해지면
 * 이 값을 false로 바꾸고 아래 LOCAL_* 을 지우면 된다.
 */
const USE_LOCAL_FRAMES = true;

const LOCAL_FRAMES: FrameSummary[] = [
  {
    frameId: 1,
    name: '베이직 세로형',
    orientation: 'PORTRAIT',
    requiredShotCount: 8,
    slotCount: 4,
    previewImageUrl: '',
  },
  {
    frameId: 2,
    name: '베이직 가로형',
    orientation: 'LANDSCAPE',
    requiredShotCount: 8,
    slotCount: 3,
    previewImageUrl: '',
  },
];

const LOCAL_FRAME_DETAILS: Record<number, FrameDetail> = {
  1: {
    frameId: 1,
    name: '베이직 세로형',
    orientation: 'PORTRAIT',
    canvasWidth: 1200,
    canvasHeight: 2176,
    requiredShotCount: 8,
    previewImageUrl: '',
    slots: [
      {slotIndex: 0, x: 81, y: 81, width: 503, height: 763},
      {slotIndex: 1, x: 614, y: 81, width: 503, height: 763},
      {slotIndex: 2, x: 81, y: 874, width: 503, height: 763},
      {slotIndex: 3, x: 614, y: 874, width: 503, height: 763},
    ],
  },
  2: {
    frameId: 2,
    name: '베이직 가로형',
    orientation: 'LANDSCAPE',
    canvasWidth: 1200,
    canvasHeight: 2176,
    requiredShotCount: 8,
    previewImageUrl: '',
    slots: [
      {slotIndex: 0, x: 81, y: 81, width: 1037, height: 461},
      {slotIndex: 1, x: 81, y: 572, width: 1037, height: 461},
      {slotIndex: 2, x: 81, y: 1063, width: 1037, height: 461},
    ],
  },
};

export function fetchFrames(orientation?: FrameOrientation): Promise<FrameSummary[]> {
  if (USE_LOCAL_FRAMES) {
    const frames = orientation
      ? LOCAL_FRAMES.filter(frame => frame.orientation === orientation)
      : LOCAL_FRAMES;
    return Promise.resolve(frames);
  }

  const query = orientation ? `?orientation=${orientation}` : '';
  return apiGet<FrameSummary[]>(`/api/frames${query}`);
}

/**
 * USE_LOCAL_FRAMES 와 무관하게 항상 서버 목록을 가져온다.
 *
 * 세션은 서버에 실제로 존재하는 frameId 에만 붙일 수 있다. 화면에서 고른
 * 프레임은 지금 목이거나(id 2) 사용자가 방금 만든 것(id 3+)이라 서버에는 없어서
 * 그대로 넘기면 404 가 난다. QR 은 영상만 담고 프레임 장식과는 무관하므로
 * 서버에 있는 아무 프레임에나 세션을 걸면 된다.
 */
export function fetchRemoteFrames(): Promise<FrameSummary[]> {
  return apiGet<FrameSummary[]>('/api/frames');
}

export function fetchFrameDetail(frameId: number): Promise<FrameDetail> {
  if (USE_LOCAL_FRAMES) {
    const detail = LOCAL_FRAME_DETAILS[frameId];
    return detail
      ? Promise.resolve(detail)
      : Promise.reject(new Error(`프레임 ${frameId}을 찾을 수 없습니다.`));
  }

  return apiGet<FrameDetail>(`/api/frames/${frameId}`);
}

/** 세로형·가로형 슬롯 배치는 촬영 화면과 값을 맞춰뒀다. (CUT_COUNT) */
const SLOT_COUNT_BY_ORIENTATION: Record<FrameOrientation, number> = {
  PORTRAIT: 4,
  LANDSCAPE: 3,
};

function buildSlots(orientation: FrameOrientation): FrameSlot[] {
  const layout = orientation === 'PORTRAIT' ? 'portrait' : 'landscape';
  const geometry = stripGeometry(layout, EXPORT_WIDTH);
  const slotCount = SLOT_COUNT_BY_ORIENTATION[orientation];

  return Array.from({length: slotCount}, (_, index) => {
    const column = index % geometry.columns;
    const row = Math.floor(index / geometry.columns);
    return {
      slotIndex: index,
      x: Math.round(geometry.padding + column * (geometry.slotWidth + geometry.gap)),
      y: Math.round(geometry.padding + row * (geometry.slotHeight + geometry.gap)),
      width: Math.round(geometry.slotWidth),
      height: Math.round(geometry.slotHeight),
    };
  });
}

let nextLocalFrameId = LOCAL_FRAMES.length + 1;

/**
 * 프레임 만들기에서 완성한 디자인을 로컬 프레임 목록에 추가한다.
 *
 * 지금은 세션이 살아있는 동안만 유지된다 — 앱을 다시 켜면 사라진다.
 * S3 연동이 붙으면 이 함수 대신 업로드 API를 호출하고, 서버가 내려주는
 * 목록을 그대로 쓰면 된다 (USE_LOCAL_FRAMES를 false로 바꾸는 시점).
 */
export function addLocalFrame(input: {
  name: string;
  orientation: FrameOrientation;
  previewImageUrl: string;
  design: FrameDesign;
}): FrameSummary {
  const frameId = nextLocalFrameId++;
  const slots = buildSlots(input.orientation);

  const summary: FrameSummary = {
    frameId,
    name: input.name,
    orientation: input.orientation,
    requiredShotCount: 8,
    slotCount: slots.length,
    previewImageUrl: input.previewImageUrl,
  };

  LOCAL_FRAMES.push(summary);
  LOCAL_FRAME_DETAILS[frameId] = {
    frameId,
    name: input.name,
    orientation: input.orientation,
    canvasWidth: EXPORT_WIDTH,
    canvasHeight: stripGeometry(
      input.orientation === 'PORTRAIT' ? 'portrait' : 'landscape',
      EXPORT_WIDTH,
    ).height,
    requiredShotCount: 8,
    previewImageUrl: input.previewImageUrl,
    slots,
    design: input.design,
  };

  return summary;
}

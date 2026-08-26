import {apiGet} from './client';

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
    requiredShotCount: 4,
    slotCount: 4,
    previewImageUrl: '',
  },
  {
    frameId: 2,
    name: '베이직 가로형',
    orientation: 'LANDSCAPE',
    requiredShotCount: 3,
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
    requiredShotCount: 4,
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
    requiredShotCount: 3,
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

export function fetchFrameDetail(frameId: number): Promise<FrameDetail> {
  if (USE_LOCAL_FRAMES) {
    const detail = LOCAL_FRAME_DETAILS[frameId];
    return detail
      ? Promise.resolve(detail)
      : Promise.reject(new Error(`프레임 ${frameId}을 찾을 수 없습니다.`));
  }

  return apiGet<FrameDetail>(`/api/frames/${frameId}`);
}

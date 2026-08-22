/**
 * 백엔드 계약. http://fourcut.duckdns.org:8080/v3/api-docs 기준.
 *
 * 서버가 프레임 규격과 합성을 모두 갖고 있다. 클라이언트는 촬영본을 올리고
 * 배치를 알려준 뒤 합성을 요청하는 역할이다.
 */

export type FrameOrientation = 'PORTRAIT' | 'LANDSCAPE';

export type PhotoSessionStatus = 'CREATED' | 'CAPTURED' | 'ARRANGED' | 'COMPOSED';

export type FrameSummary = {
  frameId: number;
  name: string;
  orientation: FrameOrientation;
  requiredShotCount: number;
  slotCount: number;
  previewImageUrl: string;
};

/** 슬롯 좌표는 canvasWidth/canvasHeight 를 기준으로 한 픽셀 값이다. */
export type FrameSlot = {
  slotIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

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

export type SessionCreated = {
  sessionId: string;
  frameId: number;
  requiredShotCount: number;
  expiresAt: string;
};

export type CapturedPhoto = {
  photoId: number;
  shotIndex: number;
  url: string;
};

export type SlotAssignment = {
  slotIndex: number;
  capturedPhotoId: number;
};

export type CompositeImage = {
  imageUrl: string;
};

export type VideoUploaded = {
  videoUrl: string;
  qrCodeUrl: string;
};

export type SessionStatus = {
  sessionId: string;
  status: PhotoSessionStatus;
  frameId: number;
  compositeImageUrl: string | null;
  videoUrl: string | null;
  qrCodeUrl: string | null;
};

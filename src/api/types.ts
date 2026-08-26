/**
 * 촬영 세션 API 계약. https://fourcut.duckdns.org/v3/api-docs 기준.
 *
 * 서버가 프레임 규격과 합성을 모두 갖고 있다. 클라이언트는 촬영본을 올리고
 * 배치를 알려준 뒤 합성을 요청하는 역할이다.
 *
 * 프레임 관련 타입은 `./frames` 한 곳에만 둔다. 같은 모양을 두 군데에
 * 적으면 서버 응답이 바뀔 때 한쪽만 고치게 된다.
 */
export type {
  FrameDetail,
  FrameOrientation,
  FrameSlot,
  FrameSummary,
} from './frames';

export type PhotoSessionStatus =
  | 'CREATED'
  | 'CAPTURED'
  | 'ARRANGED'
  | 'COMPOSED';

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

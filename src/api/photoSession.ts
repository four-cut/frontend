import {apiGet, apiSend, apiUpload} from './client';
import type {
  CapturedPhoto,
  CompositeImage,
  FrameDetail,
  FrameOrientation,
  FrameSummary,
  SessionCreated,
  SessionStatus,
  SlotAssignment,
  VideoUploaded,
} from './types';

/** 프레임 목록. orientation 을 주면 그 방향만 걸러 온다. */
export function getFrames(orientation?: FrameOrientation) {
  const query = orientation ? `?orientation=${orientation}` : '';
  return apiGet<FrameSummary[]>(`/api/frames${query}`);
}

/** 프레임 상세. 캔버스 크기와 슬롯 좌표가 여기 있다. */
export function getFrame(frameId: number) {
  return apiGet<FrameDetail>(`/api/frames/${frameId}`);
}

/** 세션 시작. 프레임이 컷 수(requiredShotCount)를 정한다. */
export function createSession(frameId: number) {
  return apiSend<SessionCreated>('POST', '/api/sessions', {frameId});
}

/** 촬영본 1장 업로드. shotIndex 는 몇 번째로 찍었는지다. */
export function uploadPhoto(
  sessionId: string,
  shotIndex: number,
  fileUri: string,
) {
  return apiUpload<void>(
    `/api/sessions/${sessionId}/photos?shotIndex=${shotIndex}`,
    {uri: fileUri, name: `shot_${shotIndex}.jpg`, type: 'image/jpeg'},
  );
}

/** 업로드된 촬영본 목록. 배치할 때 photoId 가 필요해서 쓴다. */
export function listPhotos(sessionId: string) {
  return apiGet<CapturedPhoto[]>(`/api/sessions/${sessionId}/photos`);
}

/** 어떤 사진을 어느 슬롯에 넣을지 저장한다. */
export function saveArrangement(
  sessionId: string,
  assignments: SlotAssignment[],
) {
  return apiSend<void>('PUT', `/api/sessions/${sessionId}/arrangement`, {
    assignments,
  });
}

/** 서버가 프레임과 사진을 합쳐 완성 이미지를 만든다. */
export function composeSession(sessionId: string) {
  return apiSend<CompositeImage>(
    'POST',
    `/api/sessions/${sessionId}/composite`,
  );
}

/** 촬영 과정 영상 업로드. 서버가 QR 코드까지 만들어 준다. */
export function uploadVideo(
  sessionId: string,
  fileUri: string,
  durationSeconds?: number,
) {
  const query =
    durationSeconds === undefined ? '' : `?durationSeconds=${durationSeconds}`;
  return apiUpload<VideoUploaded>(
    `/api/sessions/${sessionId}/video${query}`,
    {uri: fileUri, name: 'session.mp4', type: 'video/mp4'},
  );
}

/** 세션 상태와 합성/영상/QR URL. */
export function getSession(sessionId: string) {
  return apiGet<SessionStatus>(`/api/sessions/${sessionId}`);
}

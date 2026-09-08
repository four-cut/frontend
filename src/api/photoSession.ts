import {apiGet, apiSend, apiUpload} from './client';
import type {
  CapturedPhoto,
  CompositeImage,
  SessionCreated,
  SessionStatus,
  SlotAssignment,
  VideoUploaded,
} from './types';

/**
 * 촬영 세션 API.
 *
 * 프레임 조회는 `./frames` 의 fetchFrames / fetchFrameDetail 을 쓴다.
 * 그쪽에 서버 없이 개발하기 위한 로컬 목업 스위치가 들어 있어서
 * 여기서 따로 부르면 그 스위치를 우회하게 된다.
 */

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

/**
 * 앱이 Skia 로 만든 최종 스트립을 올린다.
 *
 * QR 다운로드 페이지는 세션에 올라와 있는 것만 버튼으로 보여 준다. 이걸
 * 안 올리면 페이지에 「영상 저장하기」만 뜨고 사진은 받아갈 수 없다.
 *
 * 서버 합성(`POST /composite`)과 같은 자리에 저장된다. 앱은 이미 화면에
 * 보여 준 그림을 그대로 올리므로 서버가 다시 합성할 필요가 없다.
 */
export function uploadCompositeImage(sessionId: string, fileUri: string) {
  return apiUpload<CompositeImage>(
    `/api/sessions/${sessionId}/composite/image`,
    {uri: fileUri, name: 'strip.png', type: 'image/png'},
  );
}

/** 촬영 과정 영상을 올리고 QR 을 받는다. */
export function uploadVideo(
  sessionId: string,
  fileUri: string,
  durationSeconds?: number,
) {
  const query =
    durationSeconds === undefined ? '' : `?durationSeconds=${durationSeconds}`;
  return apiUpload<VideoUploaded>(`/api/sessions/${sessionId}/video${query}`, {
    uri: fileUri,
    name: 'session.mp4',
    type: 'video/mp4',
  });
}

/** 세션 상태와 합성/영상/QR URL. */
export function getSession(sessionId: string) {
  return apiGet<SessionStatus>(`/api/sessions/${sessionId}`);
}

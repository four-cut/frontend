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

/** 촬영 과정 영상 업로드. 서버가 QR 코드까지 만들어 준다. */
/**
 * 촬영 과정 영상을 올리고 QR 을 받는다.
 *
 * 서버가 1 MiB 를 넘는 파일을 거부한다. Spring 기본
 * `spring.servlet.multipart.max-file-size` 가 1MB 인데, 초과분이 413 이 아니라
 * 401 UNAUTHORIZED 로 돌아온다(에러 디스패치가 인증 필요 경로로 잡힌다).
 * 인증 문제로 보이지만 아니다.
 *
 * 2026-08-31 측정: 1,048,000B → 200 / 1,100,000B → 401.
 * 8컷 2배속 영상이 2.3MB 정도라 지금은 항상 걸린다. 서버에서 상한을 올려야
 * 풀린다. (담당: 승균)
 */
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

import VideoSpeed from '../specs/NativeVideoSpeed';

/** 촬영 세션 영상을 몇 배로 돌릴지. (OQ-01) */
export const VIDEO_SPEED_FACTOR = 2;

/**
 * 녹화본을 배속한 새 파일 경로를 돌려준다.
 *
 * 네이티브 모듈을 못 찾거나 변환에 실패하면 원본 경로를 그대로 돌려준다.
 * 영상이 아예 없는 것보다는 등속이라도 남는 편이 낫다.
 */
export async function speedUpSessionVideo(filePath: string): Promise<string> {
  const source = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

  if (!VideoSpeed) {
    return source;
  }

  try {
    return await VideoSpeed.changeSpeed(source, VIDEO_SPEED_FACTOR);
  } catch {
    return source;
  }
}

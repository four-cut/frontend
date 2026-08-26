import {PermissionsAndroid, Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';

/** 저장물이 모이는 앨범 이름. */
export const ALBUM_NAME = '찍고갈래';

/**
 * API 29 부터는 scoped storage 라 앨범에 쓰는 데 권한이 필요 없다.
 * 그 아래에서만 WRITE_EXTERNAL_STORAGE 를 받는다.
 */
async function ensureWritePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (Number(Platform.Version) >= 29) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * 합성한 스트립과 촬영 세션 영상을 앨범에 저장한다. (SR-07)
 *
 * 영상은 없을 수도 있다. 녹화가 실패했거나 아직 배속 변환이 끝나지 않았으면
 * 사진만 저장하고 넘어간다. 사진이라도 남기는 편이 낫다.
 *
 * @returns 실제로 저장한 항목
 */
export async function saveToAlbum(
  stripUri: string,
  videoUri: string | null,
): Promise<{photo: boolean; video: boolean}> {
  if (!stripUri.startsWith('file://')) {
    throw new Error('스트립이 파일로 만들어지지 않아 저장할 수 없습니다.');
  }

  if (!(await ensureWritePermission())) {
    throw new Error('저장 권한이 없습니다.');
  }

  await CameraRoll.saveAsset(stripUri, {type: 'photo', album: ALBUM_NAME});

  let video = false;
  if (videoUri) {
    try {
      await CameraRoll.saveAsset(videoUri, {type: 'video', album: ALBUM_NAME});
      video = true;
    } catch {
      // 사진은 이미 저장됐다. 영상 실패로 전체를 실패로 만들지 않는다.
    }
  }

  return {photo: true, video};
}

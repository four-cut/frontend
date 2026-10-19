import {PermissionsAndroid, Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {getStrings} from '../i18n';

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
 * 사진만 저장하고 넘어간다. 사진이라도 남기는 편이 낫다. 영상은 준비된 뒤
 * saveVideoToAlbum 으로 따로 저장할 수 있다.
 *
 * 이미 앨범에 넣은 영상이면 videoUri 를 null 로 넘긴다 — 프레임을 바꿔 사진을
 * 다시 저장할 때 같은 영상이 두 번 들어가지 않게.
 *
 * @returns 실제로 저장한 항목
 */
export async function saveToAlbum(
  stripUri: string,
  videoUri: string | null,
): Promise<{photo: boolean; video: boolean}> {
  if (!stripUri.startsWith('file://')) {
    throw new Error(getStrings().errors.noSaveTarget);
  }

  if (!(await ensureWritePermission())) {
    throw new Error(getStrings().errors.noSavePermission);
  }

  await CameraRoll.saveAsset(stripUri, {type: 'photo', album: ALBUM_NAME});

  let video = false;
  if (videoUri) {
    try {
      await CameraRoll.saveAsset(videoUri, {
        type: 'video',
        album: ALBUM_NAME,
      });
      video = true;
    } catch {
      // 사진은 이미 저장됐다. 영상 실패로 전체를 실패로 만들지 않는다.
    }
  }

  return {photo: true, video};
}

/** 사진을 먼저 저장한 뒤 준비된 영상만 따로 앨범에 넣는다. */
export async function saveVideoToAlbum(videoUri: string): Promise<void> {
  if (!(await ensureWritePermission())) {
    throw new Error(getStrings().errors.noSavePermission);
  }
  await CameraRoll.saveAsset(videoUri, {type: 'video', album: ALBUM_NAME});
}

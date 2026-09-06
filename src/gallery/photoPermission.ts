import {PermissionsAndroid, Platform} from 'react-native';

/**
 * 앨범을 읽을 권한을 확보한다.
 *
 * iOS 는 CameraRoll 이 처음 접근할 때 시스템이 알아서 물어보므로 여기서
 * 할 일이 없다. Info.plist 의 NSPhotoLibraryUsageDescription 이 그 근거다.
 */
export async function ensurePhotoReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  /**
   * base64 를 캐시 디렉터리의 파일로 쓰고 `file://` 경로를 돌려준다.
   *
   * Skia 합성 결과는 메모리 위의 바이트라 파일이 아니다.
   * 앨범 저장(CameraRoll)과 인쇄 API 모두 파일 경로를 받으므로 한 번 떨궈야 한다.
   *
   * @param base64 `data:image/png;base64,` 접두사가 붙어 있어도 된다.
   * @param extension 확장자. 점은 빼고 넘긴다. 예: `png`
   */
  writeBase64(base64: string, extension: string): Promise<string>;

  /**
   * 파일을 다른 앱으로 공유한다. 공유 시트를 띄우는 데까지가 이 함수의 몫이고,
   * 사용자가 취소해도 성공으로 끝난다.
   *
   * 캐시에 있는 파일을 그대로 넘기면 FileUriExposedException 이 나므로
   * FileProvider 로 content:// 를 만들어 건넨다.
   *
   * @param fileUri `file://` 로 시작하는 로컬 경로.
   * @param mimeType 예: `image/png`
   */
  shareFile(fileUri: string, mimeType: string): Promise<void>;
}

// getEnforcing 이 아니라 get 이다. 모듈이 없는 환경(iOS·jest)에서도
// import 만으로 터지지 않게 하고, 호출부에서 없을 때를 처리한다.
export default TurboModuleRegistry.get<Spec>('MediaFile');

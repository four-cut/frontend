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

  /**
   * content:// 같은 스킴의 이미지를 캐시 디렉터리로 복사하고 `file://` 경로를
   * 돌려준다.
   *
   * Skia의 Data.fromURI는 안드로이드에서 content:// 를 못 읽는다 — java.net.URL이
   * 그 프로토콜을 모른다며 MalformedURLException을 던지는데, 네이티브 쪽에서
   * 이 실패를 조용히 삼켜서 Promise가 영영 안 풀리고 멈춰버린다. 앨범(스티커,
   * 배경 사진)에서 고른 이미지는 항상 content:// 로 오므로, Skia에 넘기기 전에
   * 반드시 이 함수를 거쳐야 한다.
   *
   * @param uri 원본 경로. 이미 file://면 복사 없이 그대로 돌려준다.
   */
  copyToCacheFile(uri: string): Promise<string>;
}

// getEnforcing 이 아니라 get 이다. 모듈이 없는 환경(iOS·jest)에서도
// import 만으로 터지지 않게 하고, 호출부에서 없을 때를 처리한다.
export default TurboModuleRegistry.get<Spec>('MediaFile');

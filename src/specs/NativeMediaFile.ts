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

  /**
   * 임시 파일들을 지우고 실제로 지워진 개수를 돌려준다.
   *
   * 촬영본은 8장을 찍고 그중 4장(가로형은 3장)만 쓴다. 나머지는 캐시에
   * 그대로 남는데, 안드로이드는 저장 공간이 빠듯할 때나 캐시를 비우므로
   * 여러 번 찍으면 계속 쌓인다. (NFR-04)
   *
   * 이미 없는 파일은 실패가 아니다. 세는 데서만 빠진다.
   *
   * 앱의 임시 폴더(Android cacheDir, iOS Caches·tmp) 밖의 경로는 지우지 않고
   * 건너뛴다. 앨범 원본이 섞여 들어와도 지워지지 않게 하는 마지막 안전장치다.
   *
   * @param uris `file://` 로 시작해도 되고 그냥 경로여도 된다.
   */
  deleteFiles(uris: Array<string>): Promise<number>;

  /**
   * 앱 전용 저장 폴더의 `file://` 경로. 안드로이드는 filesDir, iOS 는 Documents.
   *
   * 캐시와 달리 OS 가 임의로 비우지 않는다. 앱을 지우면 같이 지워진다.
   * iOS 는 앱이 업데이트되면 이 경로 자체가 바뀌므로 절대 경로를 저장해 두지
   * 말고 매번 여기서 받아서 조립해야 한다.
   */
  getDocumentDirectory(): Promise<string>;

  /**
   * 파일을 toPath 로 복사한다. toPath 에 이미 파일이 있으면 덮어쓰고,
   * 상위 폴더가 없으면 만든다.
   *
   * @param fromUri `file://` 경로 또는 그냥 경로.
   * @param toPath `file://` 로 시작해도 되고 그냥 경로여도 된다.
   * @returns 복사된 파일의 `file://` 경로
   */
  copyFile(fromUri: string, toPath: string): Promise<string>;

  /** 문자열을 UTF-8 파일로 쓴다. 상위 폴더가 없으면 만든다. */
  writeTextFile(path: string, content: string): Promise<void>;

  readTextFile(path: string): Promise<string>;

  /** 폴더 안 항목 이름들. 폴더가 없으면 빈 배열이다. */
  listDirectory(path: string): Promise<Array<string>>;
}

// getEnforcing 이 아니라 get 이다. 모듈이 없는 환경(iOS·jest)에서도
// import 만으로 터지지 않게 하고, 호출부에서 없을 때를 처리한다.
export default TurboModuleRegistry.get<Spec>('MediaFile');

import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  /**
   * 이미지 한 장을 OS 인쇄 시트로 넘긴다.
   *
   * 인쇄 설정·용지 크기 화면은 OS 가 그려 준다. 앱에서 만들 화면이 아니다.
   * 사용자가 시트를 취소해도 성공으로 끝난다 — 취소는 오류가 아니다.
   *
   * @param fileUri `file://` 로 시작하는 로컬 경로.
   * @param jobName 인쇄 대기열에 표시될 이름.
   */
  printImage(fileUri: string, jobName: string): Promise<void>;
}

// getEnforcing 이 아니라 get 이다. 모듈이 없는 환경(iOS·jest)에서도
// import 만으로 터지지 않게 하고, 호출부에서 없을 때를 처리한다.
export default TurboModuleRegistry.get<Spec>('Print');

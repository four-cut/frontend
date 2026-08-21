import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  /**
   * 영상을 배속해 새 파일로 저장하고 그 경로를 돌려준다.
   *
   * 프레임을 다시 인코딩하지 않고 각 샘플의 표시 시각만 factor 로 나눠
   * 다시 쓴다. 그래서 화질 손실이 없고 처리도 거의 즉시 끝난다.
   *
   * @param inputPath file:// 스킴이 붙어 있어도 된다.
   * @param factor 2 면 2배속.
   */
  changeSpeed(inputPath: string, factor: number): Promise<string>;
}

// getEnforcing 이 아니라 get 이다. 모듈이 없으면 null 이 와서
// 배속만 건너뛰고 등속 영상을 남길 수 있다. jest 환경에서도 그대로 통과한다.
export default TurboModuleRegistry.get<Spec>('VideoSpeed');

/**
 * jest 환경에는 네이티브 모듈이 없다. import 시점에 TurboModule 을 찾다가
 * 실패하므로 최소한으로 대체한다. 앨범 저장은 실기기/에뮬레이터에서 검증한다.
 */
module.exports = {
  CameraRoll: {
    saveAsset: jest.fn(async () => ({
      node: {image: {uri: 'mock://saved'}},
    })),
    save: jest.fn(async () => 'mock://saved'),
  },
};

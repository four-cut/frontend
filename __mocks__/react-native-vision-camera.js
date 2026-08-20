/**
 * jest 환경에는 네이티브 모듈이 없다. vision-camera 를 그대로 import 하면
 * nitro 가 TurboModule 을 찾다가 실패하므로 최소한으로 대체한다.
 *
 * node_modules 패키지의 수동 목은 이 위치에 두면 jest 가 자동으로 쓴다.
 * (jest.mock 호출이 필요 없다)
 */
module.exports = {
  Camera: 'Camera',
  useCameraDevice: () => ({id: 'mock-camera'}),
  useCameraPermission: () => ({
    hasPermission: true,
    requestPermission: jest.fn(),
  }),
  usePhotoOutput: () => ({
    capturePhotoToFile: jest.fn(),
  }),
  useVideoOutput: () => ({
    createRecorder: jest.fn(async () => ({
      isRecording: false,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    })),
  }),
};

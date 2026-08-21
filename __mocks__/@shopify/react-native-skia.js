/**
 * jest 환경에는 Skia 네이티브 바인딩이 없다.
 * 합성 로직은 실기기/에뮬레이터에서 검증하고, 테스트에서는 import 만 통과시킨다.
 */
module.exports = {
  ImageFormat: {JPEG: 3, PNG: 4, WEBP: 6},
  Skia: {
    Surface: {MakeOffscreen: () => null},
    Color: () => 0,
    Paint: () => ({}),
    Data: {fromURI: async () => ({})},
    Image: {MakeImageFromEncoded: () => null},
    XYWHRect: (x, y, width, height) => ({x, y, width, height}),
  },
};

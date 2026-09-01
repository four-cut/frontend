#import <AppSpec/AppSpec.h>

/**
 * src/specs/NativeMediaFile.ts 의 iOS 구현.
 *
 * 안드로이드에만 있고 iOS 에는 없어서, TurboModuleRegistry.get 이 null 을
 * 돌려주고 호출부가 조용히 대체 경로로 빠지고 있었다. 그 결과 합성 결과가
 * 파일 대신 data URI 로 나와 미리보기가 빈 칸으로 보였다.
 */
@interface MediaFileModule : NSObject <NativeMediaFileSpec>
@end

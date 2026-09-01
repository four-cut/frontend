#import <AppSpec/AppSpec.h>

/**
 * src/specs/NativePrint.ts 의 iOS 구현.
 *
 * 인쇄 설정·용지 선택 화면은 OS 가 그려 준다. 앱이 만들 화면이 아니다. (EXT-01)
 */
@interface PrintModule : NSObject <NativePrintSpec>
@end

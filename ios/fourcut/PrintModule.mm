#import "PrintModule.h"

#import <UIKit/UIKit.h>

static NSString *const kPrintErrorCode = @"PRINT_FAILED";

@implementation PrintModule

RCT_EXPORT_MODULE(Print)

/** 인쇄 시트를 올릴 최상단 화면. 모달이 떠 있으면 그 위에 올려야 한다. */
static UIViewController *TopViewControllerForPrint(void) {
  UIWindow *window = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class]) {
      continue;
    }
    for (UIWindow *candidate in ((UIWindowScene *)scene).windows) {
      if (candidate.isKeyWindow) {
        window = candidate;
        break;
      }
    }
    if (window != nil) {
      break;
    }
  }

  UIViewController *controller = window.rootViewController;
  while (controller.presentedViewController != nil) {
    controller = controller.presentedViewController;
  }
  return controller;
}

- (void)printImage:(NSString *)fileUri
           jobName:(NSString *)jobName
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  NSURL *url = [fileUri hasPrefix:@"file://"]
                   ? [NSURL URLWithString:fileUri]
                   : [NSURL fileURLWithPath:fileUri];
  if (url == nil) {
    reject(kPrintErrorCode, @"인쇄할 파일 경로가 올바르지 않습니다.", nil);
    return;
  }

  // 시트를 띄우고 난 뒤에는 실패를 돌려줄 방법이 없으므로,
  // 읽히지 않는 이미지는 여기서 먼저 걸러 낸다.
  UIImage *image = [UIImage imageWithContentsOfFile:url.path];
  if (image == nil) {
    reject(kPrintErrorCode, @"이미지를 읽지 못했습니다.", nil);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    UIPrintInteractionController *controller =
        UIPrintInteractionController.sharedPrintController;

    UIPrintInfo *info = UIPrintInfo.printInfo;
    info.outputType = UIPrintInfoOutputPhoto;
    info.jobName = jobName;
    controller.printInfo = info;
    controller.printingItem = image;
    // 사진이 잘리지 않게 용지에 맞춘다. Android 의 SCALE_MODE_FIT 과 같은 뜻이다.
    controller.showsPaperSelectionForLoadedPapers = YES;

    void (^completion)(UIPrintInteractionController *, BOOL, NSError *) =
        ^(UIPrintInteractionController *_, BOOL completed, NSError *error) {
          // 여기서는 아무것도 하지 않는다. 아래에서 이미 resolve 했다.
          // 취소(completed == NO)는 오류가 아니라는 게 스펙이다.
        };

    UIViewController *presenter = TopViewControllerForPrint();
    if (UIDevice.currentDevice.userInterfaceIdiom == UIUserInterfaceIdiomPad &&
        presenter != nil) {
      // iPad 는 표시 기준점이 없으면 예외를 던지며 죽는다.
      CGRect anchor = CGRectMake(CGRectGetMidX(presenter.view.bounds),
                                 CGRectGetMaxY(presenter.view.bounds), 0, 0);
      [controller presentFromRect:anchor
                           inView:presenter.view
                         animated:YES
                completionHandler:completion];
    } else {
      [controller presentAnimated:YES completionHandler:completion];
    }

    // 시트를 띄우는 데까지가 이 함수의 몫이다 — Android 구현과 같은 시점에 끝낸다.
    resolve(nil);
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativePrintSpecJSI>(params);
}

@end

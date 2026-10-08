#import "MediaFileModule.h"

#import <Photos/Photos.h>
#import <UIKit/UIKit.h>

@implementation MediaFileModule

RCT_EXPORT_MODULE(MediaFile)

/** 캐시 디렉터리. 앱이 지워지면 같이 사라지고, 용량이 부족하면 OS 가 정리한다. */
static NSURL *CacheDirectory(void) {
  NSArray<NSURL *> *urls = [NSFileManager.defaultManager
      URLsForDirectory:NSCachesDirectory
             inDomains:NSUserDomainMask];
  return urls.firstObject;
}

/** 공유 시트를 올릴 최상단 화면. 모달이 떠 있으면 그 위에 올려야 한다. */
static UIViewController *TopViewController(void) {
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

/** `data:image/png;base64,` 접두사가 붙어 있어도 되도록 뒤쪽만 떼어 쓴다. */
static NSString *StripDataUriPrefix(NSString *value) {
  if (![value hasPrefix:@"data:"]) {
    return value;
  }
  NSRange comma = [value rangeOfString:@","];
  if (comma.location == NSNotFound) {
    return value;
  }
  return [value substringFromIndex:comma.location + 1];
}

- (void)writeBase64:(NSString *)base64
          extension:(NSString *)extension
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  NSData *data = [[NSData alloc]
      initWithBase64EncodedString:StripDataUriPrefix(base64)
                          options:NSDataBase64DecodingIgnoreUnknownCharacters];
  if (data == nil) {
    reject(@"E_DECODE", @"base64 를 해석하지 못했습니다", nil);
    return;
  }

  NSString *name = [NSString stringWithFormat:@"%@.%@",
                                              NSUUID.UUID.UUIDString,
                                              extension];
  NSURL *target = [CacheDirectory() URLByAppendingPathComponent:name];

  NSError *error = nil;
  if (![data writeToURL:target options:NSDataWritingAtomic error:&error]) {
    reject(@"E_WRITE", error.localizedDescription ?: @"파일을 쓰지 못했습니다",
           error);
    return;
  }
  // absoluteString 이 file:// 을 포함한다. 호출부가 그 형태를 기대한다.
  resolve(target.absoluteString);
}

- (void)shareFile:(NSString *)fileUri
         mimeType:(NSString *)mimeType
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  // iOS 는 확장자로 타입을 판단해서 mimeType 을 쓰지 않는다.
  NSURL *url = [NSURL URLWithString:fileUri];
  if (url == nil) {
    reject(@"E_URI", @"공유할 파일 경로가 올바르지 않습니다", nil);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    UIViewController *presenter = TopViewController();
    if (presenter == nil) {
      reject(@"E_NO_VC", @"공유 시트를 띄울 화면을 찾지 못했습니다", nil);
      return;
    }

    UIActivityViewController *sheet = [[UIActivityViewController alloc]
        initWithActivityItems:@[url]
        applicationActivities:nil];

    // iPad 는 표시 기준점이 없으면 예외를 던지며 죽는다.
    UIPopoverPresentationController *popover =
        sheet.popoverPresentationController;
    if (popover != nil) {
      popover.sourceView = presenter.view;
      popover.sourceRect =
          CGRectMake(CGRectGetMidX(presenter.view.bounds),
                     CGRectGetMaxY(presenter.view.bounds), 0, 0);
      popover.permittedArrowDirections = 0;
    }

    // 사용자가 취소해도 성공으로 끝난다 — 스펙에 그렇게 적혀 있다.
    [presenter presentViewController:sheet
                            animated:YES
                          completion:^{
                            resolve(nil);
                          }];
  });
}

/**
 * 바이트 앞머리를 보고 확장자를 정한다.
 *
 * uti 를 못 받는 경로(원격 URL 복사 등)도 있어서, 확장자를 무조건 jpg 로
 * 붙이면 PNG 가 .jpg 로 저장된다. Skia 는 내용을 보고 판단해서 상관없지만,
 * 이 파일이 공유나 앨범 저장으로 넘어가면 확장자를 믿는 쪽이 잘못 읽는다.
 */
static NSString *ExtensionForData(NSData *data) {
  const unsigned char *bytes = (const unsigned char *)data.bytes;
  const NSUInteger length = data.length;

  if (length >= 8 && bytes[0] == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' &&
      bytes[3] == 'G') {
    return @"png";
  }
  if (length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) {
    return @"jpg";
  }
  if (length >= 6 && memcmp(bytes, "GIF8", 4) == 0) {
    return @"gif";
  }
  if (length >= 12 && memcmp(bytes, "RIFF", 4) == 0 &&
      memcmp(bytes + 8, "WEBP", 4) == 0) {
    return @"webp";
  }
  // 못 알아보면 jpg 로 둔다. 대부분의 사진이 jpg 다.
  return @"jpg";
}

/**
 * 캐시에 바이트를 쓰고 file:// 경로를 돌려준다.
 *
 * HEIC 는 JPEG 로 바꿔서 쓴다. Skia 가 HEIC 를 디코딩하지 못해서,
 * 그대로 두면 합성 때 이 사진만 조용히 빠진다.
 */
static NSString *WriteToCache(NSData *data, NSString *uti, NSError **error) {
  NSData *payload = data;
  NSString *extension;

  BOOL isHeic = uti != nil && ([uti isEqualToString:@"public.heic"] ||
                               [uti hasPrefix:@"public.heif"]);
  if (isHeic) {
    UIImage *image = [UIImage imageWithData:data];
    NSData *jpeg = image != nil ? UIImageJPEGRepresentation(image, 0.95) : nil;
    if (jpeg == nil) {
      if (error != NULL) {
        *error = [NSError errorWithDomain:@"MediaFile"
                                     code:1
                                 userInfo:@{NSLocalizedDescriptionKey :
                                                @"HEIC 를 변환하지 못했습니다"}];
      }
      return nil;
    }
    payload = jpeg;
    extension = @"jpg";
  } else {
    extension = ExtensionForData(data);
  }

  NSString *name = [NSString stringWithFormat:@"%@.%@", NSUUID.UUID.UUIDString,
                                              extension];
  NSURL *target = [CacheDirectory() URLByAppendingPathComponent:name];
  if (![payload writeToURL:target options:NSDataWritingAtomic error:error]) {
    return nil;
  }
  return target.absoluteString;
}

- (void)copyToCacheFile:(NSString *)uri
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  // 이미 파일이면 복사할 이유가 없다.
  if ([uri hasPrefix:@"file://"] || [uri hasPrefix:@"/"]) {
    resolve(uri);
    return;
  }

  // 앨범에서 고른 사진은 ph://<localIdentifier> 로 온다. localIdentifier 자체가
  // "UUID/L0/001" 처럼 슬래시를 포함하므로 ph:// 뒤를 통째로 써야 한다.
  // 일반 파일 API 로는 못 읽어서 PhotoKit 을 거친다.
  if ([uri hasPrefix:@"ph://"]) {
    NSString *identifier = [uri substringFromIndex:@"ph://".length];
    PHAsset *asset =
        [PHAsset fetchAssetsWithLocalIdentifiers:@[ identifier ] options:nil]
            .firstObject;
    if (asset == nil) {
      // 일부 버전은 뒤에 /L0/001 을 덧붙인다. 앞부분만으로 한 번 더 찾는다.
      NSRange slash = [identifier rangeOfString:@"/"];
      if (slash.location != NSNotFound) {
        NSString *head = [identifier substringToIndex:slash.location];
        asset = [PHAsset fetchAssetsWithLocalIdentifiers:@[ head ] options:nil]
                    .firstObject;
      }
    }
    if (asset == nil) {
      reject(@"E_ASSET", @"사진을 찾지 못했습니다", nil);
      return;
    }

    PHImageRequestOptions *options = [PHImageRequestOptions new];
    options.networkAccessAllowed = YES;  // iCloud 사진도 받아 온다
    options.synchronous = NO;
    options.version = PHImageRequestOptionsVersionCurrent;

    [PHImageManager.defaultManager
        requestImageDataAndOrientationForAsset:asset
                                       options:options
                                 resultHandler:^(NSData *data, NSString *uti,
                                                 CGImagePropertyOrientation _,
                                                 NSDictionary *info) {
                                   if (data == nil) {
                                     reject(@"E_READ",
                                            @"사진을 읽지 못했습니다",
                                            info[PHImageErrorKey]);
                                     return;
                                   }
                                   NSError *error = nil;
                                   NSString *path =
                                       WriteToCache(data, uti, &error);
                                   if (path == nil) {
                                     reject(@"E_WRITE",
                                            error.localizedDescription
                                                ?: @"파일을 쓰지 못했습니다",
                                            error);
                                     return;
                                   }
                                   resolve(path);
                                 }];
    return;
  }

  NSURL *source = [NSURL URLWithString:uri];
  if (source == nil) {
    reject(@"E_URI", @"복사할 경로가 올바르지 않습니다", nil);
    return;
  }

  NSError *error = nil;
  NSData *data = [NSData dataWithContentsOfURL:source options:0 error:&error];
  if (data == nil) {
    reject(@"E_READ", error.localizedDescription ?: @"파일을 읽지 못했습니다",
           error);
    return;
  }

  NSString *path = WriteToCache(data, nil, &error);
  if (path == nil) {
    reject(@"E_WRITE", error.localizedDescription ?: @"파일을 쓰지 못했습니다",
           error);
    return;
  }
  resolve(path);
}

- (void)deleteFiles:(NSArray *)uris
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  NSFileManager *manager = [NSFileManager defaultManager];
  NSInteger removed = 0;

  // 앱의 임시 폴더 밖은 절대 지우지 않는다 (Android 와 같은 이유 — 앨범 원본을
  // 지울 위험). 합성·배속 결과는 Caches 에, 카메라 촬영본은 tmp 에 생긴다.
  // /var 와 /private/var 가 같은 곳이라 둘 다 심볼릭 링크를 풀어서 비교한다.
  NSString *caches =
      NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES)
          .firstObject;
  NSMutableArray<NSString *> *roots = [NSMutableArray array];
  for (NSString *root in @[ caches ?: @"", NSTemporaryDirectory() ]) {
    if (root.length > 0) {
      [roots addObject:[[root stringByResolvingSymlinksInPath]
                           stringByAppendingString:@"/"]];
    }
  }

  for (id entry in uris) {
    if (![entry isKindOfClass:[NSString class]]) {
      continue;
    }
    NSString *raw = (NSString *)entry;
    NSString *path = [raw hasPrefix:@"file://"] ? [NSURL URLWithString:raw].path : raw;
    if (path == nil) {
      continue;
    }
    NSString *resolved = [path stringByResolvingSymlinksInPath];
    BOOL inside = NO;
    for (NSString *root in roots) {
      if ([resolved hasPrefix:root]) {
        inside = YES;
        break;
      }
    }
    if (!inside) {
      continue;
    }
    // 이미 없는 파일은 실패가 아니다. 지워진 것만 센다.
    if ([manager removeItemAtPath:path error:nil]) {
      removed++;
    }
  }

  resolve(@(removed));
}

/** `file://` 로 오든 그냥 경로로 오든 파일 시스템 경로로 바꾼다. */
static NSString *PathFromUriOrPath(NSString *value) {
  if ([value hasPrefix:@"file://"]) {
    return [NSURL URLWithString:value].path;
  }
  return value;
}

static BOOL EnsureParentDirectory(NSString *path, NSError **error) {
  return [NSFileManager.defaultManager
            createDirectoryAtPath:path.stringByDeletingLastPathComponent
      withIntermediateDirectories:YES
                       attributes:nil
                            error:error];
}

- (void)getDocumentDirectory:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
  NSURL *url = [NSFileManager.defaultManager
                   URLsForDirectory:NSDocumentDirectory
                          inDomains:NSUserDomainMask]
                   .firstObject;
  if (url == nil) {
    reject(@"E_DIR", @"앱 저장 폴더를 찾지 못했습니다", nil);
    return;
  }
  resolve(url.absoluteString);
}

- (void)copyFile:(NSString *)fromUri
          toPath:(NSString *)toPath
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  NSFileManager *manager = NSFileManager.defaultManager;
  NSString *source = PathFromUriOrPath(fromUri);
  NSString *target = PathFromUriOrPath(toPath);
  if (source == nil || ![manager fileExistsAtPath:source]) {
    reject(@"E_READ", @"복사할 파일을 찾을 수 없습니다", nil);
    return;
  }

  NSError *error = nil;
  if (!EnsureParentDirectory(target, &error)) {
    reject(@"E_WRITE", error.localizedDescription, error);
    return;
  }
  // copyItemAtPath 는 대상이 이미 있으면 실패한다. 덮어쓰기로 맞춘다.
  [manager removeItemAtPath:target error:nil];
  if (![manager copyItemAtPath:source toPath:target error:&error]) {
    reject(@"E_WRITE", error.localizedDescription ?: @"파일을 복사하지 못했습니다",
           error);
    return;
  }
  resolve([NSURL fileURLWithPath:target].absoluteString);
}

- (void)writeTextFile:(NSString *)path
              content:(NSString *)content
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  NSString *target = PathFromUriOrPath(path);
  NSError *error = nil;
  if (!EnsureParentDirectory(target, &error) ||
      ![content writeToFile:target
                 atomically:YES
                   encoding:NSUTF8StringEncoding
                      error:&error]) {
    reject(@"E_WRITE", error.localizedDescription ?: @"파일을 쓰지 못했습니다",
           error);
    return;
  }
  resolve(nil);
}

- (void)readTextFile:(NSString *)path
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  NSError *error = nil;
  NSString *content = [NSString stringWithContentsOfFile:PathFromUriOrPath(path)
                                                encoding:NSUTF8StringEncoding
                                                   error:&error];
  if (content == nil) {
    reject(@"E_READ", error.localizedDescription ?: @"파일을 읽지 못했습니다",
           error);
    return;
  }
  resolve(content);
}

- (void)listDirectory:(NSString *)path
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  NSArray<NSString *> *names = [NSFileManager.defaultManager
      contentsOfDirectoryAtPath:PathFromUriOrPath(path)
                          error:nil];
  // 폴더가 아직 없으면 nil 이 온다. 저장된 게 없는 것과 같다.
  resolve([names ?: @[] sortedArrayUsingSelector:@selector(compare:)]);
}

- (void)deleteDirectory:(NSString *)path
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  NSFileManager *manager = NSFileManager.defaultManager;
  // 없는 경로는 심볼릭 링크(/var → /private/var)가 풀리지 않아 아래 앞부분
  // 비교가 어긋난다. 지울 게 없으면 비교 전에 성공으로 끝낸다.
  if (![manager fileExistsAtPath:PathFromUriOrPath(path)]) {
    resolve(nil);
    return;
  }
  NSString *documents = [manager URLsForDirectory:NSDocumentDirectory
                                        inDomains:NSUserDomainMask]
                            .firstObject.path.stringByResolvingSymlinksInPath;
  NSString *target = PathFromUriOrPath(path).stringByStandardizingPath
                         .stringByResolvingSymlinksInPath;
  // Documents 바로 아래부터만 지운다. Documents 자체나 그 밖은 거절한다.
  NSString *root = [documents stringByAppendingString:@"/"];
  if (documents == nil || ![target hasPrefix:root]) {
    reject(@"MEDIA_FILE_DELETE_FAILED",
           [NSString stringWithFormat:@"앱 저장 폴더 밖은 지울 수 없습니다: %@", path],
           nil);
    return;
  }
  // 파일을 하나씩 지우다 중간에 실패하면 반쯤 지워진 폴더가 남는다. 먼저
  // 점(.)으로 시작하는 이름으로 통째로 옮겨서 한 번에 "없는 것"으로 만든
  // 뒤 지운다. 옮긴 뒤 지우다 실패한 찌꺼기는 목록에서 보이지 않는다.
  NSString *trash = [target.stringByDeletingLastPathComponent
      stringByAppendingPathComponent:
          [NSString stringWithFormat:@".trash-%@-%lld",
                                     target.lastPathComponent,
                                     (long long)(NSDate.date.timeIntervalSince1970 * 1000)]];
  BOOL moved = [manager moveItemAtPath:target toPath:trash error:nil];
  NSError *error = nil;
  if (![manager removeItemAtPath:(moved ? trash : target) error:&error] && !moved) {
    reject(@"MEDIA_FILE_DELETE_FAILED", error.localizedDescription, error);
    return;
  }
  resolve(nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeMediaFileSpecJSI>(params);
}

@end

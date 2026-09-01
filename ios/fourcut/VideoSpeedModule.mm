#import "VideoSpeedModule.h"

#import <AVFoundation/AVFoundation.h>

static NSString *const kSpeedErrorCode = @"VIDEO_SPEED_FAILED";

/** 정의는 파일 아래에 있다. 사용 지점보다 뒤라 미리 선언해 둔다. */
static CMSampleBufferRef CopyWithScaledTiming(CMSampleBufferRef sample,
                                              double factor,
                                              NSString **failure);

@implementation VideoSpeedModule

RCT_EXPORT_MODULE(VideoSpeed)

/**
 * 프레임을 다시 인코딩하지 않고 각 샘플의 표시 시각만 다시 쓴다.
 *
 * AVAssetExportSession 의 Passthrough 프리셋은 시간 조절을 지원하지 않고,
 * 다른 프리셋은 전부 재인코딩이라 화질이 깎인다. 그래서 리더/라이터로
 * 압축된 샘플을 그대로 옮기면서 타임스탬프만 손본다.
 * Android 의 MediaExtractor + MediaMuxer 구현과 같은 접근이다.
 *
 * 오디오 트랙은 옮기지 않는다. 배속하면 음이 변하는 데다 촬영 자체를
 * 무음으로 하고 있어서 담을 소리도 없다.
 */
- (void)changeSpeed:(NSString *)inputPath
             factor:(double)factor
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  if (factor <= 0) {
    reject(kSpeedErrorCode,
           [NSString stringWithFormat:@"배속 값은 0보다 커야 합니다: %g", factor],
           nil);
    return;
  }

  NSURL *inputURL = [inputPath hasPrefix:@"file://"]
                        ? [NSURL URLWithString:inputPath]
                        : [NSURL fileURLWithPath:inputPath];
  if (inputURL == nil ||
      ![NSFileManager.defaultManager fileExistsAtPath:inputURL.path]) {
    reject(kSpeedErrorCode,
           [NSString stringWithFormat:@"영상 파일을 찾을 수 없습니다: %@",
                                      inputPath],
           nil);
    return;
  }

  // 인코딩은 안 하지만 파일 전체를 훑으므로 메인 스레드에서 하지 않는다.
  dispatch_async(
      dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        [self rewriteTimestampsFrom:inputURL
                             factor:factor
                            resolve:resolve
                             reject:reject];
      });
}

- (void)rewriteTimestampsFrom:(NSURL *)inputURL
                       factor:(double)factor
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:inputURL options:nil];
  AVAssetTrack *videoTrack =
      [asset tracksWithMediaType:AVMediaTypeVideo].firstObject;
  if (videoTrack == nil) {
    reject(kSpeedErrorCode, @"영상 트랙이 없습니다.", nil);
    return;
  }

  NSError *error = nil;
  AVAssetReader *reader = [AVAssetReader assetReaderWithAsset:asset
                                                        error:&error];
  if (reader == nil) {
    reject(kSpeedErrorCode, error.localizedDescription, error);
    return;
  }

  // outputSettings 가 nil 이면 디코딩하지 않고 압축된 샘플을 그대로 준다.
  AVAssetReaderTrackOutput *output =
      [AVAssetReaderTrackOutput assetReaderTrackOutputWithTrack:videoTrack
                                                outputSettings:nil];
  if (![reader canAddOutput:output]) {
    reject(kSpeedErrorCode, @"영상 트랙을 읽을 수 없습니다.", nil);
    return;
  }
  [reader addOutput:output];

  NSString *name = [NSString
      stringWithFormat:@"speed_%@.mp4", NSUUID.UUID.UUIDString];
  NSURL *outputURL = [[NSFileManager.defaultManager
      URLsForDirectory:NSCachesDirectory
             inDomains:NSUserDomainMask].firstObject
      URLByAppendingPathComponent:name];

  AVAssetWriter *writer = [AVAssetWriter assetWriterWithURL:outputURL
                                                  fileType:AVFileTypeMPEG4
                                                     error:&error];
  if (writer == nil) {
    reject(kSpeedErrorCode, error.localizedDescription, error);
    return;
  }

  // sourceFormatHint 로 원본 포맷을 그대로 물려준다.
  CMFormatDescriptionRef format =
      (__bridge CMFormatDescriptionRef)videoTrack.formatDescriptions.firstObject;
  AVAssetWriterInput *input =
      [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo
                                         outputSettings:nil
                                       sourceFormatHint:format];
  input.expectsMediaDataInRealTime = NO;
  // 촬영 방향을 잃지 않는다. Android 의 setOrientationHint 에 대응한다.
  input.transform = videoTrack.preferredTransform;
  if (![writer canAddInput:input]) {
    reject(kSpeedErrorCode, @"영상 트랙을 쓸 수 없습니다.", nil);
    return;
  }
  [writer addInput:input];

  if (![reader startReading]) {
    reject(kSpeedErrorCode, reader.error.localizedDescription, reader.error);
    return;
  }
  if (![writer startWriting]) {
    [reader cancelReading];
    reject(kSpeedErrorCode, writer.error.localizedDescription, writer.error);
    return;
  }
  [writer startSessionAtSourceTime:kCMTimeZero];

  dispatch_queue_t queue =
      dispatch_queue_create("com.fourcut.videospeed", DISPATCH_QUEUE_SERIAL);

  [input requestMediaDataWhenReadyOnQueue:queue
                               usingBlock:^{
    while (input.isReadyForMoreMediaData) {
      CMSampleBufferRef sample = [output copyNextSampleBuffer];
      if (sample == NULL) {
        // 더 읽을 게 없다. 읽기가 실패해서 끝난 경우와 구분한다.
        [input markAsFinished];
        if (reader.status == AVAssetReaderStatusFailed) {
          [writer cancelWriting];
          reject(kSpeedErrorCode, reader.error.localizedDescription,
                 reader.error);
          return;
        }
        [writer finishWritingWithCompletionHandler:^{
          if (writer.status == AVAssetWriterStatusCompleted) {
            resolve(outputURL.absoluteString);
          } else {
            reject(kSpeedErrorCode, writer.error.localizedDescription,
                   writer.error);
          }
        }];
        return;
      }

      NSString *failure = nil;
      CMSampleBufferRef retimed = CopyWithScaledTiming(sample, factor, &failure);
      CFRelease(sample);
      if (retimed == NULL) {
        [input markAsFinished];
        [writer cancelWriting];
        [reader cancelReading];
        reject(kSpeedErrorCode,
               [NSString stringWithFormat:@"샘플 시간을 다시 쓰지 못했습니다. (%@)",
                                          failure ?: @"원인 불명"],
               nil);
        return;
      }

      BOOL appended = [input appendSampleBuffer:retimed];
      CFRelease(retimed);
      if (!appended) {
        [input markAsFinished];
        [reader cancelReading];
        reject(kSpeedErrorCode, writer.error.localizedDescription,
               writer.error);
        return;
      }
    }
  }];
}

/**
 * 표시 시각을 앞당기는 것만으로 배속이 된다.
 *
 * 압축 샘플은 타이밍 "배열"을 갖고 있지 않은 경우가 있다. 그때
 * CMSampleBufferGetSampleTimingInfoArray 가 -12736
 * (kCMSampleBufferError_BufferHasNoSampleTimingInfo) 을 돌려주므로,
 * 개별 getter 로 한 개짜리 배열을 만들어 쓴다.
 */
static CMSampleBufferRef CopyWithScaledTiming(CMSampleBufferRef sample,
                                              double factor,
                                              NSString **failure) {
  CMItemCount count = 0;
  CMSampleTimingInfo *timings = NULL;
  OSStatus probe = CMSampleBufferGetSampleTimingInfoArray(sample, 0, NULL, &count);

  if (probe == noErr && count > 0) {
    timings =
        (CMSampleTimingInfo *)malloc(sizeof(CMSampleTimingInfo) * (size_t)count);
    if (timings == NULL) {
      *failure = @"메모리 할당 실패";
      return NULL;
    }
    OSStatus fetch =
        CMSampleBufferGetSampleTimingInfoArray(sample, count, timings, &count);
    if (fetch != noErr) {
      *failure = [NSString stringWithFormat:@"timing 조회 %d", (int)fetch];
      free(timings);
      return NULL;
    }
  } else {
    count = 1;
    timings = (CMSampleTimingInfo *)malloc(sizeof(CMSampleTimingInfo));
    if (timings == NULL) {
      *failure = @"메모리 할당 실패";
      return NULL;
    }
    timings[0].presentationTimeStamp =
        CMSampleBufferGetPresentationTimeStamp(sample);
    timings[0].duration = CMSampleBufferGetDuration(sample);
    timings[0].decodeTimeStamp = CMSampleBufferGetDecodeTimeStamp(sample);
  }

  const double scale = 1.0 / factor;
  for (CMItemCount index = 0; index < count; index++) {
    if (CMTIME_IS_NUMERIC(timings[index].presentationTimeStamp)) {
      timings[index].presentationTimeStamp =
          CMTimeMultiplyByFloat64(timings[index].presentationTimeStamp, scale);
    }
    if (CMTIME_IS_NUMERIC(timings[index].decodeTimeStamp)) {
      timings[index].decodeTimeStamp =
          CMTimeMultiplyByFloat64(timings[index].decodeTimeStamp, scale);
    }
    if (CMTIME_IS_NUMERIC(timings[index].duration)) {
      timings[index].duration =
          CMTimeMultiplyByFloat64(timings[index].duration, scale);
    }
  }

  CMSampleBufferRef result = NULL;
  OSStatus status = CMSampleBufferCreateCopyWithNewTiming(
      kCFAllocatorDefault, sample, count, timings, &result);
  free(timings);
  if (status != noErr) {
    *failure = [NSString stringWithFormat:@"copy %d", (int)status];
    return NULL;
  }
  return result;
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeVideoSpeedSpecJSI>(params);
}

@end

package com.fourcut.videospeed

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.fourcut.specs.NativeVideoSpeedSpec
import java.io.File
import java.nio.ByteBuffer

/**
 * 촬영 세션 영상을 배속한다. (OQ-01 / OQ-10)
 *
 * 프레임을 다시 인코딩하지 않고 각 샘플의 표시 시각만 다시 쓴다.
 * ffmpeg 같은 무거운 의존성 없이 되고, 화질 손실도 없다.
 *
 * 오디오 트랙은 옮기지 않는다. 배속하면 음이 변하는 데다
 * 촬영 자체를 무음으로 하고 있어서 담을 소리도 없다.
 */
class VideoSpeedModule(reactContext: ReactApplicationContext) :
    NativeVideoSpeedSpec(reactContext) {

  override fun getName(): String = NAME

  override fun changeSpeed(inputPath: String, factor: Double, promise: Promise) {
    if (factor <= 0) {
      promise.reject(ERROR_CODE, "배속 값은 0보다 커야 합니다: $factor")
      return
    }

    val source = inputPath.removePrefix("file://")
    if (!File(source).exists()) {
      promise.reject(ERROR_CODE, "영상 파일을 찾을 수 없습니다: $source")
      return
    }

    val extractor = MediaExtractor()
    var muxer: MediaMuxer? = null

    try {
      extractor.setDataSource(source)

      var videoTrack = -1
      var videoFormat: MediaFormat? = null
      for (index in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(index)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("video/")) {
          videoTrack = index
          videoFormat = format
          break
        }
      }

      val format = videoFormat
      if (videoTrack < 0 || format == null) {
        promise.reject(ERROR_CODE, "영상 트랙이 없습니다.")
        return
      }

      val bufferSize =
          if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
            format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
          } else {
            DEFAULT_BUFFER_SIZE
          }
      val rotation =
          if (format.containsKey(MediaFormat.KEY_ROTATION)) {
            format.getInteger(MediaFormat.KEY_ROTATION)
          } else {
            0
          }

      val output = File(reactApplicationContext.cacheDir, "speed_${System.currentTimeMillis()}.mp4")
      val activeMuxer =
          MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      muxer = activeMuxer
      activeMuxer.setOrientationHint(rotation)

      extractor.selectTrack(videoTrack)
      val targetTrack = activeMuxer.addTrack(format)
      activeMuxer.start()

      val buffer = ByteBuffer.allocate(bufferSize)
      val info = MediaCodec.BufferInfo()

      while (true) {
        val size = extractor.readSampleData(buffer, 0)
        if (size < 0) break

        info.offset = 0
        info.size = size
        // 표시 시각을 앞당기는 것만으로 배속이 된다.
        info.presentationTimeUs = (extractor.sampleTime / factor).toLong()
        // MediaExtractor 의 SAMPLE_FLAG_SYNC 와 MediaCodec 의
        // BUFFER_FLAG_KEY_FRAME 은 같은 값(1)이라 그대로 넘겨도 된다.
        info.flags = extractor.sampleFlags

        activeMuxer.writeSampleData(targetTrack, buffer, info)
        extractor.advance()
      }

      activeMuxer.stop()
      promise.resolve("file://" + output.absolutePath)
    } catch (error: Exception) {
      promise.reject(ERROR_CODE, error.message, error)
    } finally {
      extractor.release()
      try {
        muxer?.release()
      } catch (ignored: Exception) {
        // stop 이 실패했으면 release 도 던질 수 있다. 여기서 할 건 없다.
      }
    }
  }

  companion object {
    const val NAME = "VideoSpeed"
    private const val ERROR_CODE = "VIDEO_SPEED_FAILED"
    private const val DEFAULT_BUFFER_SIZE = 2 * 1024 * 1024
  }
}

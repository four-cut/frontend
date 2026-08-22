package com.fourcut.mediafile

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.fourcut.specs.NativeMediaFileSpec
import java.io.File

/**
 * Skia 로 합성한 이미지를 파일로 떨군다.
 *
 * 앨범 저장(CameraRoll)과 인쇄 API 가 모두 파일 경로를 받는데,
 * Skia 결과는 메모리 위의 바이트라 중간에 한 번 파일로 써야 한다.
 * 이것만 하자고 파일시스템 라이브러리를 통째로 들이는 건 과하다.
 */
class MediaFileModule(reactContext: ReactApplicationContext) :
    NativeMediaFileSpec(reactContext) {

  override fun getName(): String = NAME

  override fun writeBase64(base64: String, extension: String, promise: Promise) {
    try {
      // data URI 로 넘어와도 받아준다.
      val payload = base64.substringAfterLast("base64,")
      val bytes = Base64.decode(payload, Base64.DEFAULT)

      val file =
          File(reactApplicationContext.cacheDir, "strip_${System.currentTimeMillis()}.$extension")
      file.writeBytes(bytes)

      promise.resolve("file://" + file.absolutePath)
    } catch (error: Exception) {
      promise.reject(ERROR_CODE, error.message, error)
    }
  }

  companion object {
    const val NAME = "MediaFile"
    private const val ERROR_CODE = "MEDIA_FILE_WRITE_FAILED"
  }
}

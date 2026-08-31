package com.fourcut.mediafile

import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.core.content.FileProvider
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

  override fun shareFile(fileUri: String, mimeType: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(SHARE_ERROR_CODE, "화면이 없어 공유를 시작할 수 없습니다.")
      return
    }

    try {
      val file = File(fileUri.removePrefix("file://"))
      if (!file.exists()) {
        promise.reject(SHARE_ERROR_CODE, "공유할 파일을 찾을 수 없습니다.")
        return
      }

      // 캐시 파일을 그대로 넘기면 FileUriExposedException 이 난다.
      val shared =
          FileProvider.getUriForFile(
              reactApplicationContext,
              "${reactApplicationContext.packageName}.fileprovider",
              file,
          )

      val intent =
          Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, shared)
            // 받는 앱이 이 URI 를 읽을 수 있게 일회성 권한을 준다.
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }

      activity.startActivity(Intent.createChooser(intent, "공유하기"))
      // 시트를 띄우는 데까지가 우리 몫이다. 이후 취소는 오류가 아니다.
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject(SHARE_ERROR_CODE, error.message, error)
    }
  }

  override fun copyToCacheFile(uri: String, promise: Promise) {
    if (uri.startsWith("file://")) {
      promise.resolve(uri)
      return
    }
    try {
      val input = reactApplicationContext.contentResolver.openInputStream(Uri.parse(uri))
      if (input == null) {
        promise.reject(ERROR_CODE, "이미지를 열 수 없습니다.")
        return
      }
      val file =
          File(reactApplicationContext.cacheDir, "picked_${System.currentTimeMillis()}")
      input.use { stream -> file.outputStream().use { out -> stream.copyTo(out) } }
      promise.resolve("file://" + file.absolutePath)
    } catch (error: Exception) {
      promise.reject(ERROR_CODE, error.message, error)
    }
  }

  companion object {
    const val NAME = "MediaFile"
    private const val ERROR_CODE = "MEDIA_FILE_WRITE_FAILED"
    private const val SHARE_ERROR_CODE = "MEDIA_FILE_SHARE_FAILED"
  }
}

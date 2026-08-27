package com.fourcut.print

import android.graphics.BitmapFactory
import androidx.print.PrintHelper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.fourcut.specs.NativePrintSpec
import java.io.File

/**
 * 합성된 시트를 OS 인쇄 시트로 넘긴다. (SR-07)
 *
 * androidx 의 PrintHelper 한 줄이면 되는 일이라 라이브러리를 들일 이유가 없다.
 * react-native-print 는 compileSdk 31 고정에 32비트 ABI 만 만들어서
 * RN 0.87 에서 빌드가 되지 않고 Play 배포도 막혔다.
 */
class PrintModule(reactContext: ReactApplicationContext) :
    NativePrintSpec(reactContext) {

  override fun getName(): String = NAME

  override fun printImage(fileUri: String, jobName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(ERROR_CODE, "화면이 없어 인쇄를 시작할 수 없습니다.")
      return
    }

    // PrintHelper 는 UI 스레드에서만 동작한다.
    UiThreadUtil.runOnUiThread {
      try {
        // printBitmap(String, Uri) 는 내부적으로 ImageDecoder를 쓰는데
        // 일부 기기(One UI 등)에서 "Failed to create image decoder: unimplemented"로
        // 조용히 실패해 미리보기가 "오류가 발생했습니다"로 뜬다.
        // 직접 BitmapFactory로 디코딩해서 Bitmap을 넘기면 이 경로를 피한다.
        val file = File(fileUri.removePrefix("file://"))
        val bitmap = BitmapFactory.decodeFile(file.absolutePath)
        if (bitmap == null) {
          promise.reject(ERROR_CODE, "이미지를 읽지 못했습니다.")
          return@runOnUiThread
        }

        val helper = PrintHelper(activity)
        // 사진이 잘리지 않도록 용지에 맞춰 넣는다.
        helper.scaleMode = PrintHelper.SCALE_MODE_FIT
        helper.printBitmap(jobName, bitmap)
        // 시트를 띄우는 데까지가 우리 몫이다. 이후 취소는 오류가 아니다.
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject(ERROR_CODE, error.message, error)
      }
    }
  }

  companion object {
    const val NAME = "Print"
    private const val ERROR_CODE = "PRINT_FAILED"
  }
}

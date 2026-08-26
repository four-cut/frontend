package com.fourcut.print

import android.net.Uri
import androidx.print.PrintHelper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.fourcut.specs.NativePrintSpec

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
        val helper = PrintHelper(activity)
        // 사진이 잘리지 않도록 용지에 맞춰 넣는다.
        helper.scaleMode = PrintHelper.SCALE_MODE_FIT
        helper.printBitmap(jobName, Uri.parse(fileUri))
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

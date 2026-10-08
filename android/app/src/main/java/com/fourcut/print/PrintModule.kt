package com.fourcut.print

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import android.print.pdf.PrintedPdfDocument
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.fourcut.specs.NativePrintSpec
import java.io.File
import java.io.FileOutputStream

/**
 * 합성된 시트를 OS 인쇄 시트로 넘긴다. (SR-07)
 *
 * 처음에는 androidx 의 PrintHelper 를 썼다. 그런데 PrintHelper 는 용지를
 * MediaSize.UNKNOWN_PORTRAIT 로 고정해서 넘기고 바꿀 방법을 열어 두지 않는다.
 * 그러면 인쇄 시트가 기본 용지를 Letter(한국 기기는 A4)로 잡는다. "PDF 로
 * 저장" 해 보면 네컷이 8.5×11 인치 페이지 높이만큼 커지고, 페이지 비율(1.29)이
 * 사진(1.81)과 달라 비율이 이상해 보인다.
 *
 * 요구사항(NFR-02)은 4×6 인치 사진 인화를 전제하고, iOS 쪽도 outputType 을
 * Photo 로 둬서 기본 용지가 4×6 이다. Android 도 같은 기본값이 되도록 인쇄
 * 어댑터를 직접 둔다. 그리는 방식은 PrintHelper 의 SCALE_MODE_FIT 과 같다 —
 * 비율을 지켜 인쇄 영역 안에 넣고, 남는 곳은 흰 여백이다.
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

    UiThreadUtil.runOnUiThread {
      try {
        // ImageDecoder 경로는 일부 기기(One UI 등)에서 "unimplemented" 로 조용히
        // 실패한다. BitmapFactory 로 직접 읽어서 그 경로를 피한다.
        val file = File(fileUri.removePrefix("file://"))
        val bitmap = BitmapFactory.decodeFile(file.absolutePath)
        if (bitmap == null) {
          promise.reject(ERROR_CODE, "이미지를 읽지 못했습니다.")
          return@runOnUiThread
        }

        val printManager =
            activity.getSystemService(Context.PRINT_SERVICE) as? PrintManager
        if (printManager == null) {
          promise.reject(ERROR_CODE, "이 기기에서는 인쇄를 쓸 수 없습니다.")
          return@runOnUiThread
        }

        // 인쇄 시트를 처음 열 때의 기본값. 사용자가 시트에서 바꾸면 그쪽이 이긴다.
        // 지정한 용지를 프린터가 지원하지 않으면 시트가 지원하는 용지로 바꿔 준다.
        val attributes =
            PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.NA_INDEX_4X6)
                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                .build()

        printManager.print(jobName, StripPrintAdapter(activity, jobName, bitmap), attributes)
        // 시트를 띄우는 데까지가 우리 몫이다. 이후 취소는 오류가 아니다.
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject(ERROR_CODE, error.message, error)
      }
    }
  }

  /**
   * 사진 한 장을 한 페이지에 비율을 지켜 그린다.
   *
   * 페이지 크기·여백은 인쇄 시트에서 고른 값(PrintedPdfDocument 가 처리)을
   * 그대로 따른다. 그래서 사용자가 A4 를 고르면 A4 에, 4×6 을 고르면 4×6 에
   * 맞는다.
   */
  private class StripPrintAdapter(
      private val context: Context,
      private val jobName: String,
      private val bitmap: Bitmap,
  ) : PrintDocumentAdapter() {

    private var attributes: PrintAttributes? = null

    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes,
        cancellationSignal: CancellationSignal?,
        callback: LayoutResultCallback,
        extras: Bundle?,
    ) {
      if (cancellationSignal?.isCanceled == true) {
        callback.onLayoutCancelled()
        return
      }
      attributes = newAttributes
      val info =
          PrintDocumentInfo.Builder(jobName)
              // PHOTO 로 알려야 인쇄 서비스가 사진 용지·품질을 고른다.
              .setContentType(PrintDocumentInfo.CONTENT_TYPE_PHOTO)
              .setPageCount(1)
              .build()
      callback.onLayoutFinished(info, newAttributes != oldAttributes)
    }

    override fun onWrite(
        pages: Array<out PageRange>?,
        destination: ParcelFileDescriptor,
        cancellationSignal: CancellationSignal?,
        callback: WriteResultCallback,
    ) {
      val current = attributes
      if (current == null) {
        callback.onWriteFailed("인쇄 설정을 받지 못했습니다.")
        return
      }

      val pdf = PrintedPdfDocument(context, current)
      try {
        val page = pdf.startPage(0)
        // contentRect 는 고른 용지에서 여백을 뺀 인쇄 가능 영역이다(포인트 단위).
        val area = page.info.contentRect
        val scale =
            minOf(
                area.width().toFloat() / bitmap.width,
                area.height().toFloat() / bitmap.height,
            )
        val drawnWidth = bitmap.width * scale
        val drawnHeight = bitmap.height * scale

        val matrix = Matrix()
        matrix.postScale(scale, scale)
        // 남는 공간은 가운데 정렬로 나눈다.
        matrix.postTranslate(
            area.left + (area.width() - drawnWidth) / 2f,
            area.top + (area.height() - drawnHeight) / 2f,
        )

        val canvas = page.canvas
        canvas.drawColor(Color.WHITE)
        canvas.drawBitmap(bitmap, matrix, Paint(Paint.FILTER_BITMAP_FLAG))
        pdf.finishPage(page)

        if (cancellationSignal?.isCanceled == true) {
          callback.onWriteCancelled()
          return
        }
        FileOutputStream(destination.fileDescriptor).use { out -> pdf.writeTo(out) }
        callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
      } catch (error: Exception) {
        callback.onWriteFailed(error.message)
      } finally {
        pdf.close()
      }
    }
  }

  companion object {
    const val NAME = "Print"
    private const val ERROR_CODE = "PRINT_FAILED"
  }
}

import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import KakaoSDKAuth
import GoogleSignIn

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "fourcut",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// 외부 앱/브라우저에서 로그인을 마치고 돌아올 때 열리는 URL 을 받는다.
  ///
  /// 이 처리가 없으면 로그인 후 앱으로 돌아와도 토큰이 전달되지 않아
  /// 로그인이 완료되지 않는다. 카카오 → 구글 → RN Linking 순으로 넘기며,
  /// 앞에서 처리한 곳이 있으면 거기서 끝난다.
  ///
  /// 순서가 중요하다. 한 곳이라도 무조건 true 를 돌려주면 뒤가 실행되지
  /// 않으므로, 각 SDK 가 "내 URL 이 맞는지" 판별하는 함수를 써야 한다.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if AuthApi.isKakaoTalkLoginUrl(url) {
      return AuthController.handleOpenUrl(url: url)
    }
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

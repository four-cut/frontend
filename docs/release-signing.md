# Android 릴리스 서명

## 왜 필요한가

Play 스토어는 **디버그 키로 서명한 파일을 받지 않는다.** 그리고 저장소에 있는
`debug.keystore` 는 공개돼 있어서, 이걸로 서명하면 누구나 같은 서명의 앱을 만들 수 있다.

키를 **잃어버리면 그 앱은 다시는 업데이트할 수 없다.** Play App Signing 을 켜면
Google 이 최종 서명 키를 보관하고, 우리 키(업로드 키)는 분실 시 재발급을 요청할 수 있다.
반드시 켜고 시작한다.

## 1. 업로드 키 만들기 (한 사람이 한 번만)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore fourcut-upload.keystore -alias fourcut-upload -keyalg RSA -keysize 2048 -validity 10000
```

- 이 파일과 비밀번호는 **저장소에 올리지 않는다.** (`.gitignore` 에 `*.keystore` 가 있다)
- 팀이 접근할 수 있는 안전한 곳(비밀번호 관리자 등)에 파일과 비밀번호를 함께 보관한다.

## 2. 빌드하는 사람의 PC 에 등록

`~/.gradle/gradle.properties` (Windows 는 `C:\Users\<이름>\.gradle\gradle.properties`) 에 추가한다.
프로젝트 안의 `android/gradle.properties` 가 아니다 — 거기는 커밋된다.

```properties
FOURCUT_UPLOAD_STORE_FILE=C:/keys/fourcut-upload.keystore
FOURCUT_UPLOAD_STORE_PASSWORD=****
FOURCUT_UPLOAD_KEY_ALIAS=fourcut-upload
FOURCUT_UPLOAD_KEY_PASSWORD=****
```

네 값이 다 있으면 release 빌드가 업로드 키로 서명된다. 하나라도 없으면 디버그 키로 서명되고
빌드 로그에 경고가 뜬다 — 실기기 시험용 APK 는 그대로 만들 수 있다.

## 3. 로그인 콘솔에 키 해시 등록

서명 키가 바뀌면 카카오·구글 로그인이 실패한다. 새 키의 해시를 등록해야 한다.

```bash
keytool -list -v -keystore fourcut-upload.keystore -alias fourcut-upload
```

- **카카오 개발자 콘솔** → 앱 → 플랫폼 → Android → 키 해시
- **Google Cloud 콘솔** → OAuth 클라이언트(Android) → SHA-1

Play App Signing 을 켜면 Play 가 다시 서명하므로, Play Console 의
**앱 서명 키 인증서** SHA-1 도 함께 등록해야 스토어에서 받은 앱의 로그인이 된다.

## 4. 스토어용 파일 만들기

Play 는 APK 가 아니라 **AAB** 를 받는다.

```bash
cd android
./gradlew bundleRelease
```

결과: `android/app/build/outputs/bundle/release/app-release.aab`

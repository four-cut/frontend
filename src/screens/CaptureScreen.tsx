import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useOrientation,
  usePhotoOutput,
  useVideoOutput,
  type Recorder,
} from 'react-native-vision-camera';

import {images} from '../assets';
import {SLOT_ASPECT} from '../capture/stripLayout';
import {speedUpSessionVideo} from '../capture/videoSpeed';
import type {CaptureNavigation} from '../navigation/types';
import {
  TIMER_SECONDS,
  useCaptureSession,
} from '../state/CaptureSessionContext';
import {colors, fonts, fontSize} from '../theme';

/**
 * SR-05 촬영.
 *
 * 컷마다 6초를 세고 자동으로 찍는다. 「바로촬영」은 기다리지 않고 즉시 찍는다.
 * 몇 장을 찍을지는 프레임이 정한다(requiredShotCount). 그중에서 슬롯 수만큼
 * 고르는 건 다음 화면이다. 둘은 다른 값이다.
 */
export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const isFocused = useIsFocused();
  const {width, height} = useWindowDimensions();
  const {addShot, setVideo, shotCount, layout} = useCaptureSession();
  const isLandscape = layout === 'landscape';

  // 물리적 기기 방향. 가로형은 기기를 눕혀야(left/right) 촬영할 수 있다.
  const deviceOrientation = useOrientation('device');
  // 한 번 가로로 눕히면 그 방향을 기억한다. 촬영 도중 잠깐 세로로 돌아가도
  // "돌려주세요"가 다시 뜨지 않고, 마지막 가로 방향 기준으로 계속 촬영한다.
  const [captureOrientation, setCaptureOrientation] = useState<
    'left' | 'right' | null
  >(null);
  useEffect(() => {
    if (deviceOrientation === 'left' || deviceOrientation === 'right') {
      setCaptureOrientation(deviceOrientation);
    }
  }, [deviceOrientation]);
  // 가로형인데 아직 한 번도 가로로 눕힌 적 없으면 안내를 띄운다.
  const needsRotate = isLandscape && captureOrientation == null;

  // 눕힌 방향에 따라 화면(세로 고정) 콘텐츠를 반대로 돌려 사용자에게 똑바로
  // 보이게 한다. 기기 상단이 왼쪽을 향하면('left') 콘텐츠를 시계방향(+90)으로,
  // 반대('right')면 반시계(-90)로 돌린다.
  const rotation = captureOrientation === 'left' ? 90 : -90;
  const upright = `${rotation}deg`;

  // 사용자가 보는 "위"와 "오른쪽"이 화면 좌표계의 어느 가장자리인지.
  //
  // 화면은 세로로 고정돼 있고 기기만 눕으므로, 눕힌 방향에 따라 두 방향이
  // 정반대가 된다. 기기를 반시계로 눕히면('left') 기기 상단 = 사용자의 왼쪽,
  // 기기 우변 = 사용자의 위다. 화면 좌표로 옮기면 이렇게 된다.
  //
  //   'left'  (rotation +90) → 사용자 위 = 화면 오른쪽, 사용자 오른쪽 = 화면 아래
  //   'right' (rotation -90) → 사용자 위 = 화면 왼쪽,   사용자 오른쪽 = 화면 위
  //
  // 카운트다운은 사용자의 위, 촬영 버튼은 사용자의 오른쪽에 둔다.
  const userTop = rotation === 90 ? styles.lsRight : styles.lsLeft;
  const userRight = rotation === 90 ? styles.lsBottom : styles.lsTop;

  // 가로형: 화면은 세로로 고정돼 있으니(Info.plist) 촬영 UI 를 통째로 90도
  // 돌려 기기를 눕힌 사용자에게 똑바로 보이게 한다. 이때 프리뷰가 실제 사진
  // 비율(SLOT_ASPECT.landscape)로 보이도록 상자 크기를 잡는다.
  //
  // 상자를 90도 돌리면 화면 좌표계에서 가로·세로가 뒤바뀐다. 그래서 상자의
  // CSS width 는 눕혔을 때 보이는 "가로"가 되고(=화면의 긴 변 height 를 따라간다),
  // CSS height 는 보이는 "세로"가 된다(=화면의 짧은 변 width 를 따라간다).
  // 긴 변(height) × 짧은 변(width) 공간 안에 2.25 비율을 꽉 차게 맞춘다.
  const landscapeAspect = SLOT_ASPECT.landscape;
  let rotatedWidth = height;
  let rotatedHeight = width;
  if (isLandscape) {
    if (height / width >= landscapeAspect) {
      // 화면이 비율보다 더 길다 — 짧은 변(width)에 세로를 맞춘다.
      rotatedHeight = width;
      rotatedWidth = width * landscapeAspect;
    } else {
      // 흔한 경우 — 긴 변(height)에 가로를 맞추고 위아래로 레터박스.
      rotatedWidth = height;
      rotatedHeight = height / landscapeAspect;
    }
  }

  const {hasPermission, requestPermission} = useCameraPermission();
  // containerFormat 기본값 'native' 는 iOS 에서 HEIC 를 뜻한다. Skia 가
  // HEIC 를 디코딩하지 못해 합성 때 사진이 전부 빠지고 흰 종이만 남는다.
  // (Android 는 기본이 JPEG 라 이 문제가 드러나지 않았다.)
  const photoOutput = usePhotoOutput({containerFormat: 'jpeg'});
  // 찍는 과정을 통째로 녹화한다. (OQ-01)
  // 소리는 담지 않아서 녹음 권한이 필요 없다.
  const videoOutput = useVideoOutput({enableAudio: false});
  const recorder = useRef<Recorder | null>(null);

  // Camera 에 'front' 같은 문자열을 그대로 넘기면 해당 카메라가 없을 때 예외를 던진다.
  // 기기를 직접 조회해서 없으면 반대쪽으로 넘긴다. (에뮬레이터는 전면이 없는 경우가 있다)
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');

  // 촬영을 시작하기 전에 전면/후면을 고르게 한다. 고르기 전엔 카메라를 켜지 않는다.
  const [position, setPosition] = useState<'front' | 'back' | null>(null);
  const device =
    position === 'front'
      ? frontDevice ?? backDevice
      : position === 'back'
      ? backDevice ?? frontDevice
      : null;
  const canChooseFront = frontDevice != null;
  const canChooseBack = backDevice != null;
  // 지금까지 찍은 장수. 목표치(shotCount)와 헷갈리지 않게 이름을 나눈다.
  const [taken, setTaken] = useState(0);
  const [remaining, setRemaining] = useState(TIMER_SECONDS);

  // 카운트다운과 바로촬영이 겹쳐 두 번 찍히는 걸 막는다.
  const capturing = useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const capture = useCallback(async () => {
    if (capturing.current) {
      return;
    }
    capturing.current = true;
    try {
      const file = await photoOutput.capturePhotoToFile({}, {});
      addShot(`file://${file.filePath}`);
      setTaken(count => count + 1);
    } finally {
      // 실패해도 카운트다운을 되돌려 플로우가 멈추지 않게 한다.
      setRemaining(TIMER_SECONDS);
      capturing.current = false;
    }
  }, [addShot, photoOutput]);

  useEffect(() => {
    // 기기를 아직 안 돌렸으면(needsRotate) 카운트다운을 시작하지 않는다.
    if (!hasPermission || !device || !isFocused || taken >= shotCount || needsRotate) {
      return;
    }
    const timer = setTimeout(() => {
      if (remaining <= 1) {
        capture();
      } else {
        setRemaining(seconds => seconds - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    capture,
    device,
    hasPermission,
    isFocused,
    needsRotate,
    remaining,
    shotCount,
    taken,
  ]);

  /** 카메라 세션이 뜬 뒤에야 레코더를 만들 수 있다. */
  const startRecording = useCallback(async () => {
    if (recorder.current) {
      return;
    }
    try {
      const created = await videoOutput.createRecorder({});
      recorder.current = created;
      await created.startRecording(
        filePath => {
          // 녹화가 끝나면 배속본으로 바꿔 세션에 넣는다.
          speedUpSessionVideo(filePath).then(setVideo);
        },
        () => {
          // 영상 실패가 사진 촬영을 막지는 않는다.
        },
      );
    } catch {
      // 위와 같다.
    }
  }, [setVideo, videoOutput]);

  useEffect(() => {
    if (taken < shotCount) {
      return;
    }
    // 녹화를 먼저 닫아야 파일이 온전히 마무리된다.
    const finish = async () => {
      try {
        if (recorder.current?.isRecording) {
          await recorder.current.stopRecording();
        }
      } catch {
        // 무시 — 사진은 이미 다 찍혔다.
      }
      // replace 라서 뒤로가기로 촬영을 다시 시작할 수 없다.
      navigation.replace('PhotoSelect');
    };
    finish();
  }, [navigation, shotCount, taken]);

  // 다 채우기 전에 화면을 벗어나면 녹화만 정리한다.
  useEffect(() => {
    return () => {
      recorder.current?.stopRecording().catch(() => {});
    };
  }, []);

  // 권한 거부 시 화면 시안이 없다. (OQ-07)
  if (!hasPermission || (!frontDevice && !backDevice)) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          {hasPermission ? '사용할 수 있는 카메라가 없습니다' : '카메라 권한이 필요합니다'}
        </Text>
      </View>
    );
  }

  // 촬영 전면/후면을 먼저 고르게 한다 — 촬영 중엔 전환 버튼이 없다.
  if (!position) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.pickTitle}>어느 카메라로 찍을까요?</Text>
        <View style={styles.pickRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="전면 카메라로 촬영"
            disabled={!canChooseFront}
            onPress={() => setPosition('front')}
            style={({pressed}) => [
              styles.pickButton,
              !canChooseFront && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.pickButtonLabel}>전면</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="후면 카메라로 촬영"
            disabled={!canChooseBack}
            onPress={() => setPosition('back')}
            style={({pressed}) => [
              styles.pickButton,
              !canChooseBack && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.pickButtonLabel}>후면</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>사용할 수 있는 카메라가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isLandscape && styles.containerLetterboxed]}>
      <View
        style={[
          styles.rotator,
          isLandscape && {
            width: rotatedWidth,
            height: rotatedHeight,
            top: (height - rotatedHeight) / 2,
            left: (width - rotatedWidth) / 2,
            transform: [{rotate: `${rotation}deg`}],
          },
        ]}>
        <Camera
          // device만 바꾸면 일부 기기(삼성 등)에서 네이티브 세션이 안 바뀌고
          // 이전 카메라를 계속 붙잡고 있는다. key로 강제 리마운트한다.
          key={device.id}
          style={StyleSheet.absoluteFill}
          isActive={isFocused}
          device={device}
          outputs={[photoOutput, videoOutput]}
          onStarted={startRecording}
        />
      </View>

      {isLandscape ? (
        // 가로형 오버레이는 회전 상자 밖, 화면 절대좌표에 개별 배치한다.
        // 위치는 위에서 구한 userTop/userRight 가 정하고, 글자는 rotation 만큼
        // 돌려 사용자에게 똑바로 보이게 한다 — 상자를 돌리는 각과 같은 각이다.
        !needsRotate && (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View pointerEvents="none" style={userTop}>
              <Text
                style={[styles.countdown, {transform: [{rotate: upright}]}]}>
                {remaining}
              </Text>
            </View>
            <View style={userRight}>
              <View style={[styles.footer, {transform: [{rotate: upright}]}]}>
                <Text style={styles.progress}>
                  {Math.min(taken + 1, shotCount)}/{shotCount}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="바로 촬영"
                  onPress={capture}
                  style={({pressed}) => [styles.shoot, pressed && styles.pressed]}
                />
              </View>
            </View>
          </View>
        )
      ) : (
        <View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 16,
            },
          ]}>
          <Text style={styles.countdown}>{remaining}</Text>

          <View style={styles.footer}>
            <Text style={styles.progress}>
              {Math.min(taken + 1, shotCount)}/{shotCount}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="바로 촬영"
              onPress={capture}
              style={({pressed}) => [styles.shoot, pressed && styles.pressed]}
            />
          </View>
        </View>
      )}

      {/* 가로형인데 아직 기기가 세로면 회전 안내로 덮는다. 가로로 돌리면
          방향이 감지돼 자동으로 사라지고 촬영이 시작된다. (SR-04) */}
      {needsRotate && (
        <View style={styles.rotateGuide}>
          <Image
            source={images.refresh}
            style={styles.rotateIcon}
            resizeMode="contain"
          />
          <Text style={styles.rotateTitle}>기기를 돌려주세요!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 회전 안내 — 세로로 든 상태에서 똑바로 보이도록 회전하지 않고 화면을 덮는다.
  rotateGuide: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  rotateIcon: {
    width: 66,
    height: 66,
    tintColor: colors.textPrimary,
  },
  rotateTitle: {
    fontSize: fontSize.calloutTitle,
    lineHeight: fontSize.calloutTitle * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // 가로형은 레터박스(위아래 여백)가 생기므로 흰 배경 대신 검게 채운다.
  containerLetterboxed: {
    backgroundColor: colors.black,
  },
  // 가로형일 땐 기기가 물리적으로 눕혀지지만 화면 자체는 세로로 고정돼 있어
  // (Info.plist 참고) 내용물을 통째로 90도 돌려 화면을 채운다.
  rotator: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 가로형 오버레이 위치 — 이름은 "화면의 어느 가장자리"를 뜻한다.
  // 그게 사용자의 위인지 오른쪽인지는 눕힌 방향이 정한다(userTop/userRight).
  lsLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  lsRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  lsTop: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  lsBottom: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  countdown: {
    fontSize: fontSize.countdown,
    lineHeight: fontSize.countdown * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  progress: {
    fontSize: fontSize.progress,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  // 셔터 버튼 — 카메라 앱의 전형적인 동그란 흰 버튼.
  shoot: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.black,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.35,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  pickTitle: {
    fontSize: fontSize.calloutTitle,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  pickRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pickButton: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonLabel: {
    color: colors.white,
    fontSize: fontSize.button,
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
  fallbackText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
});

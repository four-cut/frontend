import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  useVideoOutput,
  type Recorder,
} from 'react-native-vision-camera';

import {images} from '../assets';
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
  const {addShot, setVideo, shotCount} = useCaptureSession();

  const {hasPermission, requestPermission} = useCameraPermission();
  const photoOutput = usePhotoOutput();
  // 찍는 과정을 통째로 녹화한다. (OQ-01)
  // 소리는 담지 않아서 녹음 권한이 필요 없다.
  const videoOutput = useVideoOutput({enableAudio: false});
  const recorder = useRef<Recorder | null>(null);

  // Camera 에 'front' 같은 문자열을 그대로 넘기면 해당 카메라가 없을 때 예외를 던진다.
  // 기기를 직접 조회해서 없으면 반대쪽으로 넘긴다. (에뮬레이터는 전면이 없는 경우가 있다)
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');

  const [position, setPosition] = useState<'front' | 'back'>('front');
  const device =
    position === 'front'
      ? frontDevice ?? backDevice
      : backDevice ?? frontDevice;
  const canFlip = frontDevice != null && backDevice != null;
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
    if (!hasPermission || !device || !isFocused || taken >= shotCount) {
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
  }, [capture, device, hasPermission, isFocused, remaining, shotCount, taken]);

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
  if (!hasPermission || !device) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          {hasPermission ? '사용할 수 있는 카메라가 없습니다' : '카메라 권한이 필요합니다'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        isActive={isFocused}
        device={device}
        outputs={[photoOutput, videoOutput]}
        onStarted={startRecording}
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.overlay,
          {paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16},
        ]}>
        <Text style={styles.countdown}>{remaining}</Text>

        <View style={styles.footer}>
          <Text style={styles.progress}>
            {Math.min(taken + 1, shotCount)}/{shotCount}
          </Text>

          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="바로 촬영"
              onPress={capture}
              style={({pressed}) => [styles.shoot, pressed && styles.pressed]}>
              <Text style={styles.shootLabel}>바로촬영</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카메라 전환"
              disabled={!canFlip}
              onPress={() =>
                setPosition(current => (current === 'front' ? 'back' : 'front'))
              }
              style={({pressed}) => [
                styles.flip,
                !canFlip && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Image
                source={images.cameraFlip}
                style={styles.flipIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shoot: {
    height: 56,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shootLabel: {
    color: colors.white,
    fontSize: fontSize.button,
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
  // btn-camera-flip 은 아이콘이 아니라 버튼 전체(검은 원 + 흰 글리프)라
  // 배경을 씌우거나 틴트를 주면 안 된다.
  flip: {
    width: 56,
    height: 56,
  },
  flipIcon: {
    width: 56,
    height: 56,
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
  },
  fallbackText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
});

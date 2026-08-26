import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {composeStrip} from '../capture/composeStrip';
import {ALBUM_NAME, saveToAlbum} from '../capture/saveToAlbum';
import NativePrint from '../specs/NativePrint';
import {STRIP_ASPECT} from '../capture/stripLayout';
import HomeButton from '../components/HomeButton';
import PrimaryButton from '../components/PrimaryButton';
import type {CaptureNavigation, RootNavigation} from '../navigation/types';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors, fonts} from '../theme';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

/** 시안(Frame-3)에서 시트가 화면 폭을 차지하는 비율 */
const SHEET_WIDTH_RATIO = 0.52;

/**
 * SR-07 로고 선택 · 출력.
 *
 * 지금은 합성된 시트를 보여주는 데까지다. 커스텀 로고 선택과
 * 인쇄·저장은 M6 에서 붙인다.
 */
export default function LogoSelectScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const {width} = useWindowDimensions();
  const {layout, shots, selection, video} = useCaptureSession();

  const [strip, setStrip] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saved, setSaved] = useState<{photo: boolean; video: boolean} | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!layout) {
      return;
    }
    let cancelled = false;
    const photos = selection.map(index => shots[index]);

    composeStrip(layout, photos)
      .then(uri => {
        if (!cancelled) {
          setStrip(uri);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [layout, selection, shots]);

  // 프린터/매수/용지 크기 선택은 OS 인쇄 시트가 담당한다 (EXT-01).
  const handlePrint = async () => {
    if (!strip) {
      return;
    }
    setPrinting(true);
    try {
      await NativePrint?.printImage(strip, '찍고갈래 네컷');
    } catch {
      // 사용자가 인쇄 시트를 취소한 경우도 여기로 온다 — 별도 처리 불필요.
    } finally {
      setPrinting(false);
    }
  };

  const handleSave = async () => {
    if (!strip || saveState === 'saving' || saveState === 'saved') {
      return;
    }
    setSaveState('saving');
    setSaveError(null);
    try {
      // 영상은 없을 수도 있다. 무엇이 저장됐는지 결과로 돌려받아 그대로 알린다.
      setSaved(await saveToAlbum(strip, video));
      setSaveState('saved');
      try {
        // 저장이 끝났다는 걸 손끝으로도 알린다.
        // 진동은 거들 뿐이라, 안 되는 기기에서 저장까지 실패시키지 않는다.
        Vibration.vibrate(20);
      } catch {
        // 무시한다.
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '저장에 실패했습니다',
      );
      setSaveState('failed');
    }
  };

  const saveLabel = {
    idle: '사진, 영상 저장하기',
    saving: '저장 중...',
    saved: '저장됨',
    failed: '다시 저장하기',
  }[saveState];

  const goHome = () => {
    navigation.getParent<RootNavigation>()?.navigate('MainTabs', {
      screen: 'Shoot',
      params: {screen: 'Home'},
    });
  };

  const sheetWidth = width * SHEET_WIDTH_RATIO;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <HomeButton onPress={goHome} />
      </View>

      <View style={styles.previewArea}>
        <View
          style={[
            styles.sheet,
            {width: sheetWidth, height: sheetWidth * STRIP_ASPECT},
          ]}>
          {strip ? (
            <Image
              source={{uri: strip}}
              style={styles.sheetImage}
              resizeMode="contain"
            />
          ) : failed ? (
            <Text style={styles.status}>합성에 실패했습니다</Text>
          ) : (
            <ActivityIndicator color={colors.textPrimary} />
          )}
        </View>
      </View>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        <Text style={styles.sectionLabel}>커스텀 로고 선택</Text>
        <Text style={styles.pending}>로고 선택은 준비 중입니다</Text>
        <PrimaryButton
          label={printing ? '인쇄 준비 중...' : '인쇄하기'}
          disabled={!strip || printing}
          onPress={handlePrint}
        />
        <PrimaryButton
          label={saveLabel}
          disabled={!strip || saveState === 'saving' || saveState === 'saved'}
          onPress={handleSave}
          style={styles.secondAction}
        />

        {/* 무엇이 어디에 저장됐는지 말해 준다. 조용히 끝내면 됐는지 알 수 없다. */}
        {saveState === 'saved' && saved ? (
          <Text style={styles.saveNote}>
            사진 앱 &gt; {ALBUM_NAME} 앨범에 저장했어요
            {saved.video ? '' : ' (영상은 저장되지 않았습니다)'}
          </Text>
        ) : null}

        {saveState === 'failed' && saveError ? (
          <Text style={styles.saveError}>{saveError}</Text>
        ) : null}

        {saveState === 'idle' && !video ? (
          <Text style={styles.saveNote}>영상은 아직 준비 중입니다</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetImage: {
    width: '100%',
    height: '100%',
  },
  status: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  actions: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  pending: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  secondAction: {
    marginTop: 0,
  },
  saveNote: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  saveError: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#D8342B',
    includeFontPadding: false,
  },
});

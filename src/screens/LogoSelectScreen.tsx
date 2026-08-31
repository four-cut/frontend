import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchFrameDetail, fetchFrames, type FrameSummary} from '../api/frames';
import {composeStrip} from '../capture/composeStrip';
import {ALBUM_NAME, saveToAlbum} from '../capture/saveToAlbum';
import type {FrameDesign} from '../frameBuilder/types';
import NativeMediaFile from '../specs/NativeMediaFile';
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
  const {layout, shots, selection, video, frame, selectFrame} =
    useCaptureSession();

  // composeStrip이 네이티브 모듈로 이미 file:// 경로까지 떨궈서 돌려준다.
  // (네이티브 모듈이 없는 환경에서만 예외적으로 data URI로 돌아온다.)
  const [strip, setStrip] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saved, setSaved] = useState<{photo: boolean; video: boolean} | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  // 촬영한 방향과 같은 프레임만 고를 수 있다 — 방향이 다르면 슬롯 수(4/3장)가
  // 안 맞아서 다시 찍어야 한다.
  const [frames, setFrames] = useState<FrameSummary[] | null>(null);
  const [design, setDesign] = useState<FrameDesign | undefined>(undefined);
  const [frameLoadFailedId, setFrameLoadFailedId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!layout) {
      return;
    }
    const orientation = layout === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE';
    fetchFrames(orientation)
      .then(setFrames)
      .catch(() => setFrames([]));
  }, [layout]);

  const chooseFrame = async (summary: FrameSummary) => {
    selectFrame(summary);
    setFrameLoadFailedId(null);
    try {
      const detail = await fetchFrameDetail(summary.frameId);
      setDesign(detail.design);
    } catch {
      setFrameLoadFailedId(summary.frameId);
      setDesign(undefined);
    }
  };

  useEffect(() => {
    if (!layout) {
      return;
    }
    let cancelled = false;
    const photos = selection.map(index => shots[index]);

    composeStrip(layout, photos, design)
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
  }, [layout, selection, shots, design]);

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

  const handleShare = () => {
    if (!strip) {
      return;
    }
    // 시트를 띄우는 데까지가 우리 몫이라 실패해도 조용히 넘어간다.
    NativeMediaFile?.shareFile(strip, 'image/png').catch(() => {});
  };

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="결과물 크게 보기"
          disabled={!strip}
          onPress={() => setZoomed(true)}
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
        </Pressable>
      </View>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        <Text style={styles.sectionLabel}>내 프레임 고르기</Text>
        {frames === null ? (
          <ActivityIndicator color={colors.textPrimary} style={styles.frameListLoading} />
        ) : frames.length === 0 ? (
          <Text style={styles.pending}>고를 수 있는 프레임이 없습니다</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.frameList}>
            {frames.map(item => (
              <Pressable
                key={item.frameId}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} 프레임 적용`}
                onPress={() => chooseFrame(item)}
                style={styles.frameThumbWrap}>
                {item.previewImageUrl ? (
                  <Image
                    source={{uri: item.previewImageUrl}}
                    style={[
                      styles.frameThumb,
                      frame?.frameId === item.frameId && styles.frameThumbSelected,
                    ]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.frameThumb,
                      styles.frameThumbBlank,
                      frame?.frameId === item.frameId && styles.frameThumbSelected,
                    ]}
                  />
                )}
                <Text style={styles.frameThumbLabel} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {frameLoadFailedId !== null ? (
          <Text style={styles.saveError}>
            프레임을 불러오지 못했습니다. 다시 시도해주세요.
          </Text>
        ) : null}
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

        {saveState === 'saved' ? (
          <PrimaryButton label="공유하기" onPress={handleShare} />
        ) : null}

        {saveState === 'failed' && saveError ? (
          <>
            <Text style={styles.saveError}>{saveError}</Text>
            {/* 권한이 막힌 거라면 어디서 풀어야 하는지 알려 준다. */}
            {saveError.includes('권한') ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => Linking.openSettings()}
                style={styles.settingsLink}>
                <Text style={styles.settingsLinkText}>설정에서 권한 허용</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {saveState === 'idle' && !video ? (
          <Text style={styles.saveNote}>영상은 아직 준비 중입니다</Text>
        ) : null}
      </View>

      {/* 저장 전에 결과물을 크게 확인하고 싶은 건 자연스러운 요구다. */}
      <Modal
        visible={zoomed}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomed(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={() => setZoomed(false)}
          style={styles.zoomBackdrop}>
          {strip ? (
            <Image
              source={{uri: strip}}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
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
  frameListLoading: {
    alignSelf: 'flex-start',
  },
  frameList: {
    gap: 10,
    paddingRight: 16,
  },
  frameThumbWrap: {
    width: 64,
    alignItems: 'center',
    gap: 4,
  },
  frameThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.divider,
  },
  frameThumbSelected: {
    borderColor: colors.black,
  },
  frameThumbBlank: {
    backgroundColor: colors.slot,
  },
  frameThumbLabel: {
    fontSize: 11,
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
  settingsLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  settingsLinkText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    includeFontPadding: false,
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  saveError: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#D8342B',
    includeFontPadding: false,
  },
});

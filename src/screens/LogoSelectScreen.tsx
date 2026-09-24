import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import {Text} from '../components/AppText';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  fetchFrameDetail,
  fetchFrames,
  fetchRemoteFrames,
  type FrameSummary,
} from '../api/frames';
import {
  createSession,
  uploadCompositeImage,
  uploadVideo,
} from '../api/photoSession';
import {composeStrip} from '../capture/composeStrip';
import {ALBUM_NAME, saveToAlbum} from '../capture/saveToAlbum';
import {useT} from '../i18n';
import type {FrameDesign} from '../frameBuilder/types';
import NativeMediaFile from '../specs/NativeMediaFile';
import NativePrint from '../specs/NativePrint';
import {STRIP_ASPECT} from '../capture/stripLayout';
import HomeButton from '../components/HomeButton';
// UI-V2: 결과 화면 개편용 컴포넌트. 공용 PrimaryButton 은 다른 화면이 쓰므로 그대로 둔다.
import ActionButton from '../components/v2/ActionButton';
import FrameSheet from '../components/v2/FrameSheet';
import IconButton from '../components/v2/IconButton';
import Snackbar from '../components/v2/Snackbar';
import {colorsV2, fontsV2, lineV2, sizeV2, spaceV2} from '../theme/uiV2';
import type {CaptureNavigation, RootNavigation} from '../navigation/types';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors, fonts} from '../theme';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
type QrState = 'idle' | 'preparing' | 'ready' | 'failed';

/**
 * 시트가 화면 폭을 차지하는 비율.
 *
 * UI-V2: 0.52 → 0.62. 결과물이 이 화면의 주인공인데 버튼 더미에 눌려
 * 작게 보였다. 인쇄·공유를 상단 아이콘으로 올리고 남은 자리를 여기에 준다.
 */
const SHEET_WIDTH_RATIO = 0.62;

/**
 * SR-07 로고 선택 · 출력.
 *
 * 지금은 합성된 시트를 보여주는 데까지다. 커스텀 로고 선택과
 * 인쇄·저장은 M6 에서 붙인다.
 */
export default function LogoSelectScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
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
  // UI-V2: 프레임 목록을 바텀시트로 옮겼다.
  const [sheetOpen, setSheetOpen] = useState(false);
  // UI-V2: 결과 알림을 화면 안 글이 아니라 스낵바로 띄운다. 글이 나타날 때마다
  // 아래 버튼이 밀려서 누르려던 곳이 안 눌리던 문제가 있었다.
  const [snack, setSnack] = useState<{
    message: string;
    action?: {label: string; onPress: () => void};
  } | null>(null);

  const [qrState, setQrState] = useState<QrState>('idle');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  /** QR 페이지에 사진까지 올라갔는지. 영상만 올라간 경우와 구분한다. */
  const [qrHasPhoto, setQrHasPhoto] = useState(false);

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
      await NativePrint?.printImage(strip, t.result.printJob);
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
        error instanceof Error ? error.message : t.result.saveFailed,
      );
      setSaveState('failed');
    }
  };

  const saveLabel = t.result.save[saveState];

  // UI-V2: 저장 결과를 스낵바로 알린다. 권한 때문에 막힌 거라면 설정으로
  // 갈 길을 같이 준다 — 어디서 푸는지 모르면 안내가 없는 것과 같다.
  useEffect(() => {
    if (saveState === 'saved' && saved) {
      setSnack({
        message:
          t.result.savedTo(ALBUM_NAME) +
          (saved.video ? '' : t.result.videoNotSaved),
      });
    } else if (saveState === 'failed' && saveError) {
      setSnack({
        message: saveError,
        action:
          saveError === t.errors.noSavePermission
            ? {
                label: t.result.openSettings,
                onPress: () => {
                  setSnack(null);
                  Linking.openSettings();
                },
              }
            : undefined,
      });
    }
  }, [saveState, saved, saveError, t]);

  // UI-V2: QR 실패도 같은 자리에서 알린다.
  useEffect(() => {
    if (qrState === 'failed' && qrError) {
      setSnack({message: qrError});
    }
  }, [qrState, qrError]);

  const handleShare = () => {
    if (!strip) {
      return;
    }
    // 시트를 띄우는 데까지가 우리 몫이라 실패해도 조용히 넘어간다.
    NativeMediaFile?.shareFile(strip, 'image/png').catch(() => {});
  };

  /**
   * 부스에 태블릿으로 두면 손님 기기가 아니라서 앨범 저장·공유가 소용없다.
   * QR 을 찍어 각자 폰으로 받아가는 경로가 필요하다.
   *
   * 지금은 서버가 영상만 QR 로 만들어 준다. 합성 이미지를 올릴 엔드포인트와
   * 사진·영상을 함께 내려주는 다운로드 페이지가 생기면 여기서 한 번 더
   * 올리고 QR 이 그 페이지를 가리키게 된다.
   */
  const handleQr = async () => {
    if (qrState === 'preparing') {
      return;
    }
    if (!video) {
      setQrError(t.result.qrVideoNotReady);
      setQrState('failed');
      return;
    }

    setQrState('preparing');
    setQrError(null);
    try {
      // 화면에서 고른 프레임 id 는 서버에 없을 수 있어서 그대로 못 쓴다.
      const remote = await fetchRemoteFrames();
      const frameId = remote[0]?.frameId;
      if (frameId === undefined) {
        throw new Error(t.result.qrNoFrame);
      }

      const session = await createSession(frameId);

      // 사진을 못 올려도 영상만으로 QR 은 쓸 수 있다. 여기서 전체를 실패시키면
      // 원래 되던 것까지 막히므로, 실패는 기억만 해두고 계속 간다.
      let photoUploaded = false;
      if (strip?.startsWith('file://')) {
        try {
          await uploadCompositeImage(session.sessionId, strip);
          photoUploaded = true;
        } catch {
          // 아래에서 안내 문구로 알린다.
        }
      }

      const uploaded = await uploadVideo(session.sessionId, video);
      setQrHasPhoto(photoUploaded);
      setQrUrl(uploaded.qrCodeUrl);
      setQrState('ready');
    } catch (error) {
      setQrError(error instanceof Error ? error.message : t.result.qrFailed);
      setQrState('failed');
    }
  };

  const goHome = () => {
    // navigate 는 MainTabs 를 CaptureFlow 위에 새로 쌓는다. 그러면 촬영 세션이
    // 살아 있는 채로 홈만 덮여서, 다시 촬영하면 이전 촬영본이 딸려 온다.
    // popTo 는 아래에 있는 MainTabs 로 되돌아가면서 CaptureFlow 를 걷어낸다.
    navigation.getParent<RootNavigation>()?.popTo('MainTabs', {
      screen: 'Shoot',
      params: {screen: 'Home'},
    });
  };

  const sheetWidth = width * SHEET_WIDTH_RATIO;

  // UI-V2: 프레임을 고르면 시트를 닫는다. 결과가 바로 보여야 고른 보람이 있다.
  const pickFrame = (summary: FrameSummary) => {
    setSheetOpen(false);
    chooseFrame(summary);
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* UI-V2: 인쇄·공유를 상단 바 아이콘으로 옮겼다. 늘 필요한 동작이 아닌데
          풀폭 버튼으로 아래에 쌓여 있어서 주된 행동이 무엇인지 알 수 없었다. */}
      <View style={stylesV2.appBar}>
        <HomeButton onPress={goHome} />
        <View style={stylesV2.appBarActions}>
          <IconButton
            name="print"
            accessibilityLabel={t.result.print}
            onPress={handlePrint}
            disabled={!strip}
            busy={printing}
          />
          <IconButton
            name="share"
            accessibilityLabel={t.common.share}
            onPress={handleShare}
            disabled={!strip}
          />
        </View>
      </View>

      <View style={styles.previewArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.result.zoomA11y}
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
            <Text style={styles.status}>{t.result.composeFailed}</Text>
          ) : (
            <ActivityIndicator color={colors.textPrimary} />
          )}
        </Pressable>

        {/* UI-V2: 프레임 바꾸기는 꾸미기 동작이라 결과물 바로 아래에 둔다.
            지금 무엇이 적용돼 있는지도 같이 보여 준다. */}
        <View style={stylesV2.frameRow}>
          <ActionButton
            variant="tonal"
            label={`${t.result.changeFrame} · ${frame?.name ?? t.result.frameNone}`}
            onPress={() => setSheetOpen(true)}
          />
        </View>
        {frameLoadFailedId !== null ? (
          <Text style={stylesV2.inlineError}>{t.result.framesLoadFailed}</Text>
        ) : null}
      </View>

      {/* UI-V2: 하단은 주 동작 하나(QR)와 보조 하나(저장)만 남긴다. */}
      <View style={[stylesV2.bottomBar, {paddingBottom: insets.bottom + spaceV2.lg}]}>
        {snack ? (
          <Snackbar
            message={snack.message}
            action={snack.action}
            onDismiss={() => setSnack(null)}
          />
        ) : null}

        {!video ? (
          <Text style={stylesV2.pending}>{t.result.videoPending}</Text>
        ) : null}

        <ActionButton
          variant="filled"
          label={qrState === 'preparing' ? t.result.qrPreparing : t.result.qr}
          disabled={!video}
          busy={qrState === 'preparing'}
          onPress={qrState === 'ready' ? () => setQrState('ready') : handleQr}
        />
        <ActionButton
          variant="tonal"
          label={saveLabel}
          disabled={!strip || saveState === 'saved'}
          busy={saveState === 'saving'}
          onPress={handleSave}
        />
      </View>

      <FrameSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        frames={frames}
        selectedId={frame?.frameId ?? null}
        onSelect={pickFrame}
        layout={layout ?? 'portrait'}
        title={t.result.frameSheetTitle}
        emptyLabel={t.result.noFrames}
        closeLabel={t.common.close}
        itemA11yLabel={t.result.applyFrameA11y}
      />

      {/* 저장 전에 결과물을 크게 확인하고 싶은 건 자연스러운 요구다. */}
      <Modal
        visible={zoomed}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomed(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
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

      {/* 각자 폰으로 받아가는 경로. 부스 태블릿에서는 이게 유일한 수단이다. */}
      <Modal
        visible={qrState === 'ready' && !!qrUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setQrState('idle')}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={() => setQrState('idle')}
          style={styles.qrBackdrop}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>{t.result.qrTitle}</Text>
            {qrUrl ? (
              <Image
                source={{uri: qrUrl}}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.qrHint}>{t.result.qrHint}</Text>
            {qrHasPhoto ? null : (
              <Text style={styles.qrWarn}>{t.result.qrVideoOnly}</Text>
            )}
          </View>
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
    // UI-V2
    fontSize: sizeV2.caption,
    lineHeight: lineV2.caption,
    fontFamily: fontsV2.regular,
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
  qrBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  qrCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  qrTitle: {
    // UI-V2
    fontSize: sizeV2.sectionTitle,
    lineHeight: lineV2.sectionTitle,
    fontFamily: fontsV2.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrWarn: {
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.semibold,
    color: '#D8342B',
    textAlign: 'center',
    includeFontPadding: false,
  },
  qrHint: {
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
    color: colors.textMuted,
    textAlign: 'center',
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
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.semibold,
    color: '#D8342B',
    includeFontPadding: false,
  },
});

/**
 * UI-V2 전용 스타일.
 *
 * 되돌릴 때 헷갈리지 않게 기존 `styles` 와 섞지 않고 따로 둔다.
 * 값은 `theme/uiV2` 토큰만 쓴다.
 */
const stylesV2 = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spaceV2.lg,
  },
  appBarActions: {
    flexDirection: 'row',
    gap: spaceV2.xs,
  },
  frameRow: {
    marginTop: spaceV2.lg,
  },
  bottomBar: {
    paddingHorizontal: spaceV2.lg,
    gap: spaceV2.md,
  },
  pending: {
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
    color: colorsV2.textMuted,
    textAlign: 'center',
    includeFontPadding: false,
  },
  inlineError: {
    marginTop: spaceV2.md,
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.semibold,
    color: colorsV2.danger,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

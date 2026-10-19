import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from '../components/AppText';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  fetchFrameDetail,
  fetchFramePreview,
  fetchFrames,
  type FrameSummary,
} from '../api/frames';
import {STRIP_MIME} from '../capture/composeStrip';
import {ALBUM_NAME} from '../capture/saveToAlbum';
import {DOWNLOAD_LINK_DAYS} from '../config/download';
import {useT} from '../i18n';
import type {FrameDesign} from '../frameBuilder/types';
import NativeMediaFile from '../specs/NativeMediaFile';
import NativePrint from '../specs/NativePrint';
import {STRIP_ASPECT} from '../capture/stripLayout';
import ActionButton from '../components/ActionButton';
import HomeButton from '../components/HomeButton';
import StripPreview from '../components/StripPreview';
import {useGuardLeaveFlow} from '../navigation/useGuardLeaveFlow';
import QrImage from '../result/QrImage';
import {useQrDelivery} from '../result/useQrDelivery';
import {useStripComposer} from '../result/useStripComposer';
import {useStripSave} from '../result/useStripSave';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors} from '../theme';
// UI-V2: 결과 화면에서만 쓰는 타이포그래피. 공용 theme 은 그대로 둔다.
import {fontsV2, lineV2, sizeV2} from '../theme/typographyV2';

/** 시안(Frame-3)에서 시트가 화면 폭을 차지하는 비율 */
const SHEET_WIDTH_RATIO = 0.52;

/** "내 프레임 고르기" 카드 폭. 높이는 인쇄 시트 비율(STRIP_ASPECT)로 정한다. */
const FRAME_CARD_WIDTH = 72;
const FRAME_CARD_BORDER = 2;
const FRAME_CARD_INNER_WIDTH = FRAME_CARD_WIDTH - FRAME_CARD_BORDER * 2;

const QR_SIZE = 220;

/**
 * SR-07 로고 선택 · 출력.
 *
 * 지금은 합성된 시트를 보여주는 데까지다. 커스텀 로고 선택과
 * 인쇄·저장은 M6 에서 붙인다.
 */
export default function LogoSelectScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const {width} = useWindowDimensions();
  const [previewAreaHeight, setPreviewAreaHeight] = useState(0);
  const {
    layout,
    shots,
    selection,
    video,
    frame,
    selectFrame,
    fromAlbum,
    trackTempFile,
  } = useCaptureSession();

  const [printing, setPrinting] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // 촬영한 방향과 같은 프레임만 고를 수 있다 — 방향이 다르면 슬롯 수(4/3장)가
  // 안 맞아서 다시 찍어야 한다.
  const [frames, setFrames] = useState<FrameSummary[] | null>(null);
  const [design, setDesign] = useState<FrameDesign | undefined>(undefined);
  const [frameLoadFailedId, setFrameLoadFailedId] = useState<number | null>(
    null,
  );
  /**
   * 처음 씌울 프레임의 디자인까지 정해졌는지. 그 전에는 합성하지 않는다 —
   * 프레임 없이 한 번, 프레임을 씌워 또 한 번 합성하면 무거운 합성을 두 번
   * 하게 돼서 결과가 그만큼 늦게 나온다.
   */
  const [initialFrameReady, setInitialFrameReady] = useState(false);

  // 목록을 받아 오는 사이에 사용자가 먼저 골랐을 수도 있다. 그 순간의 값을
  // 보려고 ref 로 따라 둔다 — 의존성에 frame 을 넣으면 고를 때마다 목록을
  // 다시 불러오게 된다.
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    if (!layout) {
      return;
    }
    const orientation = layout === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE';
    let cancelled = false;
    fetchFrames(orientation)
      .then(async list => {
        if (cancelled) {
          return;
        }
        setFrames(list);
        fillPreviews(list, () => cancelled);
        // 들어오자마자 기본 프레임이 씌워져 있어야 한다. 전에는 목록에서 한 번
        // 눌러야 적용돼서, 아무것도 안 고르면 맨 프레임으로 저장·인쇄됐다.
        //
        // 이미 고른 게 있으면 그것을 다시 씌운다 — 프레임을 고르고 뒤로 갔다
        // 돌아오면 고른 것이 그대로 남아야 한다. 디자인은 이 화면이 들고
        // 있어서 돌아오면 비어 있으므로 다시 받아 온다.
        const initial = frameRef.current ?? list[0];
        if (initial) {
          await chooseFrame(initial);
        }
      })
      .catch(() => setFrames([]))
      .finally(() => {
        if (!cancelled) {
          setInitialFrameReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // chooseFrame 은 매 렌더 새로 만들어지고, frame 은 ref 로 읽는다 —
    // 둘을 의존성에 넣으면 목록을 계속 다시 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  /** 썸네일 없이 온 카드(아직 안 그려진 베이직 프레임)를 그려지는 대로 채운다. */
  const fillPreviews = (list: FrameSummary[], isCancelled: () => boolean) => {
    for (const item of list) {
      if (item.previewImageUrl) {
        continue;
      }
      fetchFramePreview(item)
        .then(url => {
          if (isCancelled() || !url) {
            return;
          }
          setFrames(current =>
            current?.map(frameItem =>
              frameItem.frameId === item.frameId
                ? {...frameItem, previewImageUrl: url}
                : frameItem,
            ) ?? current,
          );
        })
        // 못 그리면 카드는 빈 슬롯 미리보기로 남는다.
        .catch(() => {});
    }
  };

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

  // 매 렌더 새 배열을 만들면 합성이 매번 다시 돈다.
  const photos = useMemo(
    () =>
      // 여기까지 왔다면 자리가 다 찼다(다음 버튼이 그때만 열린다). 그래도
      // 타입상 빈 자리가 있을 수 있으므로 걸러서 넘긴다.
      selection
        .filter((index): index is number => index != null)
        .map(index => shots[index]),
    [selection, shots],
  );
  const {strip, failed, composing, retry} = useStripComposer({
    layout,
    photos,
    design,
    ready: initialFrameReady,
    trackTempFile,
  });
  const albumSave = useStripSave(strip, video);
  const qr = useQrDelivery(strip, video);
  // 저장을 마치면 저장 칸이 공유로 바뀐다. 바뀌는 순간 버튼이 튀어서 알아챈다.
  const showShare = albumSave.status === 'saved';

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

  const saveLabel = t.result.save[albumSave.status];

  // 시트를 띄우는 데까지가 우리 몫이라 실패해도 조용히 넘어간다.
  const sharePhoto = (uri: string) =>
    NativeMediaFile?.shareFile(uri, STRIP_MIME).catch(() => {});
  const shareVideo = (uri: string) =>
    NativeMediaFile?.shareFile(uri, 'video/mp4').catch(() => {});

  /** 영상이 있으면 무엇을 보낼지 묻는다. 메신저·SNS 는 한 번에 하나씩 받는 곳이 많다. */
  const handleShare = () => {
    if (!strip) {
      return;
    }
    if (!video || fromAlbum) {
      sharePhoto(strip);
      return;
    }
    Alert.alert(t.result.shareTitle, undefined, [
      {text: t.result.sharePhoto, onPress: () => sharePhoto(strip)},
      {text: t.result.shareVideo, onPress: () => shareVideo(video)},
      {text: t.common.cancel, style: 'cancel'},
    ]);
  };

  // 지금 보이는 결과물을 저장했거나 QR 로 받아갈 수 있으면 묻지 않고 나간다.
  // 전에는 한 번 저장하면 그 뒤 프레임을 바꾼 결과물이 남지 않아도 그냥 나갔다.
  const {leave: goHome} = useGuardLeaveFlow(
    !albumSave.photoSaved && !qr.deliversCurrentStrip,
    t.leaveFlow.bodyResult,
  );

  // 폭 기준으로만 잡으면 아래 버튼·프레임 목록이 커졌을 때 남은 높이를
  // 넘어서 목록 제목을 덮는다. 실측한 영역 높이 안에 들어오게 줄인다.
  let sheetWidth = width * SHEET_WIDTH_RATIO;
  const maxSheetHeight = previewAreaHeight * 0.96;
  if (maxSheetHeight > 0 && sheetWidth * STRIP_ASPECT > maxSheetHeight) {
    sheetWidth = maxSheetHeight / STRIP_ASPECT;
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <HomeButton onPress={goHome} />
      </View>

      <View
        style={styles.previewArea}
        onLayout={event =>
          setPreviewAreaHeight(event.nativeEvent.layout.height)
        }>
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
            // 실패했다고 홈으로 나가면 찍은 사진이 전부 사라진다.
            <View style={styles.composeFailed}>
              <Text style={styles.status}>{t.result.composeFailed}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={retry}
                style={styles.settingsLink}>
                <Text style={styles.settingsLinkText}>
                  {t.result.composeRetry}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ActivityIndicator color={colors.textPrimary} />
          )}
          {/* 프레임을 바꾸면 새 합성이 끝날 때까지 이전 결과가 남아 있어서,
              눌렀는데 안 바뀐 것처럼 보이지 않게 덮어서 알린다. */}
          {strip && composing ? (
            <View style={styles.sheetBusy}>
              <ActivityIndicator color={colors.textPrimary} />
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        <Text style={styles.sectionLabel}>{t.result.myFrames}</Text>
        {frames === null ? (
          <ActivityIndicator
            color={colors.textPrimary}
            style={styles.frameListLoading}
          />
        ) : frames.length === 0 ? (
          <Text style={styles.pending}>{t.result.noFrames}</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.frameList}>
            {frames.map(item => {
              const selected = frame?.frameId === item.frameId;
              return (
                <Pressable
                  key={item.frameId}
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  accessibilityLabel={t.result.applyFrameA11y(item.name)}
                  onPress={() => chooseFrame(item)}
                  style={styles.frameCard}>
                  <View
                    style={[
                      styles.frameThumb,
                      selected && styles.frameThumbSelected,
                    ]}>
                    {item.previewImageUrl ? (
                      <Image
                        source={{uri: item.previewImageUrl}}
                        style={styles.frameThumbImage}
                        resizeMode="contain"
                      />
                    ) : (
                      // 썸네일을 못 그렸을 때는 빈 슬롯 배치라도 보여준다.
                      <StripPreview
                        layout={
                          item.orientation === 'PORTRAIT'
                            ? 'portrait'
                            : 'landscape'
                        }
                        photos={[]}
                        width={FRAME_CARD_INNER_WIDTH}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.frameThumbLabel,
                      selected && styles.frameThumbLabelSelected,
                    ]}
                    // 카드가 좁아 한 줄이면 이름(최대 8자)이 잘린다.
                    numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {frameLoadFailedId !== null ? (
          <Text style={styles.saveError}>{t.result.framesLoadFailed}</Text>
        ) : null}
        {/* 인쇄·저장·QR 을 한 줄에 나란히 둔다. 세로로 쌓으면 버튼이 화면
            아래를 다 차지해서 결과물 미리보기가 작아진다. 저장을 마치면 저장
            칸이 공유로 바뀐다 — 저장됐다는 건 아래 안내 문구가 알려 준다. */}
        <View style={styles.actionRow}>
          <ActionButton
            labelStyle={styles.buttonLabel}
            variant="outline"
            icon="print"
            label={printing ? t.result.printing : t.result.print}
            disabled={!strip || printing}
            onPress={handlePrint}
          />
          {/* 가운데 칸만 채워서 가장 먼저 누를 동작(저장, 이어서 공유)을 강조한다. */}
          {/* 한 버튼의 문구·아이콘만 바꿔야 바뀔 때 튀는 애니메이션이 걸린다. */}
          <ActionButton
            labelStyle={styles.buttonLabel}
            variant="filled"
            icon={showShare ? 'share' : 'save'}
            label={showShare ? t.common.share : saveLabel}
            disabled={!strip || albumSave.status === 'saving'}
            onPress={showShare ? handleShare : albumSave.save}
          />
          {/* 사진(스트립)만 있어도 QR 을 만들 수 있다. 영상은 있으면 같이 올린다. */}
          <ActionButton
            labelStyle={styles.buttonLabel}
            variant="outline"
            icon="qr"
            label={
              qr.status === 'preparing' ? t.result.qrPreparing : t.result.qr
            }
            disabled={!strip || qr.status === 'preparing'}
            onPress={qr.start}
          />
        </View>

        {/* 무엇이 어디에 저장됐는지 말해 준다. 조용히 끝내면 됐는지 알 수 없다. */}
        {albumSave.status === 'saved' ? (
          <>
            <Text style={styles.saveNote}>{t.result.savedTo(ALBUM_NAME)}</Text>
            {fromAlbum ? null : albumSave.videoSaved ? (
              <Text style={styles.saveNote}>{t.result.videoSaved}</Text>
            ) : video ? (
              // 사진을 먼저 저장하는 사이 영상 변환이 끝났거나, 영상만 실패했다.
              <Pressable
                accessibilityRole="button"
                disabled={albumSave.savingVideo}
                onPress={albumSave.saveVideo}
                style={styles.settingsLink}>
                <Text style={styles.settingsLinkText}>
                  {albumSave.savingVideo
                    ? t.result.savingVideo
                    : t.result.saveVideo}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.saveNote}>{t.result.videoLater}</Text>
            )}
          </>
        ) : null}

        {albumSave.staleSave ? (
          <Text style={styles.saveNote}>{t.result.resaveHint}</Text>
        ) : null}

        {[albumSave.photoError, albumSave.videoError].map(message =>
          message ? (
            <React.Fragment key={message}>
              <Text style={styles.saveError}>{message}</Text>
              {/* 권한이 막힌 거라면 어디서 풀어야 하는지 알려 준다.
                  문구에 "권한"이 들었는지 보던 것을 사전 문구와 그대로 맞춘다 —
                  일본어에는 그 글자가 없어서 안내가 통째로 안 뜬다. */}
              {message === t.errors.noSavePermission ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => Linking.openSettings()}
                  style={styles.settingsLink}>
                  <Text style={styles.settingsLinkText}>
                    {t.result.openSettings}
                  </Text>
                </Pressable>
              ) : null}
            </React.Fragment>
          ) : null,
        )}

        {/* 업로드가 오래 걸리면 기다리지 않고 저장·인쇄로 넘어갈 수 있게 한다. */}
        {qr.status === 'preparing' ? (
          <Pressable
            accessibilityRole="button"
            onPress={qr.cancel}
            style={styles.settingsLink}>
            <Text style={styles.settingsLinkText}>{t.result.qrCancel}</Text>
          </Pressable>
        ) : null}

        {qr.status === 'failed' && qr.error ? (
          <Text style={styles.saveError}>{qr.error}</Text>
        ) : null}

        {albumSave.status === 'idle' && !video && !fromAlbum ? (
          <Text style={styles.saveNote}>{t.result.videoPending}</Text>
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
        visible={qr.open}
        transparent
        animationType="fade"
        onRequestClose={qr.close}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={qr.close}
          style={styles.qrBackdrop}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>{t.result.qrTitle}</Text>
            {qr.url ? (
              <QrImage key={qr.url} uri={qr.url} size={QR_SIZE} />
            ) : null}
            <Text style={styles.qrHint}>{t.result.qrHint}</Text>
            {!qr.hasPhoto ? (
              <Text style={styles.qrWarn}>{t.result.qrVideoOnly}</Text>
            ) : !qr.hasVideo && !fromAlbum ? (
              // 영상 변환이 끝나기 전에 누른 경우. 준비되면 다시 누르면 추가된다.
              <Text style={styles.qrHint}>{t.result.qrPhotoOnly}</Text>
            ) : null}
            {/* 얼굴 사진이 서버에 올라간다. 언제까지 받을 수 있는지 알려야
                손님이 미루지 않고, 개인정보 고지로도 필요하다. */}
            <Text style={styles.qrHint}>
              {t.result.qrExpiry(DOWNLOAD_LINK_DAYS)}
            </Text>
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
  sheetBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeFailed: {
    alignItems: 'center',
    gap: 4,
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
    // UI-V2
    fontSize: sizeV2.caption,
    lineHeight: lineV2.caption,
    fontFamily: fontsV2.semibold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  pending: {
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
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
  frameCard: {
    width: FRAME_CARD_WIDTH,
    alignItems: 'center',
    gap: 6,
  },
  // 인쇄 시트와 같은 비율로 전체를 보여준다. 정사각형으로 자르면 프레임의
  // 위아래 장식이 잘려서 어떤 프레임인지 알아보기 어렵다.
  frameThumb: {
    width: FRAME_CARD_WIDTH,
    height: FRAME_CARD_INNER_WIDTH * STRIP_ASPECT + FRAME_CARD_BORDER * 2,
    borderRadius: 8,
    borderWidth: FRAME_CARD_BORDER,
    borderColor: colors.divider,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  frameThumbSelected: {
    borderColor: colors.black,
  },
  frameThumbImage: {
    width: '100%',
    height: '100%',
  },
  frameThumbLabel: {
    width: FRAME_CARD_WIDTH,
    textAlign: 'center',
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  frameThumbLabelSelected: {
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  saveNote: {
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  settingsLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  settingsLinkText: {
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.semibold,
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
  qrWarn: {
    // UI-V2
    fontSize: sizeV2.footnote,
    lineHeight: lineV2.footnote,
    fontFamily: fontsV2.regular,
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
    fontFamily: fontsV2.regular,
    color: '#D8342B',
    includeFontPadding: false,
  },
  /** UI-V2: ActionButton 라벨에 끼워 넣는다. */
  buttonLabel: {
    fontSize: sizeV2.button,
    lineHeight: lineV2.button,
    fontFamily: fontsV2.semibold,
  },
});

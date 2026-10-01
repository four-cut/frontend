import React, {useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from '../components/AppText';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import StripPreview from '../components/StripPreview';
import {useAlbumPhotos} from '../gallery/useAlbumPhotos';
import {useT} from '../i18n';
import type {CaptureNavigation} from '../navigation/types';
import NativeMediaFile from '../specs/NativeMediaFile';
import {useCaptureSession} from '../state/CaptureSessionContext';
import {colors, fonts, fontSize} from '../theme';

/** 미리보기 시트가 화면 폭에서 차지하는 비율. 사진 고르기 화면과 맞췄다. */
const SHEET_WIDTH_RATIO = 0.28;
const COLUMNS = 4;

/**
 * 촬영 대신 앨범 사진으로 네컷을 만든다.
 *
 * 컷 수만큼 누른 순서대로 고르면 그 순서가 곧 스트립 배치다. 다 고르면
 * 촬영 플로우와 같은 인쇄·저장 화면으로 넘어간다.
 */
export default function AlbumPickScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CaptureNavigation>();
  const {width} = useWindowDimensions();
  const {layout, cutCount, setAlbumShots} = useCaptureSession();
  const t = useT();
  const {status, photos, loadMore, loadingMore} = useAlbumPhotos(true);

  /** 고른 사진의 원본 uri. 배열 순서가 스트립 순서다. */
  const [picked, setPicked] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!layout) {
    return null;
  }

  const complete = picked.length === cutCount;

  const toggle = (uri: string) => {
    setFailed(false);
    setPicked(prev => {
      if (prev.includes(uri)) {
        return prev.filter(item => item !== uri);
      }
      if (prev.length >= cutCount) {
        return prev;
      }
      return [...prev, uri];
    });
  };

  const next = async () => {
    if (!complete || preparing) {
      return;
    }
    setPreparing(true);
    setFailed(false);
    try {
      // 앨범 사진은 content:// (안드로이드) · ph:// (iOS) 라 Skia 가 못 읽는다.
      // 합성 전에 캐시 파일로 떨군다 — iOS HEIC 는 여기서 JPEG 로 바뀐다.
      const files = NativeMediaFile
        ? await Promise.all(
            picked.map(uri => NativeMediaFile!.copyToCacheFile(uri)),
          )
        : picked;
      setAlbumShots(files);
      navigation.navigate('LogoSelect');
    } catch {
      setFailed(true);
    } finally {
      setPreparing(false);
    }
  };

  const thumbSize = (width - 32) / COLUMNS;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <Text style={styles.title}>{t.albumPick.title}</Text>

      <View style={styles.previewArea}>
        <StripPreview
          layout={layout}
          photos={picked}
          width={width * SHEET_WIDTH_RATIO}
        />
      </View>

      <Text style={styles.counter}>
        {t.albumPick.count(picked.length, cutCount)}
      </Text>

      <View style={styles.gridArea}>
        {status === 'loading' || status === 'idle' ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.textPrimary} />
          </View>
        ) : status === 'denied' ? (
          <View style={styles.centerBox}>
            <Text style={styles.message}>{t.albumPicker.needPermission}</Text>
          </View>
        ) : status === 'error' ? (
          <View style={styles.centerBox}>
            <Text style={styles.message}>{t.albumPicker.loadFailed}</Text>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.message}>{t.albumPicker.empty}</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            numColumns={COLUMNS}
            keyExtractor={item => item.node.id}
            contentContainerStyle={styles.grid}
            onEndReachedThreshold={0.5}
            onEndReached={loadMore}
            renderItem={({item}) => {
              const uri = item.node.image.uri;
              const order = picked.indexOf(uri);
              const selected = order >= 0;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.albumPick.photoA11y(
                    selected ? order + 1 : null,
                  )}
                  accessibilityState={{selected}}
                  onPress={() => toggle(uri)}
                  style={[styles.thumbWrap, {width: thumbSize, height: thumbSize}]}>
                  <Image
                    source={{uri}}
                    style={[styles.thumb, selected && styles.thumbPicked]}
                  />
                  {selected ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeLabel}>{order + 1}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={colors.textPrimary}
                  style={styles.footerLoading}
                />
              ) : undefined
            }
          />
        )}
      </View>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        {failed ? (
          <Text style={styles.error}>{t.albumPick.prepareFailed}</Text>
        ) : null}
        <PrimaryButton
          label={preparing ? t.albumPick.preparing : t.common.next}
          disabled={!complete || preparing}
          onPress={next}
        />
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
  title: {
    textAlign: 'center',
    fontSize: fontSize.screenTitle,
    lineHeight: fontSize.screenTitle * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  previewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  counter: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  gridArea: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 16,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  thumbWrap: {
    padding: 2,
  },
  thumb: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: colors.divider,
  },
  thumbPicked: {
    borderWidth: 3,
    borderColor: colors.black,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  error: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#D8342B',
    includeFontPadding: false,
  },
});

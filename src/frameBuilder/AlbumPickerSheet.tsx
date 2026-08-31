import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {CameraRoll, type PhotoIdentifier} from '@react-native-camera-roll/camera-roll';

import NativeMediaFile from '../specs/NativeMediaFile';
import {colors, fonts} from '../theme';

const PAGE_SIZE = 60;

/** 스티커로 쓸 사진 하나를 고르면 uri/가로세로비를 함께 돌려준다. */
export type StickerPick = {uri: string; aspectRatio: number};

type Props = {
  visible: boolean;
  insetBottom: number;
  onSelect: (pick: StickerPick) => void;
  onClose: () => void;
  /** 스티커 고를 때와 배경 사진 고를 때 문구가 달라야 해서 밖에서 받는다. */
  title?: string;
};

async function ensureReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export default function AlbumPickerSheet({
  visible,
  insetBottom,
  onSelect,
  onClose,
  title = '앨범에서 스티커 고르기',
}: Props) {
  const [status, setStatus] = React.useState<
    'idle' | 'loading' | 'denied' | 'error' | 'ready'
  >('idle');
  const [photos, setPhotos] = React.useState<PhotoIdentifier[]>([]);
  const [endCursor, setEndCursor] = React.useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const granted = await ensureReadPermission();
      if (cancelled) {
        return;
      }
      if (!granted) {
        setStatus('denied');
        return;
      }
      try {
        const page = await CameraRoll.getPhotos({
          first: PAGE_SIZE,
          assetType: 'Photos',
          // width/height는 기본값으로는 안 딸려온다 — 없으면 가로세로비가
          // NaN이 되어 스티커 이미지 높이가 NaN이 되고, 그래서 아예 안 그려진다.
          include: ['imageSize'],
        });
        if (cancelled) {
          return;
        }
        setPhotos(page.edges);
        setEndCursor(page.page_info.end_cursor);
        setHasNextPage(page.page_info.has_next_page);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // 앨범 전체를 스크롤로 더 불러온다 — 처음에 PAGE_SIZE장만 가져오고 끝이면
  // 그 뒤 사진은 영영 못 고른다.
  const loadMore = React.useCallback(async () => {
    if (!hasNextPage || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await CameraRoll.getPhotos({
        first: PAGE_SIZE,
        after: endCursor,
        assetType: 'Photos',
        include: ['imageSize'],
      });
      setPhotos(prev => [...prev, ...page.edges]);
      setEndCursor(page.page_info.end_cursor);
      setHasNextPage(page.page_info.has_next_page);
    } catch {
      // 더 불러오기만 실패한 것이므로 이미 있는 목록은 그대로 둔다.
    } finally {
      setLoadingMore(false);
    }
  }, [endCursor, hasNextPage, loadingMore]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {paddingBottom: insetBottom + 20}]}
          onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.sheetDoneText}>완료</Text>
            </Pressable>
          </View>

          {status === 'loading' || status === 'idle' ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.textPrimary} />
            </View>
          ) : status === 'denied' ? (
            <View style={styles.centerBox}>
              <Text style={styles.messageText}>
                사진 접근 권한이 없어서 앨범을 불러올 수 없어요.{'\n'}
                설정에서 권한을 허용해주세요.
              </Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.centerBox}>
              <Text style={styles.messageText}>
                앨범을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
              </Text>
            </View>
          ) : photos.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.messageText}>앨범에 사진이 없어요.</Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              numColumns={4}
              keyExtractor={item => item.node.id}
              renderItem={({item}) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => {
                    // content:// 를 그대로 넘기면 Skia가 나중에 이 파일을
                    // 읽으려 할 때(합성 시점) 조용히 멈춰버린다 — 지금
                    // file://로 복사해서 넘긴다.
                    const uri = NativeMediaFile
                      ? await NativeMediaFile.copyToCacheFile(item.node.image.uri)
                      : item.node.image.uri;
                    onSelect({
                      uri,
                      aspectRatio:
                        item.node.image.width / item.node.image.height,
                    });
                  }}
                  style={styles.thumbWrap}>
                  <Image
                    source={{uri: item.node.image.uri}}
                    style={styles.thumb}
                  />
                </Pressable>
              )}
              style={styles.grid}
              onEndReachedThreshold={0.5}
              onEndReached={loadMore}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  sheetDoneText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  grid: {
    flex: 1,
  },
  thumbWrap: {
    flex: 1 / 4,
    aspectRatio: 1,
    padding: 2,
  },
  thumb: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: colors.divider,
  },
  footerLoading: {
    paddingVertical: 16,
  },
});

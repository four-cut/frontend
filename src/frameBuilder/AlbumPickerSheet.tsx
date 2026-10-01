import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from '../components/AppText';

import {useAlbumPhotos} from '../gallery/useAlbumPhotos';
import {useT} from '../i18n';
import NativeMediaFile from '../specs/NativeMediaFile';
import {colors, fonts} from '../theme';

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

export default function AlbumPickerSheet({
  visible,
  insetBottom,
  onSelect,
  onClose,
  title,
}: Props) {
  const t = useT();
  const {status, photos, loadMore, loadingMore} = useAlbumPhotos(visible);

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
            <Text style={styles.sheetTitle}>
              {title ?? t.albumPicker.stickerTitle}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.sheetDoneText}>{t.common.done}</Text>
            </Pressable>
          </View>

          {status === 'loading' || status === 'idle' ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.textPrimary} />
            </View>
          ) : status === 'denied' ? (
            <View style={styles.centerBox}>
              <Text style={styles.messageText}>
                {t.albumPicker.needPermission}
              </Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.centerBox}>
              <Text style={styles.messageText}>{t.albumPicker.loadFailed}</Text>
            </View>
          ) : photos.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.messageText}>{t.albumPicker.empty}</Text>
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
                      ? await NativeMediaFile.copyToCacheFile(
                          item.node.image.uri,
                        )
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

import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {Text} from '../components/AppText';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth, useSocialSignIn} from '../auth';
import {STRIP_ASPECT} from '../capture/stripLayout';
import {useSavedStrips, type StripItem} from '../gallery/useSavedStrips';
import {useT} from '../i18n';
import {colors, fonts} from '../theme';

const COLUMNS = 3;
const GAP = 10;
const EDGE = 16;

/** SectionList 는 행 단위로 그리므로 한 줄씩 묶어 준다. */
function toRows(items: StripItem[]): StripItem[][] {
  const rows: StripItem[][] = [];
  for (let index = 0; index < items.length; index += COLUMNS) {
    rows.push(items.slice(index, index + COLUMNS));
  }
  return rows;
}

/**
 * 이 기기에 저장된 결과물을 달별로 보여 준다.
 *
 * 서버에서 가져오지 않는다. 결과 화면에서 저장한 것만 '찍고갈래' 앨범에
 * 들어 있고, 사진 앱에서 지우면 여기서도 사라진다.
 */
export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const {width} = useWindowDimensions();
  const {status: authStatus, member} = useAuth();
  const {signOutEverywhere} = useSocialSignIn();
  const {sections, status, reload, loadMore, loadingMore} = useSavedStrips();

  const [zoomed, setZoomed] = useState<StripItem | null>(null);

  // 촬영을 마치고 돌아오면 새로 저장된 것이 있을 수 있다.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const thumbWidth = (width - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  /**
   * 사진 앱에서 지운다. 앨범에서만 빼는 게 아니라 자산을 지우는 것이라,
   * 묻지 않고 지우면 안 된다.
   *
   * iOS 는 여기에 더해 시스템 확인창을 한 번 더 띄운다. 거기서 취소하면
   * deletePhotos 가 reject 되므로, 실패를 "못 지웠다"로 뭉뚱그리지 않고
   * 조용히 넘어간다 — 취소한 사람에게 오류를 띄울 이유가 없다.
   */
  const confirmDelete = useCallback(
    (item: StripItem) => {
      Alert.alert(t.gallery.deleteTitle, t.gallery.deleteBody, [
        {text: t.common.cancel, style: 'cancel'},
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await CameraRoll.deletePhotos([item.uri]);
            } catch {
              // 시스템 확인창에서 취소한 경우도 여기로 온다. 목록을 다시
              // 읽어 보면 지워졌는지 아닌지가 그대로 드러난다.
              reload();
              return;
            }
            setZoomed(null);
            reload();
          },
        },
      ]);
    },
    [t, reload],
  );

  const rowSections = useMemo(
    () =>
      sections.map(s => ({
        year: s.year,
        month: s.month,
        data: toRows(s.data),
      })),
    [sections],
  );

  const isEmpty = status === 'ready' && rowSections.length === 0;

  return (
    <View style={[styles.container, {paddingTop: insets.top + 12}]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.gallery.title}</Text>
        {member ? (
          <Pressable
            accessibilityRole="button"
            onPress={signOutEverywhere}
            hitSlop={8}>
            <Text style={styles.signOut}>{t.gallery.signOut}</Text>
          </Pressable>
        ) : null}
      </View>

      {authStatus === 'loading' || status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : status === 'denied' ? (
        <View style={styles.center}>
          <Text style={styles.guide}>{t.gallery.needPermission}</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.guide}>{t.gallery.empty}</Text>
          <Text style={styles.guideSub}>{t.gallery.emptyHint}</Text>
        </View>
      ) : (
        <SectionList
          sections={rowSections}
          keyExtractor={row => row.map(item => item.id).join('|')}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.list,
            {paddingBottom: insets.bottom + 24},
          ]}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderSectionHeader={({section}) => (
            <Text style={styles.month}>
              {t.gallery.monthTitle(section.year, section.month)}
            </Text>
          )}
          renderItem={({item: row}) => (
            <View style={styles.row}>
              {row.map(item => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={t.gallery.zoomA11y}
                  onPress={() => setZoomed(item)}
                  style={{width: thumbWidth}}>
                  <Image
                    source={{uri: item.uri}}
                    style={[
                      styles.thumb,
                      {width: thumbWidth, height: thumbWidth * STRIP_ASPECT},
                    ]}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
              {/* 마지막 줄이 덜 찼을 때 왼쪽 정렬을 유지한다. */}
              {row.length < COLUMNS
                ? Array.from({length: COLUMNS - row.length}).map((_, index) => (
                    <View key={`gap-${index}`} style={{width: thumbWidth}} />
                  ))
                : null}
            </View>
          )}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.textPrimary}
                style={styles.more}
              />
            ) : undefined
          }
        />
      )}

      <Modal
        visible={zoomed != null}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomed(null)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={() => setZoomed(null)}
          style={styles.zoomBackdrop}>
          {zoomed ? (
            <Image
              source={{uri: zoomed.uri}}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>

        {/* 배경을 누르면 닫히므로 삭제 버튼은 그 밖에 형제로 둔다 — 안에 두면
            버튼을 누른 손가락이 배경까지 닿아 모달이 먼저 닫힌다. */}
        {zoomed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.gallery.deleteA11y}
            onPress={() => confirmDelete(zoomed)}
            style={({pressed}) => [
              styles.zoomDelete,
              {bottom: insets.bottom + 24},
              pressed && styles.zoomDeletePressed,
            ]}>
            <Text style={styles.zoomDeleteText}>{t.common.delete}</Text>
          </Pressable>
        ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: EDGE,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  signOut: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: EDGE,
  },
  guide: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  guideSub: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: EDGE,
  },
  month: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  thumb: {
    borderRadius: 6,
    backgroundColor: colors.divider,
    // 스트립 배경이 흰색이라 테두리가 없으면 흰 화면 위에 떠 보인다.
    // hairline 으로는 눈에 안 잡혀서 1px 로 둔다.
    borderWidth: 1,
    borderColor: colors.imageBorder,
  },
  more: {
    marginVertical: 16,
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDelete: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  zoomDeletePressed: {
    opacity: 0.6,
  },
  zoomDeleteText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#FF6B6B',
    includeFontPadding: false,
  },
  zoomImage: {
    width: '92%',
    height: '88%',
  },
});

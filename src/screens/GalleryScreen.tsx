import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth, useSocialSignIn} from '../auth';
import {STRIP_ASPECT} from '../capture/stripLayout';
import {useSavedStrips, type StripItem} from '../gallery/useSavedStrips';
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

  const rowSections = useMemo(
    () => sections.map(s => ({title: s.title, data: toRows(s.data)})),
    [sections],
  );

  const isEmpty = status === 'ready' && rowSections.length === 0;

  return (
    <View style={[styles.container, {paddingTop: insets.top + 12}]}>
      <View style={styles.header}>
        <Text style={styles.title}>내 네컷</Text>
        {member ? (
          <Pressable
            accessibilityRole="button"
            onPress={signOutEverywhere}
            hitSlop={8}>
            <Text style={styles.signOut}>로그아웃</Text>
          </Pressable>
        ) : null}
      </View>

      {authStatus === 'loading' || status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : status === 'denied' ? (
        <View style={styles.center}>
          <Text style={styles.guide}>사진 접근을 허용해야 볼 수 있어요</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.guide}>아직 저장한 네컷이 없어요</Text>
          <Text style={styles.guideSub}>
            촬영을 마치고 저장하면 여기에 모여요
          </Text>
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
            <Text style={styles.month}>{section.title}</Text>
          )}
          renderItem={({item: row}) => (
            <View style={styles.row}>
              {row.map(item => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel="크게 보기"
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
          accessibilityLabel="닫기"
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
  zoomImage: {
    width: '92%',
    height: '88%',
  },
});

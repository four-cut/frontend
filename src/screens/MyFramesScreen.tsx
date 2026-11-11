import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from '../components/AppText';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  deleteLocalFrame,
  fetchMyFrames,
  type FrameSummary,
} from '../api/frames';
import {STRIP_ASPECT} from '../capture/stripLayout';
import {useT} from '../i18n';
import type {RootNavigation} from '../navigation/types';
import {useAuthGate} from '../navigation/useAuthGate';
import {colors, fonts, TOP_BAR_HEIGHT} from '../theme';

const COLUMNS = 3;
const GAP = 12;
const EDGE = 16;
const ZOOM_DELETE_HEIGHT = 48;

/** 그리드 칸. 첫 칸은 항상 새 프레임을 만드는 + 카드다. */
type GridItem = {kind: 'add'} | {kind: 'frame'; frame: FrameSummary};
const ADD_ITEM: GridItem = {kind: 'add'};

/**
 * 내가 만든 프레임 모아 보기.
 *
 * 기기의 frame 폴더에 저장된 것만 보여 준다. 누르면 크게 보이고, 거기서
 * 지우면 그 프레임의 폴더가 이미지까지 함께 지워진다. (갤러리와 같은 방식)
 *
 * 첫 칸은 늘 + 카드라 프레임 만들기는 여기서 시작한다. 홈에 있던
 * '프레임 만들기' 버튼은 이 카드로 옮겼다.
 */
export default function MyFramesScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const {width} = useWindowDimensions();
  const navigation = useNavigation<RootNavigation>();
  const gate = useAuthGate();

  const [frames, setFrames] = useState<FrameSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState<FrameSummary | null>(null);

  // 프레임 만들기에서 막 저장하고 돌아왔을 수 있어서 들어올 때마다 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchMyFrames()
        .then(result => {
          if (!cancelled) {
            setFrames(result);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFrames([]);
            setFailed(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const confirmDelete = useCallback(
    (frame: FrameSummary) => {
      Alert.alert(t.myFrames.deleteTitle, t.myFrames.deleteBody(frame.name), [
        {text: t.common.cancel, style: 'cancel'},
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocalFrame(frame.frameId);
              setZoomed(null);
              setFrames(current =>
                current
                  ? current.filter(item => item.frameId !== frame.frameId)
                  : current,
              );
            } catch {
              Alert.alert(t.myFrames.deleteFailed);
            }
          },
        },
      ]);
    },
    [t],
  );

  const openFrameBuilder = () =>
    gate('FrameBuilder', () => navigation.navigate('FrameBuilder'));

  const cardWidth = (width - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const cardHeight = cardWidth * STRIP_ASPECT;

  const items: GridItem[] = [
    ADD_ITEM,
    ...(frames ?? []).map(frame => ({kind: 'frame' as const, frame})),
  ];

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* 제목 없이 다른 탭과 같은 높이만 비운다. */}
      <View style={styles.topBar} />

      {frames === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item =>
            item.kind === 'add' ? 'add' : String(item.frame.frameId)
          }
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.list,
            {paddingBottom: insets.bottom + 24},
          ]}
          ListFooterComponent={
            // 비어 있을 때 + 카드가 이미 다음에 할 일을 보여 주므로 안내
            // 문구는 두지 않는다. 불러오기 실패는 다르다 — 프레임이 없는
            // 것과 못 가져온 것을 구별해 줘야 한다.
            frames.length === 0 && failed ? (
              <Text style={styles.guideSub}>{t.myFrames.loadFailed}</Text>
            ) : undefined
          }
          renderItem={({item: gridItem}) =>
            gridItem.kind === 'add' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.myFrames.addA11y}
                onPress={openFrameBuilder}
                style={({pressed}) => [
                  styles.card,
                  {width: cardWidth},
                  pressed && styles.cardPressed,
                ]}>
                <View
                  style={[styles.thumb, styles.addThumb, {height: cardHeight}]}>
                  <View style={styles.addCircle}>
                    <View style={styles.plusBar} />
                    <View style={[styles.plusBar, styles.plusBarVertical]} />
                  </View>
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {t.myFrames.newFrame}
                </Text>
              </Pressable>
            ) : (
              <FrameCard
                frame={gridItem.frame}
                width={cardWidth}
                height={cardHeight}
                hint={t.myFrames.zoomA11y}
                onPress={() => setZoomed(gridItem.frame)}
              />
            )
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
          style={[
            styles.zoomBackdrop,
            {
              paddingTop: insets.top + 24,
              // 아래에 떠 있는 삭제 버튼과 겹치지 않게 그 높이만큼 비운다.
              paddingBottom: insets.bottom + 24 + ZOOM_DELETE_HEIGHT + 16,
            },
          ]}>
          {zoomed?.previewImageUrl ? (
            <Image
              source={{uri: zoomed.previewImageUrl}}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          ) : null}
          {zoomed ? (
            <Text style={styles.zoomName} numberOfLines={1}>
              {zoomed.name}
            </Text>
          ) : null}
        </Pressable>

        {/* 배경을 누르면 닫히므로 삭제 버튼은 그 밖에 형제로 둔다 — 안에 두면
            버튼을 누른 손가락이 배경까지 닿아 모달이 먼저 닫힌다. */}
        {zoomed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.myFrames.deleteA11y}
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

/** 저장된 프레임 한 장. 미리보기 전체를 보여 주고 아래에 이름을 단다. */
function FrameCard({
  frame,
  width: cardWidth,
  height: cardHeight,
  hint,
  onPress,
}: {
  frame: FrameSummary;
  width: number;
  height: number;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={frame.name}
      accessibilityHint={hint}
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        {width: cardWidth},
        pressed && styles.cardPressed,
      ]}>
      <View style={[styles.thumb, {height: cardHeight}]}>
        {frame.previewImageUrl ? (
          // 가로형은 비율이 달라서 자르지 않고 가운데에 담는다.
          <Image
            source={{uri: frame.previewImageUrl}}
            style={styles.thumbImage}
            resizeMode="contain"
          />
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {frame.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: EDGE,
  },
  // 프레임이 없을 때 + 카드 아래에 붙는 안내.
  guideSub: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: EDGE,
  },
  row: {
    gap: GAP,
    marginBottom: 18,
  },
  card: {
    gap: 8,
  },
  cardPressed: {
    opacity: 0.6,
  },
  thumb: {
    borderRadius: 10,
    // 프레임 배경이 흰색이면 흰 화면 위에서 경계가 사라진다.
    borderWidth: 1,
    borderColor: colors.imageBorder,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  // + 카드: 흰 바탕 가운데에 회색 원과 + 를 둔다.
  addThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBar: {
    position: 'absolute',
    width: 18,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: colors.textPrimary,
  },
  plusBarVertical: {
    transform: [{rotate: '90deg'}],
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  zoomImage: {
    width: '100%',
    flex: 1,
  },
  // 갤러리 크게 보기의 삭제 버튼과 같은 모양.
  zoomDelete: {
    position: 'absolute',
    alignSelf: 'center',
    height: ZOOM_DELETE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 28,
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
  zoomName: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.white,
    includeFontPadding: false,
  },
  name: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

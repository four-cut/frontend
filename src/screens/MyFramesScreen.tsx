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
import PrimaryButton from '../components/PrimaryButton';
import {useT} from '../i18n';
import type {RootNavigation} from '../navigation/types';
import {useAuthGate} from '../navigation/useAuthGate';
import {colors, fonts} from '../theme';

const COLUMNS = 3;
const GAP = 12;
const EDGE = 16;
const ZOOM_DELETE_HEIGHT = 48;

/**
 * 내가 만든 프레임 모아 보기.
 *
 * 기기의 frame 폴더에 저장된 것만 보여 준다. 누르면 크게 보이고, 거기서
 * 지우면 그 프레임의 폴더가 이미지까지 함께 지워진다. (갤러리와 같은 방식)
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

  return (
    <View style={[styles.container, {paddingTop: insets.top + 12}]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.myFrames.title}</Text>
      </View>

      {frames === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : frames.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.guide}>
            {failed ? t.myFrames.loadFailed : t.myFrames.empty}
          </Text>
          {failed ? null : (
            <>
              <Text style={styles.guideSub}>{t.myFrames.emptyHint}</Text>
              <PrimaryButton
                label={t.home.makeFrame}
                onPress={openFrameBuilder}
                style={styles.emptyButton}
              />
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={frames}
          keyExtractor={item => String(item.frameId)}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.list,
            {paddingBottom: insets.bottom + 24},
          ]}
          renderItem={({item}) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityHint={t.myFrames.zoomA11y}
              onPress={() => setZoomed(item)}
              style={({pressed}) => [
                styles.card,
                {width: cardWidth},
                pressed && styles.cardPressed,
              ]}>
              <View style={[styles.thumb, {height: cardHeight}]}>
                {item.previewImageUrl ? (
                  // 가로형은 비율이 달라서 자르지 않고 가운데에 담는다.
                  <Image
                    source={{uri: item.previewImageUrl}}
                    style={styles.thumbImage}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: EDGE,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
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
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    alignSelf: 'stretch',
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

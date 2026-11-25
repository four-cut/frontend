import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BackButton from '../components/BackButton';
import { useT } from '../i18n';
import PrimaryButton from '../components/PrimaryButton';
import type { RootNavigation } from '../navigation/types';
import { colors, fonts, fontSize, useIsTablet } from '../theme';

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigation>();
  const t = useT();
  const tablet = useIsTablet();
  /** 시안(Frame-14)의 번호 목록. 타이머 6초는 SR-05 카운트다운의 근거이기도 하다. */
  const notices = t.guide.items;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      {/* 폰은 시안대로 위에서부터 쌓는다. 태블릿은 화면이 넓고 길어서 그대로
          두면 왼쪽 위에 몰려 보여, 제목과 목록을 화면 가운데로 모은다. */}
      <View style={[styles.body, tablet && styles.bodyTablet]}>
        <Text style={[styles.title, tablet && styles.titleTablet]}>
          {t.guide.title}
        </Text>

        <View style={[styles.notices, tablet && styles.noticesTablet]}>
          {notices.map((notice, index) => (
            <View key={notice} style={styles.noticeRow}>
              <Text style={styles.noticeNumber}>{index + 1}.</Text>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={t.guide.cta}
          onPress={() => navigation.navigate('CaptureFlow')}
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
  body: {
    flex: 1,
    paddingHorizontal: 24,
  },
  bodyTablet: {
    justifyContent: 'center',
    // 아래 버튼만큼 위로 올려야 눈으로 보기에 가운데다.
    paddingBottom: 60,
  },
  title: {
    marginTop: 72,
    textAlign: 'center',
    fontSize: fontSize.screenTitle,
    lineHeight: fontSize.screenTitle * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  titleTablet: {
    marginTop: 0,
  },
  notices: {
    marginTop: 104,
    gap: 6,
  },
  // 목록 덩어리만 가운데에 두고, 줄끼리는 왼쪽을 맞춘다. 번호가 1. 2. 3. 으로
  // 세로로 맞아야 읽힌다.
  noticesTablet: {
    marginTop: 56,
    alignSelf: 'center',
  },
  noticeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  noticeNumber: {
    minWidth: 22,
    fontSize: fontSize.listItem,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  noticeText: {
    flexShrink: 1,
    fontSize: fontSize.listItem,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from '../components/AppText';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import BackButton from '../components/BackButton';
import {useT} from '../i18n';
import PrimaryButton from '../components/PrimaryButton';
import type {RootNavigation} from '../navigation/types';
import {colors, fonts, fontSize} from '../theme';

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigation>();
  const t = useT();
  /** 시안(Frame-14)의 번호 목록. 타이머 6초는 SR-05 카운트다운의 근거이기도 하다. */
  const notices = t.guide.items;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{t.guide.title}</Text>

        <View style={styles.notices}>
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
  title: {
    marginTop: 72,
    textAlign: 'center',
    fontSize: fontSize.screenTitle,
    lineHeight: fontSize.screenTitle * 1.2,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  notices: {
    marginTop: 104,
    gap: 6,
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
    flex: 1,
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

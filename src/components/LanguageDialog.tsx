import React from 'react';
import {Linking, Modal, Pressable, StyleSheet, View} from 'react-native';

import {useAuth, useSocialSignIn} from '../auth';
import {useDeleteAccount} from '../auth/useDeleteAccount';
import {PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL} from '../config/legal';
import {LOCALES, LOCALE_LABEL, setLocale, useLocale, useT} from '../i18n';
import {colors, fonts, fontSize} from '../theme';
import {Text} from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 설정 팝업. 언어 · 계정 · 정보.
 *
 * 처음에는 언어만 있었다. 로그아웃은 갤러리 화면 구석에 있고 회원 탈퇴는
 * 아예 없었는데, 계정 관련 동작은 사람들이 설정에서 찾는다. 탈퇴는 스토어
 * 심사 필수 항목이기도 하다. 계정 칸은 로그인했을 때만, 정보 칸은 주소가
 * 정해졌을 때만(config/legal.ts) 띄운다.
 *
 * 항목이 둘뿐이라 시트를 아래에서 끌어올릴 만한 양이 아니다. 화면 가운데
 * 작은 창으로 띄운다.
 *
 * 각 언어 이름은 그 언어로 적는다 — 일본어로 잘못 바꿔 놓고 한국어를 다시
 * 찾아야 하는 사람에게 "한국어" 라고 적혀 있어야 찾을 수 있다.
 */
export default function LanguageDialog({visible, onClose}: Props) {
  const locale = useLocale();
  const t = useT();
  const {status} = useAuth();
  const {signOutEverywhere} = useSocialSignIn();
  const {confirm: confirmDelete, deleting} = useDeleteAccount();
  const signedIn = status === 'authenticated';
  const legal = [
    {label: t.settings.privacy, url: PRIVACY_POLICY_URL},
    {label: t.settings.terms, url: TERMS_OF_SERVICE_URL},
  ].filter((item): item is {label: string; url: string} => !!item.url);

  const handleSignOut = async () => {
    onClose();
    await signOutEverywhere();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      {/* 창을 누르면 닫히지 않도록, 닫는 영역과 창을 형제로 둔다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
        onPress={onClose}
        style={styles.backdrop}
      />
      <View pointerEvents="box-none" style={styles.center}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{t.settings.title}</Text>
          <Text style={styles.sectionLabel}>{t.settings.language}</Text>

        {LOCALES.map((option, index) => {
          const selected = option === locale;
          const last = index === LOCALES.length - 1;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              accessibilityLabel={LOCALE_LABEL[option]}
              onPress={() => setLocale(option)}
              style={({pressed}) => [
                styles.row,
                // 마지막 항목 아래 선은 완료 버튼 위에 떠 보인다.
                !last && styles.rowDivided,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[styles.rowLabel, selected && styles.rowLabelActive]}>
                {LOCALE_LABEL[option]}
              </Text>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}

          {signedIn ? (
            <>
              <Text style={[styles.sectionLabel, styles.section]}>
                {t.settings.account}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleSignOut}
                style={({pressed}) => [
                  styles.row,
                  styles.rowDivided,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.rowAction}>{t.settings.signOut}</Text>
              </Pressable>
              {/* 되돌릴 수 없는 동작이라 확인을 한 번 더 받는다. 확인창이
                  설정 창 위에 겹치지 않게 먼저 닫는다. */}
              <Pressable
                accessibilityRole="button"
                disabled={deleting}
                onPress={() => confirmDelete(onClose)}
                style={({pressed}) => [styles.row, pressed && styles.pressed]}>
                <Text style={[styles.rowAction, styles.rowDanger]}>
                  {t.settings.deleteAccount}
                </Text>
              </Pressable>
            </>
          ) : null}

          {legal.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, styles.section]}>
                {t.settings.info}
              </Text>
              {legal.map((item, index) => (
                <Pressable
                  key={item.url}
                  accessibilityRole="link"
                  onPress={() => Linking.openURL(item.url)}
                  style={({pressed}) => [
                    styles.row,
                    index < legal.length - 1 && styles.rowDivided,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.rowAction}>{item.label}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({pressed}) => [styles.done, pressed && styles.pressed]}>
            <Text style={styles.doneText}>{t.common.done}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    // 흰 배경 위에 흰 창이라 그림자가 없으면 떠 보이지 않는다.
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
  // 아래 글자들은 줄 높이를 고정한다. 안 주면 글자 상자 높이가 서체마다
  // 달라서, 언어를 고르는 순간 창 높이가 바뀌고 가운데 정렬된 창이 움직인다.
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pressed: {
    opacity: 0.5,
  },
  rowLabel: {
    fontSize: fontSize.button,
    lineHeight: 24,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  rowLabelActive: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  // 구역 이름. 항목보다 작고 흐리게 둬서 누르는 곳이 아니라는 걸 보인다.
  sectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    includeFontPadding: false,
    marginTop: 4,
  },
  section: {
    marginTop: 18,
  },
  rowAction: {
    fontSize: fontSize.button,
    lineHeight: 24,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  // 탈퇴는 되돌릴 수 없어서 다른 항목과 색으로 구분한다.
  rowDanger: {
    color: '#D8342B',
  },
  check: {
    fontSize: fontSize.button,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  doneText: {
    fontSize: fontSize.button,
    lineHeight: 24,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
});

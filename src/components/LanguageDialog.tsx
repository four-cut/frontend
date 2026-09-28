import React from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';

import {LOCALES, LOCALE_LABEL, setLocale, useLocale, useT} from '../i18n';
import {colors, fonts, fontSize} from '../theme';
import {Text} from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 언어를 고르는 팝업.
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
          <Text style={styles.title}>{t.settings.language}</Text>

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
  title: {
    fontSize: 18,
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
    fontFamily: fonts.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  rowLabelActive: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  check: {
    fontSize: fontSize.button,
    color: colors.textPrimary,
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  doneText: {
    fontSize: fontSize.button,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
});

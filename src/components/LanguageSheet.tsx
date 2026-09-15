import React from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {LOCALES, LOCALE_LABEL, setLocale, useLocale, useT} from '../i18n';
import {colors, fonts, fontSize} from '../theme';
import {Text} from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 언어를 고르는 바텀 시트.
 *
 * 각 언어 이름은 그 언어로 적는다 — 일본어로 잘못 바꿔 놓고 한국어를 다시
 * 찾아야 하는 사람에게 "한국어" 라고 적혀 있어야 찾을 수 있다.
 */
export default function LanguageSheet({visible, onClose}: Props) {
  const insets = useSafeAreaInsets();
  const locale = useLocale();
  const t = useT();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={[styles.sheet, {paddingBottom: insets.bottom + 16}]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.settings.language}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
            <Text style={styles.done}>{t.common.done}</Text>
          </Pressable>
        </View>

        {LOCALES.map(option => {
          const selected = option === locale;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              accessibilityLabel={LOCALE_LABEL[option]}
              onPress={() => setLocale(option)}
              style={({pressed}) => [styles.row, pressed && styles.pressed]}>
              <Text
                style={[styles.rowLabel, selected && styles.rowLabelActive]}>
                {LOCALE_LABEL[option]}
              </Text>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  done: {
    fontSize: fontSize.button,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
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
});

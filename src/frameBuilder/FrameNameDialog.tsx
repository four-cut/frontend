import React, {useEffect, useRef, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import {Text, TextInput} from '../components/AppText';
import {useT} from '../i18n';
import {colors, fonts} from '../theme';

/**
 * 프레임 이름 최대 글자 수.
 *
 * "내 프레임" 탭(한 줄에 3개, 카드 폭 약 109dp, 13px)에서 한글 한 글자가
 * 약 11dp 라 실측으로 9자까지 들어가고 10자는 말줄임표로 잘렸다. 여유를
 * 두고 8자로 정했다. 촬영 후 프레임 고르기의 작은 카드(72dp)에서는 두 줄로
 * 나눠 보여 준다.
 */
export const FRAME_NAME_MAX_LENGTH = 8;

type Props = {
  visible: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
};

/**
 * 프레임을 저장하기 전에 이름을 받는다. 내 프레임 목록과 촬영 후 프레임
 * 고르기에서 이 이름으로 구분한다.
 */
export default function FrameNameDialog({visible, onCancel, onSave}: Props) {
  const t = useT();
  const {height} = useWindowDimensions();
  const [name, setName] = useState('');
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // 열 때마다 비운다. 지난번에 쓰다 만 이름이 남아 있으면 같은 이름으로
  // 저장하기 쉽다.
  //
  // 키보드도 여기서 올린다. 안드로이드 Modal 은 autoFocus 나 onShow 에서
  // 포커스를 잡으면 창이 아직 입력을 받을 준비가 안 돼서 키보드가 안 뜬다.
  // 페이드 애니메이션이 끝난 뒤에 잡는다.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setName('');
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [visible]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;
  const save = () => {
    if (canSave) {
      onSave(trimmed);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      {/* 창을 누르면 닫히지 않도록, 닫는 영역과 창을 형제로 둔다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.cancel}
        onPress={onCancel}
        style={styles.backdrop}
      />
      {/* Modal 안에서는 KeyboardAvoidingView 가 믿을 만하지 않아서, 창을
          처음부터 위쪽에 띄워 키보드가 올라와도 가리지 않게 한다. */}
      <View
        pointerEvents="box-none"
        style={[styles.anchor, {paddingTop: height * 0.16}]}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{t.frame.nameTitle}</Text>
          <Text style={styles.description}>{t.frame.nameDescription}</Text>

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={name}
              onChangeText={setName}
              placeholder={t.frame.namePlaceholder}
              placeholderTextColor={colors.textMuted}
              maxLength={FRAME_NAME_MAX_LENGTH}
              returnKeyType="done"
              onSubmitEditing={save}
              accessibilityLabel={t.frame.nameTitle}
              style={styles.input}
            />
            {/* maxLength 와 같은 기준(UTF-16 길이)으로 센다. 글자 단위로 세면
                이모지가 1자로 보여서 7/8 인데 더 안 써지는 일이 생긴다. */}
            <Text style={styles.counter}>
              {name.length}/{FRAME_NAME_MAX_LENGTH}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({pressed}) => [styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>{t.common.cancel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{disabled: !canSave}}
              disabled={!canSave}
              onPress={save}
              style={({pressed}) => [
                styles.save,
                !canSave && styles.saveDisabled,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.saveText}>{t.frame.save}</Text>
            </Pressable>
          </View>
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
  anchor: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
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
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  inputRow: {
    marginTop: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  counter: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  cancel: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  save: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: colors.black,
    justifyContent: 'center',
  },
  saveDisabled: {
    opacity: 0.3,
  },
  saveText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.white,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.6,
  },
});

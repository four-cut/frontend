import React from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, View} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import {useAuth, useSocialSignIn} from '../auth';
import {colors, fonts} from '../theme';

/**
 * 자리표시용 화면 — 갤러리 UI 는 추후 작업.
 *
 * 로그인해야 들어올 수 있는 탭이라(BottomTabBar 의 requiresAuth), 여기서는
 * 로그인 수단을 다시 보여줄 필요가 없다. 지금은 내 정보와 로그아웃만 둔다.
 */
export default function GalleryScreen() {
  const {status, member} = useAuth();
  const {signOutEverywhere} = useSocialSignIn();

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {member ? (
        <>
          {member.profileImageUrl ? (
            <Image
              source={{uri: member.profileImageUrl}}
              style={styles.avatar}
            />
          ) : null}
          <Text style={styles.name}>{member.nickname ?? '이름 없음'}</Text>
          <Text style={styles.detail}>{member.email ?? '이메일 미제공'}</Text>
          <Text style={styles.detail}>{member.provider} 로그인</Text>
          <PrimaryButton
            label="로그아웃"
            onPress={signOutEverywhere}
            style={styles.action}
          />
        </>
      ) : (
        <Text style={styles.detail}>로그인이 필요합니다</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  detail: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  action: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
});

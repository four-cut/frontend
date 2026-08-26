import React from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, View} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import {useAuth, useSocialSignIn} from '../auth';
import {colors, fonts} from '../theme';

/**
 * 자리표시용 화면 — 갤러리 UI 는 추후 작업.
 *
 * 지금은 로그인 상태를 확인하고 조작할 수 있는 유일한 진입점 역할을 겸한다.
 * 시안에 로그인 화면이 없어서 위치를 임의로 정하지 않고, 이미 비어 있던
 * 이 탭에 임시로 붙였다. 갤러리 실제 UI 를 만들 때 정리해야 한다.
 */
export default function GalleryScreen() {
  const {status, member} = useAuth();
  const {start, signOutEverywhere, pending, error} = useSocialSignIn();

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
        <>
          <Text style={styles.name}>갤러리</Text>
          <Text style={styles.detail}>로그인하면 내 사진을 볼 수 있어요</Text>
          <PrimaryButton
            label={pending === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
            onPress={() => start('kakao')}
            style={styles.action}
          />
          <PrimaryButton
            label={pending === 'google' ? '연결 중…' : '구글로 시작하기'}
            onPress={() => start('google')}
            style={styles.secondAction}
          />
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  secondAction: {
    marginTop: 10,
    alignSelf: 'stretch',
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#D8342B',
    textAlign: 'center',
  },
});

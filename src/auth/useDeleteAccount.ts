import {useCallback, useState} from 'react';
import {Alert} from 'react-native';

import {useT} from '../i18n';
import {useAuth} from './AuthContext';
import {unlinkProvider} from './useSocialSignIn';
import {deleteAllFrames} from '../frameBuilder/frameStorage';

/**
 * 회원 탈퇴 흐름.
 *
 * 두 스토어 모두 로그인이 있는 앱은 앱 안에서 계정을 지울 수 있어야 한다
 * (App Store 5.1.1(v), Google Play 계정 삭제 정책). API(DELETE /api/members/me)
 * 와 AuthContext.deleteAccount 는 있었지만 부르는 화면이 없었다.
 *
 * 순서가 중요하다.
 * 1. 되돌릴 수 없으니 먼저 묻는다. 무엇이 지워지고 무엇이 남는지 적는다 —
 *    "기기에 저장한 사진도 사라지나?" 가 가장 먼저 드는 걱정이다.
 * 2. 서버 계정부터 지운다. 여기서 실패하면 아무것도 바뀌지 않은 채로 끝난다.
 * 3. 기기에 저장한 프레임을 지운다. 탈퇴한 사람이 만든 것이라 남기지 않는다.
 *    네컷 사진은 사진 앱에 있는 사용자의 사진이라 건드리지 않는다.
 * 4. 카카오·구글 연결을 끊는다. 서버 계정은 이미 지워졌으므로 여기서
 *    실패해도 탈퇴는 끝난 것이다. 연결이 남으면 다음 로그인 때 동의 화면만
 *    건너뛸 뿐 새 계정으로 가입된다.
 */
export function useDeleteAccount() {
  const t = useT();
  const {member, deleteAccount} = useAuth();
  const [deleting, setDeleting] = useState(false);

  const run = useCallback(async () => {
    const provider = member?.provider;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setDeleting(false);
      Alert.alert(t.settings.deleteFailed);
      return;
    }
    try {
      await deleteAllFrames();
    } catch {
      // 서버 계정은 이미 지워졌다. 프레임 탭은 로그인해야 열리므로
      // 남은 프레임이 바로 드러나지는 않는다.
    }
    try {
      if (provider === 'KAKAO') {
        await unlinkProvider('kakao');
      } else if (provider === 'GOOGLE') {
        await unlinkProvider('google');
      }
    } catch {
      // 위 4번 참고. 탈퇴 자체는 끝났다.
    }
    setDeleting(false);
    Alert.alert(t.settings.deleted);
  }, [member, deleteAccount, t]);

  const confirm = useCallback(
    (onConfirmed?: () => void) => {
      Alert.alert(t.settings.deleteTitle, t.settings.deleteBody, [
        {text: t.common.cancel, style: 'cancel'},
        {
          text: t.settings.deleteConfirm,
          style: 'destructive',
          onPress: () => {
            onConfirmed?.();
            run();
          },
        },
      ]);
    },
    [run, t],
  );

  return {confirm, deleting};
}

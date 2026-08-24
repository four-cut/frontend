/**
 * 사용자가 로그인 창을 닫은 경우.
 *
 * 실패가 아니라 의사 표시라 화면에 에러를 띄우면 안 된다.
 * 조용히 원래 상태로 돌아가야 한다.
 */
export class SignInCancelled extends Error {
  constructor() {
    super('사용자가 로그인을 취소했다');
    this.name = 'SignInCancelled';
  }
}

/**
 * 소셜 로그인 제공자.
 *
 * apple 은 당장 붙이지 않는다. Apple Developer Program(연 12만원)이
 * 있어야 Sign in with Apple capability 를 켤 수 있는데 아직 없다.
 * 다만 App Store 출시 시점에는 필수다 — 심사 지침 4.8 이 카카오·구글 같은
 * 소셜 로그인을 쓰면 이메일 마스킹이 되는 수단을 함께 제공하라고 요구하고,
 * 사실상 Sign in with Apple 뿐이다. 그래서 타입에는 남겨 둔다.
 */
export type Provider = 'kakao' | 'google' | 'apple';

/** MemberResponse 와 1:1 대응. provider 는 서버가 대문자로 준다. */
export type Member = {
  memberId: number;
  provider: 'KAKAO' | 'GOOGLE' | 'APPLE';
  email?: string;
  nickname?: string;
  profileImageUrl?: string;
};

/** 서버가 준 토큰 쌍에 만료 시각을 계산해 붙인 형태. */
export type Session = {
  accessToken: string;
  refreshToken: string;
  /** epoch ms. expiresIn 을 받은 시각 기준으로 계산해 둔다. */
  expiresAt: number;
  member: Member;
};

/** POST /api/auth/login/{provider} 요청 본문. */
export type SocialLoginRequest = {
  /** 카카오=액세스 토큰, 구글=ID 토큰, 애플=identityToken */
  token: string;
  /**
   * 애플 전용. 서버가 토큰을 폐기(revoke)하려면 필요하다.
   * 백엔드 스키마에는 아직 없다. 애플 연동을 시작할 때 추가 요청할 것.
   */
  authorizationCode?: string;
  /**
   * 애플 전용. 애플은 이름을 최초 1회 인증에서만 내려주므로
   * 그때 서버로 넘기지 않으면 영영 받을 수 없다.
   * 백엔드 스키마에는 아직 없다. 애플 연동을 시작할 때 추가 요청할 것.
   */
  name?: string;
};

/** POST /api/auth/login/{provider} 응답. */
export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  newMember: boolean;
  member: Member;
};

/** POST /api/auth/reissue 응답. 로그인 응답과 달리 member 가 없다. */
export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

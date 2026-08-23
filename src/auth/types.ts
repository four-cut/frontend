/** 백엔드가 지원하는 소셜 로그인 제공자. */
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
   * TODO: 백엔드 스키마에 아직 없다. 추가 여부 확인 중.
   */
  authorizationCode?: string;
  /**
   * 애플 전용. 애플은 이름을 최초 1회 인증에서만 내려주므로
   * 그때 서버로 넘기지 않으면 영영 받을 수 없다.
   * TODO: 백엔드 스키마에 아직 없다. 추가 여부 확인 중.
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

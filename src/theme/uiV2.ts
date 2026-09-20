/**
 * 결과 화면 UI 개편(V2) 전용 토큰. — 되돌리려면 이 파일과 `components/v2/` 를
 * 지우고 `LogoSelectScreen` 의 `UI-V2` 주석이 달린 부분만 되돌리면 된다.
 *
 * 공용 `theme/` 값은 건드리지 않는다. 다른 담당자 화면이 같이 바뀌면
 * 시안을 비교할 수 없고, 되돌릴 때도 범위가 커진다. 그래서 값을 고치는 대신
 * 여기에 새로 둔다. 개편안이 팀에서 채택되면 이 파일을 공용 테마로 옮긴다.
 *
 * 수치 근거는 Material 3 타입 스케일과 iOS HIG 를 겹쳐 본 공통 범위다.
 * 지금 앱은 제목 34 / 본문 21 로 키오스크에 가깝고, 상용 사진앱은
 * 제목 24~28 / 본문 16~17 을 쓴다.
 */
import {colors} from './colors';

export const sizeV2 = {
  /** 화면 제목 */
  title: 26,
  /** 구역 제목 — 바텀시트 헤더 */
  sectionTitle: 20,
  /** 본문 */
  body: 17,
  /** 버튼 라벨 */
  button: 16,
  /** 카드·썸네일 라벨 */
  caption: 15,
  /** 보조 설명, 스낵바 */
  footnote: 13,
} as const;

/** 행간. 본문은 1.4배, 제목은 1.25배. */
export const lineV2 = {
  title: Math.round(sizeV2.title * 1.25),
  sectionTitle: Math.round(sizeV2.sectionTitle * 1.25),
  body: Math.round(sizeV2.body * 1.4),
  caption: Math.round(sizeV2.caption * 1.4),
  footnote: Math.round(sizeV2.footnote * 1.4),
} as const;

/** 4의 배수 간격. */
export const spaceV2 = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radiusV2 = {
  /** 버튼 — 완전히 둥글게 */
  pill: 999,
  card: 16,
  sheet: 28,
} as const;

/**
 * 최소 터치 영역. Material 48dp, HIG 44pt — 둘을 만족하는 48 을 쓴다.
 * 아이콘 자체는 24 로 그리고 주변 여백으로 48 을 채운다.
 */
export const touchV2 = {
  min: 48,
  icon: 24,
  /** 주 버튼 */
  buttonPrimary: 56,
  /** 보조 버튼 */
  buttonSecondary: 48,
} as const;

export const colorsV2 = {
  ...colors,
  /**
   * 강조색.
   *
   * 지금 팔레트는 흑·백·회색뿐이라 "선택됨"을 나타낼 수단이 아예 없다.
   * 프레임을 골라도 티가 안 나던 게 취향 문제가 아니라 이것 때문이다.
   * 로고의 검정 선화와 부딪히지 않게 채도를 낮춘 산호색을 골랐다.
   */
  accent: '#FF4D6D',
  /** 강조색 위에 얹는 글자 */
  onAccent: '#FFFFFF',
  /** 보조 버튼 배경 — 검정 버튼과 위계를 벌린다 */
  surfaceMuted: '#F2F3F5',
  /** 스낵바 배경 */
  inverseSurface: '#2B2B2B',
  onInverseSurface: '#FFFFFF',
  /** 바텀시트 뒤 어둡게 */
  scrim: 'rgba(0, 0, 0, 0.4)',
  danger: '#D8342B',
} as const;

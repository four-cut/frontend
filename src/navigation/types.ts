import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

/**
 * 찰칵 탭 내부 스택.
 * 안내사항까지는 탭바를 유지하므로 탭 안에 둔다. (CR-01)
 */
export type ShootStackParamList = {
  Home: undefined;
  Guide: undefined;
};

/** 하단 탭 — 탭바가 보이는 영역 */
export type MainTabParamList = {
  Shoot: NavigatorScreenParams<ShootStackParamList> | undefined;
  Gallery: undefined;
};

/**
 * 촬영 플로우. 레이아웃 선택부터는 탭바가 사라지므로
 * 탭 내부가 아니라 루트 스택의 형제로 둔다. (CR-01)
 */
export type CaptureStackParamList = {
  LayoutSelect: undefined;
  RotateGuide: undefined;
  Capture: undefined;
  PhotoSelect: undefined;
  LogoSelect: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  CaptureFlow: NavigatorScreenParams<CaptureStackParamList> | undefined;
  /** 프레임 만들기 — 편집 중엔 탭바가 필요 없어 CaptureFlow처럼 루트에 둔다. */
  FrameBuilder: undefined;
};

/**
 * 중첩 네비게이터를 가로지르는 이동용 타입.
 * navigate 는 현재 네비게이터에 없는 라우트 이름이면 부모로 올라가며 찾으므로,
 * 루트 스택의 라우트는 트리 어디서든 부를 수 있다.
 */
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export type ShootNavigation = NativeStackNavigationProp<ShootStackParamList>;

export type CaptureNavigation =
  NativeStackNavigationProp<CaptureStackParamList>;

import {useWindowDimensions} from 'react-native';

/**
 * 큰 화면(태블릿) 대응 기준.
 *
 * 부스에서는 태블릿을 세워 두고 쓴다. 화면은 폰용으로 짜여 있어서 그대로
 * 띄우면 버튼은 화면 끝까지 늘어나고 글자는 폰 크기 그대로라 작아 보였다
 * (2026-10-19 갤럭시 탭 시험).
 */

/** 짧은 변이 이 이상이면 태블릿으로 본다. Android 의 sw600dp 와 같은 기준이다. */
export const TABLET_MIN_SIDE = 600;

/** 태블릿에서 글자를 키우는 비율. 공용 Text(AppText)가 적용한다. */
export const TABLET_TEXT_SCALE = 1.15;

/** 화면 폭을 꽉 채우는 버튼이 넘지 않을 폭. 폰은 이보다 좁아서 그대로다. */
export const CONTENT_MAX_WIDTH = 560;

export function isTabletSize(width: number, height: number): boolean {
  return Math.min(width, height) >= TABLET_MIN_SIDE;
}

export function useIsTablet(): boolean {
  const {width, height} = useWindowDimensions();
  return isTabletSize(width, height);
}

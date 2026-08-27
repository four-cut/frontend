import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type {FrameSummary} from '../api/frames';

export type CaptureLayout = 'portrait' | 'landscape';

/** 레이아웃별 컷 수 — 서버에서 프레임을 못 받아왔을 때의 최후 폴백. */
export const CUT_COUNT: Record<CaptureLayout, number> = {
  portrait: 4,
  landscape: 3,
};

/** 프레임을 못 받아왔을 때 쓸 기본 촬영 매수. 평소엔 서버 값을 쓴다. */
export const SHOT_COUNT = 8;

/** 컷 사이 카운트다운 초. (SR-02 안내사항 1번) */
export const TIMER_SECONDS = 6;

function toCaptureLayout(orientation: FrameSummary['orientation']): CaptureLayout {
  return orientation === 'PORTRAIT' ? 'portrait' : 'landscape';
}

type CaptureSession = {
  /** GET /api/frames 에서 고른 프레임. 선택 전엔 null. */
  frame: FrameSummary | null;
  /** frame.orientation 에서 파생. */
  layout: CaptureLayout | null;
  /**
   * 몇 장을 찍는지. frame.requiredShotCount 에서 파생.
   *
   * 서버도 이 값으로 shotIndex 를 검증한다. 이보다 큰 인덱스로 올리면
   * INVALID_SHOT_INDEX 로 거부된다.
   */
  shotCount: number;
  /**
   * 몇 장을 고르는지. frame.slotCount 에서 파생. 프레임 선택 전에는 0.
   *
   * 촬영 장수와 다른 값이다. 8장 찍고 4장 고르는 게 기본이라
   * 둘을 같은 값으로 두면 선택 화면이 8장을 요구하게 된다.
   */
  cutCount: number;
  /** 촬영본 경로. file:// 스킴을 포함한다. */
  shots: string[];
  /** 고른 촬영본의 인덱스. 배열 순서가 곧 스트립에 놓이는 순서다. */
  selection: number[];
  /** 8장을 찍는 과정을 담은 영상. 녹화가 끝나야 채워진다. (OQ-01) */
  video: string | null;
  selectFrame: (frame: FrameSummary) => void;
  addShot: (path: string) => void;
  setVideo: (path: string) => void;
  /** 이미 고른 사진이면 빼고, 아니면 컷 수까지만 더한다. */
  toggleSelection: (shotIndex: number) => void;
};

// 로고(logo)는 M6 에서 추가한다.
const CaptureSessionContext = createContext<CaptureSession | null>(null);

type Props = {children: React.ReactNode};

/**
 * Provider 를 촬영 플로우 네비게이터 안에 두면 플로우를 벗어날 때
 * 언마운트되면서 세션이 자동으로 정리된다. 별도 reset 이 필요 없다.
 */
export function CaptureSessionProvider({children}: Props) {
  const [frame, setFrame] = useState<FrameSummary | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  const layout = frame ? toCaptureLayout(frame.orientation) : null;
  const shotCount = frame ? frame.requiredShotCount : SHOT_COUNT;
  const cutCount = frame ? frame.slotCount : 0;

  const selectFrame = useCallback((next: FrameSummary) => {
    setFrame(next);
  }, []);

  const addShot = useCallback((path: string) => {
    setShots(prev => [...prev, path]);
  }, []);

  const toggleSelection = useCallback(
    (shotIndex: number) => {
      setSelection(prev => {
        if (prev.includes(shotIndex)) {
          return prev.filter(index => index !== shotIndex);
        }
        if (prev.length >= cutCount) {
          return prev;
        }
        return [...prev, shotIndex];
      });
    },
    [cutCount],
  );

  const value = useMemo<CaptureSession>(
    () => ({
      frame,
      layout,
      shotCount,
      cutCount,
      shots,
      selection,
      video,
      selectFrame,
      addShot,
      setVideo,
      toggleSelection,
    }),
    [
      frame,
      layout,
      shotCount,
      cutCount,
      shots,
      selection,
      video,
      selectFrame,
      addShot,
      toggleSelection,
    ],
  );

  return (
    <CaptureSessionContext.Provider value={value}>
      {children}
    </CaptureSessionContext.Provider>
  );
}

export function useCaptureSession() {
  const session = useContext(CaptureSessionContext);
  if (!session) {
    throw new Error(
      'useCaptureSession 은 CaptureSessionProvider 안에서만 쓸 수 있다.',
    );
  }
  return session;
}

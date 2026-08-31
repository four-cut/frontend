import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type {FrameSummary} from '../api/frames';

export type CaptureLayout = 'portrait' | 'landscape';

/** 레이아웃별 컷 수 — 프레임과 무관하게 방향만으로 정해진다. */
export const CUT_COUNT: Record<CaptureLayout, number> = {
  portrait: 4,
  landscape: 3,
};

/** 촬영 매수. 프레임과 무관하게 고정. */
export const SHOT_COUNT = 8;

/** 컷 사이 카운트다운 초. (SR-02 안내사항 1번) */
export const TIMER_SECONDS = 6;

type CaptureSession = {
  /** 레이아웃 고르기에서 정한 방향. 선택 전엔 null. 촬영이 끝나면 안 바뀐다. */
  layout: CaptureLayout | null;
  /** 촬영 매수 — 항상 SHOT_COUNT. */
  shotCount: number;
  /** 골라야 하는 장수 — layout에서 파생 (CUT_COUNT). 방향 선택 전엔 0. */
  cutCount: number;
  /** 촬영본 경로. file:// 스킴을 포함한다. */
  shots: string[];
  /** 고른 촬영본의 인덱스. 배열 순서가 곧 스트립에 놓이는 순서다. */
  selection: number[];
  /** 8장을 찍는 과정을 담은 영상. 녹화가 끝나야 채워진다. (OQ-01) */
  video: string | null;
  /**
   * 인쇄·저장 화면에서 고른 디자인 프레임. 촬영 방향과는 무관하고,
   * 배경·텍스트·스티커를 최종 합성에 입힐 때만 쓰인다. 안 고르면 null(무배경).
   */
  frame: FrameSummary | null;
  selectLayout: (layout: CaptureLayout) => void;
  selectFrame: (frame: FrameSummary | null) => void;
  addShot: (path: string) => void;
  setVideo: (path: string) => void;
  /** 이미 고른 사진이면 빼고, 아니면 컷 수까지만 더한다. */
  toggleSelection: (shotIndex: number) => void;
};

const CaptureSessionContext = createContext<CaptureSession | null>(null);

type Props = {children: React.ReactNode};

/**
 * Provider 를 촬영 플로우 네비게이터 안에 두면 플로우를 벗어날 때
 * 언마운트되면서 세션이 자동으로 정리된다. 별도 reset 이 필요 없다.
 */
export function CaptureSessionProvider({children}: Props) {
  const [layout, setLayout] = useState<CaptureLayout | null>(null);
  const [frame, setFrame] = useState<FrameSummary | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  const shotCount = SHOT_COUNT;
  const cutCount = layout ? CUT_COUNT[layout] : 0;

  const selectLayout = useCallback((next: CaptureLayout) => {
    setLayout(next);
  }, []);

  const selectFrame = useCallback((next: FrameSummary | null) => {
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
      layout,
      shotCount,
      cutCount,
      shots,
      selection,
      video,
      frame,
      selectLayout,
      selectFrame,
      addShot,
      setVideo,
      toggleSelection,
    }),
    [
      layout,
      shotCount,
      cutCount,
      shots,
      selection,
      video,
      frame,
      selectLayout,
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

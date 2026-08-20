import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type CaptureLayout = 'portrait' | 'landscape';

/** 레이아웃별 컷 수 — 세로형은 2×2, 가로형은 3단 적층. (SR-03) */
export const CUT_COUNT: Record<CaptureLayout, number> = {
  portrait: 4,
  landscape: 3,
};

/** 촬영 매수. 이 중에서 컷 수만큼 고른다. (SR-05) */
export const SHOT_COUNT = 8;

/** 컷 사이 카운트다운 초. (SR-02 안내사항 1번) */
export const TIMER_SECONDS = 6;

type CaptureSession = {
  layout: CaptureLayout | null;
  /** layout 에서 파생. 레이아웃 선택 전에는 0. */
  cutCount: number;
  /** 촬영본 경로. file:// 스킴을 포함한다. */
  shots: string[];
  /** 고른 촬영본의 인덱스. 배열 순서가 곧 스트립에 놓이는 순서다. */
  selection: number[];
  selectLayout: (layout: CaptureLayout) => void;
  addShot: (path: string) => void;
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
  const [layout, setLayout] = useState<CaptureLayout | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [selection, setSelection] = useState<number[]>([]);

  const cutCount = layout ? CUT_COUNT[layout] : 0;

  const selectLayout = useCallback((next: CaptureLayout) => {
    setLayout(next);
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
      cutCount,
      shots,
      selection,
      selectLayout,
      addShot,
      toggleSelection,
    }),
    [layout, cutCount, shots, selection, selectLayout, addShot, toggleSelection],
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

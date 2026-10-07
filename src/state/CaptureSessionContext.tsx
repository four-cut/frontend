import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {FrameSummary} from '../api/frames';
import MediaFile from '../specs/NativeMediaFile';

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
  /**
   * 스트립의 자리마다 어느 촬영본이 들어갈지. 길이는 항상 컷 수와 같고,
   * 아직 안 채운 자리는 null 이다.
   *
   * 고른 순서대로 쌓는 배열이 아니다 — 그러면 가운데 것을 빼는 순간 뒤가
   * 앞으로 당겨져서, 누른 자리가 아니라 맨 뒤가 비는 것처럼 보인다.
   */
  selection: (number | null)[];
  /** 8장을 찍는 과정을 담은 영상. 녹화가 끝나야 채워진다. (OQ-01) */
  video: string | null;
  /**
   * 인쇄·저장 화면에서 고른 디자인 프레임. 촬영 방향과는 무관하고,
   * 배경·텍스트·스티커를 최종 합성에 입힐 때만 쓰인다. 안 고르면 null(무배경).
   */
  frame: FrameSummary | null;
  /**
   * 촬영 대신 앨범 사진으로 만든 세션인지. 이때는 찍는 과정이 없으니 영상도
   * 없어서, 영상이 있어야 하는 QR 같은 기능을 감춰야 한다.
   */
  fromAlbum: boolean;
  selectLayout: (layout: CaptureLayout) => void;
  selectFrame: (frame: FrameSummary | null) => void;
  addShot: (path: string) => void;
  setVideo: (path: string) => void;
  /**
   * 플로우가 끝나면 지울 파일을 알려 둔다. 합성 결과나 배속 전 원본 영상처럼
   * 세션 state 에 남지 않는 것들이다.
   */
  trackTempFile: (uri: string) => void;
  /** 이미 고른 사진이면 빼고, 아니면 컷 수까지만 더한다. */
  toggleSelection: (shotIndex: number) => void;
  /**
   * 앨범에서 고른 사진(file://)을 고른 순서대로 세션에 넣는다. 전부 쓰이는
   * 사진이라 선택도 그 순서 그대로 채운다.
   */
  setAlbumShots: (paths: string[]) => void;
};

/**
 * 자리 배열에서 한 촬영본을 넣거나 뺀다.
 *
 * 이미 들어 있으면 그 자리만 비운다 — 뒤 사진을 앞으로 당겨오지 않는다.
 * 당겨오면 1번을 뺐는데 4번 자리가 빈 것처럼 보인다.
 *
 * 새로 넣을 때는 앞에서부터 처음 비어 있는 자리에 넣는다.
 */
export function toggleSlot(
  slots: (number | null)[],
  shotIndex: number,
  cutCount: number,
): (number | null)[] {
  // 길이가 어긋나 있어도 자리 수는 항상 컷 수에 맞춘다.
  const next =
    slots.length === cutCount
      ? [...slots]
      : Array.from({length: cutCount}, (_, index) => slots[index] ?? null);

  const at = next.indexOf(shotIndex);
  if (at >= 0) {
    next[at] = null;
    return next;
  }

  const empty = next.indexOf(null);
  if (empty < 0) {
    return slots;
  }
  next[empty] = shotIndex;
  return next;
}

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
  const [selection, setSelection] = useState<(number | null)[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [fromAlbum, setFromAlbum] = useState(false);

  const shotCount = SHOT_COUNT;
  const cutCount = layout ? CUT_COUNT[layout] : 0;

  // 언마운트 시점에는 state 가 이미 닫혀 있어서 최신 값을 따로 들고 있어야 한다.
  const latest = useRef({shots, video});
  useEffect(() => {
    latest.current = {shots, video};
  }, [shots, video]);

  const tempFiles = useRef(new Set<string>());
  const trackTempFile = useCallback((uri: string) => {
    tempFiles.current.add(uri);
  }, []);

  // 플로우를 벗어나면 이 세션이 만든 파일을 모두 지운다. (NFR-04)
  //
  // 고른 촬영본도 지운다. 남겨 둘 결과물은 앨범에 복사돼 있고, 갤러리도
  // 앨범에서 읽는다. 캐시에 둔 원본은 플로우 밖에서 쓰는 곳이 없다.
  // 안드로이드는 저장 공간이 빠듯할 때나 캐시를 비우므로 그냥 두면 계속 쌓인다.
  useEffect(
    () => () => {
      const {shots: taken, video: clip} = latest.current;
      const targets = new Set([...taken, ...tempFiles.current]);
      if (clip) {
        targets.add(clip);
      }
      if (targets.size === 0 || !MediaFile) {
        return;
      }
      // 화면은 이미 사라진 뒤라 실패를 알릴 곳이 없다. 시스템 캐시 비우기에 맡긴다.
      MediaFile.deleteFiles([...targets]).catch(() => {});
    },
    [],
  );

  const selectLayout = useCallback((next: CaptureLayout) => {
    setLayout(next);
    // 방향이 정해져야 컷 수가 정해진다. 자리를 그 수만큼 비워 둔다.
    setSelection(Array.from({length: CUT_COUNT[next]}, () => null));
  }, []);

  const selectFrame = useCallback((next: FrameSummary | null) => {
    setFrame(next);
  }, []);

  const addShot = useCallback((path: string) => {
    setShots(prev => [...prev, path]);
  }, []);

  const toggleSelection = useCallback(
    (shotIndex: number) => {
      setSelection(prev => toggleSlot(prev, shotIndex, cutCount));
    },
    [cutCount],
  );

  const setAlbumShots = useCallback((paths: string[]) => {
    setFromAlbum(true);
    setShots(paths);
    setSelection(paths.map((_, index) => index));
  }, []);

  const value = useMemo<CaptureSession>(
    () => ({
      layout,
      shotCount,
      cutCount,
      shots,
      selection,
      video,
      frame,
      fromAlbum,
      selectLayout,
      selectFrame,
      addShot,
      setVideo,
      trackTempFile,
      toggleSelection,
      setAlbumShots,
    }),
    [
      layout,
      shotCount,
      cutCount,
      shots,
      selection,
      video,
      frame,
      fromAlbum,
      selectLayout,
      selectFrame,
      addShot,
      trackTempFile,
      toggleSelection,
      setAlbumShots,
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

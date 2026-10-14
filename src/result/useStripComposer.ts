import {useCallback, useEffect, useRef, useState} from 'react';

import {composeStrip} from '../capture/composeStrip';
import type {FrameDesign} from '../frameBuilder/types';
import type {CaptureLayout} from '../state/CaptureSessionContext';

type Options = {
  layout: CaptureLayout | null;
  photos: string[];
  design: FrameDesign | undefined;
  /** 처음 씌울 프레임이 정해졌는지. 그 전에는 합성하지 않는다. */
  ready: boolean;
  trackTempFile: (uri: string) => void;
};

/**
 * 결과 화면의 합성. 프레임이 바뀔 때마다 다시 그린다.
 *
 * - 한 번에 하나만 돌린다. 합성 하나가 서피스와 원본 사진을 합쳐 수십 MB 를
 *   쓴다. 전에는 프레임을 연달아 누르면 앞의 결과를 버리기만 하고 작업은
 *   전부 동시에 끝까지 돌아서 저가 폰에서 메모리가 모자랄 수 있었다. 지금은
 *   돌던 것이 끝나면 마지막 요청 하나만 이어서 돌린다.
 * - 실패하면 이전 결과를 지운다. 전에는 이전 프레임 결과가 그대로 남아서,
 *   목록에는 새 프레임이 골라져 있는데 저장·인쇄는 이전 프레임으로 됐다.
 * - retry 로 같은 조건을 다시 합성한다. 실패했다고 홈으로 나가면 찍은 사진이
 *   전부 사라진다.
 */
export function useStripComposer({
  layout,
  photos,
  design,
  ready,
  trackTempFile,
}: Options) {
  // composeStrip 이 네이티브 모듈로 file:// 경로까지 떨궈서 돌려준다.
  // (네이티브 모듈이 없는 환경에서만 예외적으로 data URI 로 돌아온다.)
  const [strip, setStrip] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  /** 다시 합성하는 중인지. 배경 사진이 크면 몇 초 걸린다. */
  const [composing, setComposing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /** 앞의 합성이 끝나야 다음 것이 시작된다. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!layout || !ready) {
      return;
    }
    let superseded = false;
    setComposing(true);
    setFailed(false);

    queue.current = queue.current.then(async () => {
      // 기다리는 사이에 프레임이 또 바뀌었으면 그릴 필요가 없다.
      if (superseded) {
        return;
      }
      try {
        const uri = await composeStrip(layout, photos, design);
        // 프레임을 바꿀 때마다 새 파일이 생긴다. 화면에 쓰든 안 쓰든
        // 파일은 이미 써졌으니 정리 대상에 올린다.
        if (uri.startsWith('file://')) {
          trackTempFile(uri);
        }
        if (!superseded) {
          setStrip(uri);
        }
      } catch {
        if (!superseded) {
          setStrip(null);
          setFailed(true);
        }
      } finally {
        if (!superseded) {
          setComposing(false);
        }
      }
    });

    return () => {
      superseded = true;
    };
  }, [layout, photos, design, ready, trackTempFile, attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  return {strip, failed, composing, retry};
}

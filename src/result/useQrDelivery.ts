import {useCallback, useEffect, useRef, useState} from 'react';

import {fetchRemoteFrames} from '../api/frames';
import {
  createSession,
  uploadCompositeImage,
  uploadVideo,
} from '../api/photoSession';
import {toUserMessage} from '../api/userMessage';
import {useT} from '../i18n';

export type QrStatus = 'idle' | 'preparing' | 'ready' | 'failed';

/**
 * 스트립은 몇 MB, 영상은 그보다 크다. 이만큼 지나면 끊고 다시 하게 한다.
 * 에뮬레이터에서 영상까지 올리는 데 1~2분 걸린 적이 있어 영상은 넉넉히 둔다.
 * 그보다 먼저 그만두고 싶으면 취소 버튼이 있다.
 */
export const PHOTO_UPLOAD_TIMEOUT_MS = 60_000;
export const VIDEO_UPLOAD_TIMEOUT_MS = 180_000;

/** 사용자가 취소 버튼을 눌렀다. 오류가 아니라서 문구를 띄우지 않는다. */
class Cancelled extends Error {}

/**
 * 부스에 태블릿으로 두면 손님 기기가 아니라서 앨범 저장·공유가 소용없다.
 * QR 을 찍어 각자 폰으로 받아가는 경로가 필요하다.
 *
 * 서버는 사진(스트립)을 올려도, 영상을 올려도 같은 다운로드 페이지의 QR 을
 * 준다. 그래서 영상이 없어도(앨범으로 만든 네컷, 아직 영상 변환 중) 사진만으로
 * QR 을 만들고, 영상이 있으면 같은 세션에 함께 올린다.
 *
 * 한 번 만든 세션은 재사용한다. 다시 누르면 프레임을 바꿔 달라진 스트립이나
 * 그사이 준비된 영상처럼 빠진 것만 올리고, 다 올라가 있으면 QR 만 다시 띄운다.
 *
 * 업로드에는 시간 제한이 있고, 기다리는 중에 cancel 로 그만둘 수 있다.
 */
export function useQrDelivery(strip: string | null, video: string | null) {
  const t = useT();
  const [status, setStatus] = useState<QrStatus>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  /** QR 페이지에 올라간 것들. 다시 누르면 빠진 것만 채워 올린다. */
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedStrip, setUploadedStrip] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  /** QR 페이지에 사진까지 올라갔는지. 영상만 올라간 경우와 구분한다. */
  const [hasPhoto, setHasPhoto] = useState(false);

  const running = useRef<AbortController | null>(null);

  // 화면을 떠나면 올리던 것을 끊는다.
  useEffect(() => () => running.current?.abort(), []);

  const start = useCallback(async () => {
    if (running.current || !strip) {
      return;
    }
    const needPhoto = uploadedStrip !== strip && strip.startsWith('file://');
    const needVideo = !!video && !hasVideo;
    if (url && !needPhoto && !needVideo) {
      setOpen(true);
      return;
    }

    const controller = new AbortController();
    running.current = controller;
    const {signal} = controller;
    /** await 가 끝날 때마다 본다 — 취소한 뒤에 상태를 바꾸면 안 된다. */
    const checkCancelled = () => {
      if (signal.aborted) {
        throw new Cancelled();
      }
    };

    setStatus('preparing');
    setError(null);
    try {
      let id = sessionId;
      if (!id) {
        // 화면에서 고른 프레임 id 는 서버에 없을 수 있어서 그대로 못 쓴다.
        const remote = await fetchRemoteFrames();
        checkCancelled();
        const frameId = remote[0]?.frameId;
        if (frameId === undefined) {
          throw new Error(t.result.qrNoFrame);
        }
        id = (await createSession(frameId)).sessionId;
        checkCancelled();
        setSessionId(id);
      }

      let nextUrl = url;
      // 둘 다 실패하면 마지막 원인으로 문구를 고른다(끊김이면 끊김 문구).
      let lastError: unknown = null;

      // 사진과 영상 중 하나만 올라가도 QR 은 쓸 수 있다. 한쪽 실패로 전체를
      // 막지 않고, 무엇이 빠졌는지는 QR 창 안내 문구로 알린다.
      let photoOk = uploadedStrip === strip;
      if (needPhoto) {
        try {
          const uploaded = await uploadCompositeImage(id, strip, {
            signal,
            timeoutMs: PHOTO_UPLOAD_TIMEOUT_MS,
          });
          checkCancelled();
          nextUrl = uploaded.qrCodeUrl ?? nextUrl;
          setUploadedStrip(strip);
          photoOk = true;
        } catch (e) {
          checkCancelled();
          lastError = e;
          photoOk = false;
        }
      }

      let videoOk = hasVideo;
      if (needVideo && video) {
        try {
          const uploaded = await uploadVideo(id, video, {
            signal,
            timeoutMs: VIDEO_UPLOAD_TIMEOUT_MS,
          });
          checkCancelled();
          nextUrl = uploaded.qrCodeUrl;
          setHasVideo(true);
          videoOk = true;
        } catch (e) {
          checkCancelled();
          // 사진만으로 QR 을 줄 수 있으면 그대로 간다.
          lastError = e;
        }
      }

      if (!nextUrl || (!photoOk && !videoOk)) {
        throw lastError ?? new Error(t.result.qrFailed);
      }
      setHasPhoto(photoOk);
      setUrl(nextUrl);
      setStatus('ready');
      setOpen(true);
    } catch (e) {
      if (e instanceof Cancelled) {
        // 올라간 것은 그대로 두고 다음에 빠진 것만 올린다.
        return;
      }
      // 만료 등으로 세션이 망가졌을 수 있으니 다음엔 새로 만든다.
      setSessionId(null);
      setUploadedStrip(null);
      setHasVideo(false);
      setHasPhoto(false);
      setUrl(null);
      setError(
        toUserMessage(e, {
          fallback: t.result.qrFailed,
          offline: t.result.qrOffline,
          known: [t.result.qrFailed, t.result.qrNoFrame],
        }),
      );
      setStatus('failed');
    } finally {
      if (running.current === controller) {
        running.current = null;
      }
    }
  }, [strip, video, url, sessionId, uploadedStrip, hasVideo, t]);

  const cancel = useCallback(() => {
    const controller = running.current;
    if (!controller) {
      return;
    }
    running.current = null;
    controller.abort();
    setStatus(url ? 'ready' : 'idle');
  }, [url]);

  return {
    status,
    url,
    error,
    open: open && !!url,
    close: useCallback(() => setOpen(false), []),
    start,
    cancel,
    hasPhoto,
    hasVideo,
    /** 지금 보이는 결과물을 QR 로 받아갈 수 있는지 */
    deliversCurrentStrip: hasPhoto && strip !== null && uploadedStrip === strip,
  };
}

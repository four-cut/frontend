import {useCallback, useState} from 'react';
import {Vibration} from 'react-native';

import {toUserMessage} from '../api/userMessage';
import {saveToAlbum, saveVideoToAlbum} from '../capture/saveToAlbum';
import {useT} from '../i18n';
import type {Strings} from '../i18n/ko';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

/** 어떤 파일에 대해 난 오류인지 같이 들고 있는다. */
type ErrorFor = {uri: string; message: string};

/** 저장이 끝났다는 걸 손끝으로도 알린다. 안 되는 기기에서 저장까지 실패시키지 않는다. */
function buzz() {
  try {
    Vibration.vibrate(20);
  } catch {
    // 무시한다.
  }
}

function errorMessage(t: Strings, error: unknown, fallback: string) {
  return toUserMessage(error, {
    fallback,
    // 권한 문구는 그대로 둬야 화면이 "설정에서 권한 허용" 을 띄운다.
    known: [t.errors.noSavePermission, t.errors.noSaveTarget],
  });
}

/**
 * 결과물을 앨범에 저장한다.
 *
 * "저장됐는지" 는 지금 화면에 보이는 결과물 기준이다. 전에는 한 번 저장하면
 * 상태가 계속 "저장됨" 이라서, 그 뒤에 프레임을 바꾼 결과물은 앨범에 없는데도
 * 저장 버튼이 공유로 바뀐 채였고 나갈 때 묻지도 않았다.
 *
 * 영상은 배속 변환이 끝나야 생긴다. 그 전에 사진을 저장했으면 영상은 나중에
 * saveVideo 로 따로 넣는다 — 전에는 그럴 방법이 없어서 영상을 놓쳤다.
 * 이미 넣은 영상은 사진을 다시 저장할 때 또 넣지 않는다.
 */
export function useStripSave(strip: string | null, video: string | null) {
  const t = useT();
  const [savedStrip, setSavedStrip] = useState<string | null>(null);
  const [savedVideo, setSavedVideo] = useState<string | null>(null);
  const [busy, setBusy] = useState<'photo' | 'video' | null>(null);
  const [photoError, setPhotoError] = useState<ErrorFor | null>(null);
  const [videoError, setVideoError] = useState<ErrorFor | null>(null);

  const photoSaved = strip !== null && savedStrip === strip;
  const videoSaved = video !== null && savedVideo === video;
  const currentPhotoError =
    strip !== null && photoError?.uri === strip ? photoError.message : null;

  const status: SaveStatus =
    busy === 'photo'
      ? 'saving'
      : photoSaved
      ? 'saved'
      : currentPhotoError
      ? 'failed'
      : 'idle';

  const save = useCallback(async () => {
    if (!strip || busy || savedStrip === strip) {
      return;
    }
    setBusy('photo');
    setPhotoError(null);
    try {
      const pendingVideo = video && savedVideo !== video ? video : null;
      const result = await saveToAlbum(strip, pendingVideo);
      setSavedStrip(strip);
      if (result.video && pendingVideo) {
        setSavedVideo(pendingVideo);
      }
      buzz();
    } catch (error) {
      setPhotoError({
        uri: strip,
        message: errorMessage(t, error, t.result.saveFailed),
      });
    } finally {
      setBusy(null);
    }
  }, [strip, video, busy, savedStrip, savedVideo, t]);

  const saveVideo = useCallback(async () => {
    if (!video || busy || savedVideo === video) {
      return;
    }
    setBusy('video');
    setVideoError(null);
    try {
      await saveVideoToAlbum(video);
      setSavedVideo(video);
      buzz();
    } catch (error) {
      setVideoError({
        uri: video,
        message: errorMessage(t, error, t.result.videoSaveFailed),
      });
    } finally {
      setBusy(null);
    }
  }, [video, busy, savedVideo, t]);

  return {
    status,
    save,
    saveVideo,
    savingVideo: busy === 'video',
    /** 지금 보이는 결과물이 앨범에 있는지 */
    photoSaved,
    videoSaved,
    /** 전에 저장한 적은 있는데 지금 보이는 결과물은 아직 없다(프레임을 바꿈) */
    staleSave:
      strip !== null && savedStrip !== null && !photoSaved && busy !== 'photo',
    photoError: currentPhotoError,
    videoError:
      video !== null && videoError?.uri === video ? videoError.message : null,
  };
}

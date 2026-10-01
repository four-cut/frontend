import React from 'react';
import {
  CameraRoll,
  type PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';

import {ensurePhotoReadPermission} from './photoPermission';

const PAGE_SIZE = 60;

export type AlbumStatus = 'idle' | 'loading' | 'denied' | 'error' | 'ready';

/**
 * 기기 앨범의 사진을 최신순으로 불러온다. enabled 가 켜질 때마다 처음부터
 * 다시 읽고, loadMore 로 다음 페이지를 이어 붙인다.
 */
export function useAlbumPhotos(enabled: boolean) {
  const [status, setStatus] = React.useState<AlbumStatus>('idle');
  const [photos, setPhotos] = React.useState<PhotoIdentifier[]>([]);
  const [endCursor, setEndCursor] = React.useState<string | undefined>(
    undefined,
  );
  const [hasNextPage, setHasNextPage] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const granted = await ensurePhotoReadPermission();
      if (cancelled) {
        return;
      }
      if (!granted) {
        setStatus('denied');
        return;
      }
      try {
        const page = await CameraRoll.getPhotos({
          first: PAGE_SIZE,
          assetType: 'Photos',
          // width/height는 기본값으로는 안 딸려온다 — 없으면 가로세로비가
          // NaN이 되어 스티커 이미지 높이가 NaN이 되고, 그래서 아예 안 그려진다.
          include: ['imageSize'],
        });
        if (cancelled) {
          return;
        }
        setPhotos(page.edges);
        setEndCursor(page.page_info.end_cursor);
        setHasNextPage(page.page_info.has_next_page);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // 앨범 전체를 스크롤로 더 불러온다 — 처음에 PAGE_SIZE장만 가져오고 끝이면
  // 그 뒤 사진은 영영 못 고른다.
  const loadMore = React.useCallback(async () => {
    if (!hasNextPage || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await CameraRoll.getPhotos({
        first: PAGE_SIZE,
        after: endCursor,
        assetType: 'Photos',
        include: ['imageSize'],
      });
      setPhotos(prev => [...prev, ...page.edges]);
      setEndCursor(page.page_info.end_cursor);
      setHasNextPage(page.page_info.has_next_page);
    } catch {
      // 더 불러오기만 실패한 것이므로 이미 있는 목록은 그대로 둔다.
    } finally {
      setLoadingMore(false);
    }
  }, [endCursor, hasNextPage, loadingMore]);

  return {status, photos, loadMore, loadingMore};
}

import {useCallback, useEffect, useState} from 'react';
import {
  CameraRoll,
  type PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';

import {ALBUM_NAME} from '../capture/saveToAlbum';
import {ensurePhotoReadPermission} from './photoPermission';

/** 한 번에 가져올 장수. 스크롤로 더 불러온다. */
const PAGE_SIZE = 60;

export type StripItem = {
  /** 앨범 자산의 식별자. 목록 key 로 쓴다. */
  id: string;
  uri: string;
  /** epoch ms. */
  takenAt: number;
};

/** 같은 달에 찍은 것끼리 묶은 한 덩어리. */
export type MonthSection = {
  /** 예: "2026년 8월" */
  title: string;
  data: StripItem[];
};

export type LoadStatus = 'loading' | 'denied' | 'error' | 'ready';

function toItem(edge: PhotoIdentifier): StripItem {
  return {
    id: edge.node.id,
    uri: edge.node.image.uri,
    // CameraRoll 의 timestamp 는 초다 (timeIntervalSince1970).
    takenAt: edge.node.timestamp * 1000,
  };
}

/**
 * 최신순으로 들어온 목록을 달별로 묶는다.
 *
 * getPhotos 가 이미 최신순으로 주므로 다시 정렬하지 않는다. 순서대로 훑으며
 * 달이 바뀔 때 새 덩어리를 여는 방식이라, 각 달 안에서도 최신순이 유지된다.
 */
export function groupByMonth(items: StripItem[]): MonthSection[] {
  const sections: MonthSection[] = [];
  let currentKey = '';

  for (const item of items) {
    const date = new Date(item.takenAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (key !== currentKey) {
      currentKey = key;
      sections.push({
        title: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
        data: [],
      });
    }
    sections[sections.length - 1].data.push(item);
  }

  return sections;
}

/**
 * 이 기기의 '찍고갈래' 앨범에 저장된 결과물을 읽어 온다.
 *
 * 서버에서 가져오지 않는다. 결과 화면에서 저장한 것만 이 앨범에 들어 있고,
 * 사진 앱에서 지우면 여기서도 사라진다.
 */
export function useSavedStrips() {
  const [items, setItems] = useState<StripItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    const granted = await ensurePhotoReadPermission();
    if (!granted) {
      setStatus('denied');
      return;
    }
    try {
      const page = await CameraRoll.getPhotos({
        first: PAGE_SIZE,
        assetType: 'Photos',
        groupTypes: 'Album',
        groupName: ALBUM_NAME,
        include: ['imageSize'],
      });
      setItems(page.edges.map(toItem));
      setEndCursor(page.page_info.end_cursor);
      setHasNextPage(page.page_info.has_next_page);
      setStatus('ready');
    } catch {
      // 앨범이 아직 없으면(한 번도 저장한 적 없음) 여기로 올 수 있다.
      // 빈 목록으로 두고 화면이 안내 문구를 보여주게 한다.
      setItems([]);
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await CameraRoll.getPhotos({
        first: PAGE_SIZE,
        after: endCursor,
        assetType: 'Photos',
        groupTypes: 'Album',
        groupName: ALBUM_NAME,
        include: ['imageSize'],
      });
      setItems(prev => [...prev, ...page.edges.map(toItem)]);
      setEndCursor(page.page_info.end_cursor);
      setHasNextPage(page.page_info.has_next_page);
    } catch {
      // 더 불러오기만 실패한 것이라 이미 있는 목록은 그대로 둔다.
    } finally {
      setLoadingMore(false);
    }
  }, [endCursor, hasNextPage, loadingMore]);

  return {
    sections: groupByMonth(items),
    status,
    reload: load,
    loadMore,
    loadingMore,
    hasNextPage,
  };
}

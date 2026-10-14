/**
 * 앨범 저장 상태는 "지금 보이는 결과물" 기준이다.
 *
 * - 저장한 뒤 프레임을 바꾸면 다시 저장할 수 있어야 한다.
 * - 영상이 늦게 준비되면 따로 저장할 수 있어야 하고, 두 번 넣지 않는다.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import ko from '../../src/i18n/ko';
import {useStripSave} from '../../src/result/useStripSave';

const mockSaveToAlbum = jest.fn();
const mockSaveVideoToAlbum = jest.fn();
jest.mock('../../src/capture/saveToAlbum', () => ({
  saveToAlbum: (...args: unknown[]) => mockSaveToAlbum(...args),
  saveVideoToAlbum: (...args: unknown[]) => mockSaveVideoToAlbum(...args),
}));

type Props = {strip: string | null; video: string | null};
type Result = ReturnType<typeof useStripSave>;

async function mount(initial: Props) {
  const result = {} as {current: Result};
  function Probe({strip, video}: Props) {
    result.current = useStripSave(strip, video);
    return null;
  }
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe {...initial} />);
  });
  return {
    result,
    rerender: (props: Props) =>
      ReactTestRenderer.act(async () => {
        renderer.update(<Probe {...props} />);
      }),
    run: (fn: () => Promise<void>) => ReactTestRenderer.act(fn),
  };
}

beforeEach(() => {
  mockSaveToAlbum.mockReset();
  mockSaveVideoToAlbum.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

test('저장한 뒤 프레임을 바꾸면 다시 저장할 수 있고, 영상은 또 넣지 않는다', async () => {
  mockSaveToAlbum.mockResolvedValue({photo: true, video: true});
  const view = await mount({strip: 'file:///A.jpg', video: 'file:///v.mp4'});

  await view.run(view.result.current.save);
  expect(mockSaveToAlbum).toHaveBeenLastCalledWith(
    'file:///A.jpg',
    'file:///v.mp4',
  );
  expect(view.result.current.status).toBe('saved');
  expect(view.result.current.videoSaved).toBe(true);

  await view.rerender({strip: 'file:///B.jpg', video: 'file:///v.mp4'});
  expect(view.result.current.status).toBe('idle');
  expect(view.result.current.photoSaved).toBe(false);
  expect(view.result.current.staleSave).toBe(true);

  await view.run(view.result.current.save);
  expect(mockSaveToAlbum).toHaveBeenLastCalledWith('file:///B.jpg', null);
  expect(view.result.current.status).toBe('saved');
  expect(view.result.current.staleSave).toBe(false);
});

test('영상이 늦게 준비되면 따로 저장한다', async () => {
  mockSaveToAlbum.mockResolvedValue({photo: true, video: false});
  mockSaveVideoToAlbum.mockResolvedValue(undefined);
  const view = await mount({strip: 'file:///A.jpg', video: null});

  await view.run(view.result.current.save);
  expect(mockSaveToAlbum).toHaveBeenLastCalledWith('file:///A.jpg', null);
  expect(view.result.current.videoSaved).toBe(false);

  await view.rerender({strip: 'file:///A.jpg', video: 'file:///v.mp4'});
  await view.run(view.result.current.saveVideo);
  expect(mockSaveVideoToAlbum).toHaveBeenCalledWith('file:///v.mp4');
  expect(view.result.current.videoSaved).toBe(true);

  // 이미 넣었으면 다시 눌러도 또 넣지 않는다.
  await view.run(view.result.current.saveVideo);
  expect(mockSaveVideoToAlbum).toHaveBeenCalledTimes(1);
});

test('권한 오류는 그 문구 그대로, 다른 결과물로 바뀌면 지운다', async () => {
  mockSaveToAlbum.mockRejectedValue(new Error(ko.errors.noSavePermission));
  const view = await mount({strip: 'file:///A.jpg', video: null});

  await view.run(view.result.current.save);
  expect(view.result.current.status).toBe('failed');
  expect(view.result.current.photoError).toBe(ko.errors.noSavePermission);

  await view.rerender({strip: 'file:///B.jpg', video: null});
  expect(view.result.current.status).toBe('idle');
  expect(view.result.current.photoError).toBeNull();
});

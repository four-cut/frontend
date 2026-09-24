/**
 * 결과 화면은 들어오자마자 목록의 첫 프레임을 씌운다. 그 "첫 번째"가 방향에
 * 맞는 기본 프레임이라는 전제가 깨지면, 사용자가 고르지도 않은 프레임이
 * 자동으로 적용된다. 목록 순서를 바꾸면 여기서 걸리게 해 둔다.
 */
import {fetchFrames} from '../../src/api/frames';
import ko from '../../src/i18n/ko';

test('세로형 목록의 첫 프레임은 베이직 세로형이다', async () => {
  const frames = await fetchFrames('PORTRAIT');

  expect(frames.length).toBeGreaterThan(0);
  expect(frames[0].name).toBe(ko.frameNames.basicPortrait);
  expect(frames[0].orientation).toBe('PORTRAIT');
});

test('가로형 목록의 첫 프레임은 베이직 가로형이다', async () => {
  const frames = await fetchFrames('LANDSCAPE');

  expect(frames.length).toBeGreaterThan(0);
  expect(frames[0].name).toBe(ko.frameNames.basicLandscape);
  expect(frames[0].orientation).toBe('LANDSCAPE');
});

test('방향을 주면 그 방향 프레임만 온다 — 슬롯 수가 달라 섞이면 안 된다', async () => {
  const portrait = await fetchFrames('PORTRAIT');
  const landscape = await fetchFrames('LANDSCAPE');

  expect(portrait.every(f => f.orientation === 'PORTRAIT')).toBe(true);
  expect(landscape.every(f => f.orientation === 'LANDSCAPE')).toBe(true);
});

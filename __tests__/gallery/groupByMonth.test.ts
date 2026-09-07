/**
 * 갤러리의 달별 묶기.
 *
 * getPhotos 가 최신순으로 주는 것을 전제로 순서대로 훑으며 묶는다.
 * 그 전제가 깨지거나 경계(달이 바뀌는 지점)를 잘못 다루면
 * 같은 달이 두 번 나오거나 순서가 뒤집힌다.
 */
import {groupByMonth, type StripItem} from '../../src/gallery/useSavedStrips';

/** 읽기 쉬우라고 날짜로 만든다. 로컬 시간 기준이어야 달 경계가 맞다. */
function item(id: string, iso: string): StripItem {
  return {id, uri: `file:///${id}.png`, takenAt: new Date(iso).getTime()};
}

test('같은 달이면 한 덩어리로 묶인다', () => {
  const sections = groupByMonth([
    item('a', '2026-08-30T10:00:00'),
    item('b', '2026-08-02T09:00:00'),
  ]);

  expect(sections).toHaveLength(1);
  expect(sections[0].title).toBe('2026년 8월');
  expect(sections[0].data.map(s => s.id)).toEqual(['a', 'b']);
});

test('달이 바뀌면 나뉘고, 최신 달이 먼저 온다', () => {
  const sections = groupByMonth([
    item('a', '2026-08-30T10:00:00'),
    item('b', '2026-07-15T10:00:00'),
    item('c', '2026-07-01T10:00:00'),
  ]);

  expect(sections.map(s => s.title)).toEqual(['2026년 8월', '2026년 7월']);
  expect(sections[1].data.map(s => s.id)).toEqual(['b', 'c']);
});

test('해가 바뀌어도 같은 월끼리 잘못 합쳐지지 않는다', () => {
  // 달 번호만 보고 묶으면 2026-01 과 2025-01 이 한 덩어리가 된다.
  const sections = groupByMonth([
    item('a', '2026-01-10T10:00:00'),
    item('b', '2025-01-10T10:00:00'),
  ]);

  expect(sections.map(s => s.title)).toEqual(['2026년 1월', '2025년 1월']);
});

test('달을 건너뛰어도 그대로 이어진다', () => {
  const sections = groupByMonth([
    item('a', '2026-09-01T10:00:00'),
    item('b', '2026-06-01T10:00:00'),
  ]);

  expect(sections.map(s => s.title)).toEqual(['2026년 9월', '2026년 6월']);
});

test('빈 목록이면 덩어리도 없다', () => {
  expect(groupByMonth([])).toEqual([]);
});

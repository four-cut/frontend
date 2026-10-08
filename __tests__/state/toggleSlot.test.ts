/**
 * 사진 고르기의 자리 배치.
 *
 * 고른 순서대로 쌓는 배열이면 가운데 것을 빼는 순간 뒤가 앞으로 당겨져서,
 * 누른 자리가 아니라 맨 뒤가 빈 것처럼 보인다. 자리를 고정해 두는지 본다.
 */
import {toggleSlot} from '../../src/state/CaptureSessionContext';

const CUTS = 4;
const empty = [null, null, null, null];

test('앞에서부터 빈 자리에 채워진다', () => {
  let slots = toggleSlot(empty, 7, CUTS);
  slots = toggleSlot(slots, 3, CUTS);

  expect(slots).toEqual([7, 3, null, null]);
});

test('뺀 자리가 그대로 비고, 뒤가 당겨오지 않는다', () => {
  const slots = toggleSlot([7, 3, 5, 1], 7, CUTS);

  // 1번 자리를 뺐으면 1번 자리가 빈다. [3, 5, 1, null] 이 되면 안 된다.
  expect(slots).toEqual([null, 3, 5, 1]);
});

test('가운데를 빼도 그 자리만 빈다', () => {
  expect(toggleSlot([7, 3, 5, 1], 5, CUTS)).toEqual([7, 3, null, 1]);
});

test('비운 자리에 다음에 고른 사진이 들어간다', () => {
  const holed = toggleSlot([7, 3, 5, 1], 7, CUTS);

  expect(toggleSlot(holed, 9, CUTS)).toEqual([9, 3, 5, 1]);
});

test('자리가 다 차면 더 넣지 않는다', () => {
  const full = [7, 3, 5, 1];

  expect(toggleSlot(full, 9, CUTS)).toBe(full);
});

test('길이가 어긋나 있어도 컷 수만큼으로 맞춘다', () => {
  expect(toggleSlot([], 2, CUTS)).toEqual([2, null, null, null]);
  expect(toggleSlot([7, 3], 5, CUTS)).toEqual([7, 3, 5, null]);
});

test('가로형처럼 컷 수가 3이어도 같은 규칙이다', () => {
  expect(toggleSlot([7, 3, 5], 7, 3)).toEqual([null, 3, 5]);
});

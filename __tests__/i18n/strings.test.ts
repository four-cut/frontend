/**
 * 사전 자체를 검사한다.
 *
 * 키가 빠진 건 타입 검사기가 잡아 주지만, 잡아 주지 못하는 게 둘 있다.
 * 값을 한국어인 채로 복사해 놓은 것과, 자리표시자(${...})를 옮기다 빠뜨린 것.
 * 둘 다 컴파일은 통과하고 화면에서만 티가 난다.
 */
import ko from '../../src/i18n/ko';
import ja from '../../src/i18n/ja';

type Node = Record<string, unknown>;

/** 중첩 객체를 "a.b.c" 로 납작하게 편다. 배열은 인덱스를 키로 쓴다. */
function flatten(node: unknown, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (Array.isArray(node)) {
    node.forEach((child, index) => {
      for (const [k, v] of flatten(child, `${prefix}[${index}]`)) {
        out.set(k, v);
      }
    });
  } else if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node as Node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      for (const [k, v] of flatten(child, path)) {
        out.set(k, v);
      }
    }
  } else {
    out.set(prefix, node);
  }
  return out;
}

const koFlat = flatten(ko);
const jaFlat = flatten(ja);

/** 브랜드명은 일본어에서도 한국어 그대로 두기로 했다. */
const BRAND = '찍고갈래';
const HANGUL = /[가-힣]/;

test('두 사전의 키가 정확히 같다', () => {
  expect([...jaFlat.keys()].sort()).toEqual([...koFlat.keys()].sort());
});

test('같은 키는 같은 종류다 — 한쪽만 함수이면 호출부가 깨진다', () => {
  for (const [key, koValue] of koFlat) {
    expect(`${key}: ${typeof jaFlat.get(key)}`).toBe(
      `${key}: ${typeof koValue}`,
    );
  }
});

test('일본어 값에 한글이 남아 있지 않다 (브랜드명 제외)', () => {
  const leftovers: string[] = [];
  for (const [key, value] of jaFlat) {
    if (typeof value !== 'string') {
      continue;
    }
    if (HANGUL.test(value.split(BRAND).join(''))) {
      leftovers.push(`${key} = ${value}`);
    }
  }
  expect(leftovers).toEqual([]);
});

test('자리표시자를 쓰는 문구는 인자를 실제로 끼워 넣는다', () => {
  // 번역하다 ${...} 를 통째로 빠뜨리면 "写真を選択" 처럼 숫자 없는 문구가 된다.
  const samples: Array<[string, string, string]> = [
    [
      'photoSelect.count',
      ko.photoSelect.count(2, 4),
      ja.photoSelect.count(2, 4),
    ],
    [
      'gallery.monthTitle',
      ko.gallery.monthTitle(2026, 8),
      ja.gallery.monthTitle(2026, 8),
    ],
    [
      'result.savedTo',
      ko.result.savedTo('찍고갈래'),
      ja.result.savedTo('찍고갈래'),
    ],
    [
      'frame.colorA11y',
      ko.frame.colorA11y('#FF8800'),
      ja.frame.colorA11y('#FF8800'),
    ],
    [
      'errors.requestFailed',
      ko.errors.requestFailed('/api/frames', 500, 'boom'),
      ja.errors.requestFailed('/api/frames', 500, 'boom'),
    ],
  ];

  for (const [key, korean, japanese] of samples) {
    expect(`${key}: ${japanese.includes('${')}`).toBe(`${key}: false`);
    // 한국어에 들어간 숫자·기호는 일본어에도 그대로 들어가야 한다.
    for (const token of korean.match(/[0-9#/]+|boom/g) ?? []) {
      expect(`${key}/${token}: ${japanese.includes(token)}`).toBe(
        `${key}/${token}: true`,
      );
    }
  }
});

test('안내 목록처럼 길이가 있는 값은 개수가 같다', () => {
  expect(ja.guide.items).toHaveLength(ko.guide.items.length);
  expect(ja.frame.slots.portrait).toHaveLength(ko.frame.slots.portrait.length);
  expect(ja.frame.slots.landscape).toHaveLength(
    ko.frame.slots.landscape.length,
  );
});

import {normalizeWeight, splitTextRuns} from '../../src/frameBuilder/textFonts';

describe('splitTextRuns', () => {
  it('쌍자음·겹모음 글자와 홀자모를 모두 Pretendard 한 조각으로 둔다', () => {
    // Jua 에 없어서 저장 결과에서 빈 네모로 깨지던 글자들이 섞여 있다.
    expect(splitTextRuns('ㅃㅟ 뛔쀼 뀌웨 Ab1', 700)).toEqual([
      {text: 'ㅃㅟ 뛔쀼 뀌웨 Ab1', fontFamily: 'Pretendard-Bold'},
    ]);
  });

  it('가나·한자·전각 기호는 일본어 서체 조각으로 나눈다', () => {
    expect(splitTextRuns('안녕あア漢。!', 400)).toEqual([
      {text: '안녕', fontFamily: 'Pretendard-Regular'},
      {text: 'あア漢。', fontFamily: 'ShinRetroMaruGothic-Regular'},
      {text: '!', fontFamily: 'Pretendard-Regular'},
    ]);
  });

  it('이모지(서로게이트 쌍)를 반으로 쪼개지 않는다', () => {
    const runs = splitTextRuns('A😀', 600);
    expect(runs.map(run => run.text).join('')).toBe('A😀');
    expect(runs).toHaveLength(1);
  });
});

describe('normalizeWeight', () => {
  it('서체 파일이 없는 500 은 600 으로 그린다', () => {
    expect(normalizeWeight(400)).toBe(400);
    expect(normalizeWeight(500)).toBe(600);
    expect(normalizeWeight(600)).toBe(600);
    expect(normalizeWeight(700)).toBe(700);
  });
});

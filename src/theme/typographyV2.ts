/**
 * 결과 화면에서 시험 중인 타이포그래피. (UI-V2)
 *
 * 공용 `typography.ts` 는 건드리지 않는다. 값을 고치면 다른 담당자 화면이
 * 같이 바뀌어서 전후를 비교할 수 없고, 되돌릴 범위도 커진다.
 * 팀에서 채택하면 이 파일을 공용 테마로 합친다.
 *
 * ## 왜 바꾸나
 *
 * Jua 는 굵기가 하나뿐이다. Material 3 도 HIG 도 위계를 **굵기 + 크기**로
 * 만드는데 굵기 축이 없으니 크기만으로 버티게 되고, 그래서 제목이 34 까지
 * 커졌다. 화면이 키오스크처럼 보이던 주된 이유다.
 *
 * Pretendard(SIL OFL) 세 굵기를 넣어 굵기 축을 만들고, 크기는 두 가이드라인이
 * 겹치는 범위(제목 24~28 / 본문 16~17)로 낮춘다.
 *
 * 워드마크("찍고갈래?")는 브랜드라 Jua 그대로 둔다.
 *
 * ## 주의
 *
 * Pretendard 에는 가나·한자가 없어 일본어와 섞어 쓰면 글자마다 서체가 바뀐다.
 * 그래서 일본어는 `AppText` 가 Shin Retro Maru Gothic 의 대응 굵기로 갈아
 * 끼운다(`typography.ts` 의 `localeFontFamily`, SemiBold → Medium).
 * 여기 굵기 위계는 일본어에서도 유지된다.
 *
 * `typography.ts` 의 경고는 여기에도 그대로다 — fontFamily 와 fontWeight 를
 * 함께 주면 안 된다. 굵기는 파일로 고른다.
 */

export const fontsV2 = {
  /** 본문, 보조 설명 */
  regular: 'Pretendard-Regular',
  /** 버튼 라벨, 강조되는 라벨 */
  semibold: 'Pretendard-SemiBold',
  /** 제목 */
  bold: 'Pretendard-Bold',
} as const;

export const sizeV2 = {
  /** 구역 제목, 모달 제목 */
  sectionTitle: 20,
  /** 본문 */
  body: 17,
  /** 버튼 라벨 */
  button: 16,
  /** 카드·썸네일 라벨 */
  caption: 15,
  /** 보조 설명, 상태 문구 */
  footnote: 13,
} as const;

/** 행간. 본문은 글자 크기의 1.4배, 제목은 1.25배. */
export const lineV2 = {
  sectionTitle: Math.round(sizeV2.sectionTitle * 1.25),
  body: Math.round(sizeV2.body * 1.4),
  button: Math.round(sizeV2.button * 1.4),
  caption: Math.round(sizeV2.caption * 1.4),
  footnote: Math.round(sizeV2.footnote * 1.4),
} as const;

# 결과 화면 타이포그래피 시험 (UI-V2)

오프라인 테스트에서 "시중 앱과 비교하면 어딘가 부자연스럽다" 는 지적이 나왔다.
원인을 찾아 보니 취향 문제가 아니라 **굵기 축이 없다는 구조적 이유**였다.
그 부분만 결과 화면(`LogoSelectScreen`)에서 먼저 시험한다.

## 원인

Jua 는 굵기가 하나뿐이다. Material 3 도 iOS HIG 도 위계를 **굵기 + 크기**로 만드는데,
굵기 축이 없으니 크기만으로 버티게 된다. 그래서 제목이 34 까지 커졌고 화면이
키오스크처럼 보였다. 상용 사진앱은 제목 24~28 / 본문 16~17 을 쓴다.

## 무엇을 했나

`assets/fonts/` 에 **Pretendard**(SIL OFL) 세 굵기를 넣고 `npx react-native-asset` 으로 링크했다.

| 굵기 | 쓰는 곳 |
| --- | --- |
| Regular | 본문, 보조 설명 |
| SemiBold | 버튼 라벨, 강조 라벨 |
| Bold | 제목 |

합쳐서 7.7MB. 라이선스 전문은 `assets/fonts/Pretendard-LICENSE.txt` 에 함께 뒀다.

크기는 `src/theme/typographyV2.ts` 에 근거와 함께 정리했다.

## 범위

**이 화면에만** 적용했다. 공용 `src/theme/typography.ts` 는 한 줄도 바꾸지 않았으므로
다른 담당자 화면은 지금도 Jua 다. 전후를 비교하려면 범위가 좁아야 하고,
되돌릴 때도 범위가 작아야 한다.

워드마크("찍고갈래?")는 브랜드라 Jua 그대로 둔다.

`PrimaryButton` 에 `labelStyle` 을 하나 열어 뒀다. 버튼 라벨이 컴포넌트 안에 갇혀 있어
밖에서 서체를 바꿀 수 없었기 때문인데, 안 넘기면 지금까지와 똑같이 그리므로
다른 화면에는 영향이 없다.

## 되돌리는 법

```bash
git revert <이 PR 의 머지 커밋>
```

부분만 되돌린다면 — 바꾼 자리는 `UI-V2` 로 전부 찾을 수 있다.

```bash
grep -rn "UI-V2" src/
```

1. `src/theme/typographyV2.ts` 삭제
2. `src/screens/LogoSelectScreen.tsx` 의 `UI-V2` 부분 되돌리기
3. `src/components/PrimaryButton.tsx` 의 `labelStyle` 제거
4. 폰트를 아예 빼려면 `assets/fonts/Pretendard-*` 를 지우고 `npx react-native-asset` 재실행

## 주의

- **폰트를 추가했으므로 이 브랜치를 받으면 Android 재빌드가 필요하다.** `npm install` 만으로는 글꼴이 안 보인다.
- **일본어에는 굵기가 적용되지 않는다.** `AppText` 가 일본어일 때 Zen Maru Gothic 으로
  갈아 끼우기 때문이다. Pretendard 에는 가나·한자가 없어 섞어 쓸 수 없고, PretendardJP 는
  한자 때문에 한 벌에 수십 MB라 넣지 않았다.

## 같이 논의할 것

레이아웃 쪽(버튼 위계, 인쇄·공유 위치, 프레임 고르기)도 같은 기준으로 손봤다가,
#31 과 `acde4cf` 에서 이미 다루고 있어 이 PR 에서는 뺐다.
그 작업은 `backup/result-ui-refresh-full` 브랜치에 남아 있다.

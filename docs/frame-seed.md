# 기본 프레임 시드 값

시안(`src/assets/samples/Frame-8`)의 세로형·가로형 두 레이아웃을 백엔드 `FrameTemplate` 로 옮긴 값이다.
프론트의 `src/capture/stripLayout.ts` 와 **같은 공식으로 산출**했으므로 화면 미리보기와 서버 합성이 어긋나지 않는다.

지금 `GET /api/frames` 가 `[]` 라 세션 생성(`POST /api/sessions`)부터 막혀 있다.
아래 두 개만 들어가면 촬영 플로우 연동을 끝까지 붙일 수 있다.

---

## 1. 프레임은 이미지 하나가 아니다

`FrameTemplate` 은 **테두리 이미지 + 규격** 한 세트다.

| 필드 | 값의 의미 |
| --- | --- |
| `canvasWidth` · `canvasHeight` | 최종 출력물 픽셀 크기 |
| `requiredShotCount` | 몇 장 찍는지 (고르는 장수가 아니라 **촬영 장수**) |
| `frameAssetKey` | S3에 올린 **테두리 PNG** 키 |
| `slots[]` | 사진이 들어갈 칸 좌표 |

`CompositeImageService` 는 캔버스에 사진을 먼저 그리고 **그 위에 테두리 이미지를 통째로 덮는다.**
그래서 테두리 PNG는 아래 조건을 지켜야 한다.

- 크기가 정확히 **1200 × 2176**
- 사진이 보일 자리가 **완전 투명**으로 뚫려 있어야 한다
- 뚫린 구멍 위치가 아래 `slots` 좌표와 **정확히 일치**해야 한다
- 하단 로고 영역은 불투명하게 채워도 된다 (사진이 안 들어가는 자리다)

---

## 2. 산출된 값

두 프레임 모두 캔버스 **1200 × 2176**, 촬영 **8장**, 좌우 여백 81px 대칭.

### 세로형 — 세로 사진 2×2 (4컷)

사진 영역이 `y=81` 부터 `y=1638` 까지, 그 아래 **538px 가 로고 영역**이다.

| slotIndex | x | y | width | height |
| --- | --- | --- | --- | --- |
| 0 | 81 | 81 | 503 | 763 |
| 1 | 615 | 81 | 503 | 763 |
| 2 | 81 | 875 | 503 | 763 |
| 3 | 615 | 875 | 503 | 763 |

### 가로형 — 가로 사진 3단 (3컷)

사진 영역이 `y=81` 부터 `y=1525` 까지, 그 아래 **651px 가 로고 영역**이다.

| slotIndex | x | y | width | height |
| --- | --- | --- | --- | --- |
| 0 | 81 | 81 | 1037 | 461 |
| 1 | 81 | 573 | 1037 | 461 |
| 2 | 81 | 1064 | 1037 | 461 |

> **가로형도 캔버스는 세로다.** 기기를 눕혀 촬영할 뿐 출력물은 세로 용지에 가로 사진 3장이 쌓인 형태다.
> `orientation` 은 용지 방향이 아니라 **각 컷의 사진 방향**을 가리킨다.

---

## 3. JSON

```json
[
  {
    "name": "기본 세로형",
    "orientation": "PORTRAIT",
    "canvasWidth": 1200,
    "canvasHeight": 2176,
    "requiredShotCount": 8,
    "slots": [
      {"slotIndex": 0, "x": 81,  "y": 81,   "width": 503,  "height": 763},
      {"slotIndex": 1, "x": 615, "y": 81,   "width": 503,  "height": 763},
      {"slotIndex": 2, "x": 81,  "y": 875,  "width": 503,  "height": 763},
      {"slotIndex": 3, "x": 615, "y": 875,  "width": 503,  "height": 763}
    ]
  },
  {
    "name": "기본 가로형",
    "orientation": "LANDSCAPE",
    "canvasWidth": 1200,
    "canvasHeight": 2176,
    "requiredShotCount": 8,
    "slots": [
      {"slotIndex": 0, "x": 81, "y": 81,   "width": 1037, "height": 461},
      {"slotIndex": 1, "x": 81, "y": 573,  "width": 1037, "height": 461},
      {"slotIndex": 2, "x": 81, "y": 1064, "width": 1037, "height": 461}
    ]
  }
]
```

---

## 4. MySQL INSERT

`frame_asset_key` 는 S3에 올린 실제 키로 바꿔야 한다.

```sql
-- 세로형
INSERT INTO frame_template
  (name, orientation, canvas_width, canvas_height, required_shot_count, frame_asset_key, active, created_at)
VALUES
  ('기본 세로형', 'PORTRAIT', 1200, 2176, 8, 'frames/basic-portrait.png', true, NOW());
SET @portrait = LAST_INSERT_ID();

INSERT INTO frame_slot (frame_template_id, slot_index, x, y, width, height) VALUES
  (@portrait, 0, 81,  81,  503, 763),
  (@portrait, 1, 615, 81,  503, 763),
  (@portrait, 2, 81,  875, 503, 763),
  (@portrait, 3, 615, 875, 503, 763);

-- 가로형
INSERT INTO frame_template
  (name, orientation, canvas_width, canvas_height, required_shot_count, frame_asset_key, active, created_at)
VALUES
  ('기본 가로형', 'LANDSCAPE', 1200, 2176, 8, 'frames/basic-landscape.png', true, NOW());
SET @landscape = LAST_INSERT_ID();

INSERT INTO frame_slot (frame_template_id, slot_index, x, y, width, height) VALUES
  (@landscape, 0, 81, 81,   1037, 461),
  (@landscape, 1, 81, 573,  1037, 461),
  (@landscape, 2, 81, 1064, 1037, 461);
```

---

## 5. 참고

- **프레임 생성 API가 아직 없다.** 컨트롤러에 조회(`GET /api/frames`, `GET /api/frames/{id}`)만 있어서, 지금은 위 SQL 로 직접 넣거나 시딩 코드를 붙여야 한다.
- 촬영은 8장인데 세로형은 4장, 가로형은 3장만 고른다. `requiredShotCount`(촬영 장수)와 `slots.length`(고르는 장수)가 다르다.
- 값을 바꾸려면 프론트의 `stripLayout.ts` 와 함께 바꿔야 미리보기가 결과물과 맞는다. 나중에는 프론트가 이 값을 하드코딩하지 않고 `GET /api/frames/{id}` 로 받아 쓰도록 정리할 예정이다.

/**
 * 한국어 문자열 — 키의 원본이다.
 *
 * 여기에 키를 추가하면 ja.ts 가 `Strings` 타입을 만족하지 못해 컴파일이
 * 깨진다. 번역을 빠뜨린 채로 배포되는 일을 타입 검사기가 막아 준다.
 *
 * 값이 바뀌는 문자열은 문자열 대신 함수로 둔다 — 한국어와 일본어의 어순이
 * 달라서 `${a} 중 ${b}` 같은 조립을 호출부에서 하면 한쪽 말이 어색해진다.
 */
const ko = {
  common: {
    done: '완료',
    close: '닫기',
    back: '뒤로 가기',
    home: '홈으로',
    next: '다음',
    delete: '삭제',
    apply: '적용',
    share: '공유하기',
    cancel: '취소',
    retry: '다시 시도해주세요.',
  },

  tab: {
    shoot: '찰칵',
    myFrames: '내 프레임',
    gallery: '갤러리',
  },

  home: {
    shoot: '촬영하기',
    fromAlbum: '앨범에서 선택',
    makeFrame: '프레임 만들기',
  },

  login: {
    guide: '로그인하고 시작해요',
    connecting: '연결 중…',
    kakao: '카카오로 시작하기',
    google: '구글로 시작하기',
    failed: '로그인에 실패했습니다',
    appleNotReady: '애플 로그인은 아직 준비되지 않았습니다',
  },

  settings: {
    title: '설정',
    open: '설정 열기',
    language: '언어',
    /** 설정 · 계정 */
    account: '계정',
    signOut: '로그아웃',
    deleteAccount: '회원 탈퇴',
    deleteTitle: '정말 탈퇴하시겠어요?',
    deleteBody:
      '계정과 로그인 정보가 삭제되고 되돌릴 수 없습니다. 기기에 저장한 네컷 사진은 지워지지 않습니다.',
    deleteConfirm: '탈퇴하기',
    deleted: '탈퇴가 완료되었습니다.',
    deleteFailed: '탈퇴하지 못했습니다. 잠시 후 다시 시도해주세요.',
    /** 설정 · 정보 */
    info: '정보',
    privacy: '개인정보처리방침',
    terms: '이용약관',
  },

  guide: {
    title: '안내사항',
    items: [
      '타이머는 6초',
      '촬영하기 누르면 바로 촬영',
      'QR로 사진, 영상 저장',
    ],
    cta: '레이아웃 고르기',
  },

  layoutSelect: {
    portrait: '세로형',
    landscape: '가로형',
    /** 레이아웃 카드 접근성 라벨 — "세로형 레이아웃" */
    cardA11y: (label: string) => `${label} 레이아웃`,
  },

  rotate: {
    title: '기기를 돌려주세요!',
    a11y: '기기를 돌려주세요. 눌러서 촬영으로 이동',
  },

  capture: {
    needPermission: '카메라 권한이 필요합니다',
    noCamera: '사용할 수 있는 카메라가 없습니다',
    pickTitle: '어느 카메라로 찍을까요?',
    front: '전면',
    back: '후면',
    frontA11y: '전면 카메라로 촬영',
    backA11y: '후면 카메라로 촬영',
    shootNow: '바로 촬영',
    cameraFailed: '카메라를 켜지 못했어요',
    pickAgain: '카메라 다시 고르기',
  },

  albumPick: {
    title: '앨범에서 사진을 골라주세요',
    /** "3/4장 선택" */
    count: (picked: number, total: number) => `${picked}/${total}장 선택`,
    /** "앨범 사진, 2번으로 선택됨" */
    photoA11y: (order: number | null) =>
      order === null ? '앨범 사진' : `앨범 사진, ${order}번으로 선택됨`,
    preparing: '사진 준비 중...',
    prepareFailed: '사진을 불러오지 못했어요. 다시 시도해주세요.',
  },

  photoSelect: {
    title: '사진을 선택해주세요',
    /** "사진 선택 (2/4)" */
    count: (picked: number, total: number) => `사진 선택 (${picked}/${total})`,
    /** "촬영본 3, 1번으로 선택됨" */
    shotA11y: (index: number, order: number | null) =>
      order === null
        ? `촬영본 ${index}`
        : `촬영본 ${index}, ${order}번으로 선택됨`,
  },

  /** 촬영 플로우를 중간에 벗어날 때 확인 */
  leaveFlow: {
    title: '정말 나가시겠어요?',
    bodyShots: '지금까지 찍은 사진이 사라지고 처음 화면으로 돌아갑니다.',
    bodyResult: '저장하지 않은 네컷이 사라지고 처음 화면으로 돌아갑니다.',
    stay: '계속하기',
    leave: '나가기',
  },
  result: {
    myFrames: '내 프레임 고르기',
    noFrames: '고를 수 있는 프레임이 없습니다',
    framesLoadFailed: '프레임을 불러오지 못했습니다. 다시 시도해주세요.',
    /** "베이직 세로형 프레임 적용" */
    applyFrameA11y: (name: string) => `${name} 프레임 적용`,
    composeFailed: '합성에 실패했습니다',
    zoomA11y: '결과물 크게 보기',

    // 인쇄·저장·QR 을 한 줄에 나란히 두므로 버튼 문구는 짧게 쓴다.
    save: {
      idle: '저장',
      saving: '저장 중',
      saved: '저장됨',
      failed: '다시 저장',
    },
    saveFailed: '저장에 실패했습니다',
    /** "사진 앱 > 찍고갈래 앨범에 저장했어요" — 앨범 이름은 번역하지 않는다. */
    savedTo: (album: string) => `사진 앱 > ${album} 앨범에 저장했어요`,
    videoNotSaved: ' (영상은 저장되지 않았습니다)',
    videoPending: '영상은 아직 준비 중입니다',
    openSettings: '설정에서 권한 허용',

    print: '인쇄',
    printing: '인쇄 중',
    /** 인쇄 작업 이름 — 프린터 대기열에 뜬다. */
    printJob: '찍고갈래 네컷',

    qr: 'QR',
    qrPreparing: 'QR 생성 중',
    qrTitle: 'QR을 찍어 받아가세요',
    qrHint: '휴대폰 카메라로 찍으면 다운로드 화면이 열립니다',
    qrVideoOnly: '사진을 올리지 못해 영상만 받을 수 있어요',
    qrPhotoOnly: '영상은 준비 중이라 지금은 사진만 받을 수 있어요',
    qrVideoNotReady: '영상이 아직 준비되지 않았습니다',
    qrNoFrame: '서버에 등록된 프레임이 없습니다',
    qrFailed: 'QR 을 만들지 못했습니다',
    /** QR 은 서버가 있어야 만들 수 있다. 끊겼을 때 할 수 있는 걸 알려 준다. */
    qrOffline:
      'QR은 인터넷이 연결돼 있어야 만들 수 있어요. 지금은 저장이나 인쇄를 이용해주세요.',
  },

  myFrames: {
    title: '내 프레임',
    zoomA11y: '크게 보기',
    deleteA11y: '이 프레임 삭제',
    empty: '아직 만든 프레임이 없어요',
    emptyHint: '프레임 만들기에서 나만의 프레임을 만들어 보세요',
    loadFailed: '프레임을 불러오지 못했어요',
    deleteTitle: '이 프레임을 삭제할까요?',
    /** 휴지통 없이 바로 지워진다 — 지우기 전에 알아야 하는 사실이다. */
    deleteBody: (name: string) => `"${name}"을(를) 삭제하면 되돌릴 수 없어요.`,
    deleteFailed: '삭제하지 못했어요',
  },

  gallery: {
    title: '내 네컷',
    signOut: '로그아웃',
    needPermission: '사진 접근을 허용해야 볼 수 있어요',
    empty: '아직 저장한 네컷이 없어요',
    emptyHint: '촬영을 마치고 저장하면 여기에 모여요',
    zoomA11y: '크게 보기',
    deleteA11y: '이 네컷 삭제',
    deleteTitle: '이 네컷을 삭제할까요?',
    /** 되돌릴 수 있다는 걸 알려 준다 — 지우기 전에 알아야 하는 사실이다. */
    deleteBody: '사진 앱의 "최근 삭제된 항목"으로 옮겨져요. 거기서 되돌릴 수 있어요.',
    deleteFailed: '삭제하지 못했어요',
    /** 달 구분 머리말 — "2026년 8월" */
    monthTitle: (year: number, month: number) => `${year}년 ${month}월`,
  },

  albumPicker: {
    stickerTitle: '앨범에서 스티커 고르기',
    backgroundTitle: '앨범에서 배경 사진 고르기',
    needPermission:
      '사진 접근 권한이 없어서 앨범을 불러올 수 없어요.\n설정에서 권한을 허용해주세요.',
    loadFailed: '앨범을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    empty: '앨범에 사진이 없어요.',
  },

  frame: {
    title: '프레임 만들기',
    saving: '저장 중...',
    saveFailed: '저장에 실패했습니다',
    nameTitle: '프레임 이름',
    nameDescription: '내 프레임에서 이 이름으로 구분돼요',
    namePlaceholder: '예: 우리 반 네컷',
    save: '저장',

    text: '텍스트',
    sticker: '스티커',
    background: '배경',
    textColor: '글자색',
    /** 글자 크기 미리보기 칸에 쓰는 한 글자 */
    sampleGlyph: '가',

    textPlaceholder: '텍스트 입력',
    deleteText: '텍스트 삭제',
    deleteSticker: '스티커 삭제',
    editDone: '편집 완료',
    textSmaller: '글자 작게',
    textBigger: '글자 크게',
    stickerSmaller: '스티커 작게',
    stickerBigger: '스티커 크게',

    pickColor: '색상을 선택하세요',
    pickColorDirect: '색상 직접 선택',
    /** "글자색 #FF8800" */
    colorA11y: (hex: string) => `색상 ${hex}`,
    textColorA11y: (hex: string) => `글자색 ${hex}`,
    badHex: '올바른 색상 코드가 아니에요 (예: #FF8800)',

    bgFromPhoto: '사진으로 배경 만들기',
    bgClearPhoto: '사진 배경 지우기',
    pickFromGallery: '갤러리에서 선택',
    pickFromGalleryHint: '나만의 이미지를 스티커로 사용하세요',
    defaultStickers: '기본 스티커',

    weight: {
      400: '보통',
      500: '중간',
      600: '두껍게',
      700: '아주 두껍게',
    },
    /** 편집 툴바의 조절 묶음 라벨 */
    sizeLabel: '크기',
    weightLabel: '굵기',
  },

  /**
   * 기본 스티커 이름.
   *
   * frame 안에 두지 않는 이유는, defaultStickers.ts 가 `keyof` 로 키만 들고
   * 있어야 하는데 frame 에는 함수가 섞여 있어서 문자열 키만 고를 수 없기
   * 때문이다.
   */
  stickers: {
    logo: '찍고갈래 로고',
  },

  /** 서버에서 내려오는 기본 프레임 이름 — 응답에 이름이 없을 때만 쓴다. */
  frameNames: {
    basicPortrait: '베이직 세로형',
    basicLandscape: '베이직 가로형',
  },

  errors: {
    noSaveTarget: '스트립이 파일로 만들어지지 않아 저장할 수 없습니다.',
    noSavePermission: '저장 권한이 없습니다.',
    surfaceFailed: '그림을 그릴 공간을 만들지 못했습니다.',
    /** "사진을 읽지 못했습니다: file://… (지원하지 않는 형식일 수 있습니다)" */
    photoUnreadable: (uri: string) =>
      `사진을 읽지 못했습니다: ${uri} (지원하지 않는 형식일 수 있습니다)`,
    frameNotFound: (frameId: string | number) =>
      `프레임 ${frameId}을 찾을 수 없습니다.`,
    /** "/api/frames 요청이 실패했습니다 (500 …)" */
    requestFailed: (path: string, status: number, detail: string) =>
      `${path} 요청이 실패했습니다 (${status} ${detail})`,
    /** 사용자에게 보이는 공용 오류 문구 (api/userMessage.ts) */
    offline: '인터넷 연결이 불안정해요. 연결을 확인한 뒤 다시 시도해주세요.',
    server: '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
  },
};

export default ko;

/** ja.ts 가 맞춰야 하는 모양. 키가 빠지면 컴파일이 깨진다. */
export type Strings = typeof ko;

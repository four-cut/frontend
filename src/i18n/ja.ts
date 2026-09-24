import type {Strings} from './ko';

/**
 * 일본어 문자열 — 초벌 번역이다.
 *
 * 일본에 실제로 낼 때는 원어민 검수를 한 번 거쳐야 한다. 특히 버튼 문구의
 * 경어체(です・ます)와 명사형(「保存」/「保存する」)이 화면마다 섞이지
 * 않았는지 보는 게 좋다.
 *
 * 브랜드명 "찍고갈래" 는 번역하지 않고 한국어 그대로 둔다.
 */
const ja: Strings = {
  common: {
    done: '完了',
    close: '閉じる',
    back: '戻る',
    home: 'ホームへ',
    next: '次へ',
    delete: '削除',
    apply: '適用',
    share: '共有する',
    retry: 'もう一度お試しください。',
  },

  tab: {
    shoot: 'カシャ',
    gallery: 'ギャラリー',
  },

  home: {
    shoot: '撮影する',
    makeFrame: 'フレームを作る',
  },

  login: {
    guide: 'ログインして始めましょう',
    connecting: '接続中…',
    kakao: 'カカオで始める',
    google: 'Googleで始める',
    failed: 'ログインに失敗しました',
    appleNotReady: 'Appleログインはまだ準備中です',
  },

  settings: {
    title: '設定',
    open: '設定を開く',
    language: '言語',
  },

  guide: {
    title: 'ご案内',
    items: [
      'タイマーは6秒',
      '「撮影する」を押すとすぐに撮影',
      'QRで写真・動画を保存',
    ],
    cta: 'レイアウトを選ぶ',
  },

  layoutSelect: {
    portrait: '縦型',
    landscape: '横型',
    cardA11y: (label: string) => `${label}レイアウト`,
  },

  rotate: {
    title: '端末を回してください！',
    a11y: '端末を回してください。タップすると撮影に進みます',
  },

  capture: {
    needPermission: 'カメラの許可が必要です',
    noCamera: '使用できるカメラがありません',
    pickTitle: 'どちらのカメラで撮りますか？',
    front: 'イン',
    back: 'アウト',
    frontA11y: 'インカメラで撮影',
    backA11y: 'アウトカメラで撮影',
    shootNow: 'すぐに撮影',
  },

  photoSelect: {
    title: '写真を選んでください',
    count: (picked: number, total: number) => `写真を選択 (${picked}/${total})`,
    shotA11y: (index: number, order: number | null) =>
      order === null
        ? `撮影${index}枚目`
        : `撮影${index}枚目、${order}番目に選択中`,
  },

  result: {
    /** UI-V2: フレームのボトムシート */
    changeFrame: 'フレームを変える',
    frameSheetTitle: 'フレームを選ぶ',
    frameNone: '標準',
    myFrames: 'マイフレームを選ぶ',
    noFrames: '選べるフレームがありません',
    framesLoadFailed:
      'フレームを読み込めませんでした。もう一度お試しください。',
    applyFrameA11y: (name: string) => `${name}フレームを適用`,
    composeFailed: '合成に失敗しました',
    zoomA11y: '完成した写真を拡大',

    save: {
      idle: '写真・動画を保存',
      saving: '保存中...',
      saved: '保存しました',
      failed: 'もう一度保存',
    },
    saveFailed: '保存に失敗しました',
    savedTo: (album: string) => `写真アプリ > ${album} アルバムに保存しました`,
    videoNotSaved: '（動画は保存されませんでした）',
    videoPending: '動画はまだ準備中です',
    openSettings: '設定で許可する',

    print: '印刷する',
    printing: '印刷の準備中...',
    printJob: '찍고갈래 4カット',

    qr: 'QRで受け取る',
    qrPreparing: 'QRを作成中...',
    qrTitle: 'QRを読み取って受け取ってください',
    qrHint: 'スマホのカメラで読み取るとダウンロード画面が開きます',
    qrVideoOnly: '写真をアップロードできず、動画のみ受け取れます',
    qrVideoNotReady: '動画はまだ準備ができていません',
    qrNoFrame: 'サーバーに登録されたフレームがありません',
    qrFailed: 'QRを作成できませんでした',
  },

  gallery: {
    title: 'わたしの4カット',
    signOut: 'ログアウト',
    needPermission: '写真へのアクセスを許可すると表示されます',
    empty: '保存した4カット写真はまだありません',
    emptyHint: '撮影して保存すると、ここに集まります',
    zoomA11y: '拡大する',
    monthTitle: (year: number, month: number) => `${year}年${month}月`,
  },

  albumPicker: {
    stickerTitle: 'アルバムからステッカーを選ぶ',
    backgroundTitle: 'アルバムから背景写真を選ぶ',
    needPermission:
      '写真へのアクセス許可がないため、アルバムを読み込めません。\n設定で許可してください。',
    loadFailed:
      'アルバムを読み込めませんでした。しばらくしてからもう一度お試しください。',
    empty: 'アルバムに写真がありません。',
  },

  frame: {
    title: 'フレームを作る',
    saving: '保存中...',
    saveFailed: '保存に失敗しました',
    myPortrait: '自作の縦型',
    myLandscape: '自作の横型',

    text: 'テキスト',
    sticker: 'ステッカー',
    background: '背景',
    textColor: '文字色',
    sampleGlyph: 'あ',

    textPlaceholder: 'テキストを入力',
    deleteText: 'テキストを削除',
    deleteSticker: 'ステッカーを削除',
    editDone: '編集完了',
    textSmaller: '文字を小さく',
    textBigger: '文字を大きく',
    stickerSmaller: 'ステッカーを小さく',
    stickerBigger: 'ステッカーを大きく',

    pickColor: '色を選んでください',
    pickColorDirect: '色を直接指定',
    colorA11y: (hex: string) => `色 ${hex}`,
    textColorA11y: (hex: string) => `文字色 ${hex}`,
    badHex: '正しいカラーコードではありません（例: #FF8800）',

    bgFromPhoto: '写真で背景を作る',
    bgClearPhoto: '写真の背景を削除',
    pickFromGallery: 'ギャラリーから選ぶ',
    pickFromGalleryHint: 'お気に入りの画像をステッカーにできます',
    defaultStickers: '基本ステッカー',

    weight: {
      400: '標準',
      500: '中太',
      600: '太字',
      700: '極太',
    },
    slots: {
      portrait: ['左上', '右上', '左下', '右下'],
      landscape: ['上', '中', '下'],
    },
  },

  stickers: {
    logo: '찍고갈래 ロゴ',
  },

  frameNames: {
    basicPortrait: 'ベーシック縦型',
    basicLandscape: 'ベーシック横型',
  },

  errors: {
    noSaveTarget: '画像ファイルが作成されず、保存できません。',
    noSavePermission: '保存の許可がありません。',
    surfaceFailed: '描画領域を作成できませんでした。',
    photoUnreadable: (uri: string) =>
      `写真を読み込めませんでした: ${uri}（対応していない形式の可能性があります）`,
    frameNotFound: (frameId: string | number) =>
      `フレーム ${frameId} が見つかりません。`,
    requestFailed: (path: string, status: number, detail: string) =>
      `${path} のリクエストに失敗しました (${status} ${detail})`,
  },
};

export default ja;

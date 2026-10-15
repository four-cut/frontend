/**
 * 기본 스티커 이미지.
 *
 * 한 장짜리 스티커 시트를 낱개로 잘라 넣은 것이다(배경은 투명). require 는
 * Metro 가 번들 시점에 정적으로 훑어야 해서 변수로 만들 수 없다 — 그래서
 * 파일마다 한 줄씩 적는다. 시트를 다시 자를 일이 생기면 이 파일도 같이
 * 새로 만들어야 한다.
 */
export const stickerImages = {
  'bear-1': require('./stickers/bear-1.png'),
  'cat-1': require('./stickers/cat-1.png'),
  'heart-1': require('./stickers/heart-1.png'),
  'cat-2': require('./stickers/cat-2.png'),
  'bear-2': require('./stickers/bear-2.png'),
  'sparkle-1': require('./stickers/sparkle-1.png'),
  'cat-3': require('./stickers/cat-3.png'),
  'bear-3': require('./stickers/bear-3.png'),
  'sparkle-2': require('./stickers/sparkle-2.png'),
  'star-1': require('./stickers/star-1.png'),
  'flower-1': require('./stickers/flower-1.png'),
  'cherry-1': require('./stickers/cherry-1.png'),
  'note-1': require('./stickers/note-1.png'),
  'cool-1': require('./stickers/cool-1.png'),
  'brokenHeart-1': require('./stickers/brokenHeart-1.png'),
  'bear-4': require('./stickers/bear-4.png'),
  'fire-1': require('./stickers/fire-1.png'),
  'paw-1': require('./stickers/paw-1.png'),
  'cat-4': require('./stickers/cat-4.png'),
  'speech-1': require('./stickers/speech-1.png'),
  'lightning-1': require('./stickers/lightning-1.png'),
  'duo-1': require('./stickers/duo-1.png'),
  'crown-1': require('./stickers/crown-1.png'),
  'bear-5': require('./stickers/bear-5.png'),
  'sparkle-3': require('./stickers/sparkle-3.png'),
  'star-2': require('./stickers/star-2.png'),
  'cat-5': require('./stickers/cat-5.png'),
  'skull-1': require('./stickers/skull-1.png'),
  'bear-6': require('./stickers/bear-6.png'),
  'love-1': require('./stickers/love-1.png'),
  'cat-6': require('./stickers/cat-6.png'),
  'heart-2': require('./stickers/heart-2.png'),
  'bow-1': require('./stickers/bow-1.png'),
  'bear-7': require('./stickers/bear-7.png'),
  'cat-7': require('./stickers/cat-7.png'),
  'sparkle-4': require('./stickers/sparkle-4.png'),
  'paw-2': require('./stickers/paw-2.png'),
  'bear-8': require('./stickers/bear-8.png'),
  'mood-1': require('./stickers/mood-1.png'),
  'lightning-2': require('./stickers/lightning-2.png'),
  'cat-8': require('./stickers/cat-8.png'),
  'cherry-2': require('./stickers/cherry-2.png'),
  'star-3': require('./stickers/star-3.png'),
  'bear-9': require('./stickers/bear-9.png'),
  'flower-2': require('./stickers/flower-2.png'),
  'skull-2': require('./stickers/skull-2.png'),
} as const;

export type StickerImageId = keyof typeof stickerImages;


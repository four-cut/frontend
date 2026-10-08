import MediaFile from '../specs/NativeMediaFile';
import type {FrameOrientation} from '../api/frames';
import type {FrameDesign} from './types';

/**
 * 사용자가 만든 프레임을 기기의 앱 전용 폴더에 저장하고 읽는다.
 *
 * 폴더 구조 (앱 전용 폴더 = 안드로이드 filesDir, iOS Documents):
 *
 *   frame/<frameId>/frame.json    이름·방향·디자인
 *   frame/<frameId>/preview.png   목록 썸네일
 *   frame/<frameId>/background…   배경 사진 (있을 때)
 *   frame/<frameId>/sticker-N…    스티커 이미지
 *
 * 편집 중인 배경·스티커 이미지는 캐시 폴더에 있다. 캐시는 저장 공간이
 * 모자라면 OS가 비우므로, 저장할 때 프레임 폴더로 복사해 둔다.
 *
 * frame.json 에는 이미지를 폴더 안 파일 이름으로만 적는다. iOS는 앱이
 * 업데이트되면 앱 폴더의 절대 경로가 바뀌어서, 절대 경로로 적어 두면
 * 다음 업데이트 뒤에 이미지를 못 찾는다.
 */

const ROOT_DIR = 'frame';
const MANIFEST = 'frame.json';
const MANIFEST_VERSION = 1;

type Manifest = {
  version: typeof MANIFEST_VERSION;
  frameId: number;
  name: string;
  orientation: FrameOrientation;
  createdAt: string;
  /** 폴더 안 파일 이름. */
  preview: string;
  /** 이미지 경로가 폴더 안 파일 이름으로 바뀐 디자인. */
  design: FrameDesign;
};

/** 읽어 들인 프레임. 이미지 경로는 지금 기기에서 바로 쓸 수 있는 file:// 경로다. */
export type StoredFrame = {
  frameId: number;
  name: string;
  orientation: FrameOrientation;
  previewImageUrl: string;
  design: FrameDesign;
};

function join(dir: string, name: string): string {
  return `${dir.replace(/\/+$/, '')}/${name}`;
}

function requireMediaFile() {
  if (!MediaFile) {
    throw new Error('MediaFile native module is not available');
  }
  return MediaFile;
}

async function rootDir(): Promise<string> {
  return join(await requireMediaFile().getDocumentDirectory(), ROOT_DIR);
}

function isLocalFile(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

/** 폴더 안 파일 이름이면 절대 경로로 바꾸고, 원래부터 절대 경로·URL이면 그대로 둔다. */
function toAbsolute(folder: string, value: string): string {
  return value.includes('://') || value.startsWith('/')
    ? value
    : join(folder, value);
}

function extensionOf(uri: string): string {
  const name = uri.split('/').pop() ?? '';
  const match = name.match(/\.[a-zA-Z0-9]{1,5}$/);
  return match ? match[0] : '';
}

/**
 * 이미지를 프레임 폴더로 복사하고 폴더 안 파일 이름을 돌려준다.
 *
 * 로컬 파일만 복사한다. 개발 모드의 기본 스티커는 Metro 의 http:// 주소라
 * 복사할 수 없고 그대로 둬도 다시 읽힌다.
 */
async function copyInto(
  folder: string,
  uri: string,
  baseName: string,
): Promise<string> {
  if (!isLocalFile(uri)) {
    return uri;
  }
  const name = baseName + extensionOf(uri);
  await requireMediaFile().copyFile(uri, join(folder, name));
  return name;
}

function fromManifest(folder: string, manifest: Manifest): StoredFrame {
  const {design} = manifest;
  return {
    frameId: manifest.frameId,
    name: manifest.name,
    orientation: manifest.orientation,
    previewImageUrl: toAbsolute(folder, manifest.preview),
    design: {
      ...design,
      backgroundImageUri: design.backgroundImageUri
        ? toAbsolute(folder, design.backgroundImageUri)
        : null,
      stickerElements: design.stickerElements.map(sticker => ({
        ...sticker,
        uri: toAbsolute(folder, sticker.uri),
      })),
    },
  };
}

export async function saveFrame(frame: StoredFrame): Promise<StoredFrame> {
  const media = requireMediaFile();
  const folder = join(await rootDir(), String(frame.frameId));
  const {design} = frame;

  const preview = await copyInto(folder, frame.previewImageUrl, 'preview');
  const backgroundImageUri = design.backgroundImageUri
    ? await copyInto(folder, design.backgroundImageUri, 'background')
    : null;
  const stickerElements = await Promise.all(
    design.stickerElements.map(async (sticker, index) => ({
      ...sticker,
      uri: await copyInto(folder, sticker.uri, `sticker-${index}`),
    })),
  );

  const manifest: Manifest = {
    version: MANIFEST_VERSION,
    frameId: frame.frameId,
    name: frame.name,
    orientation: frame.orientation,
    createdAt: new Date().toISOString(),
    preview,
    design: {...design, backgroundImageUri, stickerElements},
  };

  // frame.json 을 맨 마지막에 쓴다. 이미지를 복사하다 앱이 꺼지면
  // frame.json 이 없는 폴더가 남는데, 목록을 읽을 때 그런 폴더는 건너뛴다.
  await media.writeTextFile(join(folder, MANIFEST), JSON.stringify(manifest));
  return fromManifest(folder, manifest);
}

async function readFrame(folder: string): Promise<StoredFrame | null> {
  try {
    const text = await requireMediaFile().readTextFile(join(folder, MANIFEST));
    const manifest = JSON.parse(text) as Manifest;
    return manifest.version === MANIFEST_VERSION
      ? fromManifest(folder, manifest)
      : null;
  } catch {
    return null;
  }
}

/** 저장된 프레임 전체. 만든 순서대로. */
export async function loadFrames(): Promise<StoredFrame[]> {
  if (!MediaFile) {
    return [];
  }
  const root = await rootDir();
  const names = await MediaFile.listDirectory(root);
  // 점으로 시작하는 건 지우는 중이던 폴더(.trash-…)다. 프레임이 아니므로
  // 건너뛰고, 지난번에 다 못 지운 것이면 이참에 다시 지운다.
  for (const name of names) {
    if (name.startsWith('.trash-')) {
      MediaFile.deleteDirectory(join(root, name)).catch(() => {});
    }
  }
  const frames = await Promise.all(
    names
      .filter(name => !name.startsWith('.'))
      .map(name => readFrame(join(root, name))),
  );
  return frames
    .filter((frame): frame is StoredFrame => frame !== null)
    .sort((a, b) => a.frameId - b.frameId);
}

/** 프레임 폴더를 이미지까지 통째로 지운다. 이미 없으면 그대로 끝난다. */
export async function deleteFrame(frameId: number): Promise<void> {
  // 폴더 이름이 되는 값이라 정수만 받는다. '..' 같은 값이 섞이면 frame
  // 폴더 밖을 가리키게 된다.
  if (!Number.isSafeInteger(frameId) || frameId <= 0) {
    throw new Error(`Invalid frameId: ${frameId}`);
  }
  await requireMediaFile().deleteDirectory(
    join(await rootDir(), String(frameId)),
  );
}

export async function loadFrame(frameId: number): Promise<StoredFrame | null> {
  if (!MediaFile) {
    return null;
  }
  return readFrame(join(await rootDir(), String(frameId)));
}

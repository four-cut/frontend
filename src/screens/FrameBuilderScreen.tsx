import React, {useState} from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import {Text, TextInput} from '../components/AppText';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {addLocalFrame} from '../api/frames';
import AlbumPickerSheet, {
  type StickerPick,
} from '../frameBuilder/AlbumPickerSheet';
import BackButton from '../components/BackButton';
import {useT} from '../i18n';
import PrimaryButton from '../components/PrimaryButton';
import {
  DEFAULT_STICKERS,
  resolveStickerUri,
  type DefaultSticker,
} from '../frameBuilder/defaultStickers';
import {PALETTE} from '../frameBuilder/palette';
import {renderFrameDesign} from '../frameBuilder/renderFrameDesign';
import type {StickerElement, TextElement} from '../frameBuilder/types';
import {
  computeSlotRects,
  STRIP_ASPECT,
  stripGeometry,
} from '../capture/stripLayout';
import type {CaptureLayout} from '../state/CaptureSessionContext';
import type {RootNavigation} from '../navigation/types';
import {colors, fonts, fontSize} from '../theme';

/** 화면에 그리는 캔버스 폭. 실제 인쇄 해상도는 renderFrameDesign이 따로 맞춘다. */
const CANVAS_WIDTH_RATIO = 0.82;

/**
 * 색상 선택 바텀시트가 차지하는 높이 비율. 배경·글자색을 고를 때 시트가
 * 화면을 너무 많이 가리면 색 비교가 어려워서, 화면 하단 1/3로 제한하고
 * 캔버스를 나머지 2/3에 맞춰 축소해 항상 보이게 한다.
 */
const COLOR_SHEET_HEIGHT_RATIO = 1 / 3;

/** 텍스트·스티커를 캔버스 밖으로 끌 때, 네 방향 모두 이만큼(px)까지만 나가게 한다. */
const DRAG_OVERFLOW_PX = 24;

const WEIGHT_OPTIONS: TextElement['fontWeight'][] = [400, 500, 600, 700];

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/**
 * 실제로 올라온 키보드 높이(px)를 추적한다. Modal 안에서는
 * KeyboardAvoidingView의 자동 계산이 잘 안 맞는다 — "height" 방식은 이미
 * 작게 줄여둔 시트 높이에서 키보드 높이를 빼려다 음수가 나와 시트가 통째로
 * 사라졌었다. 대신 실측한 키보드 높이만큼 시트를 직접 marginBottom으로
 * 밀어올린다.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = React.useState(0);
  React.useEffect(() => {
    const showEvent =
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent =
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const showSub = Keyboard.addListener(showEvent, event =>
      setHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return height;
}

/**
 * 안드로이드 EditText는 터치가 시작되면 텍스트 선택 드래그를 위해
 * 부모의 스크롤 가로채기를 스스로 막아버린다
 * (requestDisallowInterceptTouchEvent) — 시트를 스크롤하려고 숫자·색상
 * 코드 입력칸 위에서 손가락을 쓸어도 입력칸이 그 터치를 통째로 잡고
 * 안 놔줘서 스크롤이 안 먹고, 포커스가 잡혔다 풀렸다 하며 키보드가
 * 뜨려다 마는 게 반복돼 화면이 위아래로 움찔거린다. 이 값들은 커서로
 * 정교하게 편집할 일이 없는 짧은 숫자·코드라 드래그 편집 자체가 필요 없다.
 *
 * TextInput에 pointerEvents="none"만 주는 건 안드로이드에서 잘 안 먹는다
 * (EditText가 그 설정과 무관하게 터치를 직접 받아버린다) — 대신 투명한
 * Pressable을 TextInput "위"에 절대 위치로 완전히 덮어서, 터치가 물리적으로
 * EditText에 닿을 일 자체를 없앤다. 이 Pressable은 스와치 버튼과 똑같이
 * 평범한 Pressable이라 부모의 스크롤 가로채기를 막지 않는다.
 */
function TapToFocusInput({
  inputRef,
  style,
  ...rest
}: React.ComponentProps<typeof TextInput> & {
  inputRef: React.RefObject<React.ElementRef<typeof TextInput> | null>;
}) {
  return (
    <View style={styles.tapToFocusWrapper}>
      <TextInput ref={inputRef} style={style} {...rest} />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => inputRef.current?.focus()}
      />
    </View>
  );
}

function makeId() {
  return `text_${Date.now()}_${Math.round(Math.random() * 1000)}`;
}

type Rgb = {r: number; g: number; b: number};

function clamp255(value: number) {
  return Math.round(clamp(value, 0, 255));
}

/** "#RGB", "#RRGGBB", 앞의 #이 없어도 받는다. 형식이 아니면 null. */
function hexToRgb(hex: string): Rgb | null {
  const trimmed = hex.trim().replace(/^#/, '');
  const expanded =
    trimmed.length === 3
      ? trimmed
          .split('')
          .map(ch => ch + ch)
          .join('')
      : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return null;
  }
  const n = parseInt(expanded, 16);
  return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}

function rgbToHex({r, g, b}: Rgb): string {
  const toHex = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

const CHANNEL_LABEL: Record<keyof Rgb, string> = {r: 'R', g: 'G', b: 'B'};
const CHANNEL_TINT: Record<keyof Rgb, string> = {
  r: '#E8543E',
  g: '#3F7D5C',
  b: '#2F6FA6',
};

/**
 * SR-09 프레임 만들기.
 *
 * 배경 색상과 텍스트(색상·크기·굵기)를 편집해서 완료하면 로컬 프레임
 * 목록에 새 프레임으로 추가된다 — 다음부터 레이아웃 선택 화면에서 고를 수 있다.
 * 스티커·사진 배치 편집은 여기 범위가 아니다.
 */
export default function FrameBuilderScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigation>();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();

  const [layout, setLayout] = useState<CaptureLayout>('portrait');
  const [backgroundColor, setBackgroundColor] = useState<string>(colors.white);
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(
    null,
  );
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stickerElements, setStickerElements] = useState<StickerElement[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null,
  );
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [backgroundImagePickerOpen, setBackgroundImagePickerOpen] =
    useState(false);
  const [textColorPickerOpen, setTextColorPickerOpen] = useState(false);
  const [stickerSourceOpen, setStickerSourceOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canvasArea, setCanvasArea] = useState({width: 0, height: 0});

  // 텍스트 편집 툴바가 뜨면 canvasArea(위아래 여백)가 줄어든다. 폭 기준으로만
  // 캔버스 크기를 잡으면 그 여백보다 캔버스가 커져서 위로는 레이아웃 뱃지를,
  // 아래로는 툴바를 가리며 넘친다 — 실측한 canvasArea 안에 꼭 맞게 축소한다.
  const AREA_MARGIN = 0.96;
  // 색상 시트는 Modal이라 canvasArea 레이아웃에 잡히지 않는다 — 시트가 떠
  // 있으면 화면 하단 1/3만큼을 직접 빼서, 캔버스가 시트에 가려지지 않고
  // 나머지 2/3 안에서 실시간으로 줄어들게 한다.
  const colorSheetOpen = backgroundPickerOpen || textColorPickerOpen;
  const colorSheetHeight = windowHeight * COLOR_SHEET_HEIGHT_RATIO;
  const maxCanvasWidth = windowWidth * CANVAS_WIDTH_RATIO;
  const availableWidth =
    canvasArea.width > 0 ? canvasArea.width * AREA_MARGIN : maxCanvasWidth;
  const rawAvailableHeight =
    canvasArea.height > 0 ? canvasArea.height * AREA_MARGIN : Infinity;
  const availableHeight = colorSheetOpen
    ? Math.max(rawAvailableHeight - colorSheetHeight, 80)
    : rawAvailableHeight;
  let canvasWidth = Math.min(maxCanvasWidth, availableWidth);
  let canvasHeight = canvasWidth * STRIP_ASPECT;
  if (canvasHeight > availableHeight) {
    canvasHeight = availableHeight;
    canvasWidth = canvasHeight / STRIP_ASPECT;
  }
  const selected =
    textElements.find(element => element.id === selectedId) ?? null;
  const selectedSticker =
    stickerElements.find(element => element.id === selectedStickerId) ?? null;

  const deselectAll = () => {
    setSelectedId(null);
    setSelectedStickerId(null);
  };

  const updateSelected = (patch: Partial<TextElement>) => {
    if (!selectedId) {
      return;
    }
    setTextElements(prev =>
      prev.map(element =>
        element.id === selectedId ? {...element, ...patch} : element,
      ),
    );
  };

  const addText = () => {
    const id = makeId();
    setTextElements(prev => [
      ...prev,
      {
        id,
        content: t.frame.text,
        xRatio: 0.5,
        yRatio: 0.5,
        fontSize: 64,
        fontWeight: 700,
        color: colors.textPrimary,
      },
    ]);
    setSelectedStickerId(null);
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (!selectedId) {
      return;
    }
    setTextElements(prev => prev.filter(element => element.id !== selectedId));
    setSelectedId(null);
  };

  const updateSelectedSticker = (patch: Partial<StickerElement>) => {
    if (!selectedStickerId) {
      return;
    }
    setStickerElements(prev =>
      prev.map(element =>
        element.id === selectedStickerId ? {...element, ...patch} : element,
      ),
    );
  };

  const addSticker = (uri: string, aspectRatio: number) => {
    const id = makeId();
    setStickerElements(prev => [
      ...prev,
      {
        id,
        uri,
        // 사진 메타데이터가 없어 비율을 못 구하면 1(정사각형)로 대체한다 —
        // NaN이 새어나가면 이미지 높이가 NaN이 되어 아예 안 그려진다.
        aspectRatio: aspectRatio > 0 ? aspectRatio : 1,
        xRatio: 0.3,
        yRatio: 0.3,
        widthRatio: 0.35,
      },
    ]);
    setSelectedId(null);
    setSelectedStickerId(id);
  };

  const handlePickSticker = ({uri, aspectRatio}: StickerPick) => {
    addSticker(uri, aspectRatio);
    setStickerPickerOpen(false);
  };

  const handlePickDefaultSticker = async (sticker: DefaultSticker) => {
    const uri = await resolveStickerUri(sticker.uri);
    addSticker(uri, sticker.aspectRatio);
    setStickerSourceOpen(false);
  };

  const removeSelectedSticker = () => {
    if (!selectedStickerId) {
      return;
    }
    setStickerElements(prev =>
      prev.filter(element => element.id !== selectedStickerId),
    );
    setSelectedStickerId(null);
  };

  const handlePickBackgroundImage = ({uri}: StickerPick) => {
    setBackgroundImageUri(uri);
    setBackgroundImagePickerOpen(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const orientation = layout === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE';
      const previewImageUrl = await renderFrameDesign(
        layout,
        backgroundColor,
        textElements,
        stickerElements,
        backgroundImageUri,
      );
      addLocalFrame({
        name: layout === 'portrait' ? t.frame.myPortrait : t.frame.myLandscape,
        orientation,
        previewImageUrl,
        design: {
          backgroundColor,
          backgroundImageUri,
          textElements,
          stickerElements,
        },
      });
      // navigate 로는 FrameBuilder 가 아래에 남아 계속 쌓인다. (LogoSelect 와 같은 이유)
      navigation.popTo('MainTabs', {
        screen: 'Shoot',
        params: {screen: 'Home'},
      });
    } catch {
      Alert.alert(t.frame.saveFailed, t.common.retry);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{t.frame.title}</Text>
        <PrimaryButton
          label={saving ? t.frame.saving : t.common.done}
          onPress={handleComplete}
          disabled={saving}
          style={styles.completeButton}
        />
      </View>

      <View style={styles.layoutToggle}>
        {(['portrait', 'landscape'] as const).map(option => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={
              option === 'portrait'
                ? t.layoutSelect.portrait
                : t.layoutSelect.landscape
            }
            onPress={() => setLayout(option)}
            style={[
              styles.layoutChip,
              layout === option && styles.layoutChipActive,
            ]}>
            <Text
              style={[
                styles.layoutChipText,
                layout === option && styles.layoutChipTextActive,
              ]}>
              {option === 'portrait'
                ? t.layoutSelect.portrait
                : t.layoutSelect.landscape}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.canvasArea,
          colorSheetOpen && {paddingBottom: colorSheetHeight},
        ]}
        onLayout={event =>
          setCanvasArea({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        <Pressable
          onPress={deselectAll}
          style={[
            styles.canvas,
            {width: canvasWidth, height: canvasHeight, backgroundColor},
          ]}>
          {backgroundImageUri ? (
            <Image
              source={{uri: backgroundImageUri}}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          ) : null}
          <SlotPlaceholders layout={layout} canvasWidth={canvasWidth} />
          {stickerElements.map(element => (
            <DraggableSticker
              key={element.id}
              element={element}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              selected={element.id === selectedStickerId}
              onSelect={() => {
                setSelectedId(null);
                setSelectedStickerId(element.id);
              }}
              onMove={(xRatio, yRatio) =>
                setStickerElements(prev =>
                  prev.map(item =>
                    item.id === element.id ? {...item, xRatio, yRatio} : item,
                  ),
                )
              }
            />
          ))}
          {textElements.map(element => (
            <DraggableText
              key={element.id}
              element={element}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              selected={element.id === selectedId}
              onSelect={() => {
                setSelectedStickerId(null);
                setSelectedId(element.id);
              }}
              onMove={(xRatio, yRatio) =>
                setTextElements(prev =>
                  prev.map(item =>
                    item.id === element.id ? {...item, xRatio, yRatio} : item,
                  ),
                )
              }
            />
          ))}
        </Pressable>
      </View>

      {selected ? (
        <TextStyleToolbar
          element={selected}
          insetBottom={insets.bottom}
          onChangeContent={content => updateSelected({content})}
          onChangeFontSize={fontSize2 => updateSelected({fontSize: fontSize2})}
          onChangeWeight={fontWeight => updateSelected({fontWeight})}
          onChangeColor={color => updateSelected({color})}
          onOpenColorPicker={() => setTextColorPickerOpen(true)}
          onDelete={removeSelected}
          onDone={() => setSelectedId(null)}
        />
      ) : selectedSticker ? (
        <StickerStyleToolbar
          element={selectedSticker}
          insetBottom={insets.bottom}
          onChangeWidthRatio={widthRatio => updateSelectedSticker({widthRatio})}
          onDelete={removeSelectedSticker}
          onDone={() => setSelectedStickerId(null)}
        />
      ) : (
        <View style={[styles.toolbar, {paddingBottom: insets.bottom + 16}]}>
          <Pressable
            accessibilityRole="button"
            onPress={addText}
            style={styles.toolButton}>
            <View style={styles.textIconBadge}>
              <Text style={styles.textIconGlyph}>{t.frame.sampleGlyph}</Text>
            </View>
            <Text style={styles.toolButtonCaption}>{t.frame.text}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setStickerSourceOpen(true)}
            style={styles.toolButton}>
            <View style={styles.textIconBadge}>
              <Text style={styles.textIconGlyph}>⭐</Text>
            </View>
            <Text style={styles.toolButtonCaption}>{t.frame.sticker}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setBackgroundPickerOpen(true)}
            style={styles.toolButton}>
            <View style={[styles.backgroundDot, {backgroundColor}]} />
            <Text style={styles.toolButtonCaption}>{t.frame.background}</Text>
          </Pressable>
        </View>
      )}

      <ColorPickerSheet
        visible={backgroundPickerOpen}
        title={t.frame.background}
        color={backgroundColor}
        insetBottom={insets.bottom}
        onChange={setBackgroundColor}
        onClose={() => setBackgroundPickerOpen(false)}
        onPickImage={() => {
          setBackgroundPickerOpen(false);
          setBackgroundImagePickerOpen(true);
        }}
        hasImage={!!backgroundImageUri}
        onClearImage={() => setBackgroundImageUri(null)}
      />

      <ColorPickerSheet
        visible={textColorPickerOpen}
        title={t.frame.textColor}
        color={selected?.color ?? colors.textPrimary}
        insetBottom={insets.bottom}
        onChange={color => updateSelected({color})}
        onClose={() => setTextColorPickerOpen(false)}
      />

      <StickerSourceSheet
        visible={stickerSourceOpen}
        insetBottom={insets.bottom}
        onPickFromGallery={() => {
          setStickerSourceOpen(false);
          setStickerPickerOpen(true);
        }}
        onPickDefault={handlePickDefaultSticker}
        onClose={() => setStickerSourceOpen(false)}
      />

      <AlbumPickerSheet
        visible={stickerPickerOpen}
        insetBottom={insets.bottom}
        onSelect={handlePickSticker}
        onClose={() => setStickerPickerOpen(false)}
      />

      <AlbumPickerSheet
        visible={backgroundImagePickerOpen}
        insetBottom={insets.bottom}
        onSelect={handlePickBackgroundImage}
        onClose={() => setBackgroundImagePickerOpen(false)}
        title={t.albumPicker.backgroundTitle}
      />
    </View>
  );
}

/**
 * 실제 촬영본은 이 자리를 항상 완전히 덮는다. composeStrip이 사진을 그리는
 * 자리와 정확히 같은 계산(computeSlotRects)을 써서, 배경 색·사진이 이 자리를
 * 비쳐 보이게 하지 않고 슬롯색으로 가린다 — 편집 중에도 최종 결과물과
 * 똑같이 "어디가 사진이고 어디가 배경인지" 보인다.
 */
function SlotPlaceholders({
  layout,
  canvasWidth,
}: {
  layout: CaptureLayout;
  canvasWidth: number;
}) {
  const t = useT();
  // 슬롯 위치를 말로 알려주는 라벨 — 세로형 2×2, 가로형 3단.
  const labels = t.frame.slots[layout];
  const geometry = stripGeometry(layout, canvasWidth);
  const slots = computeSlotRects(layout, geometry);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {slots.map((slot, index) => (
        <View
          key={labels[index]}
          style={[
            styles.slot,
            {
              left: slot.x,
              top: slot.y,
              width: slot.width,
              height: slot.height,
            },
          ]}>
          <Text style={styles.slotLabel}>{labels[index]}</Text>
        </View>
      ))}
    </View>
  );
}

type DraggableTextProps = {
  element: TextElement;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (xRatio: number, yRatio: number) => void;
};

function DraggableText({
  element,
  canvasWidth,
  canvasHeight,
  selected,
  onSelect,
  onMove,
}: DraggableTextProps) {
  const start = React.useRef({x: element.xRatio, y: element.yRatio});

  // PanResponder는 useMemo로 한 번만 만들어지므로, 핸들러 안에서 매번 최신 값을
  // 읽으려면 ref를 거쳐야 한다. element/onSelect/onMove를 그대로 클로저에 담으면
  // 드래그 후 다시 눌렀을 때 처음 렌더 시점의 좌표로 되돌아가는 버그가 생긴다.
  const elementRef = React.useRef(element);
  elementRef.current = element;
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;
  const onMoveRef = React.useRef(onMove);
  onMoveRef.current = onMove;

  // 상하좌우 전부 DRAG_OVERFLOW_PX만큼만 캔버스 밖으로 나가게 하려면 실제
  // 렌더된 크기(폰트 크기·글자수에 따라 바뀐다)를 알아야 한다 — onLayout으로
  // 잰다. 값 자체는 ref로 들고 있다가 핸들러 안에서 최신 것을 읽는다.
  const sizeRef = React.useRef({width: 0, height: 0});

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = {
            x: elementRef.current.xRatio,
            y: elementRef.current.yRatio,
          };
          onSelectRef.current();
        },
        onPanResponderMove: (
          _event: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => {
          const xPx = clamp(
            start.current.x * canvasWidth + gesture.dx,
            -DRAG_OVERFLOW_PX,
            canvasWidth - sizeRef.current.width + DRAG_OVERFLOW_PX,
          );
          const yPx = clamp(
            start.current.y * canvasHeight + gesture.dy,
            -DRAG_OVERFLOW_PX,
            canvasHeight - sizeRef.current.height + DRAG_OVERFLOW_PX,
          );
          onMoveRef.current(xPx / canvasWidth, yPx / canvasHeight);
        },
      }),
    [canvasWidth, canvasHeight],
  );

  const previewFontSize = (element.fontSize / 1200) * canvasWidth;

  return (
    <View
      {...responder.panHandlers}
      onLayout={event => {
        sizeRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
      style={[
        styles.draggable,
        {
          left: element.xRatio * canvasWidth,
          top: element.yRatio * canvasHeight,
        },
        selected && styles.draggableSelected,
      ]}>
      <Text
        style={{
          fontSize: previewFontSize,
          fontWeight: String(element.fontWeight) as never,
          color: element.color,
        }}>
        {element.content}
      </Text>
    </View>
  );
}

type DraggableStickerProps = {
  element: StickerElement;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (xRatio: number, yRatio: number) => void;
};

function DraggableSticker({
  element,
  canvasWidth,
  canvasHeight,
  selected,
  onSelect,
  onMove,
}: DraggableStickerProps) {
  const start = React.useRef({x: element.xRatio, y: element.yRatio});

  // DraggableText와 같은 이유로 최신 값을 ref에 담아 둔다 — 자세한 설명은
  // 위 DraggableText의 주석 참고.
  const elementRef = React.useRef(element);
  elementRef.current = element;
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;
  const onMoveRef = React.useRef(onMove);
  onMoveRef.current = onMove;

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = {
            x: elementRef.current.xRatio,
            y: elementRef.current.yRatio,
          };
          onSelectRef.current();
        },
        onPanResponderMove: (
          _event: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => {
          const stickerWidth = elementRef.current.widthRatio * canvasWidth;
          const stickerHeight = stickerWidth / elementRef.current.aspectRatio;
          const xPx = clamp(
            start.current.x * canvasWidth + gesture.dx,
            -DRAG_OVERFLOW_PX,
            canvasWidth - stickerWidth + DRAG_OVERFLOW_PX,
          );
          const yPx = clamp(
            start.current.y * canvasHeight + gesture.dy,
            -DRAG_OVERFLOW_PX,
            canvasHeight - stickerHeight + DRAG_OVERFLOW_PX,
          );
          onMoveRef.current(xPx / canvasWidth, yPx / canvasHeight);
        },
      }),
    [canvasWidth, canvasHeight],
  );

  const width = element.widthRatio * canvasWidth;
  const height = width / element.aspectRatio;

  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.draggable,
        {
          left: element.xRatio * canvasWidth,
          top: element.yRatio * canvasHeight,
          width,
          height,
        },
        selected && styles.draggableSelected,
      ]}>
      <Image
        source={{uri: element.uri}}
        style={styles.stickerImage}
        resizeMode="contain"
      />
    </View>
  );
}

type ToolbarProps = {
  element: TextElement;
  insetBottom: number;
  onChangeContent: (content: string) => void;
  onChangeFontSize: (fontSize: number) => void;
  onChangeWeight: (weight: TextElement['fontWeight']) => void;
  onChangeColor: (color: string) => void;
  onOpenColorPicker: () => void;
  onDelete: () => void;
  onDone: () => void;
};

function TextStyleToolbar({
  element,
  insetBottom,
  onChangeContent,
  onChangeFontSize,
  onChangeWeight,
  onChangeColor,
  onOpenColorPicker,
  onDelete,
  onDone,
}: ToolbarProps) {
  const t = useT();
  return (
    <View style={[styles.styleToolbar, {paddingBottom: insetBottom + 20}]}>
      <View style={styles.styleRow}>
        <TextInput
          value={element.content}
          onChangeText={onChangeContent}
          placeholder={t.frame.textPlaceholder}
          style={styles.contentInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.deleteText}
          onPress={onDelete}
          style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>{t.common.delete}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.editDone}
          onPress={onDone}
          style={styles.doneButton}>
          <Text style={styles.doneButtonText}>{t.common.done}</Text>
        </Pressable>
      </View>

      <View style={styles.styleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.textSmaller}
          onPress={() => onChangeFontSize(Math.max(24, element.fontSize - 8))}
          style={styles.stepButton}>
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{element.fontSize}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.textBigger}
          onPress={() => onChangeFontSize(Math.min(160, element.fontSize + 8))}
          style={styles.stepButton}>
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weightScroll}>
          {WEIGHT_OPTIONS.map(weight => (
            <Pressable
              key={weight}
              accessibilityRole="button"
              accessibilityLabel={t.frame.weight[weight]}
              onPress={() => onChangeWeight(weight)}
              style={[
                styles.weightChip,
                weight === element.fontWeight && styles.weightChipActive,
              ]}>
              <Text
                style={[
                  styles.weightChipText,
                  {fontWeight: String(weight) as never},
                  weight === element.fontWeight && styles.weightChipTextActive,
                ]}>
                {t.frame.sampleGlyph}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colorScroll}
        contentContainerStyle={styles.colorScrollContent}>
        {PALETTE.map(hex => (
          <Pressable
            key={hex}
            accessibilityRole="button"
            accessibilityLabel={t.frame.textColorA11y(hex)}
            onPress={() => onChangeColor(hex)}
            style={[
              styles.swatchSmall,
              {backgroundColor: hex},
              hex === element.color && styles.swatchSelected,
            ]}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.pickColorDirect}
          onPress={onOpenColorPicker}
          style={styles.customSwatchTrigger}>
          <Text style={styles.customSwatchTriggerText}>+</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const STICKER_WIDTH_RATIO_MIN = 0.12;
const STICKER_WIDTH_RATIO_MAX = 0.9;
const STICKER_WIDTH_RATIO_STEP = 0.04;

type StickerToolbarProps = {
  element: StickerElement;
  insetBottom: number;
  onChangeWidthRatio: (widthRatio: number) => void;
  onDelete: () => void;
  onDone: () => void;
};

function StickerStyleToolbar({
  element,
  insetBottom,
  onChangeWidthRatio,
  onDelete,
  onDone,
}: StickerToolbarProps) {
  const t = useT();
  return (
    <View style={[styles.styleToolbar, {paddingBottom: insetBottom + 20}]}>
      <View style={styles.styleRow}>
        <Text style={styles.stickerToolbarTitle}>{t.frame.sticker}</Text>
        <View style={styles.styleRowSpacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.deleteSticker}
          onPress={onDelete}
          style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>{t.common.delete}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.editDone}
          onPress={onDone}
          style={styles.doneButton}>
          <Text style={styles.doneButtonText}>{t.common.done}</Text>
        </Pressable>
      </View>

      <View style={styles.styleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.stickerSmaller}
          onPress={() =>
            onChangeWidthRatio(
              Math.max(
                STICKER_WIDTH_RATIO_MIN,
                element.widthRatio - STICKER_WIDTH_RATIO_STEP,
              ),
            )
          }
          style={styles.stepButton}>
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>
          {Math.round(element.widthRatio * 100)}%
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.frame.stickerBigger}
          onPress={() =>
            onChangeWidthRatio(
              Math.min(
                STICKER_WIDTH_RATIO_MAX,
                element.widthRatio + STICKER_WIDTH_RATIO_STEP,
              ),
            )
          }
          style={styles.stepButton}>
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

type RgbSliderProps = {
  channel: keyof Rgb;
  value: number;
  onChange: (value: number) => void;
};

/**
 * 슬라이더 라이브러리 없이 PanResponder로 직접 만든다.
 *
 * 트랙 전체가 아니라 손잡이(막대)에만 팬레스폰더를 붙인다 — 예전엔 트랙
 * 전체가 터치를 가로채서, 시트를 스크롤하려고 트랙 위에서 위아래로 쓸어도
 * 슬라이더가 그걸 가로 드래그로 먼저 가로채 값이 바뀌면서 스크롤이 아예
 * 안 됐다. 손잡이(작은 원)만 반응하게 하면 트랙 위 스와이프는 그대로
 * ScrollView로 넘어가고, 값은 손잡이를 직접 잡고 끌 때만 바뀐다.
 */
function RgbSlider({channel, value, onChange}: RgbSliderProps) {
  const widthRef = React.useRef(0);
  const startValueRef = React.useRef(value);
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const inputRef = React.useRef<React.ElementRef<typeof TextInput>>(null);

  const [textValue, setTextValue] = React.useState(String(value));
  React.useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  const commitTextValue = () => {
    const parsed = parseInt(textValue, 10);
    if (Number.isNaN(parsed)) {
      setTextValue(String(value));
      return;
    }
    onChangeRef.current(clamp255(parsed));
  };

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startValueRef.current = valueRef.current;
        },
        onPanResponderMove: (
          _event: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => {
          const width = widthRef.current;
          if (width <= 0) {
            return;
          }
          onChangeRef.current(
            clamp255(startValueRef.current + (gesture.dx / width) * 255),
          );
        },
      }),
    [],
  );

  const percent = (value / 255) * 100;

  return (
    <View style={styles.rgbSliderRow}>
      <Text style={styles.rgbSliderLabel}>{CHANNEL_LABEL[channel]}</Text>
      <View
        style={styles.rgbSliderTrack}
        onLayout={event => {
          widthRef.current = event.nativeEvent.layout.width;
        }}>
        <View
          style={[
            styles.rgbSliderFill,
            {width: `${percent}%`, backgroundColor: CHANNEL_TINT[channel]},
          ]}
        />
        <View
          {...responder.panHandlers}
          hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}
          style={[styles.rgbSliderThumb, {left: `${percent}%`}]}
        />
      </View>
      <TapToFocusInput
        inputRef={inputRef}
        value={textValue}
        onChangeText={setTextValue}
        onSubmitEditing={commitTextValue}
        onBlur={commitTextValue}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
        style={styles.rgbSliderValueInput}
      />
    </View>
  );
}

type RgbHexEditorProps = {
  color: string;
  onChange: (hex: string) => void;
};

function RgbHexEditor({color, onChange}: RgbHexEditorProps) {
  const t = useT();
  const [hexInput, setHexInput] = React.useState(color);
  const [hexError, setHexError] = React.useState(false);
  const hexInputRef = React.useRef<React.ElementRef<typeof TextInput>>(null);

  React.useEffect(() => {
    setHexInput(color);
    setHexError(false);
  }, [color]);

  const rgb = hexToRgb(color) ?? {r: 0, g: 0, b: 0};

  const updateChannel = (channel: keyof Rgb, next: number) => {
    const updated: Rgb = {...rgb};
    updated[channel] = next;
    onChange(rgbToHex(updated));
  };

  const applyHex = () => {
    const parsed = hexToRgb(hexInput);
    if (!parsed) {
      setHexError(true);
      return;
    }
    onChange(rgbToHex(parsed));
  };

  return (
    <View style={styles.rgbEditor}>
      <View style={[styles.colorPreviewLarge, {backgroundColor: color}]} />
      <RgbSlider
        channel="r"
        value={rgb.r}
        onChange={v => updateChannel('r', v)}
      />
      <RgbSlider
        channel="g"
        value={rgb.g}
        onChange={v => updateChannel('g', v)}
      />
      <RgbSlider
        channel="b"
        value={rgb.b}
        onChange={v => updateChannel('b', v)}
      />

      <View style={styles.hexRow}>
        <TapToFocusInput
          inputRef={hexInputRef}
          value={hexInput}
          onChangeText={text => {
            setHexInput(text);
            setHexError(false);
          }}
          onSubmitEditing={applyHex}
          placeholder="#RRGGBB"
          autoCapitalize="characters"
          autoCorrect={false}
          style={[styles.hexInput, hexError && styles.hexInputError]}
        />
        <Pressable
          accessibilityRole="button"
          onPress={applyHex}
          style={styles.hexApplyButton}>
          <Text style={styles.hexApplyButtonText}>{t.common.apply}</Text>
        </Pressable>
      </View>
      {hexError ? (
        <Text style={styles.hexErrorText}>{t.frame.badHex}</Text>
      ) : null}
    </View>
  );
}

type ColorPickerSheetProps = {
  visible: boolean;
  title: string;
  color: string;
  insetBottom: number;
  onChange: (hex: string) => void;
  onClose: () => void;
  /** 배경 색상 시트에서만 준다 — 있으면 "사진으로 배경 만들기" 항목이 나온다. */
  onPickImage?: () => void;
  hasImage?: boolean;
  onClearImage?: () => void;
};

function ColorPickerSheet({
  visible,
  title,
  color,
  insetBottom,
  onChange,
  onClose,
  onPickImage,
  hasImage,
  onClearImage,
}: ColorPickerSheetProps) {
  const t = useT();
  const {height: windowHeight} = useWindowDimensions();
  const sheetMaxHeight = windowHeight * COLOR_SHEET_HEIGHT_RATIO;
  const keyboardHeight = useKeyboardHeight();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      {/* 뒤로 닫는 영역과 시트를 부모-자식이 아니라 형제로 둔다 — 예전처럼
          시트를 Pressable로 감싸서 뒤 배경 탭을 막으면, RN의 JS 제스처
          responder가 그 Pressable에 걸려서 안의 네이티브 ScrollView가
          스크롤을 가로챌 기회를 아예 못 얻는다(터치가 JS 쪽에 잡히면 보통의
          안드로이드 뷰 계층 터치 전달을 안 탄다). 닫는 영역을 시트 위쪽
          "남는 공간"에만 딱 맞게 형제로 분리하면 시트 영역은 터치를 가로채는
          Pressable이 전혀 없어 스크롤이 정상 동작한다. */}
      <View style={styles.colorSheetContainer}>
        <Pressable style={styles.colorSheetDismissArea} onPress={onClose} />
        {/* KeyboardAvoidingView는 Modal 안에서 잘 안 맞는다 — "height" 방식은
            이미 1/3로 줄여둔 시트 높이에서 키보드 높이를 빼려다 음수가 나와
            시트가 통째로 사라졌다. 실측한 키보드 높이(useKeyboardHeight)만큼
            직접 marginBottom을 줘서 시트를 밀어올린다. */}
        <View
          style={[
            styles.sheet,
            {
              maxHeight: sheetMaxHeight,
              marginBottom: keyboardHeight,
              paddingBottom: insetBottom + 20,
            },
          ]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.sheetDoneText}>{t.common.done}</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetSubtitle}>{t.frame.pickColor}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.swatchGrid}>
              {PALETTE.map(hex => (
                <Pressable
                  key={hex}
                  accessibilityRole="button"
                  accessibilityLabel={t.frame.colorA11y(hex)}
                  onPress={() => onChange(hex)}
                  style={[
                    styles.swatch,
                    {backgroundColor: hex},
                    hex === color && styles.swatchSelected,
                  ]}
                />
              ))}
            </View>
            <RgbHexEditor color={color} onChange={onChange} />
            {onPickImage ? (
              <View style={styles.bgImageSection}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onPickImage}
                  style={styles.bgImageButton}>
                  <Text style={styles.bgImageButtonText}>
                    {t.frame.bgFromPhoto}
                  </Text>
                </Pressable>
                {hasImage ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onClearImage}
                    style={styles.bgImageClearButton}>
                    <Text style={styles.bgImageClearButtonText}>
                      {t.frame.bgClearPhoto}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type StickerSourceSheetProps = {
  visible: boolean;
  insetBottom: number;
  onPickFromGallery: () => void;
  onPickDefault: (sticker: DefaultSticker) => void;
  onClose: () => void;
};

/**
 * "스티커" 버튼을 누르면 뜨는 첫 화면 — "갤러리에서 선택"과 기본 스티커
 * 그리드(DEFAULT_STICKERS)를 함께 보여준다. 기본 스티커가 늘어나면
 * defaultStickers.ts에 추가하기만 하면 여기 그리드에 자동으로 나온다.
 */
function StickerSourceSheet({
  visible,
  insetBottom,
  onPickFromGallery,
  onPickDefault,
  onClose,
}: StickerSourceSheetProps) {
  const t = useT();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {paddingBottom: insetBottom + 20}]}
          onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t.frame.sticker}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.sheetDoneText}>{t.common.done}</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onPickFromGallery}
            style={styles.galleryRow}>
            <View style={styles.galleryRowIcon}>
              <Text style={styles.galleryRowIconText}>🖼️</Text>
            </View>
            <View style={styles.galleryRowTextGroup}>
              <Text style={styles.galleryRowTitle}>
                {t.frame.pickFromGallery}
              </Text>
              <Text style={styles.galleryRowSubtitle}>
                {t.frame.pickFromGalleryHint}
              </Text>
            </View>
            <Text style={styles.galleryRowChevron}>›</Text>
          </Pressable>

          {DEFAULT_STICKERS.length > 0 ? (
            <>
              <Text style={styles.defaultStickerLabel}>
                {t.frame.defaultStickers}
              </Text>
              <View style={styles.defaultStickerGrid}>
                {DEFAULT_STICKERS.map(sticker => (
                  <Pressable
                    key={sticker.id}
                    accessibilityRole="button"
                    accessibilityLabel={t.stickers[sticker.labelKey]}
                    onPress={() => onPickDefault(sticker)}
                    style={styles.defaultStickerItem}>
                    <Image
                      source={{uri: sticker.uri}}
                      style={styles.defaultStickerImage}
                      resizeMode="contain"
                    />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slot,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: fontSize.calloutTitle,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  completeButton: {
    height: 40,
    paddingHorizontal: 18,
    width: undefined,
  },
  layoutToggle: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  layoutChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.divider,
  },
  layoutChipActive: {
    backgroundColor: colors.black,
  },
  layoutChipText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  layoutChipTextActive: {
    color: colors.white,
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  slot: {
    position: 'absolute',
    backgroundColor: colors.slot,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  draggable: {
    position: 'absolute',
  },
  draggableSelected: {
    borderWidth: 1,
    borderColor: colors.black,
    borderStyle: 'dashed',
    padding: 2,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  toolButton: {
    alignItems: 'center',
    gap: 6,
  },
  toolButtonCaption: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  backgroundDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  textIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textIconGlyph: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  styleToolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  styleRowSpacer: {
    flex: 1,
  },
  stickerToolbarTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  contentInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    color: colors.textPrimary,
  },
  deleteButton: {
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#D8342B',
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  doneButton: {
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  doneButtonText: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    fontSize: 18,
    color: colors.textPrimary,
  },
  stepValue: {
    width: 32,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  weightScroll: {
    flex: 1,
  },
  weightChip: {
    width: 36,
    height: 32,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.divider,
  },
  weightChipActive: {
    backgroundColor: colors.black,
  },
  weightChipText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  weightChipTextActive: {
    color: colors.white,
  },
  colorScroll: {
    flexGrow: 0,
  },
  colorScrollContent: {
    gap: 10,
    paddingRight: 16,
  },
  swatchSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  customSwatchTrigger: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSwatchTriggerText: {
    fontSize: 16,
    lineHeight: 16,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  // 색상 시트 전용 — 닫는 영역(dismissArea)과 시트를 형제로 두는 바깥 껍데기.
  colorSheetContainer: {
    flex: 1,
  },
  // 시트 위 "남는 공간"만 차지하는 탭-닫기 영역. 뒤 배경을 어둡게 하지
  // 않아야 캔버스 색을 있는 그대로 비교할 수 있어서 투명으로 둔다.
  // (sheetBackdrop과 구분해서 다른 시트는 그대로 어둡게 유지)
  colorSheetDismissArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '86%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetDoneText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  galleryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.slot,
  },
  galleryRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryRowIconText: {
    fontSize: 20,
  },
  galleryRowTextGroup: {
    flex: 1,
    gap: 2,
  },
  galleryRowTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  galleryRowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  galleryRowChevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  defaultStickerLabel: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginTop: 20,
    marginBottom: 10,
  },
  defaultStickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  defaultStickerItem: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  defaultStickerImage: {
    width: '100%',
    height: '100%',
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: colors.black,
  },
  rgbEditor: {
    marginTop: 20,
    gap: 4,
  },
  colorPreviewLarge: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    marginBottom: 14,
  },
  rgbSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  // 자식 크기에 맞춰 감싸기만 하는 컨테이너 — 투명 Pressable을 TextInput
  // 위에 absoluteFill로 덮기 위한 위치 기준점 역할만 한다.
  tapToFocusWrapper: {
    alignSelf: 'flex-start',
  },
  rgbSliderLabel: {
    width: 14,
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  rgbSliderTrack: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.divider,
    justifyContent: 'center',
  },
  rgbSliderFill: {
    height: '100%',
    borderRadius: 16,
  },
  // 트랙 위에서 값을 바꾸는 손잡이. hitSlop으로 실제 터치 영역은 더
  // 넓지만(트랙 스크롤과 구분되도록), 시각적으로는 작게 유지한다.
  rgbSliderThumb: {
    position: 'absolute',
    top: 4,
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  rgbSliderValueInput: {
    width: 64,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    textAlign: 'right',
    textAlignVertical: 'center',
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 14,
    includeFontPadding: false,
    color: colors.textPrimary,
  },
  hexRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  hexInput: {
    // flex:1로 행 전체를 채우면 터치 영역도 그만큼 넓어져서, 시트를
    // 스크롤하려고 이 줄 위에서 손가락을 쓸어도 텍스트 입력칸이 먼저
    // 커서 위치 지정으로 가로채 스크롤이 안 먹는다. "#RRGGBB" 정도만
    // 들어가면 되니 폭을 고정해서 나머지 공간은 스크롤이 그대로 통하게 둔다.
    width: 150,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    color: colors.textPrimary,
  },
  hexInputError: {
    borderColor: '#D8342B',
  },
  hexApplyButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexApplyButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  hexErrorText: {
    color: '#D8342B',
    fontSize: 12,
    marginTop: 6,
  },
  bgImageSection: {
    marginTop: 20,
    gap: 10,
  },
  bgImageButton: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgImageButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  bgImageClearButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgImageClearButtonText: {
    color: '#D8342B',
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});

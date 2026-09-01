import React, {useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {addLocalFrame} from '../api/frames';
import AlbumPickerSheet, {type StickerPick} from '../frameBuilder/AlbumPickerSheet';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import {PALETTE} from '../frameBuilder/palette';
import {renderFrameDesign} from '../frameBuilder/renderFrameDesign';
import type {StickerElement, TextElement} from '../frameBuilder/types';
import {computeSlotRects, STRIP_ASPECT, stripGeometry} from '../capture/stripLayout';
import type {CaptureLayout} from '../state/CaptureSessionContext';
import type {RootNavigation} from '../navigation/types';
import {colors, fonts, fontSize} from '../theme';

/** 화면에 그리는 캔버스 폭. 실제 인쇄 해상도는 renderFrameDesign이 따로 맞춘다. */
const CANVAS_WIDTH_RATIO = 0.82;

/** 텍스트·스티커를 캔버스 밖으로 끌 때, 네 방향 모두 이만큼(px)까지만 나가게 한다. */
const DRAG_OVERFLOW_PX = 24;

const WEIGHT_OPTIONS: TextElement['fontWeight'][] = [400, 500, 600, 700];
const WEIGHT_LABEL: Record<TextElement['fontWeight'], string> = {
  400: '보통',
  500: '중간',
  600: '두껍게',
  700: '아주 두껍게',
};

/** 슬롯 위치를 말로 알려주는 라벨 — 세로형 2×2, 가로형 3단. */
const SLOT_LABELS: Record<CaptureLayout, string[]> = {
  portrait: ['좌상', '우상', '좌하', '우하'],
  landscape: ['상', '중', '하'],
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
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
      ? trimmed.split('').map(ch => ch + ch).join('')
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigation>();
  const {width: windowWidth} = useWindowDimensions();

  const [layout, setLayout] = useState<CaptureLayout>('portrait');
  const [backgroundColor, setBackgroundColor] = useState<string>(colors.white);
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stickerElements, setStickerElements] = useState<StickerElement[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [backgroundImagePickerOpen, setBackgroundImagePickerOpen] = useState(false);
  const [textColorPickerOpen, setTextColorPickerOpen] = useState(false);
  const [stickerSourceOpen, setStickerSourceOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canvasArea, setCanvasArea] = useState({width: 0, height: 0});

  // 텍스트 편집 툴바가 뜨면 canvasArea(위아래 여백)가 줄어든다. 폭 기준으로만
  // 캔버스 크기를 잡으면 그 여백보다 캔버스가 커져서 위로는 레이아웃 뱃지를,
  // 아래로는 툴바를 가리며 넘친다 — 실측한 canvasArea 안에 꼭 맞게 축소한다.
  const AREA_MARGIN = 0.96;
  const maxCanvasWidth = windowWidth * CANVAS_WIDTH_RATIO;
  const availableWidth = canvasArea.width > 0 ? canvasArea.width * AREA_MARGIN : maxCanvasWidth;
  const availableHeight = canvasArea.height > 0 ? canvasArea.height * AREA_MARGIN : Infinity;
  let canvasWidth = Math.min(maxCanvasWidth, availableWidth);
  let canvasHeight = canvasWidth * STRIP_ASPECT;
  if (canvasHeight > availableHeight) {
    canvasHeight = availableHeight;
    canvasWidth = canvasHeight / STRIP_ASPECT;
  }
  const selected = textElements.find(element => element.id === selectedId) ?? null;
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
        content: '텍스트',
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

  const handlePickSticker = ({uri, aspectRatio}: StickerPick) => {
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
    setStickerPickerOpen(false);
    setSelectedId(null);
    setSelectedStickerId(id);
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
        name: layout === 'portrait' ? '내가 만든 세로형' : '내가 만든 가로형',
        orientation,
        previewImageUrl,
        design: {backgroundColor, backgroundImageUri, textElements, stickerElements},
      });
      navigation.navigate('MainTabs', {
        screen: 'Shoot',
        params: {screen: 'Home'},
      });
    } catch {
      Alert.alert('저장에 실패했습니다', '잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>프레임 만들기</Text>
        <PrimaryButton
          label={saving ? '저장 중...' : '완료'}
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
            accessibilityLabel={option === 'portrait' ? '세로형' : '가로형'}
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
              {option === 'portrait' ? '세로형' : '가로형'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={styles.canvasArea}
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
              <Text style={styles.textIconGlyph}>가</Text>
            </View>
            <Text style={styles.toolButtonCaption}>텍스트</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setStickerSourceOpen(true)}
            style={styles.toolButton}>
            <View style={styles.textIconBadge}>
              <Text style={styles.textIconGlyph}>⭐</Text>
            </View>
            <Text style={styles.toolButtonCaption}>스티커</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setBackgroundPickerOpen(true)}
            style={styles.toolButton}>
            <View
              style={[styles.backgroundDot, {backgroundColor}]}
            />
            <Text style={styles.toolButtonCaption}>배경</Text>
          </Pressable>
        </View>
      )}

      <ColorPickerSheet
        visible={backgroundPickerOpen}
        title="배경"
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
        title="글자색"
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
        title="앨범에서 배경 사진 고르기"
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
  const labels = SLOT_LABELS[layout];
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
  return (
    <View
      style={[styles.styleToolbar, {paddingBottom: insetBottom + 20}]}>
      <View style={styles.styleRow}>
        <TextInput
          value={element.content}
          onChangeText={onChangeContent}
          placeholder="텍스트 입력"
          style={styles.contentInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="텍스트 삭제"
          onPress={onDelete}
          style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>삭제</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="편집 완료"
          onPress={onDone}
          style={styles.doneButton}>
          <Text style={styles.doneButtonText}>완료</Text>
        </Pressable>
      </View>

      <View style={styles.styleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="글자 작게"
          onPress={() => onChangeFontSize(Math.max(24, element.fontSize - 8))}
          style={styles.stepButton}>
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{element.fontSize}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="글자 크게"
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
              accessibilityLabel={WEIGHT_LABEL[weight]}
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
                가
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
            accessibilityLabel={`글자색 ${hex}`}
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
          accessibilityLabel="색상 직접 선택"
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
  return (
    <View style={[styles.styleToolbar, {paddingBottom: insetBottom + 20}]}>
      <View style={styles.styleRow}>
        <Text style={styles.stickerToolbarTitle}>스티커</Text>
        <View style={styles.styleRowSpacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="스티커 삭제"
          onPress={onDelete}
          style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>삭제</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="편집 완료"
          onPress={onDone}
          style={styles.doneButton}>
          <Text style={styles.doneButtonText}>완료</Text>
        </Pressable>
      </View>

      <View style={styles.styleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="스티커 작게"
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
        <Text style={styles.stepValue}>{Math.round(element.widthRatio * 100)}%</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="스티커 크게"
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
 * 슬라이더 라이브러리 없이 PanResponder로 직접 만든다. 터치 시작 위치로
 * 값을 바로 옮기고(탭-투-점프), 이후 드래그는 시작값 + 델타로 계산한다 —
 * DraggableText와 같은 방식이라 화면 이동 중 값이 튀는 문제가 없다.
 */
function RgbSlider({channel, value, onChange}: RgbSliderProps) {
  const widthRef = React.useRef(0);
  const startValueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

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
        onPanResponderGrant: (event: GestureResponderEvent) => {
          const width = widthRef.current;
          if (width <= 0) {
            return;
          }
          const next = clamp255(
            (event.nativeEvent.locationX / width) * 255,
          );
          startValueRef.current = next;
          onChangeRef.current(next);
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

  return (
    <View style={styles.rgbSliderRow}>
      <Text style={styles.rgbSliderLabel}>{CHANNEL_LABEL[channel]}</Text>
      <View
        style={styles.rgbSliderTrack}
        onLayout={event => {
          widthRef.current = event.nativeEvent.layout.width;
        }}
        {...responder.panHandlers}>
        <View
          style={[
            styles.rgbSliderFill,
            {width: `${(value / 255) * 100}%`, backgroundColor: CHANNEL_TINT[channel]},
          ]}
        />
      </View>
      <TextInput
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
  const [hexInput, setHexInput] = React.useState(color);
  const [hexError, setHexError] = React.useState(false);

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
      <RgbSlider channel="r" value={rgb.r} onChange={v => updateChannel('r', v)} />
      <RgbSlider channel="g" value={rgb.g} onChange={v => updateChannel('g', v)} />
      <RgbSlider channel="b" value={rgb.b} onChange={v => updateChannel('b', v)} />

      <View style={styles.hexRow}>
        <TextInput
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
          <Text style={styles.hexApplyButtonText}>적용</Text>
        </Pressable>
      </View>
      {hexError ? (
        <Text style={styles.hexErrorText}>
          올바른 색상 코드가 아니에요 (예: #FF8800)
        </Text>
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
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.sheetDoneText}>완료</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetSubtitle}>색상을 선택하세요</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.swatchGrid}>
              {PALETTE.map(hex => (
                <Pressable
                  key={hex}
                  accessibilityRole="button"
                  accessibilityLabel={`색상 ${hex}`}
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
                    사진으로 배경 만들기
                  </Text>
                </Pressable>
                {hasImage ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onClearImage}
                    style={styles.bgImageClearButton}>
                    <Text style={styles.bgImageClearButtonText}>
                      사진 배경 지우기
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type StickerSourceSheetProps = {
  visible: boolean;
  insetBottom: number;
  onPickFromGallery: () => void;
  onClose: () => void;
};

/**
 * "스티커" 버튼을 누르면 뜨는 첫 화면 — 지금은 "갤러리에서 선택" 한 줄뿐이지만,
 * 나중에 기본 스티커 그리드가 생기면 이 목록 아래에 추가하면 된다.
 */
function StickerSourceSheet({
  visible,
  insetBottom,
  onPickFromGallery,
  onClose,
}: StickerSourceSheetProps) {
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
            <Text style={styles.sheetTitle}>스티커</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.sheetDoneText}>완료</Text>
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
              <Text style={styles.galleryRowTitle}>갤러리에서 선택</Text>
              <Text style={styles.galleryRowSubtitle}>
                나만의 이미지를 스티커로 사용하세요
              </Text>
            </View>
            <Text style={styles.galleryRowChevron}>›</Text>
          </Pressable>
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
    overflow: 'hidden',
  },
  rgbSliderFill: {
    height: '100%',
  },
  rgbSliderValueInput: {
    width: 44,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    textAlign: 'right',
    paddingHorizontal: 6,
    fontSize: 13,
    color: colors.textPrimary,
  },
  hexRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  hexInput: {
    flex: 1,
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

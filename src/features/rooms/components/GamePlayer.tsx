import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, DeviceEventEmitter, TextInput, Image, Pressable, Modal, Dimensions, ScrollView, Alert } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './GamePlayer.styles';
import Matter from 'matter-js';
import { X, RotateCcw, Play as PlayIcon, Pause, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronUp, Bolt, Database } from 'lucide-react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '../../../theme';
import { useProjectStore, GameObject, RoomLayer } from '../../../store/useProjectStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  makeMutable,
  useAnimatedProps,
  SharedValue,
  useAnimatedReaction,
  runOnJS,
  useDerivedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useWindowDimensions } from 'react-native';
import { PixelSprite } from '../../../components/PixelSprite';

import base64js from 'base64-js';

const SPRITE_CACHE = new Map<string, string>();
const parsedImmediateCache = new WeakMap<any, any>();
const parsedSubConditionsCache = new WeakMap<any, any>();

// --- Optimized Tilemap Dimensions Lookup Cache ---
const tilemapDimensionCache = new WeakMap<any, { width: number; height: number }>();

function getTilemapDimensions(inst: any, tileGS: number): { width: number; height: number } {
  const cached = tilemapDimensionCache.get(inst);
  if (cached) return cached;

  const tileData = inst.tileData || {};
  const keys = Object.keys(tileData);
  if (keys.length === 0) {
    const res = { width: 32, height: 32 };
    tilemapDimensionCache.set(inst, res);
    return res;
  }

  let maxCol = 0;
  let maxRow = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const commaIndex = k.indexOf(',');
    if (commaIndex !== -1) {
      const col = parseInt(k.substring(0, commaIndex), 10);
      const row = parseInt(k.substring(commaIndex + 1), 10);
      if (col > maxCol) maxCol = col;
      if (row > maxRow) maxRow = row;
    }
  }

  const res = {
    width: (maxCol + 1) * tileGS,
    height: (maxRow + 1) * tileGS
  };
  tilemapDimensionCache.set(inst, res);
  return res;
}

// --- Raycast Geometry Helpers ---
function getLineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number; fraction: number } | null {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return null; // Parallel

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1),
      fraction: ua
    };
  }
  return null;
}

function getCircleIntersection(
  startX: number, startY: number, endX: number, endY: number,
  cx: number, cy: number, r: number
): { x: number; y: number; fraction: number } | null {
  const dx = endX - startX;
  const dy = endY - startY;
  const fx = startX - cx;
  const fy = startY - cy;

  const a = dx * dx + dy * dy;
  if (a === 0) return null; // Prevent division by zero if ray has 0 length
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  let t = -1;
  if (t1 >= 0 && t1 <= 1) {
    t = t1;
  } else if (t2 >= 0 && t2 <= 1) {
    t = t2;
  }

  if (t >= 0 && t <= 1) {
    return {
      x: startX + t * dx,
      y: startY + t * dy,
      fraction: t
    };
  }
  return null;
}

function getBodyIntersection(
  body: Matter.Body,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number; fraction: number } | null {
  let closest: { x: number; y: number; fraction: number } | null = null;
  const parts = body.parts || [body];
  const startIdx = parts.length > 1 ? 1 : 0;

  for (let p = startIdx; p < parts.length; p++) {
    const part = parts[p];

    if (part.circleRadius && part.circleRadius > 0) {
      const hit = getCircleIntersection(
        startX, startY, endX, endY,
        part.position.x, part.position.y, part.circleRadius
      );
      if (hit) {
        if (!closest || hit.fraction < closest.fraction) {
          closest = hit;
        }
      }
    } else {
      const vertices = part.vertices;
      if (vertices && vertices.length > 0) {
        for (let j = 0; j < vertices.length; j++) {
          const v1 = vertices[j];
          const v2 = vertices[(j + 1) % vertices.length];

          const hit = getLineIntersection(
            startX, startY, endX, endY,
            v1.x, v1.y, v2.x, v2.y
          );
          if (hit) {
            if (!closest || hit.fraction < closest.fraction) {
              closest = hit;
            }
          }
        }
      }
    }
  }
  return closest;
}


const GameButton = ({
  style,
  pressedStyle,
  onPressIn,
  onPressOut,
  children
}: {
  style?: any;
  pressedStyle?: any;
  onPressIn: () => void;
  onPressOut: () => void;
  children: React.ReactNode;
}) => {
  const [pressed, setPressed] = useState(false);

  const gesture = useMemo(() => Gesture.Manual()
    .onTouchesDown((e, manager) => {
      manager.activate();
      runOnJS(setPressed)(true);
      runOnJS(onPressIn)();
    })
    .onTouchesUp((e, manager) => {
      manager.end();
      runOnJS(setPressed)(false);
      runOnJS(onPressOut)();
    })
    .onTouchesCancelled((e, manager) => {
      manager.fail();
      runOnJS(setPressed)(false);
      runOnJS(onPressOut)();
    }), [onPressIn, onPressOut]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[style, pressed && pressedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

const VirtualJoystick = ({ settings, onMove, onRelease }: {
  settings: any,
  onMove: (data: { x: number, y: number, angle: number, magnitude: number }) => void,
  onRelease: () => void
}) => {
  const stickX = useSharedValue(0);
  const stickY = useSharedValue(0);
  const baseRange = settings.stick_range || 50;

  const isPersistent = !!settings?.persistence;

  const gesture = useMemo(() => Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      const dx = e.x - baseRange;
      const dy = e.y - baseRange;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let finalX = dx;
      let finalY = dy;

      if (dist > baseRange) {
        finalX = (dx / dist) * baseRange;
        finalY = (dy / dist) * baseRange;
      }

      stickX.value = finalX;
      stickY.value = finalY;
    })
    .onUpdate((e) => {
      const dx = e.x - baseRange;
      const dy = e.y - baseRange;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let finalX = dx;
      let finalY = dy;

      if (dist > baseRange) {
        finalX = (dx / dist) * baseRange;
        finalY = (dy / dist) * baseRange;
      }

      stickX.value = finalX;
      stickY.value = finalY;

      const magnitude = Math.min(1, dist / baseRange);
      if (dist >= (settings.dead_zone || 0)) {
        runOnJS(onMove)({
          x: finalX / baseRange,
          y: finalY / baseRange,
          angle: Math.atan2(finalY, finalX) * (180 / Math.PI),
          magnitude
        });
      }
    })
    .onFinalize(() => {
      'worklet';
      if (!isPersistent) {
        stickX.value = withTiming(0, { duration: 150 });
        stickY.value = withTiming(0, { duration: 150 });
      }
      runOnJS(onRelease)();
    }), [baseRange, isPersistent, settings.dead_zone, onMove, onRelease]);


  const stickStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stickX.value }, { translateY: stickY.value }]
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        pointerEvents="auto"
        style={{
          width: baseRange * 2,
          height: baseRange * 2,
          borderRadius: baseRange,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.15)',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible'
        }}
      >
        <Animated.View style={[{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.9)',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
          borderWidth: 2,
          borderColor: '#fff'
        }, stickStyle]} />

        {/* Visual indicator for the center */}
        <View style={{
          position: 'absolute',
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.3)'
        }} />
      </Animated.View>
    </GestureDetector>
  );
};

/**
 * Generates a BMP at the exact display resolution using true nearest-neighbor scaling.
 * By rendering at 1:1 pixel ratio, the Image component does ZERO scaling,
 * completely eliminating bilinear filtering blur on all platforms.
 */
const pixelsToBmp = (pixels: string[][], spriteId: string, displayWidth?: number, displayHeight?: number) => {
  if (!pixels || pixels.length === 0) return null;

  const srcW = pixels[0]?.length || 0;
  const srcH = pixels.length || 0;
  if (srcW === 0 || srcH === 0) return null;

  // Output at exact display size (minimum 2x source to ensure sharpness)
  const minScale = Math.max(2, Math.ceil((displayWidth || 32) / srcW));
  const width = displayWidth ? Math.max(displayWidth, srcW * 2) : srcW * minScale;
  const height = displayHeight ? Math.max(displayHeight, srcH * 2) : srcH * minScale;

  const cacheKey = `${spriteId}_${width}x${height}_v5`;
  if (SPRITE_CACHE.has(cacheKey)) return SPRITE_CACHE.get(cacheKey);

  const rowSize = width * 4;
  const pixelDataSize = rowSize * height;
  const headerSize = 72; // 4-byte aligned for Uint32Array
  const fileSize = headerSize + pixelDataSize;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // BMP File Header
  view.setUint16(0, 0x4D42, true);
  view.setUint32(2, fileSize, true);
  view.setUint32(10, headerSize, true);

  // DIB Header (BITMAPINFOHEADER)
  view.setUint32(14, 40, true);
  view.setUint32(18, width, true);
  view.setUint32(22, -height, true); // Top-down
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(30, 3, true); // BI_BITFIELDS
  view.setUint32(34, pixelDataSize, true);

  // Channel masks (BGRA)
  view.setUint32(54, 0x00FF0000, true); // R
  view.setUint32(58, 0x0000FF00, true); // G
  view.setUint32(62, 0x000000FF, true); // B
  view.setUint32(66, 0xFF000000, true); // A

  const pixelView = new Uint32Array(buffer.buffer, headerSize, width * height);

  // Pre-parse all unique colors in the sprite
  const colorLut = new Map<string, number>();
  for (let sy = 0; sy < srcH; sy++) {
    const row = pixels[sy];
    for (let sx = 0; sx < srcW; sx++) {
      const color = row[sx] || 'transparent';
      if (color !== 'transparent' && !colorLut.has(color)) {
        const hex = color.startsWith('#') ? color.slice(1) : 'FFFFFF';
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        colorLut.set(color, (255 << 24) | (r << 16) | (g << 8) | b);
      }
    }
  }

  // True nearest-neighbor: iterate source pixels → fill output blocks
  for (let sy = 0; sy < srcH; sy++) {
    const row = pixels[sy];
    const outYStart = Math.floor(sy * height / srcH);
    const outYEnd = Math.floor((sy + 1) * height / srcH);
    const blockH = outYEnd - outYStart;

    for (let sx = 0; sx < srcW; sx++) {
      const color = row[sx] || 'transparent';
      const argb = color === 'transparent' ? 0 : (colorLut.get(color) || 0);

      const outXStart = Math.floor(sx * width / srcW);
      const outXEnd = Math.floor((sx + 1) * width / srcW);
      const blockW = outXEnd - outXStart;

      // Fill entire rectangular block for this source pixel
      for (let py = 0; py < blockH; py++) {
        const rowStart = (outYStart + py) * width + outXStart;
        pixelView.fill(argb, rowStart, rowStart + blockW);
      }
    }
  }

  const base64 = `data:image/bmp;base64,${base64js.fromByteArray(buffer)}`;
  SPRITE_CACHE.set(cacheKey, base64);
  return base64;
};

// --- Isolated Dynamic Text Component to prevent global re-renders ---
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// --- Isolated Dynamic Text Component to prevent global re-renders ---
const resolveTextWorklet = (text: string, v_tapX: number, v_tapY: number) => {
  'worklet';
  if (!text) return '';
  let resolved = text;
  const lower = text.trim().toLowerCase();

  // Support bare names for simple cases
  if (lower === 'tap_x' || lower === 'get_drag_x') return String(Math.round(v_tapX));
  if (lower === 'tap_y' || lower === 'get_drag_y') return String(Math.round(v_tapY));

  // Support expression replacement
  resolved = resolved.replace(/\{tap_x\}/g, String(Math.round(v_tapX)));
  resolved = resolved.replace(/\{tap_y\}/g, String(Math.round(v_tapY)));
  resolved = resolved.replace(/\{get_drag_x\}/g, String(Math.round(v_tapX)));
  resolved = resolved.replace(/\{get_drag_y\}/g, String(Math.round(v_tapY)));

  return resolved;
};

// --- Isolated Dynamic Text Component to prevent global re-renders ---
const DynamicTextNode = React.memo(({ content, variables, localVariables, lowerMap, tapX, tapY, style }: any) => {
  const animatedProps = useAnimatedProps(() => {
    if (!content) return {};
    const lower = content.toLowerCase();
    if (lower.includes('tap_x') || lower.includes('tap_y') || lower.includes('drag_x') || lower.includes('drag_y')) {
      const nextText = resolveTextWorklet(content, tapX.value, tapY.value);
      return {
        text: nextText,
        value: nextText
      } as any;
    }
    return {};
  }, [content]);

  const resolveTextLocal = (text: string) => {
    if (!text) return '';

    let resolved = text;

    // 1. Check if it's a bare variable or built-in (e.g. "tap_x")
    const trimmed = text.trim().toLowerCase();
    if (trimmed === 'tap_x') return String(Math.round(tapX.value || 0));
    if (trimmed === 'tap_y') return String(Math.round(tapY.value || 0));

    if (lowerMap && lowerMap[trimmed] !== undefined && variables) {
      return String(variables[lowerMap[trimmed]]);
    }

    if (localVariables && localVariables[trimmed] !== undefined) {
      return String(localVariables[trimmed]);
    }

    // 2. Handle expressions in brackets {tap_x} or {score}
    resolved = resolved.replace(/\{([^}]+)\}/g, (match, expr) => {
      const e = expr.trim().toLowerCase();
      if (e === 'tap_x') return String(Math.round(tapX.value || 0));
      if (e === 'tap_y') return String(Math.round(tapY.value || 0));

      if (lowerMap && lowerMap[e] !== undefined && variables) {
        return String(variables[lowerMap[e]]);
      }
      if (localVariables && localVariables[e] !== undefined) {
        return String(localVariables[e]);
      }
      return match;
    });

    return resolved;
  };

  return (
    <View style={{
      backgroundColor: style.backgroundColor || 'transparent',
      paddingHorizontal: style.paddingX || 0,
      paddingVertical: style.paddingY || 0,
      borderRadius: style.borderRadius || 0,
    }}>
      <AnimatedTextInput
        editable={false}
        multiline={false}
        pointerEvents="none"
        style={[style, { padding: 0, margin: 0, borderBottomWidth: 0 }]}
        defaultValue={resolveTextLocal(content)}
        animatedProps={animatedProps}
        underlineColorAndroid="transparent"
      />
    </View>
  );
});

const PhysicsBodyInner = ({
  instanceId, sprite, spriteId, sv, width, height, name, variables, nonce, localVariables, varKeysMap,
  obj, sprites, override, onTap, globalFrameTimer, cameraX, cameraY, cameraZoom,
  gameWidth, gameHeight, onFetch, isRemote, ySort, ySortAmount, layerIndex, forceNoHUD,
  liveOverride, tapX, tapY, debug, tileData
}: {
  instanceId?: string,
  sprite: any,
  spriteId?: string,
  sv: any,
  width: number,
  height: number,
  name?: string,
  variables?: Record<string, number>,
  nonce?: number,
  localVariables?: Record<string, number>,
  varKeysMap?: Record<string, string>,
  obj: GameObject,
  sprites?: any[],
  override?: { spriteId?: string, animName?: string, text?: any },
  onTap?: () => void,
  globalFrameTimer: SharedValue<number>,
  cameraX: SharedValue<number>,
  cameraY: SharedValue<number>,
  cameraZoom: SharedValue<number>,
  tapX: SharedValue<number>,
  tapY: SharedValue<number>,
  gameWidth: number,
  gameHeight: number,
  onFetch?: (id: string, type: 'sprite' | 'animation') => void | Promise<void>,
  isRemote?: boolean,
  ySort?: boolean,
  ySortAmount?: number,
  layerIndex?: number,
  forceNoHUD?: boolean,
  liveOverride?: { health?: any, sprite_repeater?: any, progress_bar?: any },
  debug?: boolean,
  tileData?: any
}) => {
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  const [currentDimId, setCurrentDimId] = useState<string | null>(null);

  const parsedTileEntries = useMemo(() => {
    if (obj?.behavior !== 'tilemap' || !tileData) return [];
    return Object.entries(tileData).map(([key, value]) => {
      const commaIndex = key.indexOf(',');
      let c = 0;
      let r = 0;
      if (commaIndex !== -1) {
        c = parseInt(key.substring(0, commaIndex), 10);
        r = parseInt(key.substring(commaIndex + 1), 10);
      }
      return {
        key,
        c,
        r,
        tileIndex: parseInt(value as string, 10)
      };
    });
  }, [tileData, obj?.behavior]);
  const [localAnimState, setLocalAnimState] = useState(() => {
    if (!sv?.animState) return 0;
    // Safely check if it's a real Reanimated shared value
    if (sv.animState._isReanimatedSharedValue === true) {
      return 0; // Default to 0 (idle) during render, will sync in useAnimatedReaction / useEffect
    }
    // If it's a static/mock object (e.g. from GUIRenderer), it's safe to read immediately
    return sv.animState.value ?? 0;
  });

  // Sync initial value of shared value safely inside useEffect after render to prevent warning
  useEffect(() => {
    if (sv?.animState && sv.animState._isReanimatedSharedValue === true) {
      const currentVal = sv.animState.value;
      if (currentVal !== localAnimState) {
        setLocalAnimState(currentVal);
      }
    }
  }, [sv?.animState]);

  // Sync high-level animation state (idle, move, etc.) to trigger re-render
  // This is much less frequent than frame changes (60fps vs ~2-5 changes per second)
  useAnimatedReaction(
    () => sv?.animState?.value ?? 0,
    (val) => {
      if (val !== localAnimState) {
        runOnJS(setLocalAnimState)(val);
      }
    },
    [localAnimState]
  );

  // Shared values for animation parameters to ensure UI-thread reactivity
  const animFrameCount = useSharedValue(1);
  const animRow = useSharedValue(0);
  const animFps = useSharedValue(10);
  const animLoop = useSharedValue(true);
  const hasAnim = useSharedValue(false);

  // Animation frame calculation moved to worklet
  const frameIndex = useDerivedValue(() => {
    'worklet';
    if (!hasAnim.value || animFrameCount.value <= 1) return 0;

    const interval = 1000 / animFps.value;
    const elapsed = globalFrameTimer.value % (animFrameCount.value * interval);
    const frame = Math.floor(elapsed / interval);
    return animLoop.value ? frame : Math.min(frame, animFrameCount.value - 1);
  });

  const isHUD = !forceNoHUD && obj?.isHUD === true;

  const isVisible = useDerivedValue(() => {
    'worklet';
    if (sv?.visible?.value === 0) return false;
    if (isHUD || forceNoHUD) return true;

    const camX = cameraX.value;
    const camY = cameraY.value;
    const zoom = cameraZoom.value;

    // Visible area in world coordinates (room space)
    const viewportW = gameWidth / zoom;
    const viewportH = gameHeight / zoom;
    const visibleLeft = camX;
    const visibleRight = camX + viewportW;
    const visibleTop = camY;
    const visibleBottom = camY + viewportH;

    // Object bounding box
    const objLeft = sv.x.value;
    const objRight = sv.x.value + width;
    const objTop = sv.y.value;
    const objBottom = sv.y.value + height;

    const margin = 100; // extra pixels to avoid popping at edges
    return (objRight + margin > visibleLeft &&
      objLeft - margin < visibleRight &&
      objBottom + margin > visibleTop &&
      objTop - margin < visibleBottom);
  });

  const activeState = useMemo(() => {
    const stateNames = ['idle', 'move', 'jump', 'hit', 'dead'];
    let targetSprite = override?.spriteId ? (sprites?.find(s => s.id === override.spriteId) || sprite) : sprite;
    if (!targetSprite) return null;

    // Priority:
    // 1. Manual override (from script action)
    // 2. Physics-driven state (from velocity, if not idle)
    // 3. Object-level default state (from Appearance settings)
    // 4. Fallback to "idle"
    let currentStateName: string = override?.animName || '';

    if (!currentStateName) {
      const physicsState = stateNames[localAnimState];
      if (physicsState && physicsState !== 'idle') {
        currentStateName = physicsState;
      } else {
        currentStateName = obj?.appearance?.animationState || 'idle';
      }
    }

    // Check for custom mapping in GameObject (e.g. mapping "idle" to "Dance")
    const customMapping = override?.animName ? null : (obj?.animations as any)?.[currentStateName];
    const searchStr = customMapping || currentStateName;
    let targetAnimName = searchStr;

    if (!override?.spriteId && searchStr.includes(':')) {
      const [sName, aName] = searchStr.split(':');
      targetAnimName = aName;
      const foundSprite = sprites?.find((s: any) => s.name === sName);
      if (foundSprite) targetSprite = foundSprite;
    }

    const trimmedTargetAnimName = targetAnimName.trim().toLowerCase();

    // Find animation with robust fallback (case-insensitive and trimmed)
    let foundAnim = targetSprite.animations?.find((a: any) =>
      a.name && a.name.trim().toLowerCase() === trimmedTargetAnimName
    );

    // Fallback 1: If searching for 'idle' (or common defaults) and not found, take the first animation
    if (!foundAnim && (trimmedTargetAnimName === 'idle' || trimmedTargetAnimName === 'default') && targetSprite.animations?.length > 0) {
      foundAnim = targetSprite.animations[0];
    }

    // Fallback 2: If we have multiple frames (assumed by grid) but no named animation, create a virtual one for the first row
    if (!foundAnim && targetSprite.grid?.enabled) {
      if (!targetSprite.animations?.length) {
        foundAnim = { name: 'default', row: 0, frameCount: 1, fps: 10, loop: true };
      } else if (trimmedTargetAnimName === 'idle') {
        foundAnim = targetSprite.animations[0];
      }
    }

    return foundAnim ? {
      anim: { ...foundAnim, frameCount: foundAnim.frameCount || 1, fps: foundAnim.fps || 10 },
      sprite: targetSprite
    } : null;
  }, [sprite, localAnimState, obj?.animations, obj?.appearance?.animationState, override, sprites]);

  // Sync animation data to shared values for the UI thread
  useEffect(() => {
    if (activeState?.anim) {
      animFrameCount.value = activeState.anim.frameCount || 1;
      animRow.value = activeState.anim.row || 0;
      animFps.value = activeState.anim.fps || 10;
      animLoop.value = activeState.anim.loop !== false;
      hasAnim.value = true;
    } else {
      animFrameCount.value = 1;
      animRow.value = 0;
      animFps.value = 10;
      animLoop.value = true;
      hasAnim.value = false;
    }
  }, [activeState]);

  const currentSprite = activeState?.sprite || sprite;

  // Pre-calculate image dimensions for the spritesheet to avoid .value access in render
  const sheetDimensions = useMemo(() => {
    if (!currentSprite) return { w: 0, h: 0 };
    const fw = Math.max(1, currentSprite.grid?.frameWidth || width || 32);
    const fh = Math.max(1, currentSprite.grid?.frameHeight || height || 32);
    const fc = activeState?.anim?.frameCount || 1;

    const baseW = imgDimensions.w || currentSprite.width || (fw * fc);
    const baseH = imgDimensions.h || currentSprite.height || fh;

    return {
      w: baseW * (width / fw),
      h: baseH * (height / fh)
    };
  }, [imgDimensions, currentSprite, activeState?.anim?.frameCount, width, height]);

  useEffect(() => {
    if (!currentSprite) return;
    if (currentSprite.uri) {
      if (currentSprite.width && currentSprite.height) {
        setImgDimensions({ w: currentSprite.width, h: currentSprite.height });
        setCurrentDimId(currentSprite.id);
      } else {
        Image.getSize(currentSprite.uri, (w, h) => {
          setImgDimensions({ w, h });
          setCurrentDimId(currentSprite.id);
        });
      }
    } else if (currentSprite.pixels) {
      const h = currentSprite.pixels.length;
      const w = currentSprite.pixels[0]?.length || 0;
      setImgDimensions({ w, h });
      setCurrentDimId(currentSprite.id);
    }
  }, [currentSprite?.uri, currentSprite?.id]);

  // Per-instance interval removed in favor of global worklet timer

  useEffect(() => {
    if (isRemote && onFetch) {
      if (!sprite && spriteId) {
        onFetch(spriteId, (obj?.appearance?.type as 'sprite' | 'animation') || 'sprite');
      }
      // Also fetch repeater sprites if needed
      if (obj?.behavior === 'sprite_repeater' && obj?.sprite_repeater) {
        const sr = obj.sprite_repeater;
        if (sr.activeSpriteId && !sprites?.find(s => s.id === sr.activeSpriteId)) {
          onFetch(sr.activeSpriteId, 'sprite');
        }
        if (sr.inactiveSpriteId && !sprites?.find(s => s.id === sr.inactiveSpriteId)) {
          onFetch(sr.inactiveSpriteId, 'sprite');
        }
      }
    }
  }, [sprite, spriteId, isRemote, obj?.behavior, obj?.sprite_repeater, sprites?.length]);

  const col = obj?.physics?.collision;
  const offsetX = col?.offsetX || 0;
  const offsetY = col?.offsetY || 0;
  const scale = obj?.physics?.scale || 1;
  const colW = (col?.type === 'circle' ? (col.radius || width / 2) * 2 : (col?.width || width));
  const colH = (col?.type === 'circle' ? (col.radius || width / 2) * 2 : (col?.height || height));

  const ySortOffset = obj?.appearance?.ySortOffset || 0;
  const colWVal = colW;
  const colHVal = colH;
  const scaleVal = scale;
  const offsetXVal = offsetX;
  const offsetYVal = offsetY;
  const layerIndexVal = layerIndex || 0;
  const ySortEnabled = ySort;
  const ySortAmt = ySortAmount || 0;
  const heightVal = height;

  const animatedStyle = useAnimatedStyle(() => {
    if (!sv || !sv.x || !sv.y) return { display: 'none' as const };

    let tx = sv.x.value;
    let ty = sv.y.value;

    if (isHUD) {
      tx += cameraX.value;
      ty += cameraY.value;
    }

    const currentScale = sv.scale ? sv.scale.value : scaleVal;

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${sv.rot.value}rad` },
        { scaleX: (sv.flipX ? sv.flipX.value : 1) * currentScale },
        { scaleY: currentScale },
        { translateX: -offsetXVal },
        { translateY: -offsetYVal }
      ],
      display: isVisible.value ? 'flex' : 'none',
      borderColor: debug ? (sv.isColliding?.value ? '#ff0000' : '#00ff00') : 'transparent',
      zIndex: (layerIndexVal * 10000) + (ySortEnabled ? Math.floor(ty + heightVal * currentScale + ySortAmt + ySortOffset) : 0),
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (!hasAnim.value || !currentSprite?.grid?.enabled) return {};
    const frameWidth = Math.max(1, currentSprite.grid.frameWidth || width);
    const frameHeight = Math.max(1, currentSprite.grid.frameHeight || height);
    const scaleW = width / frameWidth;
    const scaleH = height / frameHeight;

    return {
      transform: [
        { translateX: -frameIndex.value * frameWidth * scaleW },
        { translateY: -animRow.value * frameHeight * scaleH }
      ],
    };
  });

  const debugBoxStyle = useAnimatedStyle(() => {
    if (!debug || !sv?.isColliding) return { display: 'none' as const };
    return {
      borderColor: sv.isColliding.value ? '#ff0000' : '#00ff00',
      backgroundColor: sv.isColliding.value ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 255, 0, 0.2)',
    };
  });

  const bmpUri = useMemo(() => {
    if (!currentSprite) return null;
    if (currentSprite.type === 'imported') return currentSprite.uri;
    if (!currentSprite.pixels) return null;
    return pixelsToBmp(currentSprite.pixels, currentSprite.id, width, height);
  }, [currentSprite?.id, currentSprite?.uri, width, height]);

  // ── Gesture refs & gesture object MUST be declared here, BEFORE any
  // ── conditional hooks (useAnimatedStyle inside progress_bar block) to
  // ── keep React hook ordering stable across all render paths.
  const startDragX = useRef(0);
  const startDragY = useRef(0);

  const hasDrag = obj?.logic?.listeners?.some((l: any) => l.eventId === 'on_drag') ?? false;
  const hasGesture = !!onTap || hasDrag;

  const bodyGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .onStart((_e) => {
        if (startDragX) startDragX.current = sv?.x?.value ?? 0;
        if (startDragY) startDragY.current = sv?.y?.value ?? 0;
      })
      .onUpdate((e) => {
        const tx = (startDragX?.current ?? 0) + e.translationX;
        const ty = (startDragY?.current ?? 0) + e.translationY;
        DeviceEventEmitter.emit('builtin_drag', {
          targetId: instanceId || sv?.id || obj?.id,
          x: tx + width / 2,
          y: ty + height / 2
        });
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onStart(() => {
        if (onTap) onTap();
      });

    return Gesture.Simultaneous(pan, tap);
  }, [sv, width, height, onTap, obj?.id, instanceId]);

  let content: React.ReactNode = null;
  const livePb = liveOverride?.progress_bar || obj?.progress_bar;
  if (obj?.behavior === 'progress_bar' && livePb) {
    const pb = livePb;
    const pbValue = sv?.pbValue;

    const pbMin = pb.minValue;
    const pbMax = pb.maxValue;
    const pbDir = pb.direction;

    const fillStyle = useAnimatedStyle(() => {
      if (!pbValue) return { width: 0, height: 0 };
      const val = Math.max(pbMin, Math.min(pbMax, pbValue.value));
      const ratio = pbMax > pbMin ? (val - pbMin) / (pbMax - pbMin) : 0;

      if (pbDir === 'horizontal') {
        return { width: `${ratio * 100}%`, height: '100%' };
      } else if (pbDir === 'vertical') {
        return { height: `${ratio * 100}%`, width: '100%', position: 'absolute', bottom: 0 };
      } else if (pbDir === 'radial') {
        return { width: '100%', height: '100%', transform: [{ scale: ratio }], borderRadius: 999 };
      }
      return { width: 0, height: 0 };
    });

    content = (
      <View style={{
        width,
        height,
        backgroundColor: pb.backgroundColor || 'rgba(0,0,0,0.5)',
        borderRadius: pb.direction === 'radial' ? Math.min(width, height) / 2 : 2,
        overflow: 'hidden',
        borderWidth: pb.borderWidth !== undefined ? pb.borderWidth : 1,
        borderColor: pb.borderColor || '#555'
      }}>
        {bmpUri && (
          <Image source={{ uri: bmpUri }} style={{ width: '100%', height: '100%', position: 'absolute' }} resizeMode="stretch" resizeMethod="scale" />
        )}
        <Animated.View style={[{
          backgroundColor: pb.fillColor || '#4facfe',
          position: 'absolute',
          bottom: 0,
          left: 0
        }, fillStyle]} />
      </View>
    );
  } else if (obj?.behavior === 'sprite_repeater' && (liveOverride?.sprite_repeater || obj?.sprite_repeater)) {
    const sr = liveOverride?.sprite_repeater || obj?.sprite_repeater;
    let count = sr.currentCount;
    if (sr.linkedVariable) {
      const globalKey = varKeysMap?.[sr.linkedVariable.trim().toLowerCase()];
      if (globalKey && variables) {
        count = Number(variables[globalKey]) || 0;
      }
    }
    const icons = [];
    // Treat the object's width/height as the size for ONE icon, then repeat it
    const fillIconW = width;
    const fillIconH = height;

    for (let i = 0; i < sr.maxCount; i++) {
      const isActive = i < count;
      const spriteId = isActive ? sr.activeSpriteId : sr.inactiveSpriteId;
      const sprite = (sprites || []).find(s => s.id === spriteId);

      const uri = sprite ? (sprite.type === 'imported' ? sprite.uri : pixelsToBmp(sprite.pixels || [], sprite.id, Math.round(fillIconW), Math.round(fillIconH))) : null;

      icons.push(
        <View key={i} style={{ width: fillIconW, height: fillIconH, backgroundColor: !uri ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
          {uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" resizeMethod="scale" />}
        </View>
      );
    }

    const totalW = sr.layout === 'horizontal' ? (fillIconW * sr.maxCount + sr.spacing * (sr.maxCount - 1)) : fillIconW;
    const totalH = sr.layout === 'vertical' ? (fillIconH * sr.maxCount + sr.spacing * (sr.maxCount - 1)) : fillIconH;

    content = (
      <View style={{
        flexDirection: sr.layout === 'horizontal' ? 'row' : 'column',
        gap: sr.spacing,
        flexWrap: 'nowrap',
        alignItems: 'center',
        justifyContent: 'center',
        width: totalW,
        height: totalH
      }}>
        {icons}
      </View>
    );
  } else if (obj?.behavior === 'tilemap') {
    const gs = currentSprite?.grid?.frameWidth || 32;

    content = (
      <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
        {parsedTileEntries.map(({ key, c, r, tileIndex }) => {
          if (!currentSprite?.grid?.enabled) {
            return (
              <View
                key={key}
                style={{
                  position: 'absolute',
                  left: c * gs,
                  top: r * gs,
                  width: gs,
                  height: gs,
                }}
              >
                {bmpUri && <Image source={{ uri: bmpUri }} style={{ width: gs, height: gs }} />}
              </View>
            );
          }

          const fw = currentSprite.grid.frameWidth || gs;
          const fh = currentSprite.grid.frameHeight || gs;
          const sheetW = imgDimensions.w || currentSprite.width || 256;
          const cols = Math.floor(sheetW / fw) || 1;

          const tileRow = Math.floor(tileIndex / cols);
          const tileCol = tileIndex % cols;

          const leftOffset = -tileCol * gs;
          const topOffset = -tileRow * gs;

          return (
            <View
              key={key}
              style={{
                position: 'absolute',
                left: c * gs,
                top: r * gs,
                width: gs,
                height: gs,
                overflow: 'hidden',
              }}
            >
              {bmpUri && (
                <Image
                  source={{ uri: bmpUri }}
                  style={{
                    width: (sheetW / fw) * gs,
                    height: ((imgDimensions.h || currentSprite.height || 256) / fh) * gs,
                    position: 'absolute',
                    left: leftOffset,
                    top: topOffset,
                  }}
                  resizeMode="stretch"
                  resizeMethod="scale"
                />
              )}
            </View>
          );
        })}
      </View>
    );
  } else if (bmpUri && !obj?.text) {
    content = (currentSprite?.grid?.enabled) ? (
      (currentDimId !== currentSprite.id) ? null : (
        <View style={{ width, height, overflow: 'hidden' }}>
          <Animated.Image
            source={{ uri: bmpUri }}
            style={[
              {
                width: sheetDimensions.w,
                height: sheetDimensions.h,
                position: 'absolute',
                left: 0,
                top: 0,
              },
              imageAnimatedStyle
            ]}
            resizeMode="stretch"
            resizeMethod="scale"
          />
        </View>
      )
    ) : sprite?.crop ? (
      <View style={{ width, height, overflow: 'hidden' }}>
        <Image
          source={{ uri: bmpUri }}
          style={{
            width: (sprite.width || width) * (width / sprite.crop.width),
            height: (sprite.height || height) * (height / sprite.crop.height),
            position: 'absolute',
            left: -sprite.crop.x * (width / sprite.crop.width),
            top: -sprite.crop.y * (height / sprite.crop.height),
          }}
          resizeMode="stretch"
          resizeMethod="scale"
        />
      </View>
    ) : (
      <Image
        source={{ uri: bmpUri }}
        style={{ width, height }}
        resizeMode="stretch"
        resizeMethod="scale"
      />
    );
  } else if (obj?.text || override?.text) {
    const textData = override?.text || obj.text;
    content = (
      <View style={{
        width,
        height,
        justifyContent: 'center',
        alignItems: textData.textAlign === 'center' ? 'center' : textData.textAlign === 'right' ? 'flex-end' : 'flex-start'
      }}>
        <DynamicTextNode
          content={textData.content}
          variables={variables}
          localVariables={localVariables}
          lowerMap={varKeysMap}
          tapX={tapX}
          tapY={tapY}
          style={{
            color: textData.color || '#FFF',
            fontSize: textData.fontSize || 16,
            fontFamily: textData.fontFamily === 'pixel' ? 'Pixel' : undefined,
            textAlign: textData.textAlign,
            backgroundColor: textData.backgroundColor,
            paddingX: textData.paddingX,
            paddingY: textData.paddingY,
            borderRadius: textData.borderRadius,
          }}
        />
      </View>
    );
  } else {
    content = obj?.isHUD ? null : (
      <View style={{ width, height, backgroundColor: '#333', borderRadius: 4, borderWidth: 1, borderColor: '#555', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666', fontSize: 8 }}>?</Text>
      </View>
    );
  }

  const innerView = (
    <Animated.View style={[styles.instance, animatedStyle, { width, height }]} pointerEvents={hasGesture ? 'auto' : 'none'}>
      {content}
      {debug && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 9999,
              borderWidth: 1.5,
              borderRadius: obj?.physics?.collision?.type === 'circle' ? 9999 : 2,
              width: colW,
              height: colH,
              left: (width / 2) - (colW / 2) + offsetX,
              top: (height / 2) - (colH / 2) + offsetY,
            },
            debugBoxStyle
          ]}
        />
      )}
      {debug && (
        <View
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#FFF',
            left: (width / 2) + offsetX - 2,
            top: (height / 2) + offsetY - 2,
            zIndex: 10000,
          }}
        />
      )}
    </Animated.View>
  );

  if (hasGesture) {
    return (
      <GestureDetector gesture={bodyGesture}>
        {innerView}
      </GestureDetector>
    );
  }

  return innerView;
};

const PhysicsBody = React.memo(PhysicsBodyInner, (prev, next) => {
  // 1. Check if it's a new object or structure
  if (prev.instanceId !== next.instanceId) return false;
  if (prev.obj?.id !== next.obj?.id) return false;
  if (prev.nonce !== next.nonce) return false;
  if (prev.spriteId !== next.spriteId) return false;

  // 2. Deep check SV values to handle mock objects in GUIRenderer safely
  if (prev.sv && next.sv) {
    if (prev.sv === next.sv) {
      // If shared value references are identical, the position/rotation updates
      // are handled natively by Reanimated (UI thread). We do NOT need to re-render.
      // This avoids reading .value during component render, preventing the Reanimated warning!
    } else {
      // If they are different references (e.g. static GUI renderer mock objects, or restarted / swapped instances):
      // Check if they are real shared values. If they are real shared values, since the references are different,
      // we must re-render to bind the new shared values.
      const isSharedValue = (val: any) => !!(val && val._isReanimatedSharedValue === true);
      if (isSharedValue(prev.sv.x)) {
        return false; // Different shared values -> re-render
      }

      // If they are NOT real shared values (i.e. static GUI mock objects from GUIRenderer), we can safely compare their values.
      if (prev.sv.x.value !== next.sv.x.value) return false;
      if (prev.sv.y.value !== next.sv.y.value) return false;
      if (prev.sv.rot.value !== next.sv.rot.value) return false;
      if (prev.sv.flipX?.value !== next.sv.flipX?.value) return false;
    }
  } else if (prev.sv !== next.sv) return false;

  // 3. Static props
  if (prev.width !== next.width || prev.height !== next.height) return false;
  if (prev.name !== next.name) return false;
  if (prev.forceNoHUD !== next.forceNoHUD) return false;
  if (prev.ySort !== next.ySort || prev.ySortAmount !== next.ySortAmount) return false;

  // 4. Variables - check if reference changed (throttled at 30fps)
  if (prev.variables !== next.variables) return false;
  if (prev.localVariables !== next.localVariables) return false;

  // 5. Live logic state overrides - check values deep because refs may be mutated
  if (prev.liveOverride?.progress_bar?.currentValue !== next.liveOverride?.progress_bar?.currentValue) return false;
  if (prev.liveOverride?.sprite_repeater?.currentCount !== next.liveOverride?.sprite_repeater?.currentCount) return false;
  if (prev.liveOverride?.health?.current !== next.liveOverride?.health?.current) return false;
  if (prev.liveOverride !== next.liveOverride) return false;

  // 6. Debug mode
  if (prev.debug !== next.debug) return false;

  return true;
});

const GUIRenderer = React.memo(({
  nodes, objectMap, spriteMap, allSprites, parentX = 0, parentY = 0,
  variables, localVariables, varKeysMap, nonce, globalFrameTimer,
  cameraX, cameraY, cameraZoom, gameWidth, gameHeight, handleFetchAsset, restartKey,
  tapX, tapY, debug
}: any) => {
  return (
    <>
      {nodes.map((node: any) => {
        const obj = objectMap.get(node.objectId);
        if (!obj) return null;

        const absoluteX = parentX + (node.x || 0);
        const absoluteY = parentY + (node.y || 0);

        // We create a static sv for GUI nodes
        const sv = {
          x: { value: absoluteX },
          y: { value: absoluteY },
          rot: { value: 0 },
          isColliding: { value: 0 },
          flipX: { value: 1 },
          pbValue: { value: obj.progress_bar?.currentValue || 0 }
        };

        return (
          <React.Fragment key={node.id}>
            <PhysicsBody
              instanceId={node.id}
              sprite={spriteMap.get(obj.appearance?.spriteId || '')}
              spriteId={obj.appearance?.spriteId}
              sv={sv}
              width={node.width || obj.width || 32}
              height={node.height || obj.height || 32}
              name={node.name || obj.name}
              variables={(obj.text || obj.behavior === 'sprite_repeater' || obj.behavior === 'progress_bar') ? variables : undefined}
              nonce={nonce}
              localVariables={(obj.text || obj.behavior === 'sprite_repeater' || obj.behavior === 'progress_bar') ? localVariables?.[node.id] : undefined}
              varKeysMap={varKeysMap}
              obj={obj}
              liveOverride={{
                health: node._logicState?.health,
                sprite_repeater: node._logicState?.sprite_repeater,
                progress_bar: node._logicState?.progress_bar
              }}
              forceNoHUD={true} // Explicitly disable HUD compensation in screen-space overlay
              sprites={allSprites}
              onFetch={handleFetchAsset}
              onTap={() => {
                DeviceEventEmitter.emit('builtin_tap', { targetId: node.id });
                if (obj.logic?.triggers?.onTap) {
                  DeviceEventEmitter.emit(obj.logic.triggers.onTap);
                }
              }}
              globalFrameTimer={globalFrameTimer}
              cameraX={cameraX}
              cameraY={cameraY}
              cameraZoom={cameraZoom}
              gameWidth={gameWidth}
              gameHeight={gameHeight}
              tapX={tapX}
              tapY={tapY}
              debug={debug} />
            {node.children && node.children.length > 0 && (
              <GUIRenderer
                nodes={node.children}
                objectMap={objectMap}
                spriteMap={spriteMap}
                allSprites={allSprites}
                parentX={absoluteX}
                parentY={absoluteY}
                variables={variables}
                localVariables={localVariables}
                varKeysMap={varKeysMap}
                nonce={nonce}
                globalFrameTimer={globalFrameTimer}
                cameraX={cameraX}
                cameraY={cameraY}
                cameraZoom={cameraZoom}
                gameWidth={gameWidth}
                gameHeight={gameHeight}
                handleFetchAsset={handleFetchAsset}
                restartKey={restartKey}
                tapX={tapX}
                tapY={tapY}
                debug={debug}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}, (prev, next) => {
  // If variables changed, we only re-render if the nonce changed (batched)
  // or if the nodes themselves changed.
  if (prev.nonce !== next.nonce) return false;
  if (prev.nodes !== next.nodes) return false;
  if (prev.parentX !== next.parentX || prev.parentY !== next.parentY) return false;
  if (prev.restartKey !== next.restartKey) return false;

  // Only re-render tree if variables changed AND we are not in a high-freq loop
  // Actually, PhysicsBody handles variable changes, so we can be very conservative here.
  if (prev.variables !== next.variables) return false;
  if (prev.debug !== next.debug) return false;

  return true;
});



const MicroSparkline = React.memo(({ history, color = '#00ff66', max = 5 }: { history: number[], color?: string, max?: number }) => {
  return (
    <View style={styles.sparklineContainer}>
      {history.map((val, idx) => {
        const hPct = Math.min(100, Math.max(10, (val / max) * 100));
        return (
          <View
            key={idx}
            style={[
              styles.sparklineBar,
              {
                height: `${hPct}%`,
                backgroundColor: color,
              }
            ]}
          />
        );
      })}
    </View>
  );
});

const MatterStatsPanel = React.memo(({ stats, utHistory, rtHistory }: { stats: any, utHistory: number[], rtHistory: number[] }) => {
  return (
    <View style={styles.matterStatsContainer}>
      {/* Top Row: Entity Counts */}
      <View style={styles.matterStatsGrid}>
        <View style={styles.matterStatsCol}>
          <Text style={styles.matterStatsLabel}>Part</Text>
          <Text style={styles.matterStatsValue}>{stats.partCount}</Text>
        </View>
        <View style={styles.matterStatsCol}>
          <Text style={styles.matterStatsLabel}>Body</Text>
          <Text style={stats.bodyCount > 100 ? [styles.matterStatsValue, { color: '#ff4d4d' }] : styles.matterStatsValue}>{stats.bodyCount}</Text>
        </View>
        <View style={styles.matterStatsCol}>
          <Text style={styles.matterStatsLabel}>Cons</Text>
          <Text style={styles.matterStatsValue}>{stats.consCount}</Text>
        </View>
        <View style={styles.matterStatsCol}>
          <Text style={styles.matterStatsLabel}>Comp</Text>
          <Text style={styles.matterStatsValue}>{stats.compCount}</Text>
        </View>
        <View style={styles.matterStatsCol}>
          <Text style={styles.matterStatsLabel}>Pair</Text>
          <Text style={stats.pairCount > 150 ? [styles.matterStatsValue, { color: '#ff9f43' }] : styles.matterStatsValue}>{stats.pairCount}</Text>
        </View>
      </View>

      {/* Bottom Row: Performance indicators */}
      <View style={styles.matterStatsRow}>
        <View style={styles.matterIndicatorItem}>
          <View style={[styles.matterIndicatorDot, { backgroundColor: stats.fps < 45 ? '#ff4d4d' : '#00ff66' }]} />
          <Text style={styles.matterIndicatorText}>{stats.fps} fps</Text>
        </View>
        <View style={styles.matterIndicatorItem}>
          <View style={[styles.matterIndicatorDot, { backgroundColor: stats.dt > 25 ? '#ff9f43' : '#00ff66' }]} />
          <Text style={styles.matterIndicatorText}>{stats.dt.toFixed(2)} dt</Text>
        </View>
        <View style={styles.matterIndicatorItem}>
          <View style={[styles.matterIndicatorDot, { backgroundColor: '#00ff66' }]} />
          <Text style={styles.matterIndicatorText}>{stats.upf} upf</Text>
        </View>
        <View style={styles.matterIndicatorItem}>
          <View style={[styles.matterIndicatorDot, { backgroundColor: stats.ut > 10 ? '#ff4d4d' : stats.ut > 5 ? '#ff9f43' : '#00ff66' }]} />
          <Text style={styles.matterIndicatorText}>{stats.ut.toFixed(2)} ut</Text>
          <MicroSparkline history={utHistory} color={stats.ut > 10 ? '#ff4d4d' : stats.ut > 5 ? '#ff9f43' : '#00ff66'} max={8} />
        </View>
        <View style={styles.matterIndicatorItem}>
          <View style={[styles.matterIndicatorDot, { backgroundColor: stats.rt > 10 ? '#ff4d4d' : stats.rt > 5 ? '#ff9f43' : '#00ff66' }]} />
          <Text style={styles.matterIndicatorText}>{stats.rt.toFixed(2)} rt</Text>
          <MicroSparkline history={rtHistory} color={stats.rt > 10 ? '#ff4d4d' : stats.rt > 5 ? '#ff9f43' : '#00ff66'} max={8} />
        </View>
        <View style={styles.matterIndicatorItem}>
          <View style={[styles.matterIndicatorDot, { backgroundColor: '#00ff66' }]} />
          <Text style={styles.matterIndicatorText}>{stats.timeScale.toFixed(2)} x</Text>
        </View>
      </View>
    </View>
  );
});

const FPSCounter = React.memo(({ fps }: { fps: SharedValue<number> }) => {
  const [displayFps, setDisplayFps] = useState(0);

  useAnimatedReaction(
    () => fps.value,
    (val) => {
      runOnJS(setDisplayFps)(Math.round(val));
    }
  );

  return (
    <View style={styles.fpsOverlay}>
      <Text style={styles.fpsText}>{displayFps} FPS</Text>
    </View>
  );
});

const ZoomIndicator = React.memo(({ zoom, camX, camY, enabled, roomW, roomH, gameW, gameH, targetName, inSidebar }: {
  zoom: SharedValue<number>,
  camX: SharedValue<number>,
  camY: SharedValue<number>,
  enabled: boolean,
  roomW: number,
  roomH: number,
  gameW: number,
  gameH: number,
  targetName: string,
  inSidebar?: boolean
}) => {
  const [displayZoom, setDisplayZoom] = useState(1);
  const [displayX, setDisplayX] = useState(0);
  const [displayY, setDisplayY] = useState(0);

  useAnimatedReaction(() => zoom.value, (val) => runOnJS(setDisplayZoom)(val));
  useAnimatedReaction(() => camX.value, (val) => runOnJS(setDisplayX)(val));
  useAnimatedReaction(() => camY.value, (val) => runOnJS(setDisplayY)(val));

  if (inSidebar) {
    return (
      <View style={{ gap: 4 }}>
        <View style={styles.debugVarRow}>
          <Text style={styles.debugLabel}>CAMERA</Text>
          <Text style={styles.debugVarVal}>{enabled ? `${displayZoom.toFixed(1)}x` : 'OFF'}</Text>
        </View>
        <View style={styles.debugVarRow}>
          <Text style={styles.debugLabel}>POSITION</Text>
          <Text style={styles.debugVarVal}>{Math.round(displayX)}, {Math.round(displayY)}</Text>
        </View>
        <View style={styles.debugVarRow}>
          <Text style={styles.debugLabel}>VIEWPORT</Text>
          <Text style={styles.debugVarVal}>{gameW}x{gameH}</Text>
        </View>
        {enabled && (
          <View style={styles.debugVarRow}>
            <Text style={styles.debugLabel}>FOLLOWING</Text>
            <Text style={styles.debugVarVal}>{targetName || '???'}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fpsOverlay}>
      <Text style={[styles.fpsText, { width: 'auto', minWidth: 100 }]}>
        {enabled ? `CAM: ${displayZoom.toFixed(1)}x` : 'CAM: OFF'}
        {` | Room: ${roomW}x${roomH} | View: ${gameW}x${gameH}`}
        {enabled && ` | Following: ${targetName || '???'}`}
        {enabled && ` | Cam: (${Math.round(displayX)}, ${Math.round(displayY)})`}
      </Text>
    </View>
  );
});

const LayerTilemapRenderer = React.memo(({ tileData, tilesetSprite, gridSize }: { tileData: any; tilesetSprite: any; gridSize: number }) => {
  const parsedTiles = useMemo(() => {
    const data = tileData || {};
    return Object.entries(data).map(([key, value]) => {
      const commaIndex = key.indexOf(',');
      let col = 0;
      let row = 0;
      if (commaIndex !== -1) {
        col = parseInt(key.substring(0, commaIndex), 10);
        row = parseInt(key.substring(commaIndex + 1), 10);
      }
      return {
        key,
        col,
        row,
        tileIndex: parseInt(value as string, 10)
      };
    });
  }, [tileData]);

  return (
    <>
      {parsedTiles.map((tile) => (
        <View
          key={tile.key}
          style={{
            position: 'absolute',
            left: tile.col * gridSize,
            top: tile.row * gridSize,
            width: gridSize,
            height: gridSize,
          }}
        >
          <PixelSprite
            sprite={tilesetSprite}
            size={gridSize}
            originalSize={true}
            frameIndex={tile.tileIndex}
          />
        </View>
      ))}
    </>
  );
});

export default function GamePlayer({ visible, onClose, projectOverride, debug }: { visible: boolean; onClose: () => void; projectOverride?: any; debug?: boolean }) {
  const storeProject = useProjectStore(s => s.activeProject);
  const activeRoomId = useProjectStore(s => s.activeRoomId);
  const fetchRemoteAsset = useProjectStore(s => s.fetchRemoteAsset);
  const streamedSprites = useProjectStore(s => s.streamedSprites);
  const addStreamedSprite = useProjectStore(s => s.addStreamedSprite);
  const currentProject = projectOverride || storeProject;
  const [roomOverride, setRoomOverride] = useState<string | null>(null);

  // Get the room being edited, or fall back to the first room
  const currentRoom = useMemo(() => {
    if (!currentProject?.rooms) return null;
    const targetId = roomOverride || activeRoomId || currentProject.mainRoomId;
    return currentProject.rooms.find(r => r.id === targetId) || currentProject.rooms[0];
  }, [currentProject, activeRoomId, roomOverride]);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Calculate scaling to fit screen
  // If camera is enabled, we use a reference resolution (800x600) to allow scrolling.
  // If disabled, we fit the entire room on screen.
  const roomWidth = currentRoom?.width || 800;
  const roomHeight = currentRoom?.height || 600;
  const camEnabled = !!currentRoom?.settings?.camera?.enabled;

  // Viewport size matches room size exactly as requested
  const gameWidth = roomWidth;
  const gameHeight = roomHeight;

  const scale = Math.min(screenWidth / gameWidth, screenHeight / gameHeight);

  const [restartKey, setRestartKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showDebugSidebar, setShowDebugSidebar] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [lasers, setLasers] = useState<Array<{ id: string; startX: number; startY: number; endX: number; endY: number; color: string }>>([]);
  const [physicsStats, setPhysicsStats] = useState({
    partCount: 0,
    bodyCount: 0,
    consCount: 0,
    compCount: 0,
    pairCount: 0,
    fps: 0,
    dt: 0,
    upf: 1,
    ut: 0,
    rt: 0,
    timeScale: 1.0,
  });
  const [utHistory, setUtHistory] = useState<number[]>(new Array(10).fill(0));
  const [rtHistory, setRtHistory] = useState<number[]>(new Array(10).fill(0));
  const varCooldowns = useRef<Record<string, number>>({});
  const lastRestartRef = useRef(0);
  const pendingLoadRef = useRef<any>(null);
  const lasersRef = useRef<any[]>([]);
  const lastLoadTimeRef = useRef(0);
  const lastSaveTimeRef = useRef(0);

  // Calculate initial camera position based on target to avoid "jump" on first frame
  const initialCamPos = useMemo(() => {
    const cam = currentRoom?.settings?.camera;
    if (!cam?.enabled) return { x: 0, y: 0 };

    const targetId = cam.targetId || cam.targetObjectId;
    let targetInst = currentRoom.instances?.find(i => i.id === targetId || i.objectId === targetId);

    // Fallback to finding a player object if no specific target is set or found
    if (!targetInst) {
      targetInst = currentRoom.instances?.find(i => {
        const obj = currentProject?.objects?.find(o => o.id === i.objectId);
        return obj?.behavior === 'player' || obj?.name?.toLowerCase().includes('player');
      });
    }

    if (targetInst) {
      const zoom = cam.zoom || 1;
      // Reference viewport dimensions used in the game loop
      const rw = currentRoom?.width || 800;
      const rh = currentRoom?.height || 600;
      const gw = Math.min(rw, 800);
      const gh = Math.min(rh, 600);
      const vw = gw / zoom;
      const vh = gh / zoom;

      const obj = currentProject?.objects?.find(o => o.id === targetInst.objectId);
      const w = obj?.width || targetInst.width || 32;
      const h = obj?.height || targetInst.height || 32;

      return {
        x: (targetInst.x + w / 2) - vw / 2,
        y: (targetInst.y + h / 2) - vh / 2
      };
    }
    return { x: 0, y: 0 };
  }, [currentRoom?.id, restartKey]);

  // Camera shared values — updated in the game loop, drive canvas translation
  const cameraX = useSharedValue(initialCamPos.x);
  const cameraY = useSharedValue(initialCamPos.y);
  const cameraZoom = useSharedValue(currentRoom?.settings?.camera?.zoom || 1);
  const cameraRef = useRef({ x: initialCamPos.x, y: initialCamPos.y });
  const tapX = useSharedValue(0);
  const tapY = useSharedValue(0);

  // Keep cameraZoom in sync with component state
  useEffect(() => {
    cameraZoom.value = currentRoom?.settings?.camera?.zoom || 1;
  }, [currentRoom?.settings?.camera?.zoom, currentRoom?.id]);

  const scalerAnimStyle = useAnimatedStyle(() => {
    const totalScale = scale * cameraZoom.value;
    // Compensation for React Native's center-origin scaling
    const offX = (roomWidth * totalScale - roomWidth) / 2;
    const offY = (roomHeight * totalScale - roomHeight) / 2;
    return {
      transform: [
        { translateX: offX },
        { translateY: offY },
        { scale: totalScale },
      ]
    };
  });

  const cameraAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -cameraX.value },
        { translateY: -cameraY.value },
      ]
    };
  });

  const guiScalerStyle = useAnimatedStyle(() => {
    // HUD overlay uses the base room scale but typically skips camera zoom
    const offX = (roomWidth * scale - roomWidth) / 2;
    const offY = (roomHeight * scale - roomHeight) / 2;
    return {
      transform: [
        { translateX: offX },
        { translateY: offY },
        { scale: scale },
      ]
    };
  });

  const [dynamicElements, setDynamicElements] = useState<{
    gameObject: any; id: string; sprite: any; sv: any; width: number; height: number; name: string; layerIndex: number; isRoomInstance?: boolean;
  }[]>([]);
  const [guiInstances, setGuiInstances] = useState<any[]>([]);

  // Streaming state
  const [streamedAnimations, setStreamedAnimations] = useState<Map<string, any>>(new Map());

  const handleFetchAsset = useCallback(async (id: string, type: 'sprite' | 'animation' = 'sprite') => {
    if (type === 'sprite' && streamedSprites.has(id)) return;
    if (type === 'animation' && streamedAnimations.has(id)) return;

    try {
      const data = await fetchRemoteAsset(id);
      if (type === 'animation') {
        setStreamedAnimations(prev => new Map(prev).set(id, data));
        if (data.frames) {
          data.frames.forEach((fId: string) => handleFetchAsset(fId, 'sprite'));
        }
      } else {
        addStreamedSprite(id, data);
      }
    } catch (err) {
      console.warn('Failed to stream asset:', id, err);
    }
  }, [fetchRemoteAsset, streamedSprites, streamedAnimations, addStreamedSprite]);

  // Combined sprite map for local + streamed
  const spriteMap = useMemo(() => {
    const map = new Map<string, any>();
    (currentProject?.sprites || []).forEach((s: any) => map.set(s.id, s));
    (streamedSprites || new Map()).forEach((s, id) => map.set(id, s));
    return map;
  }, [currentProject?.sprites, streamedSprites]);

  // High-performance lookups
  const objectMap = useMemo(() => {
    const map = new Map<string, GameObject>();
    (currentProject?.objects || []).forEach((o: GameObject) => map.set(o.id, o));
    return map;
  }, [currentProject?.objects]);

  const spriteMapRef = useRef(spriteMap);
  const objectMapRef = useRef(objectMap);
  useEffect(() => { spriteMapRef.current = spriteMap; }, [spriteMap]);
  useEffect(() => { objectMapRef.current = objectMap; }, [objectMap]);

  const instanceSharedValues = useMemo(() => {
    if (!currentRoom || !currentRoom.instances) return [];
    return (currentRoom.instances || []).map((inst: any) => {
      const obj = objectMap.get(inst.objectId);
      const defaultScale = obj?.physics?.scale ?? 1;
      return {
        x: makeMutable(inst.x || 0),
        y: makeMutable(inst.y || 0),
        rot: makeMutable((inst.angle || 0) * Math.PI / 180),
        isColliding: makeMutable(0),
        animState: makeMutable(0), // 0: idle, 1: move, 2: jump, 3: hit, 4: dead
        flipX: makeMutable(1),
        pbValue: makeMutable(0),
        scale: makeMutable(defaultScale),
        visible: makeMutable(obj?.visible !== false ? 1 : 0),
      };
    });
  }, [currentRoom?.id, currentRoom?.instances, objectMap, restartKey]);

  const [variables, setVariables] = useState<Record<string, number>>(currentProject?.variables?.global || { score: 0 });
  const variablesRef = useRef<Record<string, number>>(currentProject?.variables?.global || { score: 0 });
  const [localVariables, setLocalVariables] = useState<Record<string, Record<string, number>>>({});
  const localVariablesRef = useRef<Record<string, Record<string, number>>>({});
  const variablesDirtyRef = useRef<boolean>(false);
  const varKeysCache = useRef<{ keys: string[], lowerMap: Record<string, string> }>({ keys: [], lowerMap: {} });

  // Keep varKeysCache in sync for fast lookups
  useEffect(() => {
    const currentVarKeys = Object.keys(variables);
    if (varKeysCache.current.keys.length !== currentVarKeys.length) {
      const lowerMap: Record<string, string> = {};
      currentVarKeys.forEach(k => { lowerMap[k.toLowerCase()] = k; });
      varKeysCache.current = { keys: currentVarKeys, lowerMap };
    }
  }, [variables]);

  // Performance Optimization: Frame-based lookup indices
  const nameLookupRef = useRef<Map<string, Matter.Body>>(new Map());
  const behaviorLookupRef = useRef<Map<string, Matter.Body[]>>(new Map());

  const inputLeft = useRef(0);
  const inputRight = useRef(0);
  const inputUp = useRef(0);
  const inputDown = useRef(0);
  const inputJump = useRef(0);
  const inputShoot = useRef(0);
  const inputTap = useRef(0);
  const joystickData = useRef({ x: 0, y: 0, angle: 0, magnitude: 0 });
  const fpsShared = useSharedValue(60);
  const globalFrameTimer = useSharedValue(0);

  const allSprites = useMemo(() => [...(currentProject?.sprites || []), ...Array.from(streamedSprites.values())], [currentProject?.sprites, streamedSprites.size]);
  const allAnimations = useMemo(() => [...(currentProject?.animations || []), ...Array.from(streamedAnimations.values())], [currentProject?.animations, streamedAnimations.size]);

  const screenTapGesture = useMemo(() => Gesture.Tap()
    .runOnJS(true)
    .onStart((e) => {
      inputTap.current = 1;
      variablesRef.current.tap_x = e.x;
      variablesRef.current.tap_y = e.y;
      tapX.value = e.x;
      tapY.value = e.y;
      DeviceEventEmitter.emit('builtin_tap', { x: e.x, y: e.y });
      DeviceEventEmitter.emit('on_screen_tap', { x: e.x, y: e.y });
    }), [tapX, tapY]);

  const updateTapVars = useCallback((x: number, y: number) => {
    variablesRef.current.tap_x = x;
    variablesRef.current.tap_y = y;
  }, []);

  const screenPanGesture = useMemo(() => Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      tapX.value = e.x;
      tapY.value = e.y;
      runOnJS(updateTapVars)(e.x, e.y);
    })
    .onUpdate((e) => {
      tapX.value = e.x;
      tapY.value = e.y;
      runOnJS(updateTapVars)(e.x, e.y);
    }), [tapX, tapY, updateTapVars]);

  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  useEffect(() => {
    localVariablesRef.current = localVariables;
  }, [localVariables]);

  // Throttle React state updates to max 15/sec to avoid re-render storms
  const pendingVarFlush = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateGlobalVar = useCallback((name: string, amount: number | string, isSet: boolean = false, persist: boolean = true) => {
    const now = Date.now();
    const cooldownKey = `global_${name}`;
    if (!isSet && varCooldowns.current[cooldownKey] && now - varCooldowns.current[cooldownKey] < 50) return;
    varCooldowns.current[cooldownKey] = now;

    const currentVal = Number(variablesRef.current[name]) || 0;
    const numAmount = Number(amount) || 0;
    const newVal = isSet ? numAmount : currentVal + numAmount;
    variablesRef.current = { ...variablesRef.current, [name]: newVal };
    variablesDirtyRef.current = true;

    if (name === 'tap_x') tapX.value = newVal;
    if (name === 'tap_y') tapY.value = newVal;

    // Throttled UI flush: batch updates, max 30 renders/sec
    if (!pendingVarFlush.current) {
      pendingVarFlush.current = setTimeout(() => {
        pendingVarFlush.current = null;
        if (variablesDirtyRef.current) {
          setVariables({ ...variablesRef.current });
          setLocalVariables({ ...localVariablesRef.current });
          setNonce(n => n + 1);
          variablesDirtyRef.current = false;
        }
      }, 33); // ~30fps UI refresh
    }
  }, []);

  const updateLocalVar = useCallback((bodyId: string, name: string, amount: number | string, defaultVars: any, isSet: boolean = false) => {
    const now = Date.now();
    const cooldownKey = `local_${bodyId}_${name}`;
    if (!isSet && varCooldowns.current[cooldownKey] && now - varCooldowns.current[cooldownKey] < 50) return;
    varCooldowns.current[cooldownKey] = now;

    const current = localVariablesRef.current[bodyId] || { ...defaultVars };
    const currentVal = Number(current[name]) || 0;
    const numAmount = Number(amount) || 0;
    const newVal = isSet ? numAmount : currentVal + numAmount;
    localVariablesRef.current = {
      ...localVariablesRef.current,
      [bodyId]: { ...current, [name]: newVal }
    };
    variablesDirtyRef.current = true;

    if (name === 'tap_x') tapX.value = newVal;
    if (name === 'tap_y') tapY.value = newVal;

    // Throttled flush — same as global
    if (!pendingVarFlush.current) {
      pendingVarFlush.current = setTimeout(() => {
        pendingVarFlush.current = null;
        if (variablesDirtyRef.current) {
          setVariables({ ...variablesRef.current });
          setLocalVariables({ ...localVariablesRef.current });
          setNonce(n => n + 1);
          variablesDirtyRef.current = false;
        }
      }, 33);
    }
  }, []);

  const handleJoystickMove = useCallback((data: any) => {
    joystickData.current = data;

    // Sync to global variables for debug visibility
    variablesRef.current = {
      ...variablesRef.current,
      joystick_x: Number(data.x.toFixed(2)),
      joystick_y: Number(data.y.toFixed(2)),
      joystick_angle: Number(data.angle.toFixed(1)),
      joystick_magnitude: Number(data.magnitude.toFixed(2))
    };
    variablesDirtyRef.current = true;

    // Auto-map horizontal movement
    if (data.x < -0.3) {
      inputLeft.current = 1;
      inputRight.current = 0;
    } else if (data.x > 0.3) {
      inputLeft.current = 0;
      inputRight.current = 1;
    } else {
      inputLeft.current = 0;
      inputRight.current = 0;
    }

    // Auto-map vertical movement
    if (data.y < -0.3) {
      inputUp.current = 1;
      inputDown.current = 0;
    } else if (data.y > 0.3) {
      inputUp.current = 0;
      inputDown.current = 1;
    } else {
      inputUp.current = 0;
      inputDown.current = 0;
    }

    DeviceEventEmitter.emit('on_move', data);
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickData.current = { x: 0, y: 0, angle: 0, magnitude: 0 };
    variablesRef.current = {
      ...variablesRef.current,
      joystick_x: 0,
      joystick_y: 0,
      joystick_angle: 0,
      joystick_magnitude: 0
    };
    variablesDirtyRef.current = true;
    inputLeft.current = 0;
    inputRight.current = 0;
    inputUp.current = 0;
    inputDown.current = 0;
    DeviceEventEmitter.emit('on_release');
  }, []);

  const cameraTargetBodyRef = useRef<Matter.Body | null>(null);

  const [instanceOverrides, setInstanceOverrides] = useState<Record<string, { spriteId?: string, animName?: string }>>({});
  const instanceOverridesRef = useRef<Record<string, any>>({});
  const liveObjectsRef = useRef<Map<string, GameObject>>(new Map());
  const soundObjectsRef = useRef<Map<string, any>>(new Map());
  useEffect(() => { instanceOverridesRef.current = instanceOverrides; }, [instanceOverrides]);

  // Sync refs to state at a throttled rate for UI rendering (backup sync)
  useEffect(() => {
    if (!visible || !isPlaying) return;
    const interval = setInterval(() => {
      if (variablesDirtyRef.current) {
        setVariables({ ...variablesRef.current });
        setLocalVariables({ ...localVariablesRef.current });
        setNonce(n => n + 1);
        variablesDirtyRef.current = false;
      }
    }, 500); // Throttled to 500ms
    return () => clearInterval(interval);
  }, [visible, isPlaying]);

  const roomRef = useRef(currentRoom);
  const isPlayingRef = useRef(isPlaying);
  const [targetName, setTargetName] = useState('');
  // Update refs immediately during render so the game loop always has the freshest data
  roomRef.current = currentRoom;
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (!visible || !currentRoom) return;

    const isActiveRef = { current: true };
    let roomStartTime = Date.now();
    globalFrameTimer.value = 0; // Reset timer immediately on room start/restart

    inputLeft.current = 0;
    inputRight.current = 0;
    inputUp.current = 0;
    inputDown.current = 0;
    inputJump.current = 0;
    inputShoot.current = 0;
    inputTap.current = 0;
    cameraTargetBodyRef.current = null; // Reset camera target on room restart
    cameraX.value = initialCamPos.x;
    cameraY.value = initialCamPos.y;
    cameraRef.current = { x: initialCamPos.x, y: initialCamPos.y };
    setDynamicElements([]);
    setInstanceOverrides({});
    // Reset variables to defaults OR load from pending save
    if (pendingLoadRef.current) {
      const data = pendingLoadRef.current;
      variablesRef.current = { ...data.globals };
      setVariables({ ...data.globals });
      localVariablesRef.current = { ...data.locals };
      setLocalVariables({ ...data.locals });
      pendingLoadRef.current = null;
    } else {
      const defaultGlobals = { ...(currentProject?.variables?.global || {}) };
      variablesRef.current = defaultGlobals;
      setVariables(defaultGlobals);
      setLocalVariables({});
      localVariablesRef.current = {};
    }
    varCooldowns.current = {};

    const engine = Matter.Engine.create({
      enableSleeping: false,
      positionIterations: 6,  // Default is 6; 10 is overkill for most games
      velocityIterations: 4,  // Default is 4; saves ~30% physics CPU
      gravity: { x: 0, y: (currentRoom?.settings?.gravity ?? 9.8) / 10 }
    });
    let physicsFrameCounter = 0;
    const newBodies: Matter.Body[] = [];
    const getPrecisionTime = () => {
      return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    };
    let lastFrameTime = getPrecisionTime();
    let statsAccumulator = {
      dtSum: 0,
      utSum: 0,
      rtSum: 0,
      count: 0
    };
    const playerBodies: { body: Matter.Body; obj: GameObject; sv?: any; isPlayer?: boolean; jumpedThisPress?: boolean; onGround?: boolean }[] = [];
    const emitters: { body: Matter.Body; obj: GameObject; lastSpawn: number }[] = [];
    const dynamicRef: {
      name: any; id: string; gameObject: any; body: Matter.Body; sv: any; expires?: number; sprite: any; width: number; height: number; layerIndex: number; isRoomInstance?: boolean;
    }[] = [];
    const guiRef: any[] = [];
    const svMap = new Map<string, any>();
    const subscriptions: any[] = [];
    liveObjectsRef.current.clear();
    // Cached once per frame — avoids repeated O(n) Matter.Composite.allBodies() allocations
    let cachedBodies: Matter.Body[] = [];

    const resolveValue = (valStr: string, currentBody: Matter.Body | null, currentObj?: GameObject): any => {
      if (!valStr) return 0;

      const lowerVal = valStr.trim().toLowerCase();
      if (lowerVal === 'true') return true;
      if (lowerVal === 'false') return false;

      // LogicState awareness: Extract real GameObject if we received a logic state superset
      const actualObj: GameObject | undefined = (currentObj as any)?.obj || currentObj;

      // Handle simple math: a+b, a-b
      const mathMatch = valStr.match(/^(.+?)\s*([\+\-])\s*(.+)$/);
      if (mathMatch) {
        const left = resolveValue(mathMatch[1].trim(), currentBody, currentObj);
        const right = resolveValue(mathMatch[3].trim(), currentBody, currentObj);
        return mathMatch[2] === '+' ? left + right : left - right;
      }

      const num = parseFloat(valStr);
      // Allow simple numbers and floats, but skip if it looks like a property (e.g. "player.x") or variable with underscores
      if (!isNaN(num) && !valStr.includes('.') && !valStr.includes('_')) return num;
      if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(valStr)) return num;

      // Handle property access: player.x, this.y, enemy.vx
      if (valStr.includes('.')) {
        const [target, prop] = valStr.split('.');
        let targetBody: Matter.Body | null = null;

        if (target === 'this' || target === 'self') {
          targetBody = currentBody;

          // Special case for GUI elements with no physical body
          if (!targetBody && actualObj) {
            if (prop === 'current_count' && actualObj.sprite_repeater) return actualObj.sprite_repeater.currentCount;
            if (prop === 'max_count' && actualObj.sprite_repeater) return actualObj.sprite_repeater.maxCount;
            if (prop === 'value' && actualObj.progress_bar) return actualObj.progress_bar.currentValue;
            if (prop === 'health' && actualObj.health) return actualObj.health.current;
            if (prop === 'scale') return actualObj.physics?.scale || 1;
            if (prop === 'visible') return actualObj.visible !== false ? 1 : 0;
            if (prop === 'flipX') return 1;
            if (prop === 'is_flipped') return 0;
            if (prop === 'is_overlapping' || prop === 'is_overlapping_another_objects' || prop === 'overlapping') return 0;
          }
        } else if (target === 'tap' || target === 'drag') {
          if (prop === 'x') return variablesRef.current.tap_x || 0;
          if (prop === 'y') return variablesRef.current.tap_y || 0;
          return 0;
        } else if (target === 'joystick') {
          if (prop === 'x') return joystickData.current.x;
          if (prop === 'y') return joystickData.current.y;
          if (prop === 'angle') return joystickData.current.angle;
          if (prop === 'magnitude') return joystickData.current.magnitude;
          return 0;
        } else {
          // Optimized lookup using pre-calculated lowercase keys
          const targetKey = target.toLowerCase();
          targetBody = nameLookupRef.current.get(targetKey) ||
            behaviorLookupRef.current.get(targetKey)?.[0] ||
            null;
        }

        if (targetBody) {
          if (prop === 'x') return targetBody.position.x;
          if (prop === 'y') return targetBody.position.y;
          if (prop === 'vx') return targetBody.velocity.x;
          if (prop === 'vy') return targetBody.velocity.y;
          if (prop === 'width') return (targetBody as any).gameInfo?.width || 0;
          if (prop === 'height') return (targetBody as any).gameInfo?.height || 0;
          if (prop === 'scale') {
            const sv = (targetBody as any).gameInfo?.sv;
            if (sv && sv.scale) return sv.scale.value;
            return (targetBody as any).gameInfo?.obj?.physics?.scale || 1;
          }
          if (prop === 'visible') {
            const sv = (targetBody as any).gameInfo?.sv;
            if (sv && sv.visible) return sv.visible.value;
            return (targetBody as any).gameInfo?.obj?.visible !== false ? 1 : 0;
          }
          if (prop === 'flipX') {
            const sv = (targetBody as any).gameInfo?.sv;
            if (sv && sv.flipX) return sv.flipX.value;
            return 1;
          }
          if (prop === 'is_flipped') {
            const sv = (targetBody as any).gameInfo?.sv;
            if (sv && sv.flipX) return sv.flipX.value === -1 ? 1 : 0;
            return 0;
          }
          if (prop === 'is_overlapping' || prop === 'is_overlapping_another_objects' || prop === 'overlapping') {
            const sv = (targetBody as any).gameInfo?.sv;
            if (sv && sv.isColliding) return sv.isColliding.value;
            return 0;
          }

          // Sprite Repeater Properties
          const sr = (targetBody as any).gameInfo?.obj?.sprite_repeater;
          if (sr) {
            if (prop === 'current_count') return sr.currentCount;
            if (prop === 'max_count') return sr.maxCount;
          }

          // Progress Bar Properties
          const pb = (targetBody as any).gameInfo?.obj?.progress_bar;
          if (pb) {
            if (prop === 'value') return pb.currentValue;
          }

          // Raycast Properties
          const raycastResults = (targetBody as any).gameInfo?.raycastResults;
          if (raycastResults) {
            // Check if prop starts with a specific plugin name (e.g. "Laser_hit")
            const match = prop.match(/^(.+?)_(hit|distance|hitX|hitY|hitObject)$/);
            if (match) {
              const pluginName = match[1].toLowerCase();
              const attr = match[2];
              const result = raycastResults[pluginName];
              if (result) {
                if (attr === 'hit') return result.hit ? 1 : 0;
                if (attr === 'distance') return result.distance;
                if (attr === 'hitX') return result.hitX;
                if (attr === 'hitY') return result.hitY;
                if (attr === 'hitObject') return result.hitObject ? 1 : 0;
              }
            }

            // Also support standard/default "raycast_hit" style properties
            const defaultMatch = prop.match(/^raycast_(hit|distance|hitX|hitY|hitObject)$/);
            if (defaultMatch) {
              const attr = defaultMatch[1];
              const keys = Object.keys(raycastResults);
              const result = keys.length > 0 ? raycastResults[keys[0]] : null;
              if (result) {
                if (attr === 'hit') return result.hit ? 1 : 0;
                if (attr === 'distance') return result.distance;
                if (attr === 'hitX') return result.hitX;
                if (attr === 'hitY') return result.hitY;
                if (attr === 'hitObject') return result.hitObject ? 1 : 0;
              }
            }
          }
        }
      }

      // Check global variables
      if (variablesRef.current[valStr] !== undefined) return variablesRef.current[valStr];

      // Check local variables
      const bodyId = currentBody ? (currentBody as any).label : (currentObj as any)?._guiNodeId;
      if (bodyId && localVariablesRef.current[bodyId]?.[valStr] !== undefined) return localVariablesRef.current[bodyId][valStr];
      if (actualObj?.variables?.local?.[valStr] !== undefined) return actualObj.variables.local[valStr];

      // Alias for drag coordinates
      if (valStr === 'get_drag_x') return variablesRef.current.tap_x || 0;
      if (valStr === 'get_drag_y') return variablesRef.current.tap_y || 0;

      return num || 0;
    };

    const playSoundEffect = async (soundName: string) => {
      const soundAsset = currentProject?.sounds?.find((s: any) => s.name === soundName || s.id === soundName);
      if (!soundAsset || !soundAsset.uri) return;

      try {
        if (soundObjectsRef.current.has(soundName)) {
          const existing = soundObjectsRef.current.get(soundName);
          existing?.pause();
          existing?.release();
        }

        const newSound = createAudioPlayer(soundAsset.uri);
        soundObjectsRef.current.set(soundName, newSound);
        newSound.play();

        DeviceEventEmitter.emit('on_start_sound', { name: soundName });
        DeviceEventEmitter.emit(`on_start_sound:${soundName}`, { name: soundName });

        const subscription = newSound.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            subscription.remove();
            newSound.release();
            soundObjectsRef.current.delete(soundName);
            DeviceEventEmitter.emit('on_stop_sound', { name: soundName });
            DeviceEventEmitter.emit(`on_stop_sound:${soundName}`, { name: soundName });
          }
        });
      } catch (err) {
        console.log('[Oxion] Error playing sound:', err);
      }
    };

    const isPlayer = (o?: GameObject) => {
      if (!o) return false;
      const name = o.name?.toLowerCase() || '';
      const behavior = o.behavior?.toLowerCase() || '';
      // A player is either explicitly named/behaved as one, OR is the current camera target
      return (
        name.includes('player') ||
        behavior.includes('player') ||
        o.id === currentRoom?.settings?.camera?.targetId
      );
    };

    const parseScriptAction = (actionData: string): { cmd: string, parts: string[] } => {
      const trimmed = actionData.trim();

      // --- Natural Syntax Transpiler (Pre-parsed) ---
      // Pattern: target.prop op value (e.g. self.x += 10, other.health -= 5)
      const match = trimmed.match(/^([\w]+)\.([\w]+)\s*([\+\-]?=)\s*(.*)$/);
      if (match) {
        const [_, target, prop, op, val] = match;
        let cmd = '';

        const lowerTarget = target.toLowerCase();
        if (lowerTarget === 'global') {
          cmd = op === '=' ? 'var_set' : 'var_add';
        } else if (lowerTarget === 'self' || lowerTarget === 'this') {
          if (prop === 'x') cmd = op === '=' ? 'set_x' : 'add_x';
          else if (prop === 'y') cmd = op === '=' ? 'set_y' : 'add_y';
          else if (prop === 'vx') cmd = 'set_vx';
          else if (prop === 'vy') cmd = 'set_vy';
          else if (prop === 'angle') cmd = op === '=' ? 'set_angle' : 'add_angle';
          else if (prop === 'health' || prop === 'hp') cmd = op === '=' ? 'set_health' : 'add_health';
          else if (prop === 'scale') cmd = op === '=' ? 'set_scale' : 'add_scale';
          else cmd = op === '=' ? 'lvar_set' : 'lvar_add';
        } else {
          // Cross-object targeting handled in executeAction via cmd
          cmd = op === '=' ? 'set_property' : 'add_property';
        }

        const finalVal = (prop === 'value' && op === '-=') ? `-${val}` : val;

        if (lowerTarget !== 'global' && lowerTarget !== 'self' && lowerTarget !== 'this') {
          return { cmd: lowerTarget, parts: [lowerTarget, op === '=' ? 'set' : 'add', prop, finalVal] };
        }

        if ((lowerTarget === 'self' || lowerTarget === 'this') && cmd !== 'lvar_set' && cmd !== 'lvar_add') {
          return { cmd, parts: [cmd, finalVal] };
        }

        return { cmd, parts: [cmd, prop, finalVal] };
      }

      // Pattern: var op value (e.g. score += 1) - Assume global variable if no dot
      const varMatch = trimmed.match(/^([\w]+)\s*([\+\-]?=)\s*(.*)$/);
      if (varMatch) {
        const [_, varName, op, val] = varMatch;
        const command = op === '=' ? 'var_set' : 'var_add';
        const sign = op === '-=' ? '-' : '';
        return { cmd: command, parts: [command, varName, sign + val] };
      }

      const p = trimmed.split(':').map(part => part.trim());
      let cmd = p[0] || '';
      if (cmd.toLowerCase() === 'do') {
        return { cmd: p[1] || '', parts: p.slice(1) };
      }
      return { cmd, parts: p };
    };

    const executeAction = (actionData: string | { cmd: string, parts: string[] }, body: Matter.Body | null, obj?: GameObject, source: string = 'unknown', otherBody?: Matter.Body | null) => {
      if (!isPlayingRef.current) return;

      const isParsedData = typeof actionData !== 'string';
      let cmd = isParsedData ? (actionData as any).cmd : '';
      let parts = isParsedData ? (actionData as any).parts : [];

      if (!isParsedData) {
        const parsed = parseScriptAction(actionData as string);
        cmd = parsed.cmd;
        parts = parsed.parts;
      }

      // --- Action Targeting (e.g. "player:jump" or "enemy:damage:10") ---
      const knownCommands = [
        'jump', 'move_left', 'move_right', 'move_up', 'move_down', 'move_towards', 'stop_x', 'set_vx', 'set_vy', 'set_x', 'set_y', 'add_x', 'add_y',
        'set_angle', 'add_angle', 'point_towards', 'var_add', 'var_set', 'lvar_add', 'lvar_set',
        'set_value', 'tween_to', 'add_value', 'bind_to_variable', 'set_health', 'add_health',
        'damage', 'heal', 'set_count', 'restart_room', 'go_to_room', 'create_instance',
        'animation', 'set_animation', 'start_sound', 'stop_sound', 'target_other',
        'save_game', 'load_game', 'set_scale', 'add_scale', 'destroy', 'set_visible', 'set_text'
      ];

      if (!knownCommands.includes(cmd)) {
        const targetKey = cmd.toLowerCase();
        const targetBodyFromMap = nameLookupRef.current.get(targetKey);
        const targetBodiesFromMap = behaviorLookupRef.current.get(targetKey);

        if (targetBodyFromMap || targetBodiesFromMap) {
          const actualCmd = parts[1];
          const actualParts = parts.slice(1);
          if (actualCmd) {
            const targets = targetBodyFromMap ? [targetBodyFromMap] : (targetBodiesFromMap || []);
            targets.forEach(t => {
              executeAction({ cmd: actualCmd, parts: actualParts }, t, (t as any).gameInfo?.obj, `${source}:Target:${cmd}`, otherBody);
            });
          }
          return;
        }
      }

      // Clear move_towards tracking if we issue other direct movement commands
      if (body && ['move_left', 'move_right', 'move_up', 'move_down', 'stop_x', 'set_vx', 'set_vy', 'set_x', 'set_y', 'add_x', 'add_y'].includes(cmd)) {
        const info = (body as any).gameInfo;
        if (info) info.moveTowards = undefined;
      }

      // Handle 'other' target redirection for pre-parsed actions
      if (cmd === 'target_other') {
        if (otherBody) {
          const actualCmd = parts[1];
          const actualParts = [actualCmd, parts[2], parts[3]];
          executeAction({ cmd: actualCmd, parts: actualParts }, otherBody, (otherBody as any).gameInfo?.obj, `${source}:TargetOther`);
        }
        return;
      }

      if (cmd === 'destroy') {
        if (body) {
          Matter.World.remove(engine.world, body);
          const info = (body as any).gameInfo;
          if (info && info.sv && info.sv.visible) {
            info.sv.visible.value = 0; // Hide the renderer
          }
          setNonce(n => n + 1);
        }
        return;
      }

      if (cmd === 'set_visible') {
        const val = parts[1] === 'true' || parts[1] === '1';
        const info = body ? (body as any).gameInfo : (obj as any);
        if (info) {
          if (info.obj) info.obj.visible = val;
          if (info.sv && info.sv.visible) {
            info.sv.visible.value = val ? 1 : 0;
          }
          setNonce(n => n + 1);
        }
        return;
      }

      if (cmd === 'restart_room' || cmd === 'go_to_room') {
        // Only allow player
        if (!isPlayer(obj)) {
          console.log(`[Oxion] Blocking [${cmd}] from [${obj?.name || 'unknown'}]`);
          return;
        }

        console.log(`[Oxion] Action [${cmd}] triggered by [${obj?.name}] via [${source}]`);
      }

      if (cmd === 'jump') {
        if (body) {
          // "Hard Jump": Physically lift the body 2 pixels to clear any floor friction/stuck state
          Matter.Body.setPosition(body, { x: body.position.x, y: body.position.y - 2 });
          const jmp = obj?.physics?.jumpStrength !== undefined ? obj.physics.jumpStrength : 12;
          Matter.Body.setVelocity(body, { x: body.velocity.x, y: -jmp });
        }
      } else if (cmd === 'set_scale' || cmd === 'add_scale') {
        const val = resolveValue(parts[1], body, obj);
        const info = body ? (body as any).gameInfo : (obj as any);
        console.log(`[Oxion Scale Debug] cmd: ${cmd}, val: ${val}, info exists: ${!!info}`);
        if (info) {
          if (info.obj && !info.obj.physics) {
            info.obj.physics = { enabled: false };
          }
          const currentScale = info.obj?.physics?.scale ?? info.scale ?? info.physics?.scale ?? 1;
          let nextScale = currentScale;
          if (cmd === 'set_scale') {
            nextScale = val;
          } else {
            nextScale = currentScale + val;
          }
          console.log(`[Oxion Scale Debug] currentScale: ${currentScale}, nextScale: ${nextScale}`);

          if (nextScale <= 0) nextScale = 0.01; // Avoid negative/zero scale bugs

          if (info.obj?.physics) info.obj.physics.scale = nextScale;
          if (info.physics) info.physics.scale = nextScale;
          info.scale = nextScale;

          if (info.sv && info.sv.scale) {
            info.sv.scale.value = nextScale;
            console.log(`[Oxion Scale Debug] updated sv.scale.value to ${info.sv.scale.value}`);
          } else {
            console.log(`[Oxion Scale Debug] sv.scale does not exist! info.sv: ${!!info.sv}`);
          }

          if (body) {
            const scaleFactor = nextScale / currentScale;
            console.log(`[Oxion Scale Debug] scaling body by scaleFactor: ${scaleFactor}`);
            Matter.Body.scale(body, scaleFactor, scaleFactor);
          }

          setNonce(n => n + 1);
        }
      } else if (cmd === 'damage' || cmd === 'heal') {
        // Resolve amount: try variable first, then literal number
        let amount = resolveValue(parts[1], body, obj);
        if (amount === undefined) {
          const parsed = Number(parts[1]);
          amount = isNaN(parsed) ? 0 : parsed;
        }
        const info = body ? (body as any).gameInfo : (obj as any);
        const sign = cmd === 'damage' ? -1 : 1;

        // 1. Update health (if present)
        let health = info?.health || info?.obj?.health;
        if (health) {
          const old = health.current;
          const newVal = Math.max(0, Math.min(health.max, health.current + (amount * sign)));

          const newHealth = { ...health, current: newVal };
          if (info.health) info.health = newHealth;
          if (info.obj?.health) info.obj.health = newHealth;

          // Also update linked variable if exists
          if (newHealth.linkedVariable) {
            updateGlobalVar(newHealth.linkedVariable, newVal, true);
          }

          const sounds = info?.obj?.sounds;
          if (sign < 0 && sounds?.hit) playSoundEffect(sounds.hit);
          if (newHealth.current <= 0 && old > 0 && sounds?.dead) playSoundEffect(sounds.dead);
          setNonce(n => n + 1);
        }

        // 2. Update sprite_repeater – check BOTH info.sprite_repeater (GUI) and info.obj.sprite_repeater
        let sr = info?.sprite_repeater || info?.obj?.sprite_repeater;
        if (sr) {
          let nextCount = sr.currentCount;
          if (sign < 0) nextCount = Math.max(0, nextCount - amount);
          else nextCount = Math.min(sr.maxCount, nextCount + amount);

          const newSr = { ...sr, currentCount: nextCount };
          if (info.sprite_repeater) info.sprite_repeater = newSr;
          if (info.obj?.sprite_repeater) info.obj.sprite_repeater = newSr;

          if (newSr.linkedVariable) {
            updateGlobalVar(newSr.linkedVariable, newSr.currentCount, true);
          }
          setNonce(n => n + 1);
          variablesDirtyRef.current = true; // Ensure store sync
        }

        // 3. Update progress_bar – check BOTH info.progress_bar and info.obj.progress_bar
        let pb = info?.progress_bar || info?.obj?.progress_bar;
        if (pb) {
          const delta = amount * sign;
          const nextVal = Math.max(pb.minValue, Math.min(pb.maxValue, pb.currentValue + delta));

          const newPb = { ...pb, currentValue: nextVal };
          if (info.progress_bar) info.progress_bar = newPb;
          if (info.obj?.progress_bar) info.obj.progress_bar = newPb;

          if (newPb.linkedVariable) {
            updateGlobalVar(newPb.linkedVariable, newPb.currentValue, true);
          }
          if (info?.sv?.pbValue) info.sv.pbValue.value = newPb.currentValue;
          setNonce(n => n + 1);
        }
      } else if (cmd === 'move_left') {
        if (body) {
          Matter.Body.setVelocity(body, { x: -(obj?.physics?.moveSpeed || 5) * 0.8, y: body.velocity.y });
          const info = (body as any).gameInfo;
          if (info?.sv?.flipX) info.sv.flipX.value = -1;
        }
      } else if (cmd === 'move_right') {
        if (body) {
          Matter.Body.setVelocity(body, { x: (obj?.physics?.moveSpeed || 5) * 0.8, y: body.velocity.y });
          const info = (body as any).gameInfo;
          if (info?.sv?.flipX) info.sv.flipX.value = 1;
        }
      } else if (cmd === 'move_up') {
        if (body) {
          Matter.Body.setVelocity(body, { x: body.velocity.x, y: -(obj?.physics?.moveSpeed || 5) * 0.8 });
        }
      } else if (cmd === 'move_down') {
        if (body) {
          Matter.Body.setVelocity(body, { x: body.velocity.x, y: (obj?.physics?.moveSpeed || 5) * 0.8 });
        }
      } else if (cmd === 'stop_x') {
        if (body) Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
      } else if (cmd === 'set_vx') {
        if (body) Matter.Body.setVelocity(body, { x: resolveValue(parts[1], body, obj), y: body.velocity.y });
      } else if (cmd === 'set_vy') {
        if (body) Matter.Body.setVelocity(body, { x: body.velocity.x, y: resolveValue(parts[1], body, obj) });
      } else if (cmd === 'set_x') {
        if (body) Matter.Body.setPosition(body, { x: resolveValue(parts[1], body, obj), y: body.position.y });
      } else if (cmd === 'set_y') {
        if (body) Matter.Body.setPosition(body, { x: body.position.x, y: resolveValue(parts[1], body, obj) });
      } else if (cmd === 'add_x') {
        if (body) Matter.Body.setPosition(body, { x: body.position.x + resolveValue(parts[1], body, obj), y: body.position.y });
      } else if (cmd === 'add_y') {
        if (body) Matter.Body.setPosition(body, { x: body.position.x, y: body.position.y + resolveValue(parts[1], body, obj) });
      } else if (cmd === 'set_angle') {
        if (body) Matter.Body.setAngle(body, resolveValue(parts[1], body, obj) * Math.PI / 180);
      } else if (cmd === 'add_angle') {
        if (body) Matter.Body.setAngle(body, body.angle + (resolveValue(parts[1], body, obj) * Math.PI / 180));
      } else if (cmd === 'point_towards') {
        if (body) {
          const target = parts[1];
          const targetLower = target?.toLowerCase();
          const targetBody = cachedBodies.find(b => {
            const info = (b as any).gameInfo;
            return b !== body && (
              info?.obj?.behavior?.toLowerCase() === targetLower ||
              info?.obj?.name?.toLowerCase() === targetLower
            );
          });
          if (targetBody) {
            const ang = Math.atan2(targetBody.position.y - body.position.y, targetBody.position.x - body.position.x);
            Matter.Body.setAngle(body, ang);
          }
        }
      } else if (cmd === 'move_towards') {
        if (body) {
          const info = (body as any).gameInfo;
          if (info) {
            const target = parts[1];
            // Check if we have X, Y, and Speed coordinates (e.g., move_towards:400:300:5)
            if (parts.length >= 4) {
              const tx = resolveValue(parts[1], body, obj);
              const ty = resolveValue(parts[2], body, obj);
              const sp = resolveValue(parts[3], body, obj);
              info.moveTowards = { target: { x: tx, y: ty }, speed: sp };
            } else {
              // Target Object Name / Behavior (e.g., move_towards:Player:3)
              const sp = parts[2] ? resolveValue(parts[2], body, obj) : 5;
              info.moveTowards = { target, speed: sp };
            }
          }
        }
      } else if (cmd === 'go_to') {
        if (body) {
          const target = parts[1];
          const targetLower = target?.toLowerCase();

          if (targetLower === 'touch' || targetLower === 'tap' || targetLower === 'drag') {
            const tx = variablesRef.current.tap_x ?? body.position.x;
            const ty = variablesRef.current.tap_y ?? body.position.y;
            Matter.Body.setPosition(body, { x: tx, y: ty });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
          } else if (parts.length >= 3) {
            const tx = resolveValue(parts[1], body, obj);
            const ty = resolveValue(parts[2], body, obj);
            Matter.Body.setPosition(body, { x: tx, y: ty });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
          } else if (target) {
            const targetBody = cachedBodies.find(b => {
              const info = (b as any).gameInfo;
              return b !== body && (
                info?.obj?.behavior?.toLowerCase() === targetLower ||
                info?.obj?.name?.toLowerCase() === targetLower
              );
            });
            if (targetBody) {
              Matter.Body.setPosition(body, { x: targetBody.position.x, y: targetBody.position.y });
              Matter.Body.setVelocity(body, { x: 0, y: 0 });
            }
          }
        }
      } else if (cmd === 'var_add') {
        const name = parts[1];
        const amount = resolveValue(parts[2], body, obj);
        updateGlobalVar(name, amount);
      } else if (cmd === 'var_set') {
        const name = parts[1];
        const val = resolveValue(parts[2], body, obj);
        updateGlobalVar(name, val, true);
      } else if (cmd === 'lvar_add') {
        const name = parts[1];
        const amount = resolveValue(parts[2], body, obj);

        // Intercept plugin updates
        const pluginMatch = name.match(/^(.+?)_(range|angle)$/i);
        if (pluginMatch && obj?.plugins) {
          const pluginName = pluginMatch[1].toLowerCase();
          const attr = pluginMatch[2].toLowerCase();
          const plugin = obj.plugins.find(p => p.name?.toLowerCase() === pluginName);
          if (plugin) {
            if (attr === 'range') {
              plugin.settings.range = (plugin.settings.range || 0) + amount;
            } else if (attr === 'angle') {
              plugin.settings.angleOffset = (plugin.settings.angleOffset || 0) + amount;
            }
            setNonce(n => n + 1);
            return;
          }
        }

        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) updateLocalVar(lId, name, amount, obj?.variables?.local);
      } else if (cmd === 'lvar_set') {
        const name = parts[1];
        const val = resolveValue(parts[2], body, obj);

        // Intercept plugin updates
        const pluginMatch = name.match(/^(.+?)_(range|angle|enabled|visualize|color)$/i);
        if (pluginMatch && obj?.plugins) {
          const pluginName = pluginMatch[1].toLowerCase();
          const attr = pluginMatch[2].toLowerCase();
          const plugin = obj.plugins.find(p => p.name?.toLowerCase() === pluginName);
          if (plugin) {
            if (attr === 'range') {
              plugin.settings.range = val;
            } else if (attr === 'angle') {
              plugin.settings.angleOffset = val;
            } else if (attr === 'enabled') {
              plugin.enabled = (val as any) === 'true' || (val as any) === '1' || val === 1 || !!val;
            } else if (attr === 'visualize') {
              plugin.settings.visualize = (val as any) === 'true' || (val as any) === '1' || val === 1 || !!val;
            } else if (attr === 'color') {
              plugin.settings.laserColor = String(val);
            }
            setNonce(n => n + 1);
            return;
          }
        }

        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) updateLocalVar(lId, name, val, obj?.variables?.local, true);
      } else if (cmd === 'set_value' || cmd === 'tween_to' || cmd === 'add_value') {
        const val = resolveValue(parts[1], body, obj);
        const info = body ? (body as any).gameInfo : (obj as any);
        let pb = info?.progress_bar || info?.obj?.progress_bar;
        if (pb) {
          let nextVal = pb.currentValue;
          if (cmd === 'set_value') {
            nextVal = val;
            info.targetValue = undefined; // Cancel any active tween
          } else if (cmd === 'add_value') {
            nextVal += val;
            info.targetValue = undefined;
          } else {
            // tween_to:target:duration
            const duration = parts[2] ? resolveValue(parts[2], body, obj) : 500;
            info.targetValue = val;
            const diff = val - pb.currentValue;
            // Calculate increment per frame (assuming 60fps)
            info.tweenRate = diff / (duration / 16.6);
            nextVal = pb.currentValue; // Value stays same until tweened
          }

          const newPb = { ...pb, currentValue: nextVal };
          if (info.progress_bar) info.progress_bar = newPb;
          if (info.obj?.progress_bar) info.obj.progress_bar = newPb;

          if (newPb.linkedVariable) {
            updateGlobalVar(newPb.linkedVariable, newPb.currentValue, true);
          }
          if (info?.sv?.pbValue) info.sv.pbValue.value = newPb.currentValue;
          setNonce(n => n + 1);
        }
      } else if (cmd === 'bind_to_variable') {
        const varName = parts[1];
        const info = body ? (body as any).gameInfo : (obj as any);
        let pb = info?.progress_bar || info?.obj?.progress_bar;
        if (pb) {
          const newPb = { ...pb, linkedVariable: varName };
          if (info.progress_bar) info.progress_bar = newPb;
          if (info.obj?.progress_bar) info.obj.progress_bar = newPb;
          setNonce(n => n + 1);
        }
      } else if (cmd === 'set_health' || cmd === 'add_health') {
        const val = resolveValue(parts[1], body, obj);
        const info = body ? (body as any).gameInfo : (obj as any);
        let health = info?.health || info?.obj?.health;
        if (health) {
          const old = health.current;
          let nextVal = health.current;
          if (cmd === 'set_health') nextVal = Math.max(0, Math.min(health.max, val));
          else nextVal = Math.max(0, Math.min(health.max, health.current + val));

          const newHealth = { ...health, current: nextVal };
          if (info.health) info.health = newHealth;
          if (info.obj?.health) info.obj.health = newHealth;

          if (newHealth.current < old && info?.obj?.sounds?.hit) playSoundEffect(info.obj.sounds.hit);
          if (newHealth.current <= 0 && old > 0 && info?.obj?.sounds?.dead) playSoundEffect(info.obj.sounds.dead);

          setNonce(n => n + 1);
        }
      } else if (cmd === 'set_count') {
        const amount = resolveValue(parts[1], body, obj);
        const info = body ? (body as any).gameInfo : (obj as any);
        let sr = info?.sprite_repeater || info?.obj?.sprite_repeater;
        if (sr) {
          const nextCount = Math.max(0, Math.min(sr.maxCount, amount));
          const newSr = { ...sr, currentCount: nextCount };
          if (info.sprite_repeater) info.sprite_repeater = newSr;
          if (info.obj?.sprite_repeater) info.obj.sprite_repeater = newSr;
          setNonce(n => n + 1);
        }
      } else if (cmd === 'restart_room') {
        const now = Date.now();
        if (now - lastRestartRef.current > 1000) {
          lastRestartRef.current = now;
          setRestartKey(k => k + 1);
        }
      } else if (cmd === 'go_to_room') {
        const roomName = parts[1];
        const room = currentProject?.rooms?.find(r => r.name === roomName || r.id === roomName);

        const now = Date.now();
        if (now - lastRestartRef.current < 1000) return;
        lastRestartRef.current = now;

        if (room) {
          console.log(`[Oxion] Switching to room: ${roomName}`);
          setRoomOverride(room.id);
          setRestartKey(k => k + 1);
        }
      } else if (cmd === 'save_game') {
        const now = Date.now();
        if (now - lastSaveTimeRef.current < 2000) return; // 2s cooldown
        lastSaveTimeRef.current = now;

        const saveKey = `oxion_save_${currentProject?.id}`;
        const saveData = {
          globals: variablesRef.current,
          locals: localVariablesRef.current,
          roomId: currentRoom?.id
        };
        AsyncStorage.setItem(saveKey, JSON.stringify(saveData)).then(() => {
          console.log('[Oxion] Game Saved to ' + saveKey);
        }).catch(err => {
          console.error('[Oxion] Save Error:', err);
        });
      } else if (cmd === 'load_game') {
        if (pendingLoadRef.current) return; // Already loading
        const now = Date.now();
        if (now - lastLoadTimeRef.current < 2000) return; // 2s cooldown
        lastLoadTimeRef.current = now;

        const saveKey = `oxion_save_${currentProject?.id}`;
        AsyncStorage.getItem(saveKey).then(json => {
          if (json) {
            const data = JSON.parse(json);
            pendingLoadRef.current = data;
            if (data.roomId) {
              setRoomOverride(data.roomId);
              setRestartKey(k => k + 1);
            } else {
              setRestartKey(k => k + 1);
            }
            console.log('[Oxion] Game Loaded from ' + saveKey);
          }
        }).catch(err => {
          console.error('[Oxion] Load Error:', err);
        });
      } else if (cmd === 'log' || cmd === 'console_log') {
        const val = resolveValue(parts[1], body, obj);
        console.log(`[Oxion Log] [${obj?.name || 'Object'}]:`, val);
      } else if (cmd === 'create_instance') {
        const targetId = parts[1];
        let targetX = body ? body.position.x : (cameraX.value + gameWidth / 2);
        let targetY = body ? body.position.y : (cameraY.value + gameHeight / 2);
        if (parts.length >= 4) {
          targetX += resolveValue(parts[2], body, obj);
          targetY += resolveValue(parts[3], body, obj);
        }
        spawnInstance(targetId, targetX, targetY, false, {}, body ? (body as any).gameInfo?.layerIndex : 0);
      } else if (cmd === 'animation' || cmd === 'set_animation') {
        const animStr = parts[1];
        let targetSpriteId: string | undefined;
        let targetAnimName: string | undefined;

        if (animStr.includes(':')) {
          const [sName, aName] = animStr.split(':');
          const trimmedSName = sName.trim();
          const foundSprite = allSprites.find(s => s.name?.trim() === trimmedSName || s.id === trimmedSName);
          if (foundSprite) {
            targetSpriteId = foundSprite.id;
            targetAnimName = aName.trim();
          }
        } else {
          targetAnimName = animStr.trim();
        }

        if (targetAnimName) {
          const current = instanceOverridesRef.current[body.label];
          if (!current || current.spriteId !== targetSpriteId || current.animName !== targetAnimName) {
            setInstanceOverrides(prev => ({
              ...prev,
              [body.label]: { spriteId: targetSpriteId, animName: targetAnimName }
            }));
          }
        }
      } else if (cmd === 'start_sound') {
        const soundName = parts[1];
        playSoundEffect(soundName);
      } else if (cmd === 'stop_sound') {
        const soundName = parts[1];
        const snd = soundObjectsRef.current.get(soundName);
        if (snd) {
          snd.pause();
          snd.release();
          soundObjectsRef.current.delete(soundName);
          DeviceEventEmitter.emit('on_stop_sound', { name: soundName });
          DeviceEventEmitter.emit(`on_stop_sound:${soundName}`, { name: soundName });
        }
      } else if (cmd === 'set_text') {
        const textVal = parts.slice(1).join(':');
        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) {
          const lower = textVal.toLowerCase();
          const isReactive = ['tap_x', 'tap_y', 'get_drag_x', 'get_drag_y'].some(v => lower.includes(v));

          let resolved: string;
          if (isReactive) {
            // Convert bare names to bracketed templates for the worklet to pick up
            resolved = textVal.replace(/(tap_x|tap_y|get_drag_x|get_drag_y)/gi, '{$1}');
            resolved = resolved.replace(/\{\{/g, '{').replace(/\}\}/g, '}'); // Clean up double brackets
          } else {
            resolved = String(resolveValue(textVal, body, obj));
          }

          // Optimization: If content is same (e.g. still the same template string), 
          // skip setInstanceOverrides to avoid React re-render choke.
          if (instanceOverridesRef.current[lId]?.text?.content === resolved) return;

          setInstanceOverrides(prev => {
            const current = prev[lId] || {};
            const text = { ...(current.text || obj?.text || { content: '', color: '#fff', fontSize: 16 }), content: resolved };
            return { ...prev, [lId]: { ...current, text } };
          });
        }
      } else if (cmd === 'set_text_color') {
        const color = parts[1];
        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) {
          setInstanceOverrides(prev => {
            const current = prev[lId] || {};
            const text = { ...(current.text || obj?.text || {}), color };
            return { ...prev, [lId]: { ...current, text } };
          });
        }
      } else if (cmd === 'set_bg_color') {
        const backgroundColor = parts[1];
        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) {
          setInstanceOverrides(prev => {
            const current = prev[lId] || {};
            const text = { ...(current.text || obj?.text || {}), backgroundColor };
            return { ...prev, [lId]: { ...current, text } };
          });
        }
      } else if (cmd === 'set_text_size') {
        const fontSize = resolveValue(parts[1], body, obj);
        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) {
          setInstanceOverrides(prev => {
            const current = prev[lId] || {};
            const text = { ...(current.text || obj?.text || {}), fontSize };
            return { ...prev, [lId]: { ...current, text } };
          });
        }
      } else if (cmd === 'set_text_align') {
        const textAlign = parts[1];
        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) {
          setInstanceOverrides(prev => {
            const current = prev[lId] || {};
            const text = { ...(current.text || obj?.text || {}), textAlign };
            return { ...prev, [lId]: { ...current, text } };
          });
        }
      }
    };

    const checkCondition = (conditionStr: string, body: Matter.Body | null, obj?: GameObject) => {
      if (!conditionStr) return true;
      const lhsRaw = conditionStr.split(/[><=!+]/)[0].trim();
      const op = conditionStr.match(/[><=!]+/)?.[0] || '==';
      const rhsRaw = conditionStr.split(/[><=!+]/).pop()?.trim() || '0';
      const lhs = resolveValue(lhsRaw, body, obj);
      const rhs = resolveValue(rhsRaw, body, obj);
      if (op === '<') return lhs < rhs;
      if (op === '>') return lhs > rhs;
      if (op === '==') return lhs === rhs;
      if (op === '!=') return lhs !== rhs;
      return false;
    };

    const executeListenerLogic = (listener: any, body: Matter.Body | null, obj: GameObject, source: string, otherBody?: Matter.Body, otherObj?: GameObject) => {
      // 1. Legacy support
      if (listener.parsedAction) {
        executeAction(listener.parsedAction, body, obj, source, otherBody);
      } else if (listener.action) {
        executeAction(listener.action, body, obj, source, otherBody);
      }

      if (listener.condition && checkCondition(listener.condition, body, obj)) {
        if (listener.conditionAction) executeAction(listener.conditionAction, body, obj, source + ':Cond', otherBody);
      }

      // 2. New Logic Editor support
      const pImm = listener.parsedImmediate || parsedImmediateCache.get(listener);
      if (pImm) {
        pImm.forEach((act: any) => {
          executeAction(act, body, obj, source + ':Imm', otherBody);
        });
      } else if (listener.immediateActions) {
        listener.immediateActions.forEach((act: string) => {
          if (act) executeAction(act, body, obj, source + ':Imm', otherBody);
        });
      }

      const pSub = listener.parsedSubConditions || parsedSubConditionsCache.get(listener);
      if (pSub) {
        pSub.forEach((sc: any) => {
          const met = checkCondition(sc.condition, body, obj);
          if (met) {
            if (sc.parsedActions) {
              sc.parsedActions.forEach((act: any) => executeAction(act, body, obj, source + ':IfT', otherBody));
            } else if (sc.actions) {
              sc.actions.forEach((act: string) => {
                if (act) executeAction(act, body, obj, source + ':IfT', otherBody);
              });
            }
          } else {
            if (sc.parsedElseActions) {
              sc.parsedElseActions.forEach((act: any) => executeAction(act, body, obj, source + ':IfF', otherBody));
            } else if (sc.elseActions) {
              sc.elseActions.forEach((act: string) => {
                if (act) executeAction(act, body, obj, source + ':IfF', otherBody);
              });
            }
          }
        });
      } else if (listener.subConditions) {
        listener.subConditions.forEach((sc: any) => {
          const met = checkCondition(sc.condition, body, obj);
          if (met) {
            if (sc.actions) sc.actions.forEach((act: string) => {
              if (act) executeAction(act, body, obj, source + ':IfT', otherBody);
            });
          } else {
            if (sc.elseActions) sc.elseActions.forEach((act: string) => {
              if (act) executeAction(act, body, obj, source + ':IfF', otherBody);
            });
          }
        });
      }
    };

    const attachListeners = (body: Matter.Body, obj: GameObject) => {
      obj.logic?.listeners?.forEach(l => {
        // Skip events handled elsewhere to prevent double-firing or handled by specialized loops
        const skippedEvents = ['on_timer', 'on_tick', 'on_start', 'on_tap', 'when_self_tap', 'builtin_tap', 'on_screen_tap', 'on_collision', 'on_drag', 'when:'];
        if (skippedEvents.some(se => l.eventId === se || l.eventId?.startsWith(se))) return;

        const sub = DeviceEventEmitter.addListener(l.eventId, (data: any) => {
          // If the event has a targetId, only react if it matches this body
          if (data?.targetId && String(data.targetId) !== String(body.label)) return;

          // For on_collision events, we no longer restrict to Player only to allow generic collision scripts to work
          // if (l.eventId === 'on_collision') {
          //   if (data?.otherName !== 'Player' && data?.otherBehavior !== 'player') return;
          // }

          executeListenerLogic(l, body, obj, `Listener:${l.eventId}`, data?.otherBody, data?.otherObj);
        });
        subscriptions.push(sub);
      });

      // Built-in tap listener for 'on_tap' scripts (legacy) and visual logic
      const tapSub = DeviceEventEmitter.addListener('builtin_tap', (data: any) => {
        // For object-specific taps, check targetId
        if (data?.targetId && String(data.targetId) !== String(body.label)) return;

        // Legacy scripts
        const info = (body as any).gameInfo;
        if (info?.scripts) {
          info.scripts.forEach((s: any) => {
            if (s.cmd === 'on_tap') {
              if (s.listenerData) executeListenerLogic(s.listenerData, body, obj, 'TapScript');
              else if (s.actionPart) executeAction(s.actionPart, body, obj, 'TapScript');
            }
          });
        }
        // Visual logic listeners for on_tap and builtin_tap
        obj.logic?.listeners?.forEach((l: any) => {
          if (l.eventId === 'on_tap' || l.eventId === 'builtin_tap' || l.eventId === 'when_self_tap') {
            executeListenerLogic(l, body, obj, 'TapListener');
          }
        });
      });
      subscriptions.push(tapSub);

      // Dedicated drag listener for 'on_drag' visual logic
      const dragSub = DeviceEventEmitter.addListener('builtin_drag', (data: any) => {
        // Check targetId
        if (data?.targetId && String(data.targetId) !== String(body.label)) return;

        // Sync world-space coordinates in global variables for expressions (e.g. self.x = tap.x)
        variablesRef.current.tap_x = data.x;
        variablesRef.current.tap_y = data.y;

        // Trigger object's on_drag visual logic listeners
        obj.logic?.listeners?.forEach((l: any) => {
          if (l.eventId === 'on_drag') {
            executeListenerLogic(l, body, obj, 'DragListener');
          }
        });
      });
      subscriptions.push(dragSub);

      // Dedicated screen tap listener
      const screenTapSub = DeviceEventEmitter.addListener('on_screen_tap', (data: any) => {
        obj.logic?.listeners?.forEach((l: any) => {
          if (l.eventId === 'on_screen_tap') {
            executeListenerLogic(l, body, obj, 'ScreenTapListener');
          }
        });
      });
      subscriptions.push(screenTapSub);
    };

    const createBodyForObject = (x: number, y: number, width: number, height: number, obj: GameObject, options: any) => {
      const col = obj.physics?.collision;
      const scale = obj.physics?.scale || 1;

      const offsetX = (col?.offsetX || 0) * scale;
      const offsetY = (col?.offsetY || 0) * scale;

      const colW = (col?.type === 'circle' ? (col.radius || width / 2) * 2 : (col?.width || width)) * scale;
      const colH = (col?.type === 'circle' ? (col.radius || width / 2) * 2 : (col?.height || height)) * scale;

      // x, y is sprite center.
      // With center-relative offsets, body center is just x + scaled offsets.
      const bodyCenterX = x + offsetX;
      const bodyCenterY = y + offsetY;

      // Store scaled dimensions for debug rendering
      (options as any).colW = colW;
      (options as any).colH = colH;

      if (col?.type === 'circle') {
        return Matter.Bodies.circle(bodyCenterX, bodyCenterY, colW / 2, options);
      } else {
        return Matter.Bodies.rectangle(bodyCenterX, bodyCenterY, colW, colH, options);
      }
    };

    const spawnInstance = (objectId: string, x: number, y: number, isParticle = false, settings?: any, layerIndex?: number) => {
      const pObj = objectMapRef.current.get(objectId);
      if (!pObj) return;
      const physics = pObj.physics || {};
      const appearance = pObj.appearance || {};
      const sprite = spriteMapRef.current.get(appearance.spriteId || '');
      const isGrid = sprite?.grid?.enabled;
      const fw = isGrid ? sprite.grid.frameWidth : sprite?.width;
      const fh = isGrid ? sprite.grid.frameHeight : sprite?.height;

      const width = isParticle ? 16 : (isGrid ? fw : (pObj.width || fw || 32));
      const height = isParticle ? 16 : (isGrid ? fh : (pObj.height || fh || 32));

      const currentType = physics.bodyType || (physics.isStatic ? 'static' : 'dynamic');
      const isStatic = !isParticle && (currentType === 'static' || currentType === 'kinematic' || !physics.enabled);
      const isSensor = !physics.enabled || currentType === 'kinematic' || !!physics.ignoreCollision;

      const spawnId = `${isParticle ? 'p' : 'dyn'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const body = isParticle
        ? Matter.Bodies.circle(x, y, 8, { frictionAir: 0.02, restitution: 0.5, density: 0.0005, label: spawnId })
        : createBodyForObject(x, y, width, height, pObj, { isStatic, isSensor, friction: physics.friction || 0.1, restitution: physics.restitution || 0.1, label: spawnId });

      if (isParticle && settings) {
        const spread = settings.spread !== undefined ? settings.spread : 45;
        const angle = (settings.angle || 0) + (Math.random() * spread - spread / 2);
        const rad = angle * Math.PI / 180;
        Matter.Body.setVelocity(body, { x: Math.cos(rad) * (settings.speed || 2), y: Math.sin(rad) * (settings.speed || 2) });
        (body as any).gravityScale = settings.gravityScale ?? 1;
      }

      if (!isParticle) attachListeners(body, pObj);

      Matter.World.add(engine.world, body);
      const parsedScripts: any[] = pObj.logic?.scripts?.map(s => {
        const doSplit = s.split(/ DO | do /);
        let actionPart = '';
        let cmd = '';
        let timerMs = 0;
        let p: string[] = [];

        if (doSplit.length > 1) {
          p = doSplit[0].split(':');
          actionPart = doSplit[1].trim();
          cmd = p[0].trim();
          if (cmd === 'on_timer') timerMs = parseInt(p[1], 10) || 1000;
        } else {
          p = s.split(':');
          cmd = p[0].trim();
          if (cmd === 'on_timer') timerMs = parseInt(p[1], 10) || 1000;
          actionPart = p.slice(cmd === 'on_timer' ? 2 : 1).join(':').trim();
        }

        return {
          cmd,
          parts: p,
          actionPart,
          parsedAction: actionPart ? parseScriptAction(actionPart) : null,
          timerMs,
          lastTrigger: Date.now()
        };
      }) || [];

      // Pre-parse ALL other Visual Logic Editor listeners
      pObj.logic?.listeners?.forEach((l: any) => {
        if (!l.parsedImmediate && !parsedImmediateCache.has(l) && l.immediateActions) {
          const parsed = l.immediateActions.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean);
          try {
            l.parsedImmediate = parsed;
          } catch (e) {
            parsedImmediateCache.set(l, parsed);
          }
        }
        if (!l.parsedSubConditions && !parsedSubConditionsCache.has(l) && l.subConditions) {
          const parsed = l.subConditions.map((sc: any) => ({
            ...sc,
            parsedActions: sc.actions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
            parsedElseActions: sc.elseActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
          }));
          try {
            l.parsedSubConditions = parsed;
          } catch (e) {
            parsedSubConditionsCache.set(l, parsed);
          }
        }
      });

      pObj.logic?.listeners?.forEach((l: any) => {
        if (l.eventId?.startsWith('on_timer') || l.eventId === 'on_tick' || l.eventId === 'on_start' || l.eventId === 'on_empty' || l.eventId === 'on_full' || l.eventId === 'on_life_lost' || l.eventId === 'on_zero_lives' || l.eventId?.startsWith('when:')) {
          const cmd = l.eventId.startsWith('on_timer') ? 'on_timer' : (l.eventId.startsWith('when:') ? 'when' : l.eventId);
          const p = l.eventId.split(':');
          let timerMs = 1000;
          if (cmd === 'on_timer' && p.length > 1) {
            timerMs = parseInt(p[1], 10) || 1000;
          }

          parsedScripts.push({
            cmd,
            parts: p,
            actionPart: '',
            timerMs,
            lastTrigger: Date.now(),
            conditionStr: l.eventId.startsWith('when:') ? l.eventId.slice(5).trim() : '',
            wasTrue: false,
            listenerData: l
          });
        }
      });

      const instObj: GameObject = { ...pObj };
      if (pObj.health) instObj.health = { ...pObj.health };
      if (pObj.progress_bar) instObj.progress_bar = { ...pObj.progress_bar };
      if (pObj.sprite_repeater) instObj.sprite_repeater = { ...pObj.sprite_repeater };

      if (pObj.gui_hierarchy) {
        const cloneNodes = (nodes: any[]): any[] => nodes.map(n => ({
          ...n,
          children: n.children ? cloneNodes(n.children) : undefined
        }));
        instObj.gui_hierarchy = {
          ...pObj.gui_hierarchy,
          root: cloneNodes(pObj.gui_hierarchy.root || [])
        };
      }

      liveObjectsRef.current.set(spawnId, instObj);

      const scale = pObj.physics?.scale || 1;
      const sv = {
        x: makeMutable(x - (width / 2 + (pObj.physics?.collision?.offsetX || 0)) * scale),
        y: makeMutable(y - (height / 2 + (pObj.physics?.collision?.offsetY || 0)) * scale),
        rot: makeMutable(0),
        isColliding: makeMutable(0),
        animState: makeMutable(0),
        flipX: makeMutable(1),
        scale: makeMutable(scale)
      };
      svMap.set(body.label, sv);

      (body as any).gameInfo = {
        width,
        height,
        obj: instObj,
        scripts: parsedScripts,
        tickScripts: parsedScripts.filter((s: any) => s && s.cmd === 'on_tick'),
        timerScripts: parsedScripts.filter((s: any) => s && s.cmd === 'on_timer' && s.timerMs > 0),
        spawnTime: Date.now(),
        layerIndex: layerIndex ?? 0,
        sv
      };

      // Run 'on_start' scripts immediately for spawned instance
      parsedScripts.forEach((script: any) => {
        if (script.cmd === 'on_start') {
          if (script.listenerData) executeListenerLogic(script.listenerData, body, instObj, 'SpawnStart');
          else if (script.actionPart) executeAction(script.actionPart, body, instObj, 'SpawnStart');
        }
      });

      dynamicRef.push({
        id: body.label,
        gameObject: pObj,
        body,
        sv,
        sprite,
        width,
        height,
        expires: isParticle ? Date.now() + (settings?.lifetime || 1000) : undefined,
        name: pObj.name,
        layerIndex: layerIndex ?? 0
      });
    };

    // Declare roomStartTime BEFORE the instances loop so spawnTime is set correctly
    const collisionCooldowns = new Map<string, number>();

    // Sort instances by layer order
    const layers = currentRoom?.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }];
    const layerOrderMap = new Map(layers.map((l: any, i: number) => [l.id, i]));

    const sortedInstances = [...(currentRoom?.instances || [])].sort((a, b) => {
      const orderA = (layerOrderMap.get(a.layerId || layers[0].id) ?? 0) as number;
      const orderB = (layerOrderMap.get(b.layerId || layers[0].id) ?? 0) as number;
      return orderA - orderB;
    });

    // Create a map to preserve the original unsorted index of each instance
    const instanceToIndexMap = new Map(
      (currentRoom?.instances || []).map((i: any, idx: number) => [i.id, idx])
    );

    sortedInstances.forEach((inst: any) => {
      if (!inst) return;
      const originalIndex = instanceToIndexMap.get(inst.id) as number;
      if (originalIndex === undefined || originalIndex === null) return;
      const instLayerId = inst.layerId || (layers[0]?.id || 'default');
      const layer = layers.find((l: any) => l.id === instLayerId);
      const layerIndex = layers.findIndex((l: any) => l.id === instLayerId);
      if (layer && !layer.visible) return;
      const obj = objectMap.get(inst.objectId);
      if (!obj) return;

      // Pre-parse scripts (Legacy)
      const parsedScripts: any[] = obj.logic?.scripts?.map(s => {
        const doSplit = s.split(/ DO | do /);
        let actionPart = '';
        let cmd = '';
        let timerMs = 0;
        let p: string[] = [];

        if (doSplit.length > 1) {
          p = doSplit[0].split(':');
          actionPart = doSplit[1].trim();
          cmd = p[0].trim();
          if (cmd === 'on_timer') timerMs = parseInt(p[1], 10) || 1000;
        } else {
          p = s.split(':');
          cmd = p[0].trim();
          if (cmd === 'on_timer') timerMs = parseInt(p[1], 10) || 1000;

          if (cmd === 'collision' && p.length > 2) {
            actionPart = p.slice(2).join(':').trim();
          } else {
            actionPart = p.slice(cmd === 'on_timer' ? 2 : 1).join(':').trim();
          }
        }

        return {
          cmd,
          parts: p,
          actionPart,
          parsedAction: actionPart ? parseScriptAction(actionPart) : null,
          timerMs,
          lastTrigger: Date.now()
        };
      }) || [];

      // Pre-parse ALL other Visual Logic Editor listeners
      obj.logic?.listeners?.forEach((l: any) => {
        if (!l.parsedImmediate && !parsedImmediateCache.has(l) && l.immediateActions) {
          const parsed = l.immediateActions.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean);
          try {
            l.parsedImmediate = parsed;
          } catch (e) {
            parsedImmediateCache.set(l, parsed);
          }
        }
        if (!l.parsedSubConditions && !parsedSubConditionsCache.has(l) && l.subConditions) {
          const parsed = l.subConditions.map((sc: any) => ({
            ...sc,
            parsedActions: sc.actions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
            parsedElseActions: sc.elseActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
          }));
          try {
            l.parsedSubConditions = parsed;
          } catch (e) {
            parsedSubConditionsCache.set(l, parsed);
          }
        }
      });

      // Process Visual Logic Editor listeners
      obj.logic?.listeners?.forEach(l => {
        if (l.eventId?.startsWith('on_timer') || l.eventId === 'on_tick' || l.eventId === 'on_start' || l.eventId === 'on_empty' || l.eventId === 'on_full' || l.eventId === 'on_life_lost' || l.eventId === 'on_zero_lives' || l.eventId?.startsWith('when:')) {
          let cmd = l.eventId;
          if (l.eventId.startsWith('on_timer')) cmd = 'on_timer';
          else if (l.eventId.startsWith('when:')) cmd = 'when';
          const p = l.eventId.split(':');
          let timerMs = 1000;
          if (cmd === 'on_timer' && p.length > 1) {
            timerMs = parseInt(p[1], 10) || 1000;
          }

          parsedScripts.push({
            cmd,
            parts: p,
            actionPart: '',
            timerMs,
            lastRun: performance.now(),
            triggerCount: 0,
            conditionStr: l.eventId.startsWith('when:') ? l.eventId.slice(5).trim() : '',
            wasTrue: false,
            listenerData: l
          });
        }
      });

      const physics = obj.physics || {};
      const currentType = physics.bodyType || (physics.isStatic ? 'static' : 'dynamic');
      const isStatic = (currentType === 'static' || currentType === 'kinematic' || !physics.enabled || obj.behavior === 'emitter' || obj.behavior === 'tilemap') && obj.behavior !== 'player';
      const isSensor = !physics.enabled || currentType === 'kinematic' || !!physics.ignoreCollision || obj.behavior === 'tilemap';

      const pObj = objectMap.get(inst.objectId);
      if (!pObj) return;

      // GUI containers go to a separate list to avoid heavy re-renders in dynamicElements
      if (pObj.behavior === 'gui_container') {
        const sv = instanceSharedValues[originalIndex];
        if (sv) {
          sv.x.value = inst.x;
          sv.y.value = inst.y;
          sv.rot.value = (inst.angle || 0) * Math.PI / 180;
          sv.isColliding.value = 0;
          if (sv.flipX) sv.flipX.value = 1;
          svMap.set(inst.id, sv);
        }

        const instObj: GameObject = { ...pObj };
        if (pObj.health) instObj.health = { ...pObj.health };
        if (pObj.progress_bar) instObj.progress_bar = { ...pObj.progress_bar };
        if (pObj.sprite_repeater) instObj.sprite_repeater = { ...pObj.sprite_repeater };

        if (pObj.gui_hierarchy) {
          const cloneNodes = (nodes: any[]): any[] => nodes.map(n => ({
            ...n,
            children: n.children ? cloneNodes(n.children) : undefined
          }));
          instObj.gui_hierarchy = {
            ...pObj.gui_hierarchy,
            root: cloneNodes(pObj.gui_hierarchy.root || [])
          };
        }

        guiRef.push({
          id: inst.id,
          gameObject: instObj,
          sv: sv || instanceSharedValues[originalIndex],
          layerIndex: layerIndex >= 0 ? layerIndex : 0,
          _logicState: {
            obj: instObj,
            scripts: parsedScripts,
            tickScripts: parsedScripts.filter((s: any) => s && s.cmd === 'on_tick'),
            timerScripts: parsedScripts.filter((s: any) => s && s.cmd === 'on_timer' && s.timerMs > 0),
            whenScripts: parsedScripts.filter((s: any) => s && s.cmd === 'when'),
            health: instObj.health,
            progress_bar: instObj.progress_bar,
            sprite_repeater: instObj.sprite_repeater
          }
        });
        return;
      }

      const sprite = spriteMap.get(pObj.appearance?.spriteId || '');
      const isGrid = !!sprite?.grid?.enabled;
      const fw = isGrid ? sprite.grid.frameWidth : sprite?.width;
      const fh = isGrid ? sprite.grid.frameHeight : sprite?.height;

      let width = isGrid ? fw : (pObj.width || inst.width || fw || 32);
      let height = isGrid ? fh : (pObj.height || inst.height || fh || 32);

      const body = createBodyForObject(inst.x + width / 2, inst.y + height / 2, width, height, obj, {
        isStatic,
        isSensor,
        collisionFilter: physics.enabled ? { category: 0x0001, mask: 0xFFFFFFFF, group: 0 } : { category: 0x0000, mask: 0x0000, group: 0 },
        friction: obj.behavior === 'player' ? 0.001 : (physics.friction || 0.1),
        frictionAir: obj.behavior === 'player' ? 0.02 : 0.01,
        restitution: physics.restitution || 0.1,
        density: physics.density || 0.001,
        inertia: obj.behavior === 'player' ? Infinity : undefined,
        angle: (inst.angle || 0) * Math.PI / 180,
        label: inst.id // Room objects use instance ID
      });

      const instObj: GameObject = { ...obj };
      if (obj.health) instObj.health = { ...obj.health };
      if (obj.progress_bar) instObj.progress_bar = { ...obj.progress_bar };
      if (obj.sprite_repeater) instObj.sprite_repeater = { ...obj.sprite_repeater };

      if (obj.gui_hierarchy) {
        const cloneNodes = (nodes: any[]): any[] => nodes.map(n => ({
          ...n,
          children: n.children ? cloneNodes(n.children) : undefined
        }));
        instObj.gui_hierarchy = {
          ...obj.gui_hierarchy,
          root: cloneNodes(obj.gui_hierarchy.root || [])
        };
      }
      liveObjectsRef.current.set(inst.id, instObj);

      (body as any).gameInfo = {
        width,
        height,
        scripts: parsedScripts,
        tickScripts: parsedScripts.filter((s: any) => s && s.cmd === 'on_tick'),
        timerScripts: parsedScripts.filter((s: any) => s && s.cmd === 'on_timer' && s.timerMs > 0),
        whenScripts: parsedScripts.filter((s: any) => s && s.cmd === 'when'),
        constantVx: obj.logic?.constantVelocityX,
        obj: instObj,
        nameLower: obj.name?.toLowerCase(),
        behaviorLower: obj.behavior?.toLowerCase(),
        spawnTime: roomStartTime,
        layerIndex: layerIndex >= 0 ? layerIndex : 0,
        pbValue: makeMutable(obj.progress_bar?.currentValue || 0)
      };

      // Run 'on_start' scripts deferred so the engine/React state is settled
      const _onStartScripts = parsedScripts.filter((s: any) => s.cmd === 'on_start');
      if (_onStartScripts.length > 0) {
        const _body = body;
        const _instObj = instObj;
        setTimeout(() => {
          if (!isActiveRef.current) return;
          _onStartScripts.forEach((script: any) => {
            if (script.listenerData) executeListenerLogic(script.listenerData, _body, _instObj, 'StartTrigger');
            else if (script.actionPart) executeAction(script.actionPart, _body, _instObj, 'StartTrigger');
          });
        }, 100);
      }

      const sv = instanceSharedValues[originalIndex];
      if (sv) {
        sv.x.value = inst.x;
        sv.y.value = inst.y;
        sv.rot.value = (inst.angle || 0) * Math.PI / 180;
        sv.isColliding.value = 0;
        if (sv.flipX) sv.flipX.value = 1;
        if (sv.pbValue) sv.pbValue.value = instObj.progress_bar?.currentValue || 0;
        svMap.set(inst.id, sv);
        if ((body as any).gameInfo) (body as any).gameInfo.sv = sv;
      }

      newBodies.push(body);
      if (obj.behavior === 'player') playerBodies.push({
        body,
        obj,
        sv,
        isPlayer: true,
        jumpedThisPress: false
      });
      if (obj.behavior === 'emitter' || obj.behavior === 'particle') emitters.push({ body, obj, lastSpawn: 0 });
      dynamicRef.push({
        id: inst.id,
        gameObject: instObj,
        body,
        sv,
        sprite,
        width,
        height,
        name: instObj.name,
        layerIndex: layerIndex >= 0 ? layerIndex : 0,
        isRoomInstance: true,
        tileData: inst.tileData || {}
      });

      attachListeners(body, obj);
    });

    setDynamicElements([]); // Clear any leftover spawned elements
    setGuiInstances(guiRef);

    Matter.World.add(engine.world, newBodies);

    // Load static physics bodies for tilemap layers
    const tilemapBodies: Matter.Body[] = [];
    const GRID_SIZE = currentRoom?.settings?.gridSize ?? 32;

    layers.forEach((layer: any, layerIdx: number) => {
      if (layer.tileData && (layer.isSolid ?? true)) {
        const tileData = layer.tileData || {};
        const visited = new Set<string>();

        // Find painted keys
        const keys = Object.keys(tileData);
        if (keys.length === 0) return;

        let minCol = Infinity, maxCol = -Infinity;
        let minRow = Infinity, maxRow = -Infinity;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const commaIndex = k.indexOf(',');
          if (commaIndex !== -1) {
            const col = parseInt(k.substring(0, commaIndex), 10);
            const row = parseInt(k.substring(commaIndex + 1), 10);
            if (col < minCol) minCol = col;
            if (col > maxCol) maxCol = col;
            if (row < minRow) minRow = row;
            if (row > maxRow) maxRow = row;
          }
        }

        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const currentKey = `${c},${r}`;
            if (tileData[currentKey] !== undefined && !visited.has(currentKey)) {
              // 1. Find max width for this row
              let w = 0;
              while (
                tileData[`${c + w},${r}`] !== undefined &&
                !visited.has(`${c + w},${r}`)
              ) {
                w++;
              }

              // 2. See how far down we can extend this row of width w
              let h = 1;
              while (true) {
                const nextRow = r + h;
                let canExtend = true;
                for (let dx = 0; dx < w; dx++) {
                  const checkKey = `${c + dx},${nextRow}`;
                  if (
                    tileData[checkKey] === undefined ||
                    visited.has(checkKey)
                  ) {
                    canExtend = false;
                    break;
                  }
                }
                if (canExtend) {
                  h++;
                } else {
                  break;
                }
              }

              // 3. Mark the rectangle as visited
              for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                  visited.add(`${c + dx},${r + dy}`);
                }
              }

              // 4. Calculate dimensions and center position
              const boxWidth = w * GRID_SIZE;
              const boxHeight = h * GRID_SIZE;
              const tileX = c * GRID_SIZE + boxWidth / 2;
              const tileY = r * GRID_SIZE + boxHeight / 2;

              const tileBody = Matter.Bodies.rectangle(tileX, tileY, boxWidth, boxHeight, {
                isStatic: true,
                label: `tile_merged_${layer.id}_${c}_${r}_w${w}_h${h}`
              });

              (tileBody as any).gameInfo = {
                width: boxWidth,
                height: boxHeight,
                nameLower: 'tile',
                behaviorLower: 'static',
                spawnTime: roomStartTime,
                layerIndex: layerIdx
              };

              tilemapBodies.push(tileBody);
            }
          }
        }
      }
    });

    if (tilemapBodies.length > 0) {
      Matter.World.add(engine.world, tilemapBodies);
    }

    // Load static physics bodies for object-based tilemap instances
    const objTilemapBodies: Matter.Body[] = [];
    (currentRoom?.instances || []).forEach((inst: any) => {
      const obj = objectMap.get(inst.objectId);
      if (obj?.behavior === 'tilemap' && obj?.physics?.enabled !== false) {
        const tileData = inst.tileData || {};
        const visited = new Set<string>();

        const keys = Object.keys(tileData);
        if (keys.length === 0) return;

        let minCol = Infinity, maxCol = -Infinity;
        let minRow = Infinity, maxRow = -Infinity;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const commaIndex = k.indexOf(',');
          if (commaIndex !== -1) {
            const col = parseInt(k.substring(0, commaIndex), 10);
            const row = parseInt(k.substring(commaIndex + 1), 10);
            if (col < minCol) minCol = col;
            if (col > maxCol) maxCol = col;
            if (row < minRow) minRow = row;
            if (row > maxRow) maxRow = row;
          }
        }

        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const currentKey = `${c},${r}`;
            if (tileData[currentKey] !== undefined && !visited.has(currentKey)) {
              // 1. Find max width for this row
              let w = 0;
              while (
                tileData[`${c + w},${r}`] !== undefined &&
                !visited.has(`${c + w},${r}`)
              ) {
                w++;
              }

              // 2. See how far down we can extend this row of width w
              let h = 1;
              while (true) {
                const nextRow = r + h;
                let canExtend = true;
                for (let dx = 0; dx < w; dx++) {
                  const checkKey = `${c + dx},${nextRow}`;
                  if (
                    tileData[checkKey] === undefined ||
                    visited.has(checkKey)
                  ) {
                    canExtend = false;
                    break;
                  }
                }
                if (canExtend) {
                  h++;
                } else {
                  break;
                }
              }

              // 3. Mark the rectangle as visited
              for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                  visited.add(`${c + dx},${r + dy}`);
                }
              }

              // 4. Calculate absolute dimensions and center position
              const boxWidth = w * GRID_SIZE;
              const boxHeight = h * GRID_SIZE;
              const tileX = inst.x + (c * GRID_SIZE) + boxWidth / 2;
              const tileY = inst.y + (r * GRID_SIZE) + boxHeight / 2;

              const tileBody = Matter.Bodies.rectangle(tileX, tileY, boxWidth, boxHeight, {
                isStatic: true,
                label: `tile_merged_obj_${inst.id}_${c}_${r}_w${w}_h${h}`
              });

              (tileBody as any).gameInfo = {
                width: boxWidth,
                height: boxHeight,
                nameLower: obj.name?.toLowerCase() || 'tilemap',
                behaviorLower: 'static',
                spawnTime: roomStartTime,
                layerIndex: 0
              };

              objTilemapBodies.push(tileBody);
            }
          }
        }
      }
    });

    if (objTilemapBodies.length > 0) {
      Matter.World.add(engine.world, objTilemapBodies);
    }

    // Optimization: Create instance map for collision lookup
    const instanceMap = new Map<string, any>();
    (currentRoom?.instances || []).forEach((i: any) => instanceMap.set(i.id, i));

    // Collision actions are queued here and drained once per game-loop frame
    // (same pattern as inputJump — prevents phantom/duplicate triggers)
    const collisionQueue: Array<() => void> = [];

    Matter.Events.on(engine, 'collisionStart', (event) => {
      const now = Date.now();

      // Stronger room grace period
      if (now - roomStartTime < 1500) return;

      event.pairs.forEach(pair => {
        const infoA = (pair.bodyA as any).gameInfo;
        const infoB = (pair.bodyB as any).gameInfo;

        // Per-body spawn protection
        if (
          now - (infoA?.spawnTime || roomStartTime) < 150 ||
          now - (infoB?.spawnTime || roomStartTime) < 150
        ) return;

        const cooldownKey = `${pair.bodyA.label}_${pair.bodyB.label}`;
        if (collisionCooldowns.has(cooldownKey) && now - collisionCooldowns.get(cooldownKey)! < 150) return;
        collisionCooldowns.set(cooldownKey, now);

        const svA = svMap.get(pair.bodyA.label);
        const svB = svMap.get(pair.bodyB.label);

        if (svA) svA.isColliding.value = 1;
        if (svB) svB.isColliding.value = 1;

        const objA = infoA?.obj;
        const objB = infoB?.obj;

        // Even if one body isn't a GameObject (like a wall/tile), we still want to trigger logic for the one that is.
        const runCollisionLogic = (targetBody: Matter.Body, targetObj: GameObject, otherObj?: GameObject, otherBody?: Matter.Body) => {
          const info = (targetBody as any).gameInfo;
          const parsedScripts = info?.scripts || [];

          const otherNameLower = otherObj?.name?.toLowerCase() || 'tile';
          const otherBehaviorLower = otherObj?.behavior?.toLowerCase() || 'static';

          for (let i = 0; i < parsedScripts.length; i++) {
            const s = parsedScripts[i];

            // Check if it's a collision script
            const isColMatch = s.cmd === 'collision' && (
              s.parts[1]?.toLowerCase() === otherNameLower ||
              (otherBehaviorLower && s.parts[1]?.toLowerCase() === otherBehaviorLower)
            );

            // Generic on_collision now works for any object hit
            const isGenericCol = s.cmd === 'on_collision';

            if (isColMatch || isGenericCol) {
              if (s.actionPart) {
                collisionQueue.push(() =>
                  executeAction(s.actionPart, targetBody, targetObj, `Collision:${otherNameLower}`, otherBody)
                );
              }
            }
          }
        };

        // Also run visual logic listeners for on_collision
        const fireCollisionListeners = (targetBody: Matter.Body, targetObj: GameObject, otherObj?: GameObject, otherBody?: Matter.Body) => {
          const otherName = otherObj?.name || 'Tile';
          const otherBehavior = otherObj?.behavior || 'static';

          targetObj.logic?.listeners?.forEach((l: any) => {
            if (l.eventId === 'on_collision') {
              collisionQueue.push(() => executeListenerLogic(l, targetBody, targetObj, 'CollisionListener', otherBody, otherObj));
            } else if (l.eventId === `collision:${otherName}` || l.eventId === `collision:${otherBehavior}`) {
              collisionQueue.push(() => executeListenerLogic(l, targetBody, targetObj, 'CollisionListener', otherBody, otherObj));
            }
          });
        };

        if (objA) {
          runCollisionLogic(pair.bodyA, objA, objB, pair.bodyB);
          fireCollisionListeners(pair.bodyA, objA, objB, pair.bodyB);
        }
        if (objB) {
          runCollisionLogic(pair.bodyB, objB, objA, pair.bodyA);
          fireCollisionListeners(pair.bodyB, objB, objA, pair.bodyA);
        }

        // Emit events for decoupled systems (HUDs, etc)
        const eventDataA = {
          targetId: pair.bodyA.label,
          otherId: pair.bodyB.label,
          otherName: objB?.name || 'Tile',
          otherBehavior: objB?.behavior || 'static',
          otherBody: pair.bodyB,
          otherObj: objB
        };

        const eventDataB = {
          targetId: pair.bodyB.label,
          otherId: pair.bodyA.label,
          otherName: objA?.name || 'Tile',
          otherBehavior: objA?.behavior || 'static',
          otherBody: pair.bodyA,
          otherObj: objA
        };

        if (objB) DeviceEventEmitter.emit(`collision:${objB.name}`, eventDataA);
        DeviceEventEmitter.emit('on_collision', eventDataA);
        if (objA) DeviceEventEmitter.emit(`collision:${objA.name}`, eventDataB);
        DeviceEventEmitter.emit('on_collision', eventDataB);

        // Automatic Sound Triggers for Collisions (e.g. Bullets Impact)
        if (objA?.behavior === 'bullet' && objA.sounds?.hit) playSoundEffect(objA.sounds.hit);
        if (objB?.behavior === 'bullet' && objB.sounds?.hit) playSoundEffect(objB.sounds.hit);
      });
    });

    Matter.Events.on(engine, 'collisionEnd', (event) => {
      event.pairs.forEach(pair => {
        const svA = svMap.get(pair.bodyA.label);
        const svB = svMap.get(pair.bodyB.label);
        if (svA) svA.isColliding.value = 0;
        if (svB) svB.isColliding.value = 0;
      });
    });

    // Direct ground check query (much more reliable than events)
    const checkGroundDirect = (body: Matter.Body) => {
      const pairs = engine.pairs.list;
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if (!pair.isActive) continue;
        if (pair.bodyA.id === body.id && pair.collision.normal.y > 0.1) return true;
        if (pair.bodyB.id === body.id && pair.collision.normal.y < -0.1) return true;
      }
      return false;
    };

    let frameId: number;
    let fpsFrames = 0;
    let fpsLastTime = Date.now();
    let lastSyncedLength = 0;



    let bodiesUpdateCounter = 0;
    let cameraInitialized = false;
    const update = () => {
      if (!isActiveRef.current) return;
      if (!isPlayingRef.current) { frameId = requestAnimationFrame(update); return; }
      const now = Date.now();
      const nowPrecision = getPrecisionTime();
      const dt = nowPrecision - lastFrameTime;
      lastFrameTime = nowPrecision;

      const utStart = getPrecisionTime();
      let utTime = 0;
      let rtStart = 0;
      let rtTime = 0;

      // Refresh body cache — avoid full traversal every frame if possible
      // (Matter.Composite.allBodies is O(N) but can be expensive with many nested composites)
      if (bodiesUpdateCounter++ % 2 === 0 || !cachedBodies) {
        cachedBodies = Matter.Composite.allBodies(engine.world);
      }

      // Calculate FPS & Refresh Statistics
      fpsFrames++;
      if (now - fpsLastTime >= 1000) {
        fpsShared.value = fpsFrames;

        const bodies = Matter.Composite.allBodies(engine.world);
        const partsCount = bodies.reduce((acc, b) => acc + (b.parts ? b.parts.length : 1), 0);
        const bodiesCount = bodies.length;
        const constraintsCount = Matter.Composite.allConstraints(engine.world).length;
        const compositesCount = Matter.Composite.allComposites(engine.world).length;
        const pairsCount = engine.pairs?.list?.length || 0;

        const avgDt = statsAccumulator.count > 0 ? (statsAccumulator.dtSum / statsAccumulator.count) : 16.67;
        const avgUt = statsAccumulator.count > 0 ? (statsAccumulator.utSum / statsAccumulator.count) : 0;
        const avgRt = statsAccumulator.count > 0 ? (statsAccumulator.rtSum / statsAccumulator.count) : 0;

        setPhysicsStats({
          partCount: partsCount,
          bodyCount: bodiesCount,
          consCount: constraintsCount,
          compCount: compositesCount,
          pairCount: pairsCount,
          fps: fpsFrames,
          dt: avgDt,
          upf: 1,
          ut: avgUt,
          rt: avgRt,
          timeScale: engine.timing?.timeScale || 1.0
        });

        setUtHistory(prev => {
          const next = [...prev];
          next.shift();
          next.push(avgUt);
          return next;
        });

        setRtHistory(prev => {
          const next = [...prev];
          next.shift();
          next.push(avgRt);
          return next;
        });

        // Reset accumulators
        statsAccumulator.dtSum = 0;
        statsAccumulator.utSum = 0;
        statsAccumulator.rtSum = 0;
        statsAccumulator.count = 0;

        fpsFrames = 0;
        fpsLastTime = now;
      } else {
        // Accumulate stats
        statsAccumulator.dtSum += dt;
      }

      globalFrameTimer.value = now - roomStartTime;

      // Drain collision queue (actions queued from physics events this frame)
      if (collisionQueue.length > 0) {
        const toRun = collisionQueue.splice(0);
        toRun.forEach(fn => fn());
      }

      // 1. Run Physics Engine
      Matter.Engine.update(engine, 1000 / 60);
      physicsFrameCounter++;

      // Build performance lookup indices for scripts/logic (Optimized memory reuse)
      nameLookupRef.current.clear();
      // Reuse existing arrays in behaviorLookupRef to minimize GC
      behaviorLookupRef.current.forEach(arr => arr.length = 0);

      for (let i = 0; i < cachedBodies.length; i++) {
        const b = cachedBodies[i];
        const info = (b as any).gameInfo;
        if (!info?.obj) continue;

        if (info.nameLower) nameLookupRef.current.set(info.nameLower, b);
        if (info.behaviorLower) {
          let arr = behaviorLookupRef.current.get(info.behaviorLower);
          if (!arr) {
            arr = [];
            behaviorLookupRef.current.set(info.behaviorLower, arr);
          }
          arr.push(b);
        }
      }

      // Note: on_tick scripts are processed directly in the body loop below.
      // DeviceEventEmitter.emit('on_tick') was removed — no listener is attached
      // (attachListeners skips on_tick), so emitting it was pure overhead.

      // 2. Process Player Inputs & Actions
      playerBodies.forEach(pb => {
        const b = pb.body;
        const c = pb.obj.physics || {};
        const combat = pb.obj.combat || {};

        // Jump Handling (Direct detection + Coyote Time + Jump Buffer)
        const onGround = checkGroundDirect(b);
        if (onGround) (pb as any).lastOnGroundTime = now;

        const canJump = onGround || (now - ((pb as any).lastOnGroundTime || 0) < 300); // More generous 300ms
        let didJump = false;

        if (inputJump.current === 1 || inputTap.current === 1) {
          if (!pb.jumpedThisPress && canJump) {
            pb.jumpedThisPress = true;
            didJump = true;
            executeAction('jump', b, pb.obj, 'InputLoop');
            DeviceEventEmitter.emit('builtin_jump', { targetId: b.label });
          }
        } else {
          pb.jumpedThisPress = false;
        }

        // Horizontal Movement
        if (inputLeft.current === 1) {
          executeAction('move_left', b, pb.obj, 'InputLoop');
          DeviceEventEmitter.emit('builtin_left', { targetId: b.label });
        } else if (inputRight.current === 1) {
          executeAction('move_right', b, pb.obj, 'InputLoop');
          DeviceEventEmitter.emit('builtin_right', { targetId: b.label });
        } else {
          // Horizontal Stop / Damping when no horizontal movement keys are pressed
          Matter.Body.setVelocity(b, { x: b.velocity.x * 0.85, y: b.velocity.y });
        }

        // Vertical Movement
        if (inputUp.current === 1) {
          executeAction('move_up', b, pb.obj, 'InputLoop');
          DeviceEventEmitter.emit('builtin_up', { targetId: b.label });
        } else if (inputDown.current === 1) {
          executeAction('move_down', b, pb.obj, 'InputLoop');
          DeviceEventEmitter.emit('builtin_down', { targetId: b.label });
        } else if (engine.gravity.y === 0) {
          // Vertical Stop / Damping only in zero gravity environments
          Matter.Body.setVelocity(b, { x: b.velocity.x, y: b.velocity.y * 0.85 });
        }

        // Play jump sound
        if (didJump && pb.obj.sounds?.jump) {
          playSoundEffect(pb.obj.sounds.jump);
        }

        // Automatic Running Sound (approx once every 300ms)
        if (onGround && Math.abs(b.velocity.x) > 1 && pb.obj.sounds?.run) {
          const pbAny = pb as any;
          if (!pbAny.lastRunSoundTime || now - pbAny.lastRunSoundTime > 300) {
            playSoundEffect(pb.obj.sounds.run);
            pbAny.lastRunSoundTime = now;
          }
        }

        // Update animation state based on velocity (fresh from body)
        let anim = 0; // idle
        if (Math.abs(b.velocity.x) > 0.5) anim = 1; // move
        if (Math.abs(b.velocity.y) > 1) anim = 2; // jump/fall
        if (pb.sv) pb.sv.animState.value = anim;

        // Combat
        if (inputShoot.current === 1) {
          if (combat?.canShoot && combat?.bulletObjectId) {
            const dir = b.velocity.x >= 0 ? 0 : 180;
            spawnInstance(combat.bulletObjectId, b.position.x + (dir === 0 ? 20 : -20), b.position.y, true, {
              speed: combat.shootSpeed || 7,
              angle: dir,
              lifetime: 1500,
              spread: 0 // Bullets shoot straight
            });
            if (pb.obj.sounds?.shoot) playSoundEffect(pb.obj.sounds.shoot);
          }
        }
      });

      // 3. Consume tap inputs after all players have processed them
      inputJump.current = 0;
      inputShoot.current = 0;
      inputTap.current = 0;

      // Physics update is now at the start of the frame for better input response

      // Emitters
      emitters.forEach(e => {
        const s = e.obj.emitter;
        if (!s?.enabled || !s.particleObjectId) return;

        // Logic Culling for Emitters (Optimized distance check)
        const isHUD = e.obj.isHUD === true;
        const dx = e.body.position.x - (cameraRef.current.x + gameWidth / 2);
        const dy = e.body.position.y - (cameraRef.current.y + gameHeight / 2);
        const distSq = dx * dx + dy * dy;
        if (!isHUD && distSq > (Math.max(gameWidth, gameHeight) * 1.5) ** 2) return;

        if (now - e.lastSpawn > 1000 / (s.rate || 5)) {
          e.lastSpawn = now;
          const layerIndex = (e.body as any).gameInfo?.layerIndex ?? 0;
          spawnInstance(s.particleObjectId, e.body.position.x, e.body.position.y, true, { ...(s || {}), angle: e.body.angle * 180 / Math.PI }, layerIndex);
        }
      });


      let dynamicChanged = false;

      // 1. Cleanup expired dynamic elements (bullets, etc) OR out-of-bounds entities (e.g., fell into a pit)
      const currentRoomInLoop = roomRef.current;
      const roomW = currentRoomInLoop?.width || 800;
      const roomH = currentRoomInLoop?.height || 600;

      for (let i = dynamicRef.length - 1; i >= 0; i--) {
        const d = dynamicRef[i];
        let shouldDestroy = false;

        // Particles/bullets lifetime expiry
        if (d.expires && now > d.expires) {
          shouldDestroy = true;
        }

        // Out of bounds detection (excluding the main camera target player, static bodies, and preserving horizontally-placed room instances)
        if (d.body && d.body !== cameraTargetBodyRef.current && !d.body.isStatic) {
          const px = d.body.position.x;
          const py = d.body.position.y;

          if (d.isRoomInstance) {
            // Room instances (placed by level editor) should only be destroyed if they fall deep into a pit,
            // never horizontally or above.
            if (py > roomH + 1000) {
              shouldDestroy = true;
            }
          } else {
            // Spawned entities (particles, bullets, etc.) are cleaned up strictly
            if (
              py > roomH + 400 ||
              py < -1500 ||
              px < -1500 ||
              px > roomW + 1500
            ) {
              shouldDestroy = true;
            }
          }
        }

        if (shouldDestroy) {
          if (d.body) Matter.World.remove(engine.world, d.body);
          dynamicRef.splice(i, 1);
          dynamicChanged = true;
        }
      }

      // 1.5 Safety cap to prevent infinite loop spawning from choking the engine
      const MAX_DYNAMIC_ENTITIES = 120;
      if (dynamicRef.length > MAX_DYNAMIC_ENTITIES) {
        let oldestPruneIndex = -1;
        for (let i = 0; i < dynamicRef.length; i++) {
          const d = dynamicRef[i];
          const isPlayerObj = d.body === cameraTargetBodyRef.current || d.gameObject?.behavior === 'player' || d.gameObject?.name?.toLowerCase().includes('player');
          // Don't prune the player, or static instances, or room instances
          if (d.body && !isPlayerObj && !d.isRoomInstance && !d.body.isStatic) {
            oldestPruneIndex = i;
            break;
          }
        }

        if (oldestPruneIndex !== -1) {
          const oldest = dynamicRef[oldestPruneIndex];
          if (oldest.body) Matter.World.remove(engine.world, oldest.body);
          dynamicRef.splice(oldestPruneIndex, 1);
          dynamicChanged = true;
        }
      }

      const bodyCount = cachedBodies.length;
      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;
      const logicCullRange = Math.max(gameWidth, gameHeight) * 1.5;

      const runScriptLogic = (body: Matter.Body | null, info: any) => {
        if (!info || !info.scripts || info.scripts.length === 0) return;

        // Progress Bar Special Logic
        if (info.obj?.progress_bar) {
          const pb = info.obj.progress_bar;
          if (info.targetValue !== undefined && info.tweenRate !== undefined) {
            pb.currentValue += info.tweenRate;
            if (info.sv?.pbValue) info.sv.pbValue.value = pb.currentValue;
            else setNonce(n => n + 1); // HUD update

            if ((info.tweenRate > 0 && pb.currentValue >= info.targetValue) ||
              (info.tweenRate < 0 && pb.currentValue <= info.targetValue)) {
              pb.currentValue = info.targetValue;
              if (info.sv?.pbValue) info.sv.pbValue.value = pb.currentValue;
              else setNonce(n => n + 1); // HUD final sync
              info.targetValue = undefined;
            }
          }

          let val = pb.currentValue;
          if (pb.linkedVariable) {
            val = resolveValue(pb.linkedVariable, body, info.obj);
            // sync progress bar value with linked variable and force UI refresh
            pb.currentValue = val;
            if (info.sv?.pbValue) info.sv.pbValue.value = val;
            setNonce(n => n + 1);
          }
          const isEmpty = val <= pb.minValue;
          const isFull = val >= pb.maxValue;
          if (isEmpty && !info.wasEmpty) {
            info.wasEmpty = true;
            info.scripts.filter((s: any) => s.cmd === 'on_empty').forEach((s: any) => {
              if (s.listenerData) executeListenerLogic(s.listenerData, body, info.obj, 'EmptyLoop');
              s.triggerCount = (s.triggerCount || 0) + 1;
              s.lastAction = 'on_empty';
            });
          } else if (!isEmpty) info.wasEmpty = false;

          if (isFull && !info.wasFull) {
            info.wasFull = true;
            info.scripts.filter((s: any) => s.cmd === 'on_full').forEach((s: any) => {
              if (s.listenerData) executeListenerLogic(s.listenerData, body, info.obj, 'FullLoop');
              s.triggerCount = (s.triggerCount || 0) + 1;
              s.lastAction = 'on_full';
            });
          } else if (!isFull) info.wasFull = false;
        }

        // Sprite Repeater Special Logic
        if (info.obj?.sprite_repeater) {
          const sr = info.obj.sprite_repeater;
          let count = sr.currentCount;
          if (sr.linkedVariable) {
            count = Number(resolveValue(sr.linkedVariable, body, info.obj)) || 0;
            if (count !== sr.currentCount) {
              sr.currentCount = count;
              setNonce(n => n + 1);
            }
          }
          if (info.lastCount === undefined) info.lastCount = count;
          if (count < info.lastCount) {
            info.scripts.filter((s: any) => s.cmd === 'on_life_lost').forEach((s: any) => {
              if (s.listenerData) executeListenerLogic(s.listenerData, body, info.obj, 'LifeLost');
              s.triggerCount = (s.triggerCount || 0) + 1;
              s.lastAction = 'on_life_lost';
            });
          }
          if (count <= 0 && info.lastCount > 0) {
            info.scripts.filter((s: any) => s.cmd === 'on_zero_lives').forEach((s: any) => {
              if (s.listenerData) executeListenerLogic(s.listenerData, body, info.obj, 'ZeroLives');
              s.triggerCount = (s.triggerCount || 0) + 1;
              s.lastAction = 'on_zero_lives';
            });
          }
          info.lastCount = count;
        }

        // General Triggers (Tick & Timer) using pre-categorized lists to bypass any on-tick lookup tax
        const tickScripts = info.tickScripts || [];
        const timerScripts = info.timerScripts || [];
        const tickLen = tickScripts.length;
        const timerLen = timerScripts.length;

        for (let i = 0; i < tickLen; i++) {
          const script = tickScripts[i];
          if (script.listenerData) executeListenerLogic(script.listenerData, body, info, 'TickLoop');
          else if (script.actionPart) executeAction(script.actionPart, body, info, 'TickLoop');
          script.triggerCount = (script.triggerCount || 0) + 1;
          script.lastAction = script.actionPart || 'Listener';
        }

        for (let i = 0; i < timerLen; i++) {
          const script = timerScripts[i];
          if (!script.lastRun) script.lastRun = now;
          if (now - script.lastRun > script.timerMs) {
            if (script.listenerData) executeListenerLogic(script.listenerData, body, info, 'TimerLoop');
            else if (script.actionPart) executeAction(script.actionPart, body, info, 'TimerLoop');
            script.lastRun = now;
            script.triggerCount = (script.triggerCount || 0) + 1;
            script.lastAction = script.actionPart || 'Listener';
          }
        }

        // Stateful edge-triggered variable comparison checks (WHEN...)
        const whenScripts = info.whenScripts || [];
        const whenLen = whenScripts.length;
        if (whenLen > 0) {
          const evaluateCondition = (cond: string, curBody: Matter.Body | null, curObj: any): boolean => {
            if (!cond) return false;
            const match = cond.match(/^(.+?)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
            if (!match) {
              const resolved = resolveValue(cond, curBody, curObj?.obj || curObj);
              return Boolean(resolved);
            }
            const lhsStr = match[1].trim();
            const op = match[2].trim();
            const rhsStr = match[3].trim();

            const lhsVal = resolveValue(lhsStr, curBody, curObj?.obj || curObj);
            const rhsVal = resolveValue(rhsStr, curBody, curObj?.obj || curObj);

            switch (op) {
              case '>': return Number(lhsVal) > Number(rhsVal);
              case '<': return Number(lhsVal) < Number(rhsVal);
              case '==': return lhsVal == rhsVal;
              case '!=': return lhsVal != rhsVal;
              case '>=': return Number(lhsVal) >= Number(rhsVal);
              case '<=': return Number(lhsVal) <= Number(rhsVal);
              default: return false;
            }
          };

          for (let i = 0; i < whenLen; i++) {
            const script = whenScripts[i];
            const isTrue = evaluateCondition(script.conditionStr, body, info);
            if (isTrue && !script.wasTrue) {
              if (script.listenerData) executeListenerLogic(script.listenerData, body, info, 'WhenTrigger');
              else if (script.actionPart) executeAction(script.actionPart, body, info, 'WhenTrigger');
              script.triggerCount = (script.triggerCount || 0) + 1;
              script.lastAction = script.actionPart || 'Listener';
            }
            script.wasTrue = isTrue;
          }
        }
      };

      // A. Process World Body Logic
      for (let i = 0; i < bodyCount; i++) {
        const body = cachedBodies[i];
        const info = (body as any).gameInfo;
        if (!info) continue;

        // Apply custom gravity scale
        const gScale = (body as any).gravityScale;
        if (gScale !== undefined && gScale !== 1) {
          Matter.Body.applyForce(body, body.position, {
            x: 0,
            y: body.mass * (engine.gravity.y * engine.gravity.scale) * (gScale - 1)
          });
        }

        // Culling Check
        const dx = body.position.x - (camX + gameWidth / 2);
        const dy = body.position.y - (camY + gameHeight / 2);
        const isTarget = cameraTargetBodyRef.current === body;
        const isHUD = info.obj?.isHUD === true;
        if (!isTarget && !isHUD && (Math.abs(dx) > logicCullRange || Math.abs(dy) > logicCullRange)) continue;

        runScriptLogic(body, info);

        if (info.constantVx !== undefined) {
          Matter.Body.setVelocity(body, { x: info.constantVx, y: body.velocity.y });
        }

        if (info.moveTowards !== undefined) {
          const { target, speed } = info.moveTowards;
          let targetX = 0;
          let targetY = 0;
          let foundTarget = false;

          if (typeof target === 'object' && target !== null && typeof (target as any).x === 'number') {
            targetX = (target as any).x;
            targetY = (target as any).y;
            foundTarget = true;
          } else if (typeof target === 'string') {
            const targetLower = target.toLowerCase();
            const targetBody = cachedBodies.find(b => {
              const bInfo = (b as any).gameInfo;
              return b !== body && (
                bInfo?.obj?.behavior?.toLowerCase() === targetLower ||
                bInfo?.obj?.name?.toLowerCase() === targetLower
              );
            });
            if (targetBody) {
              targetX = targetBody.position.x;
              targetY = targetBody.position.y;
              foundTarget = true;
            }
          }

          if (foundTarget) {
            const mDx = targetX - body.position.x;
            const mDy = targetY - body.position.y;
            const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
            let moveSpeed = 1;
            if (speed !== undefined && speed !== null && speed !== '') {
              const parsed = Number(speed);
              if (!isNaN(parsed)) {
                moveSpeed = parsed;
              }
            }

            if (mDist > 8) {
              const vx = (mDx / mDist) * moveSpeed;
              const vy = (mDy / mDist) * moveSpeed;
              Matter.Body.setVelocity(body, { x: vx, y: vy });
            } else {
              Matter.Body.setVelocity(body, { x: 0, y: 0 });
              if (typeof target === 'object') {
                info.moveTowards = undefined; // Arrived at coordinate
              }
            }
          }
        }

        // Position Sync Optimization: Only update SV if body moved
        if (body.isStatic && body.position.x === (body as any).lastX && body.position.y === (body as any).lastY) continue;

        const col = info.obj?.physics?.collision;
        const offsetX = col?.offsetX || 0;
        const offsetY = col?.offsetY || 0;
        const scale = info.obj?.physics?.scale || info.scale || 1;
        const sv = info.sv || svMap.get(body.label);

        if (sv && sv.x && sv.y) {
          sv.x.value = body.position.x - (info.width / 2 + offsetX) * scale;
          sv.y.value = body.position.y - (info.height / 2 + offsetY) * scale;
          sv.rot.value = body.angle;
          (body as any).lastX = body.position.x;
          (body as any).lastY = body.position.y;
        }
      }

      // A2. Raycasting Engine (Plugins System)
      const activeLasers: any[] = [];
      for (let i = 0; i < bodyCount; i++) {
        const body = cachedBodies[i];
        const info = (body as any).gameInfo;
        if (!info || !info.obj) continue;

        const plugins = info.obj.plugins || [];
        if (plugins.length === 0) continue;

        if (!info.raycastResults) info.raycastResults = {};

        plugins.forEach((plugin: any) => {
          if (plugin.type !== 'raycast' || !plugin.enabled) return;

          const range = plugin.settings?.range ?? 200;
          const direction = plugin.settings?.direction ?? 'forward';
          const flipX = info.sv?.flipX?.value ?? 1;

          let baseAngle = body.angle;
          if (flipX === -1) {
            baseAngle += Math.PI;
          }

          let targetAngle = baseAngle;
          if (direction === 'backward') {
            targetAngle += Math.PI;
          } else if (direction === 'down') {
            targetAngle = body.angle + Math.PI / 2;
          } else if (direction === 'up') {
            targetAngle = body.angle - Math.PI / 2;
          } else if (direction === 'angle') {
            const radOffset = (plugin.settings?.angleOffset ?? 0) * Math.PI / 180;
            targetAngle = baseAngle + (flipX === -1 ? -radOffset : radOffset);
          }

          const startX = body.position.x;
          const startY = body.position.y;
          const endX = startX + Math.cos(targetAngle) * range;
          const endY = startY + Math.sin(targetAngle) * range;

          let closestHit: { x: number; y: number } | null = null;
          let closestDist = range;
          let closestBody: Matter.Body | null = null;

          // Optimization: Pre-filter bodies according to detectType & isSensor
          const eligibleBodies = cachedBodies.filter(targetBody => {
            if (targetBody.id === body.id) return false;
            if (targetBody.isSensor) return false;

            const targetInfo = (targetBody as any).gameInfo;
            const detectType = plugin.settings?.detectType ?? 'any';

            if (detectType === 'solid' && !targetBody.isStatic) return false;
            if (detectType === 'player' && !isPlayer(targetInfo?.obj)) return false;
            if (detectType === 'enemy' && targetInfo?.obj?.behavior?.toLowerCase() !== 'enemy') return false;
            if (detectType === 'behavior' && targetInfo?.obj?.behavior?.toLowerCase() !== plugin.settings?.targetValue?.toLowerCase()) return false;
            if (detectType === 'name' && targetInfo?.obj?.name?.toLowerCase() !== plugin.settings?.targetValue?.toLowerCase()) return false;

            return true;
          });

          // Use Matter.js native, highly optimized spatial-grid raycast query
          const collisions = Matter.Query.ray(eligibleBodies, { x: startX, y: startY }, { x: endX, y: endY }, plugin.settings?.rayWidth || 1);

          let minFraction = 1.01;

          for (let cIdx = 0; cIdx < collisions.length; cIdx++) {
            const col = collisions[cIdx];
            const hitBody = (col as any).body;
            if (!hitBody) continue;

            const intersection = getBodyIntersection(hitBody, startX, startY, endX, endY);
            if (intersection && intersection.fraction < minFraction) {
              minFraction = intersection.fraction;
              closestHit = { x: intersection.x, y: intersection.y };
              closestDist = intersection.fraction * range;
              closestBody = hitBody;
            }
          }

          const lowerName = plugin.name.toLowerCase();
          const prevResult = info.raycastResults[lowerName];

          const isHit = closestHit !== null;
          const currentResult = {
            hit: isHit,
            distance: closestDist,
            hitX: closestHit ? closestHit.x : endX,
            hitY: closestHit ? closestHit.y : endY,
            hitObject: closestBody ? (closestBody as any).gameInfo?.obj : null
          };

          info.raycastResults[lowerName] = currentResult;

          if (prevResult) {
            if (currentResult.hit && !prevResult.hit) {
              info.obj.logic?.listeners?.forEach((l: any) => {
                if (l.eventId === 'on_raycast_hit' || l.eventId === `on_raycast_hit:${plugin.name}`) {
                  collisionQueue.push(() => executeListenerLogic(l, body, info.obj, `RaycastHit:${plugin.name}`, closestBody || undefined, closestBody ? (closestBody as any).gameInfo?.obj : undefined));
                }
              });
            } else if (!currentResult.hit && prevResult.hit) {
              info.obj.logic?.listeners?.forEach((l: any) => {
                if (l.eventId === 'on_raycast_clear' || l.eventId === `on_raycast_clear:${plugin.name}`) {
                  collisionQueue.push(() => executeListenerLogic(l, body, info.obj, `RaycastClear:${plugin.name}`));
                }
              });
            }
          } else {
            // Edge case: first frame of hitting
            if (currentResult.hit) {
              info.obj.logic?.listeners?.forEach((l: any) => {
                if (l.eventId === 'on_raycast_hit' || l.eventId === `on_raycast_hit:${plugin.name}`) {
                  collisionQueue.push(() => executeListenerLogic(l, body, info.obj, `RaycastHit:${plugin.name}`, closestBody || undefined, closestBody ? (closestBody as any).gameInfo?.obj : undefined));
                }
              });
            }
          }

          if (plugin.settings?.visualize && debug) {
            activeLasers.push({
              id: `${body.id}_${plugin.id}`,
              startX,
              startY,
              endX: currentResult.hitX,
              endY: currentResult.hitY,
              color: plugin.settings?.laserColor || '#FF0000'
            });
          }
        });
      }

      if (activeLasers.length > 0 || lasersRef.current.length > 0) {
        setLasers(activeLasers);
        lasersRef.current = activeLasers;
      }

      // B. Process GUI Logic (Hierarchical)
      const processGuiLogicRecursive = (nodes: any[]) => {
        nodes.forEach(node => {
          const obj = objectMap.get(node.objectId);
          if (obj?.logic?.scripts || obj?.logic?.listeners) {
            // Lazy-init logic state for GUI nodes if needed
            if (!node._logicState) {
              const scripts: any[] = [...(obj.logic.scripts || [])].map(s => {
                const doSplit = s.split(/ DO | do /);
                let actionPart = '';
                let cmd = '';
                let timerMs = 1000;
                let p: string[] = [];

                if (doSplit.length > 1) {
                  p = doSplit[0].split(':');
                  actionPart = doSplit[1].trim();
                  cmd = p[0].trim();
                  if (cmd === 'on_timer') timerMs = parseInt(p[1], 10) || 1000;
                } else {
                  p = s.split(':');
                  cmd = p[0].trim();
                  if (cmd === 'on_timer') {
                    timerMs = parseInt(p[1], 10) || 1000;
                    actionPart = p.slice(2).join(':').trim();
                  } else {
                    actionPart = p.slice(1).join(':').trim();
                  }
                }
                return { cmd, timerMs, actionPart, lastRun: Date.now(), triggerCount: 0 };
              });

              // Also add Action Builder listeners
              obj.logic?.listeners?.forEach((l: any) => {
                if (l.eventId === 'on_tick' || l.eventId?.startsWith('on_timer') || l.eventId?.startsWith('when:')) {
                  let cmd = l.eventId;
                  let timerMs = 1000;
                  if (l.eventId.startsWith('on_timer')) {
                    cmd = 'on_timer';
                    timerMs = parseInt(l.eventId.split(':')[1]) || 1000;
                  } else if (l.eventId.startsWith('when:')) {
                    cmd = 'when';
                  }
                  scripts.push({
                    cmd,
                    timerMs,
                    lastRun: performance.now(),
                    triggerCount: 0,
                    conditionStr: l.eventId.startsWith('when:') ? l.eventId.slice(5).trim() : '',
                    wasTrue: false,
                    listenerData: {
                      ...l,
                      parsedImmediate: l.immediateActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
                      parsedSubConditions: l.subConditions?.map((sc: any) => ({
                        ...sc,
                        parsedActions: sc.actions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
                        parsedElseActions: sc.elseActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
                      }))
                    }
                  });
                }
              });

              const liveObj: GameObject = { ...obj };
              if (obj.health) liveObj.health = { ...obj.health };
              if (obj.progress_bar) liveObj.progress_bar = { ...obj.progress_bar };
              if (obj.sprite_repeater) liveObj.sprite_repeater = { ...obj.sprite_repeater };

              const filteredScripts = scripts.filter(Boolean);
              node._logicState = {
                obj: liveObj,
                scripts: filteredScripts,
                tickScripts: filteredScripts.filter((s: any) => s && s.cmd === 'on_tick'),
                timerScripts: filteredScripts.filter((s: any) => s && s.cmd === 'on_timer' && s.timerMs > 0),
                whenScripts: filteredScripts.filter((s: any) => s && s.cmd === 'when'),
                health: liveObj.health,
                sprite_repeater: liveObj.sprite_repeater,
                progress_bar: liveObj.progress_bar
              };
            }
            runScriptLogic(null, node._logicState);
          }
          if (node.children) processGuiLogicRecursive(node.children);
        });
      };

      guiRef.forEach(inst => {
        // Run logic on the container itself
        if (inst._logicState) {
          runScriptLogic(null, inst._logicState);
        }
        // Run logic on nested elements
        if (inst.gameObject.gui_hierarchy?.root) {
          processGuiLogicRecursive(inst.gameObject.gui_hierarchy.root);
        }
      });

      utTime = getPrecisionTime() - utStart;
      rtStart = getPrecisionTime();

      if (dynamicChanged || dynamicRef.length !== lastSyncedLength) {
        // Optimized: Only copy essential data for React state
        const elements = [];
        for (let i = 0; i < dynamicRef.length; i++) {
          const dx = dynamicRef[i];
          if (dx.isRoomInstance) continue; // Skip room instances, rendered by staticElements
          elements.push({
            id: dx.id,
            gameObject: dx.gameObject,
            sprite: dx.sprite,
            sv: dx.sv,
            width: dx.width,
            height: dx.height,
            name: String(dx.name || ''),
            layerIndex: dx.layerIndex || 0
          });
        }
        setDynamicElements(elements);
        lastSyncedLength = dynamicRef.length;
      }

      // --- Camera Follow ---
      // Use ref to avoid stale closure on room settings

      const camSettings = currentRoomInLoop?.settings?.camera;

      if (camSettings?.enabled) {
        const zoom = camSettings.zoom || 1;
        const rw = currentRoomInLoop?.width || 800;
        const rh = currentRoomInLoop?.height || 600;
        const gw = Math.min(rw, 800);
        const gh = Math.min(rh, 600);

        // Find target body — cache in ref, only re-search when null (avoids allBodies() every frame)
        // Find target body — cache in ref, only re-search every ~30 frames or when null
        let targetBody = cameraTargetBodyRef.current;
        if (!targetBody || bodiesUpdateCounter % 30 === 0) {
          targetBody = cachedBodies.find(b => {
            const info = (b as any).gameInfo;
            if (!info || !info.obj) return false;
            return (camSettings.targetObjectId && info.obj.id === camSettings.targetObjectId) ||
              (camSettings.targetObjectId && info.id === camSettings.targetObjectId);
          }) || cachedBodies.find(b => {
            const bBeh = (b as any).gameInfo?.obj?.behavior?.toLowerCase() || '';
            const bName = (b as any).gameInfo?.obj?.name?.toLowerCase() || '';
            return bBeh === 'player' || bName === 'player' || bName === 'player_1';
          }) || null;
          cameraTargetBodyRef.current = targetBody;
        }

        if (targetBody) {
          const name = (targetBody as any).gameInfo?.obj?.name || 'Unknown';
          if (targetName !== name) runOnJS(setTargetName)(name);

          const smooth = cameraInitialized ? Math.max(0.01, Math.min(1, camSettings.smoothing || 0.1)) : 1.0;

          const rw = currentRoomInLoop?.width || 800;
          const rh = currentRoomInLoop?.height || 600;
          const gw = Math.min(rw, 800);
          const gh = Math.min(rh, 600);

          const vw = gw / zoom;
          const vh = gh / zoom;

          const targetCamX = targetBody.position.x - (vw / 2);
          const targetCamY = targetBody.position.y - (vh / 2);

          cameraRef.current.x += (targetCamX - cameraRef.current.x) * smooth;
          cameraRef.current.y += (targetCamY - cameraRef.current.y) * smooth;

          cameraX.value = Math.round(cameraRef.current.x);
          cameraY.value = Math.round(cameraRef.current.y);
          cameraZoom.value = zoom;
          cameraInitialized = true;
        } else {
          // If no target, stay at origin or follow player behavior
          cameraX.value = 0;
          cameraY.value = 0;
          cameraZoom.value = zoom;
        }
      } else {
        // Camera disabled: entire room fits on screen (handled by scale logic)
        cameraX.value = 0;
        cameraY.value = 0;
        cameraZoom.value = 1;
      }

      rtTime = getPrecisionTime() - rtStart;

      statsAccumulator.utSum += utTime;
      statsAccumulator.rtSum += rtTime;
      statsAccumulator.count++;

      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);

    return () => {
      isActiveRef.current = false;
      cancelAnimationFrame(frameId);
      subscriptions.forEach(s => s?.remove());
      Matter.Events.off(engine, 'collisionStart');
      Matter.Events.off(engine, 'collisionEnd');
      Matter.Engine.clear(engine);
      Matter.World.clear(engine.world, false);
      cameraTargetBodyRef.current = null;

      // Sound cleanup
      soundObjectsRef.current.forEach((s) => {
        try {
          s.pause();
          s.release();
        } catch (e) { }
      });
      soundObjectsRef.current.clear();
    };
  }, [visible, currentRoom?.id, restartKey, instanceSharedValues, allSprites, allAnimations, currentProject?.objects]);

  const staticElements = useMemo(() => {
    if (!currentRoom || !currentRoom.instances) return null;
    const layers = currentRoom.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }];

    // Group instances by layer in a single O(N) pass to avoid L * N iterations
    const instancesByLayer = new Map<string, any[]>();
    const defaultLayerId = layers[0]?.id || 'default';

    (currentRoom.instances || []).forEach((inst: any, index: number) => {
      if (!inst) return;
      const targetLayerId = inst.layerId || defaultLayerId;
      let list = instancesByLayer.get(targetLayerId);
      if (!list) {
        list = [];
        instancesByLayer.set(targetLayerId, list);
      }
      list.push({ inst, index });
    });

    return layers.map((layer: RoomLayer, layerIdx: number) => {
      // Skip invisible layers entirely
      if (!layer.visible) return null;

      const layerInstances = instancesByLayer.get(layer.id) || [];
      const tileData = layer.tileData || {};
      const hasTiles = Object.keys(tileData).length > 0;
      const tilesetSprite = spriteMap.get(layer.tilesetSpriteId || '');
      const GRID_SIZE = currentRoom?.settings?.gridSize ?? 32;

      return (
        <React.Fragment key={`layer-static-${layer.id}-${restartKey}`}>
          {/* Render Tiles for this Layer */}
          {hasTiles && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: roomWidth,
                height: roomHeight,
                pointerEvents: 'none',
                zIndex: layerIdx * 10
              }}
            >
              <LayerTilemapRenderer
                tileData={tileData}
                tilesetSprite={tilesetSprite}
                gridSize={GRID_SIZE}
              />
            </View>
          )}

          {/* Render Instances for this Layer */}
          {layerInstances.map(({ inst, index }) => {
            if (!instanceSharedValues[index]) return null;

            const liveObj = liveObjectsRef.current.get(inst.id) || objectMap.get(inst.objectId);
            if (!liveObj || liveObj.behavior === 'gui_container') return null;

            // --- O(1) Sprite Lookup via Map ---
            const appearance = liveObj.appearance || { type: 'sprite', spriteId: null };
            const sprite = spriteMap.get(appearance.spriteId || '');

            const isGrid = !!sprite?.grid?.enabled;
            const fw = isGrid ? sprite.grid.frameWidth : sprite?.width;
            const fh = isGrid ? sprite.grid.frameHeight : sprite?.height;
            let width = isGrid ? fw : (liveObj.width || inst.width || fw || 32);
            let height = isGrid ? fh : (liveObj.height || inst.height || fh || 32);

            // For tilemap instances, compute actual painted extent so visibility culling is correct
            if (liveObj?.behavior === 'tilemap' && inst.tileData) {
              const tileGS = currentRoom?.settings?.gridSize ?? 32;
              const dims = getTilemapDimensions(inst, tileGS);
              width = dims.width;
              height = dims.height;
            }

            // Targeted variables and nonce culling: static walls/blocks don't receive variables or nonce,
            // preventing them from re-rendering in React when scores or timers change.
            const needsVariables = !!(liveObj?.text || liveObj?.behavior === 'sprite_repeater' || liveObj?.behavior === 'progress_bar');

            return (
              <PhysicsBody
                key={`${inst.id}-${restartKey}`}
                instanceId={inst.id}
                sprite={sprite}
                spriteId={appearance.spriteId || undefined}
                sprites={allSprites}
                isRemote={!!(currentProject as any)?.isRemote}
                onFetch={handleFetchAsset}
                sv={instanceSharedValues[index]}
                width={width}
                height={height}
                name={liveObj?.name}
                nonce={needsVariables ? nonce : undefined}
                onTap={() => {
                  DeviceEventEmitter.emit('builtin_tap', { targetId: inst.id });
                  if (liveObj?.logic?.triggers?.onTap) {
                    DeviceEventEmitter.emit(liveObj.logic.triggers.onTap!);
                  }
                }}
                variables={needsVariables ? variables : undefined}
                localVariables={needsVariables ? localVariables[inst.id] : undefined}
                varKeysMap={varKeysCache.current.lowerMap}
                obj={liveObj}
                override={instanceOverrides[inst.id]}
                debug={debug}
                globalFrameTimer={globalFrameTimer}
                cameraX={cameraX}
                cameraY={cameraY}
                cameraZoom={cameraZoom}
                gameWidth={gameWidth}
                gameHeight={gameHeight}
                ySort={currentRoom?.settings?.ySort}
                ySortAmount={currentRoom?.settings?.ySortAmount}
                tapX={tapX}
                tapY={tapY}
                tileData={liveObj?.behavior === 'tilemap' ? (inst.tileData || {}) : undefined}
              />
            );
          })}
        </React.Fragment>
      );
    });
  }, [currentRoom, instanceSharedValues, objectMap, spriteMap, currentProject, handleFetchAsset, nonce, globalFrameTimer, cameraX, cameraY, gameWidth, gameHeight, allSprites]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { width: screenWidth, height: screenHeight, backgroundColor: currentRoom?.settings?.backgroundColor || '#000' }]}>
          <View style={[styles.gameViewport, { backgroundColor: 'transparent' }]}>
            <View style={{ width: screenWidth, height: screenHeight, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: gameWidth * scale, height: gameHeight * scale, overflow: 'hidden' }}>
                <Animated.View
                  style={[
                    { width: roomWidth, height: roomHeight },
                    scalerAnimStyle
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.canvas,
                      { width: roomWidth, height: roomHeight, overflow: 'visible', backgroundColor: 'transparent' },
                      cameraAnimStyle
                    ]}
                  >
                    <GestureDetector gesture={Gesture.Exclusive(screenTapGesture, screenPanGesture)}>
                      <View style={StyleSheet.absoluteFill} />
                    </GestureDetector>
                    {staticElements}
                    {(dynamicElements || []).filter(d => d?.gameObject?.behavior !== 'gui_container').map(d => {
                      if (!d || !d.sv) return null;
                      return (
                        <PhysicsBody
                          key={`${d.id}-${restartKey}`}
                          instanceId={d.id}
                          sprite={spriteMap.get(d.sprite?.id) || d.sprite}
                          spriteId={d.sprite?.id}
                          isRemote={!!(currentProject as any)?.isRemote}
                          onFetch={handleFetchAsset}
                          sv={d.sv}
                          width={d.width}
                          height={d.height}
                          name={d.name}
                          variables={(d.gameObject.text || d.gameObject.behavior === 'sprite_repeater' || d.gameObject.behavior === 'progress_bar') ? variables : undefined}
                          nonce={(d.gameObject.text || d.gameObject.behavior === 'sprite_repeater' || d.gameObject.behavior === 'progress_bar') ? nonce : undefined}
                          localVariables={(d.gameObject.text || d.gameObject.behavior === 'sprite_repeater' || d.gameObject.behavior === 'progress_bar') ? localVariables[d.id] : undefined}
                          varKeysMap={varKeysCache.current.lowerMap}
                          obj={d.gameObject}
                          sprites={allSprites}
                          override={instanceOverrides[d.id]}
                          onTap={() => {
                            DeviceEventEmitter.emit('builtin_tap', { targetId: d.id });
                            if (d.gameObject?.logic?.triggers?.onTap) {
                              DeviceEventEmitter.emit(d.gameObject.logic.triggers.onTap!);
                            }
                          }}
                          globalFrameTimer={globalFrameTimer}
                          cameraX={cameraX}
                          cameraY={cameraY}
                          cameraZoom={cameraZoom}
                          gameWidth={gameWidth}
                          gameHeight={gameHeight}
                          ySort={currentRoom?.settings?.ySort}
                          ySortAmount={currentRoom?.settings?.ySortAmount}
                          layerIndex={d.layerIndex}
                          tapX={tapX}
                          tapY={tapY}
                          debug={debug}
                          tileData={d.tileData}
                        />
                      );
                    })}
                    {lasers.map((laser) => {
                      const dx = laser.endX - laser.startX;
                      const dy = laser.endY - laser.startY;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx);

                      return (
                        <View
                          key={laser.id}
                          style={{
                            position: 'absolute',
                            left: laser.startX,
                            top: laser.startY,
                            width: dist,
                            height: 2,
                            backgroundColor: laser.color,
                            transform: [
                              { translateX: 0 },
                              { translateY: -1 },
                              { rotate: `${angle}rad` }
                            ],
                            transformOrigin: '0% 50%',
                            zIndex: 9999,
                            pointerEvents: 'none'
                          }}
                        />
                      );
                    })}
                  </Animated.View>

                  {/* GUI Overlay Layer (Screen Space) */}
                  <Animated.View
                    style={[
                      {
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 999999
                      },
                      guiScalerStyle
                    ]}
                    pointerEvents="box-none"
                  >
                    {guiInstances.map(d => (
                      <GUIRenderer
                        key={`gui-${d.id}`}
                        nodes={d.gameObject.gui_hierarchy?.root || []}
                        objectMap={objectMap}
                        spriteMap={spriteMap}
                        allSprites={allSprites}
                        parentX={d.sv.x.value}
                        parentY={d.sv.y.value}
                        variables={variables}
                        localVariables={localVariables}
                        varKeysMap={varKeysCache.current.lowerMap}
                        nonce={nonce}
                        globalFrameTimer={globalFrameTimer}
                        cameraX={cameraX}
                        cameraY={cameraY}
                        cameraZoom={cameraZoom}
                        gameWidth={gameWidth}
                        gameHeight={gameHeight}
                        handleFetchAsset={handleFetchAsset}
                        restartKey={restartKey}
                        tapX={tapX}
                        tapY={tapY}
                        debug={debug}
                      />
                    ))}
                  </Animated.View>
                </Animated.View>
              </View>
            </View>
          </View>

          {!(!!projectOverride) && (
            <View style={styles.topOverlay}>
              <TouchableOpacity onPress={onClose} style={styles.miniBtn}><X color="#fff" size={18} /></TouchableOpacity>
              <View style={styles.topRight}>
                {debug && !showDebugSidebar && (
                  <ZoomIndicator
                    zoom={cameraZoom}
                    camX={cameraX}
                    camY={cameraY}
                    enabled={camEnabled}
                    roomW={roomWidth}
                    roomH={roomHeight}
                    gameW={gameWidth}
                    gameH={gameHeight}
                    targetName={targetName}
                  />
                )}
                <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.miniBtn}>{isPlaying ? <Pause color="#fff" size={14} /> : <PlayIcon color="#fff" size={14} />}</TouchableOpacity>
                {debug && (
                  <TouchableOpacity
                    onPress={() => setShowDebugSidebar(!showDebugSidebar)}
                    style={[styles.miniBtn, showDebugSidebar && { backgroundColor: '#4facfe' }]}
                  >
                    <Database color="#fff" size={14} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.miniBtn}
                  onPress={() => {
                    setRoomOverride(currentProject?.mainRoomId || null);
                    setRestartKey(k => k + 1);
                    setIsPlaying(true);
                  }}
                >
                  <RotateCcw color="#fff" size={14} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {debug && (
            <MatterStatsPanel stats={physicsStats} utHistory={utHistory} rtHistory={rtHistory} />
          )}

          <View style={styles.floatingControls}>
            <View style={styles.dpad} pointerEvents="box-none">
              {currentRoom?.settings?.showControls?.joystick?.enabled ? (
                <VirtualJoystick
                  settings={currentRoom.settings.showControls.joystick}
                  onMove={handleJoystickMove}
                  onRelease={handleJoystickRelease}
                />
              ) : (
                <View style={{ alignItems: 'center', gap: 5 }}>
                  {currentRoom?.settings?.showControls?.up === true && (
                    <GameButton
                      style={styles.floatingBtn}
                      pressedStyle={{ opacity: 0.5 }}
                      onPressIn={() => { inputDown.current = 0; inputUp.current = 1; }}
                      onPressOut={() => { inputUp.current = 0; }}
                    >
                      <ArrowUp color="#fff" size={30} />
                    </GameButton>
                  )}
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    {currentRoom?.settings?.showControls?.left !== false && (
                      <GameButton
                        style={styles.floatingBtn}
                        pressedStyle={{ opacity: 0.5 }}
                        onPressIn={() => { inputRight.current = 0; inputLeft.current = 1; }}
                        onPressOut={() => { inputLeft.current = 0; }}
                      >
                        <ArrowLeft color="#fff" size={30} />
                      </GameButton>
                    )}
                    {currentRoom?.settings?.showControls?.up === true && currentRoom?.settings?.showControls?.down === true && (
                      <View style={{ width: 10 }} />
                    )}
                    {currentRoom?.settings?.showControls?.right !== false && (
                      <GameButton
                        style={styles.floatingBtn}
                        pressedStyle={{ opacity: 0.5 }}
                        onPressIn={() => { inputLeft.current = 0; inputRight.current = 1; }}
                        onPressOut={() => { inputRight.current = 0; }}
                      >
                        <ArrowRight color="#fff" size={30} />
                      </GameButton>
                    )}
                  </View>
                  {currentRoom?.settings?.showControls?.down === true && (
                    <GameButton
                      style={styles.floatingBtn}
                      pressedStyle={{ opacity: 0.5 }}
                      onPressIn={() => { inputUp.current = 0; inputDown.current = 1; }}
                      onPressOut={() => { inputDown.current = 0; }}
                    >
                      <ArrowDown color="#fff" size={30} />
                    </GameButton>
                  )}
                </View>
              )}
            </View>
            <View style={styles.actions}>
              {currentRoom?.settings?.showControls?.shoot !== false && (
                <GameButton
                  style={[styles.floatingBtn, styles.shootBtn, { marginBottom: 10 }]}
                  pressedStyle={{ opacity: 0.5 }}
                  onPressIn={() => { inputShoot.current = 1; }}
                  onPressOut={() => { inputShoot.current = 0; }}
                >
                  <Bolt color="#fff" size={24} />
                </GameButton>
              )}
              {currentRoom?.settings?.showControls?.jump !== false && (
                <GameButton
                  style={[styles.floatingBtn, styles.jumpBtn]}
                  pressedStyle={{ backgroundColor: 'rgba(79, 172, 254, 0.8)' }}
                  onPressIn={() => {
                    inputJump.current = 1;
                    DeviceEventEmitter.emit('on_jump_press');
                  }}
                  onPressOut={() => { inputJump.current = 0; }}
                >
                  <ChevronUp color="#fff" size={30} />
                </GameButton>
              )}
            </View>
          </View>

          {debug && showDebugSidebar && (
            <View style={styles.debugSidebar}>
              <View style={styles.debugSidebarHeader}>
                <Text style={styles.debugTitle}>OXION ENGINE v1.15.0</Text>
                <TouchableOpacity onPress={() => setShowDebugSidebar(false)} style={styles.debugCloseBtn}>
                  <X color="#fff" size={14} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.debugScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.debugLabel}>CAMERA & VIEWPORT</Text>
                <ZoomIndicator
                  zoom={cameraZoom}
                  camX={cameraX}
                  camY={cameraY}
                  enabled={camEnabled}
                  roomW={roomWidth}
                  roomH={roomHeight}
                  gameW={gameWidth}
                  gameH={gameHeight}
                  targetName={targetName}
                  inSidebar
                />

                <Text style={[styles.debugLabel, { marginTop: 15 }]}>ROOM INFO</Text>
                <Text style={styles.debugValue}>{currentRoom?.name || 'Untitled'}</Text>
                <Text style={styles.debugValue}>{roomWidth}x{roomHeight} px</Text>

                <Text style={[styles.debugLabel, { marginTop: 20 }]}>HUD & GUI LOGIC</Text>
                {guiInstances.length === 0 && <Text style={[styles.debugValue, { opacity: 0.5 }]}>No GUI Active</Text>}
                {guiInstances.map((inst: any) => {
                  const obj = inst.gameObject;
                  let stat = '';
                  if (obj.health) stat = `HP: ${Math.round(obj.health.current)}/${obj.health.max}`;
                  else if (obj.sprite_repeater) stat = `Icons: ${obj.sprite_repeater.currentCount}/${obj.sprite_repeater.maxCount}`;
                  else if (obj.progress_bar) stat = `Bar: ${Math.round(obj.progress_bar.currentValue)}%`;
                  if (!stat) return null;
                  return (
                    <View key={inst.id} style={{ marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4 }}>
                      <Text style={[styles.debugVarName, { color: '#aaa' }]}>{obj.name || 'UI_Element'}</Text>
                      <Text style={[styles.debugVarVal, { color: '#4facfe' }]}>{stat}</Text>
                      {inst._logicState?.scripts?.map((s: any, si: number) => (
                        <View key={si} style={{ marginLeft: 6, marginTop: 2 }}>
                          <Text style={{ color: '#888', fontSize: 8 }}>
                            {s.cmd}: fires:{s.triggerCount || 0}
                          </Text>
                          {s.lastAction && (
                            <Text style={{ color: '#666', fontSize: 7 }}>Last: {s.lastAction}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })}
                {dynamicElements.filter(d => d.gameObject.behavior === 'player').map((p, idx) => (
                  <View key={`pb-${idx}`} style={{ marginBottom: 4 }}>
                    <Text style={[styles.debugVarName, { color: '#aaa' }]}>Player Health</Text>
                    <Text style={[styles.debugVarVal, { color: '#ff4f4f' }]}>{Math.round(p.gameObject.health?.current || 0)} HP</Text>
                  </View>
                ))}

                <Text style={styles.debugLabel}>INSTANCES ({(currentRoom?.instances || []).length + dynamicElements.length + guiInstances.length})</Text>
                <Text style={styles.debugValue}>Static: {(currentRoom?.instances || []).length}</Text>
                <Text style={styles.debugValue}>Dynamic: {dynamicElements.length}</Text>
                {guiInstances.length > 0 && <Text style={styles.debugValue}>GUI Overlays: {guiInstances.length}</Text>}

                {/* Real-time Instances Breakdown grouped by Object Type */}
                <Text style={[styles.debugLabel, { marginTop: 15 }]}>OBJECT BREAKDOWN</Text>
                {(() => {
                  const counts: Record<string, number> = {};

                  // Count static room instances
                  (currentRoom?.instances || []).forEach((inst: any) => {
                    const obj = objectMap.get(inst.objectId);
                    const name = obj?.name || 'Static Asset';
                    counts[name] = (counts[name] || 0) + 1;
                  });

                  // Count running dynamic/physics instances
                  dynamicElements.forEach((d: any) => {
                    const name = d.gameObject?.name || 'Dynamic Instance';
                    counts[name] = (counts[name] || 0) + 1;
                  });

                  // Count active HUD/GUI overlay instances
                  guiInstances.forEach((g: any) => {
                    const name = g.gameObject?.name || 'GUI HUD';
                    counts[name] = (counts[name] || 0) + 1;
                  });

                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                  if (sorted.length === 0) {
                    return <Text style={[styles.debugValue, { opacity: 0.5 }]}>No instances active</Text>;
                  }

                  return sorted.map(([name, count]) => (
                    <View key={name} style={styles.debugVarRow}>
                      <Text style={styles.debugVarName}>{name}</Text>
                      <Text style={[styles.debugVarVal, { color: '#4facfe', fontWeight: 'bold' }]}>{count} active</Text>
                    </View>
                  ));
                })()}

                <Text style={[styles.debugLabel, { marginTop: 20 }]}>GLOBAL VARIABLES</Text>
                {Object.entries(variables).map(([key, val]) => (
                  <View key={key} style={styles.debugVarRow}>
                    <Text style={styles.debugVarName}>{key}</Text>
                    <Text style={styles.debugVarVal}>{val}</Text>
                  </View>
                ))}
                {Object.keys(variables).length === 0 && <Text style={[styles.debugValue, { opacity: 0.5 }]}>None</Text>}

                <Text style={[styles.debugLabel, { marginTop: 20 }]}>LOCAL VARIABLES</Text>
                {Object.entries(localVariables).map(([instId, vars]) => {
                  const inst = currentRoom?.instances?.find((i: any) => i.id === instId);
                  const obj = objectMap.get(inst?.objectId || '');
                  return (
                    <View key={instId} style={{ marginBottom: 10 }}>
                      <Text style={[styles.debugVarName, { color: '#aaa' }]}>{obj?.name || 'Unknown'} ({instId.slice(0, 4)})</Text>
                      {Object.entries(vars).map(([vk, vv]) => (
                        <View key={vk} style={styles.debugVarRow}>
                          <Text style={[styles.debugVarName, { fontSize: 9, paddingLeft: 10 }]}>{vk}</Text>
                          <Text style={[styles.debugVarVal, { fontSize: 9 }]}>{vv}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
                {Object.keys(localVariables).length === 0 && <Text style={[styles.debugValue, { opacity: 0.5 }]}>None active</Text>}
              </ScrollView>
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>

  );
}

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, DeviceEventEmitter, TextInput, Image, Pressable, Modal, Dimensions, ScrollView, Alert } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './GamePlayer.styles';
import Matter from 'matter-js';
import { X, RotateCcw, Play as PlayIcon, Pause, ArrowLeft, ArrowRight, ChevronUp, Bolt, Database } from 'lucide-react-native';
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

import base64js from 'base64-js';

const SPRITE_CACHE = new Map<string, string>();

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
const DynamicTextNode = React.memo(({ content, variables, localVariables, lowerMap, style }: any) => {
  const resolveTextLocal = (text: string) => {
    if (!text) return '';
    if (!lowerMap) return text;

    // Direct variable match
    const trimmed = text.trim().toLowerCase();
    if (lowerMap[trimmed] && variables) return String(variables[lowerMap[trimmed]]);

    // Template match {var}
    return text.replace(/\{([\w\s]+)\}/g, (match, varName) => {
      const name = varName.trim().toLowerCase();
      const globalKey = lowerMap[name];
      if (globalKey !== undefined && variables) return variables[globalKey].toString();
      // Try local
      if (localVariables?.[name] !== undefined) return localVariables[name].toString();
      return '0';
    });
  };

  return <Text style={style}>{resolveTextLocal(content)}</Text>;
});

const PhysicsBodyInner = ({
  sprite, spriteId, sv, width, height, name, variables, nonce, localVariables, varKeysMap,
  obj, sprites, override, onTap, globalFrameTimer, cameraX, cameraY, cameraZoom,
  gameWidth, gameHeight, onFetch, isRemote, ySort, ySortAmount, layerIndex, forceNoHUD,
  liveOverride, debug
}: {
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
  override?: { spriteId?: string, animName?: string },
  onTap?: () => void,
  globalFrameTimer: SharedValue<number>,
  cameraX: SharedValue<number>,
  cameraY: SharedValue<number>,
  cameraZoom: SharedValue<number>,
  gameWidth: number,
  gameHeight: number,
  onFetch?: (id: string, type: 'sprite' | 'animation') => void | Promise<void>,
  isRemote?: boolean,
  ySort?: boolean,
  ySortAmount?: number,
  layerIndex?: number,
  forceNoHUD?: boolean,
  liveOverride?: { health?: any, sprite_repeater?: any, progress_bar?: any },
  debug?: boolean
}) => {
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  const [currentDimId, setCurrentDimId] = useState<string | null>(null);
  const [localAnimState, setLocalAnimState] = useState(sv?.animState?.value ?? 0);

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

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${sv.rot.value}rad` },
        { scaleX: (sv.flipX ? sv.flipX.value : 1) * scaleVal },
        { scaleY: scaleVal },
        { translateX: -offsetXVal },
        { translateY: -offsetYVal }
      ],
      display: isVisible.value ? 'flex' : 'none',
      borderColor: debug ? (sv.isColliding?.value ? '#ff0000' : '#00ff00') : 'transparent',
      zIndex: (layerIndexVal * 10000) + (ySortEnabled ? Math.floor(ty + heightVal * scaleVal + ySortAmt + ySortOffset) : 0),
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
  } else if (obj?.text) {
    content = (
      <View style={{ width, height, justifyContent: 'center', alignItems: obj.text.textAlign === 'center' ? 'center' : obj.text.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
        <DynamicTextNode
          content={obj.text.content}
          variables={variables}
          localVariables={localVariables}
          lowerMap={varKeysMap}
          style={{
            color: obj.text.color || '#FFF',
            fontSize: obj.text.fontSize || 16,
            fontFamily: obj.text.fontFamily === 'pixel' ? 'Pixel' : undefined,
            textAlign: obj.text.textAlign
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

  return (
    <Animated.View style={[styles.instance, animatedStyle, { width, height }]} pointerEvents={onTap ? 'auto' : 'none'}>
      {onTap ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onTap} style={{ flex: 1 }}>
          {content}
        </TouchableOpacity>
      ) : content}
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
            left: offsetX + (colW / 2) - 2,
            top: offsetY + (colH / 2) - 2,
            zIndex: 10000,
          }}
        />
      )}
    </Animated.View>
  );
};

const PhysicsBody = React.memo(PhysicsBodyInner, (prev, next) => {
  // 1. Check if it's a new object or structure
  if (prev.obj?.id !== next.obj?.id) return false;
  if (prev.nonce !== next.nonce) return false;
  if (prev.spriteId !== next.spriteId) return false;

  // 2. Deep check SV values to handle mock objects in GUIRenderer
  if (prev.sv && next.sv) {
    if (prev.sv.x.value !== next.sv.x.value) return false;
    if (prev.sv.y.value !== next.sv.y.value) return false;
    if (prev.sv.rot.value !== next.sv.rot.value) return false;
    if (prev.sv.flipX?.value !== next.sv.flipX?.value) return false;
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
  debug
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
              debug={debug}
            />
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

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
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
  const varCooldowns = useRef<Record<string, number>>({});
  const lastRestartRef = useRef(0);
  const pendingLoadRef = useRef<any>(null);
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
    return (currentRoom.instances || []).map((inst: any) => ({
      x: makeMutable(inst.x || 0),
      y: makeMutable(inst.y || 0),
      rot: makeMutable((inst.angle || 0) * Math.PI / 180),
      isColliding: makeMutable(0),
      animState: makeMutable(0), // 0: idle, 1: move, 2: jump, 3: hit, 4: dead
      flipX: makeMutable(1),
      pbValue: makeMutable(0),
    }));
  }, [currentRoom?.id, currentRoom?.instances, restartKey]);

  const [variables, setVariables] = useState<Record<string, number>>(currentProject?.variables?.global || { score: 0 });
  const variablesRef = useRef<Record<string, number>>(currentProject?.variables?.global || { score: 0 });
  const [localVariables, setLocalVariables] = useState<Record<string, Record<string, number>>>({});
  const localVariablesRef = useRef<Record<string, Record<string, number>>>({});
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

    // Throttled UI flush: batch updates, max 30 renders/sec
    if (!pendingVarFlush.current) {
      pendingVarFlush.current = setTimeout(() => {
        pendingVarFlush.current = null;
        setVariables({ ...variablesRef.current });
        setNonce(n => n + 1);
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

    // Throttled flush — same as global
    if (!pendingVarFlush.current) {
      pendingVarFlush.current = setTimeout(() => {
        pendingVarFlush.current = null;
        setLocalVariables({ ...localVariablesRef.current });
        setNonce(n => n + 1);
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
  const soundObjectsRef = useRef<Map<string, Audio.Sound>>(new Map());
  useEffect(() => { instanceOverridesRef.current = instanceOverrides; }, [instanceOverrides]);

  // Sync refs to state at a throttled rate for UI rendering (backup sync)
  useEffect(() => {
    if (!visible || !isPlaying) return;
    const interval = setInterval(() => {
      setVariables({ ...variablesRef.current });
      setLocalVariables({ ...localVariablesRef.current });
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

    const resolveValue = (valStr: string, currentBody: Matter.Body | null, currentObj?: GameObject): number => {
      if (!valStr) return 0;

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
          }
        } else if (target === 'tap') {
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
        }
      }

      // Check global variables
      if (variablesRef.current[valStr] !== undefined) return variablesRef.current[valStr];

      // Check local variables
      const bodyId = currentBody ? (currentBody as any).label : (currentObj as any)?._guiNodeId;
      if (bodyId && localVariablesRef.current[bodyId]?.[valStr] !== undefined) return localVariablesRef.current[bodyId][valStr];
      if (actualObj?.variables?.local?.[valStr] !== undefined) return actualObj.variables.local[valStr];

      return num || 0;
    };

    const playSoundEffect = async (soundName: string) => {
      const soundAsset = currentProject?.sounds?.find((s: any) => s.name === soundName || s.id === soundName);
      if (!soundAsset || !soundAsset.uri) return;

      try {
        if (soundObjectsRef.current.has(soundName)) {
          const existing = soundObjectsRef.current.get(soundName);
          await existing?.stopAsync();
          await existing?.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: soundAsset.uri },
          { shouldPlay: true }
        );
        soundObjectsRef.current.set(soundName, newSound);
        DeviceEventEmitter.emit('on_start_sound', { name: soundName });
        DeviceEventEmitter.emit(`on_start_sound:${soundName}`, { name: soundName });

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            newSound.unloadAsync();
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
          else cmd = op === '=' ? 'lvar_set' : 'lvar_add';
        } else {
          // Cross-object targeting handled in executeAction via cmd
          cmd = op === '=' ? 'set_property' : 'add_property';
        }

        const finalVal = (prop === 'value' && op === '-=') ? `-${val}` : val;

        if (lowerTarget !== 'global' && lowerTarget !== 'self' && lowerTarget !== 'this') {
          return { cmd: lowerTarget, parts: [lowerTarget, op === '=' ? 'set' : 'add', prop, finalVal] };
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
        'jump', 'move_left', 'move_right', 'stop_x', 'set_vx', 'set_vy', 'set_x', 'set_y', 'add_x', 'add_y',
        'set_angle', 'add_angle', 'point_towards', 'var_add', 'var_set', 'lvar_add', 'lvar_set',
        'set_value', 'tween_to', 'add_value', 'bind_to_variable', 'set_health', 'add_health',
        'damage', 'heal', 'set_count', 'restart_room', 'go_to_room', 'create_instance',
        'animation', 'set_animation', 'start_sound', 'stop_sound', 'target_other',
        'save_game', 'load_game'
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

      // Handle 'other' target redirection for pre-parsed actions
      if (cmd === 'target_other') {
        if (otherBody) {
          const actualCmd = parts[1];
          const actualParts = [actualCmd, parts[2], parts[3]];
          executeAction({ cmd: actualCmd, parts: actualParts }, otherBody, (otherBody as any).gameInfo?.obj, `${source}:TargetOther`);
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
          const jmp = obj?.physics?.jumpStrength !== undefined ? obj.physics.jumpStrength : 12;
          Matter.Body.setVelocity(body, { x: body.velocity.x, y: -jmp });
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
        if (body) Matter.Body.setVelocity(body, { x: -(obj?.physics?.moveSpeed || 5) * 0.8, y: body.velocity.y });
      } else if (cmd === 'move_right') {
        if (body) Matter.Body.setVelocity(body, { x: (obj?.physics?.moveSpeed || 5) * 0.8, y: body.velocity.y });
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
          const targetBody = cachedBodies.find(b => {
            const info = (b as any).gameInfo;
            return info?.obj?.behavior === target || info?.obj?.name === target;
          });
          if (targetBody) {
            const ang = Math.atan2(targetBody.position.y - body.position.y, targetBody.position.x - body.position.x);
            Matter.Body.setAngle(body, ang);
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
        const lId = body ? body.label : (obj as any)?._guiNodeId;
        if (lId) updateLocalVar(lId, name, amount, obj?.variables?.local);
      } else if (cmd === 'lvar_set') {
        const name = parts[1];
        const val = resolveValue(parts[2], body, obj);
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
          snd.stopAsync().then(() => {
            snd.unloadAsync();
            soundObjectsRef.current.delete(soundName);
            DeviceEventEmitter.emit('on_stop_sound', { name: soundName });
            DeviceEventEmitter.emit(`on_stop_sound:${soundName}`, { name: soundName });
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

    const executeListenerLogic = (listener: any, body: Matter.Body | null, obj: GameObject, source: string) => {
      // 1. Legacy support
      if (listener.parsedAction) {
        executeAction(listener.parsedAction, body, obj, source);
      } else if (listener.action) {
        executeAction(listener.action, body, obj, source);
      }

      if (listener.condition && checkCondition(listener.condition, body, obj)) {
        if (listener.conditionAction) executeAction(listener.conditionAction, body, obj, source + ':Cond');
      }

      // 2. New Logic Editor support
      if (listener.parsedImmediate) {
        listener.parsedImmediate.forEach((act: any) => {
          executeAction(act, body, obj, source + ':Imm');
        });
      } else if (listener.immediateActions) {
        listener.immediateActions.forEach((act: string) => {
          if (act) executeAction(act, body, obj, source + ':Imm');
        });
      }

      if (listener.parsedSubConditions) {
        listener.parsedSubConditions.forEach((sc: any) => {
          const met = checkCondition(sc.condition, body, obj);
          if (met) {
            if (sc.parsedActions) {
              sc.parsedActions.forEach((act: any) => executeAction(act, body, obj, source + ':IfT'));
            } else if (sc.actions) {
              sc.actions.forEach((act: string) => {
                if (act) executeAction(act, body, obj, source + ':IfT');
              });
            }
          } else {
            if (sc.parsedElseActions) {
              sc.parsedElseActions.forEach((act: any) => executeAction(act, body, obj, source + ':IfF'));
            } else if (sc.elseActions) {
              sc.elseActions.forEach((act: string) => {
                if (act) executeAction(act, body, obj, source + ':IfF');
              });
            }
          }
        });
      } else if (listener.subConditions) {
        listener.subConditions.forEach((sc: any) => {
          const met = checkCondition(sc.condition, body, obj);
          if (met) {
            if (sc.actions) sc.actions.forEach((act: string) => {
              if (act) executeAction(act, body, obj, source + ':IfT');
            });
          } else {
            if (sc.elseActions) sc.elseActions.forEach((act: string) => {
              if (act) executeAction(act, body, obj, source + ':IfF');
            });
          }
        });
      }
    };

    const attachListeners = (body: Matter.Body, obj: GameObject) => {
      obj.logic?.listeners?.forEach(l => {
        // Skip events handled elsewhere to prevent double-firing or handled by specialized loops
        const skippedEvents = ['on_timer', 'on_tick', 'on_start', 'on_tap', 'when_self_tap', 'builtin_tap', 'on_screen_tap'];
        if (skippedEvents.some(se => l.eventId === se || l.eventId?.startsWith(se + ':'))) return;

        const sub = DeviceEventEmitter.addListener(l.eventId, (data: any) => {
          // If the event has a targetId, only react if it matches this body
          if (data?.targetId && String(data.targetId) !== String(body.label)) return;

          // For on_collision events, only fire if the other object is the player
          if (l.eventId === 'on_collision') {
            if (data?.otherName !== 'Player' && data?.otherBehavior !== 'player') return;
          }

          executeListenerLogic(l, body, obj, `Listener:${l.eventId}`);
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
      const isStatic = !isParticle && (physics.isStatic || !physics.enabled);

      const spawnId = `${isParticle ? 'p' : 'dyn'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const body = isParticle
        ? Matter.Bodies.circle(x, y, 8, { frictionAir: 0.02, restitution: 0.5, density: 0.0005, label: spawnId })
        : createBodyForObject(x, y, width, height, pObj, { isStatic, friction: physics.friction || 0.1, restitution: physics.restitution || 0.1, label: spawnId });

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

      pObj.logic?.listeners?.forEach((l: any) => {
        if (l.eventId?.startsWith('on_timer') || l.eventId === 'on_tick' || l.eventId === 'on_start' || l.eventId === 'on_empty' || l.eventId === 'on_full' || l.eventId === 'on_life_lost' || l.eventId === 'on_zero_lives') {
          const cmd = l.eventId.startsWith('on_timer') ? 'on_timer' : l.eventId;
          const p = l.eventId.split(':');
          let timerMs = 1000;
          if (cmd === 'on_timer' && p.length > 1) {
            timerMs = parseInt(p[1], 10) || 1000;
          }

          // Pre-parse all actions in the listener
          const parsedImmediate = l.immediateActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean);
          const parsedSubConditions = l.subConditions?.map((sc: any) => ({
            ...sc,
            parsedActions: sc.actions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
            parsedElseActions: sc.elseActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
          }));

          parsedScripts.push({
            cmd,
            parts: p,
            actionPart: '',
            timerMs,
            lastTrigger: Date.now(),
            listenerData: {
              ...l,
              parsedImmediate,
              parsedSubConditions
            }
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

      (body as any).gameInfo = {
        width,
        height,
        obj: instObj,
        scripts: parsedScripts,
        spawnTime: Date.now(),
        layerIndex: layerIndex ?? 0
      };

      // Run 'on_start' scripts immediately for spawned instance
      parsedScripts.forEach((script: any) => {
        if (script.cmd === 'on_start') {
          if (script.listenerData) executeListenerLogic(script.listenerData, body, pObj, 'SpawnStart');
          else if (script.actionPart) executeAction(script.actionPart, body, pObj, 'SpawnStart');
        }
      });

      const scale = pObj.physics?.scale || 1;
      const sv = {
        x: makeMutable(x - (width / 2 + (pObj.physics?.collision?.offsetX || 0)) * scale),
        y: makeMutable(y - (height / 2 + (pObj.physics?.collision?.offsetY || 0)) * scale),
        rot: makeMutable(0),
        isColliding: makeMutable(0),
        animState: makeMutable(0),
        flipX: makeMutable(1)
      };
      svMap.set(body.label, sv);

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
    const layerOrderMap = new Map(layers.map((l, i) => [l.id, i]));

    const sortedInstances = [...(currentRoom?.instances || [])].sort((a, b) => {
      const orderA = layerOrderMap.get(a.layerId || layers[0].id) ?? 0;
      const orderB = layerOrderMap.get(b.layerId || layers[0].id) ?? 0;
      return orderA - orderB;
    });

    sortedInstances.forEach((inst: any, index: number) => {
      if (!inst) return;
      const instLayerId = inst.layerId || (layers[0]?.id || 'default');
      const layer = layers.find(l => l.id === instLayerId);
      const layerIndex = layers.findIndex(l => l.id === instLayerId);
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

      // Process Visual Logic Editor listeners
      obj.logic?.listeners?.forEach(l => {
        if (l.eventId?.startsWith('on_timer') || l.eventId === 'on_tick' || l.eventId === 'on_start' || l.eventId === 'on_empty' || l.eventId === 'on_full' || l.eventId === 'on_life_lost' || l.eventId === 'on_zero_lives') {
          let cmd = l.eventId;
          if (l.eventId.startsWith('on_timer')) cmd = 'on_timer';
          const p = l.eventId.split(':');
          let timerMs = 1000;
          if (cmd === 'on_timer' && p.length > 1) {
            timerMs = parseInt(p[1], 10) || 1000;
          }

          const parsedImmediate = l.immediateActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean);
          const parsedSubConditions = l.subConditions?.map((sc: any) => ({
            ...sc,
            parsedActions: sc.actions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
            parsedElseActions: sc.elseActions?.map((act: string) => act ? parseScriptAction(act) : null).filter(Boolean),
          }));

          parsedScripts.push({
            cmd,
            parts: p,
            actionPart: '',
            timerMs,
            lastRun: performance.now(),
            triggerCount: 0,
            listenerData: {
              ...l,
              parsedImmediate,
              parsedSubConditions
            }
          });
        }
      });

      const physics = obj.physics || {};
      const isStatic = (physics.isStatic || !physics.enabled || obj.behavior === 'emitter') && obj.behavior !== 'player';

      const pObj = objectMap.get(inst.objectId);
      if (!pObj) return;

      // GUI containers go to a separate list to avoid heavy re-renders in dynamicElements
      if (pObj.behavior === 'gui_container') {
        const sv = instanceSharedValues[index];
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
          sv: sv || instanceSharedValues[index],
          layerIndex: layerIndex >= 0 ? layerIndex : 0,
          _logicState: {
            obj: instObj,
            scripts: parsedScripts,
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
        isSensor: !physics.enabled,
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

      const sv = instanceSharedValues[index];
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
        isRoomInstance: true
      });

      attachListeners(body, obj);
    });

    setDynamicElements([]); // Clear any leftover spawned elements
    setGuiInstances(guiRef);

    Matter.World.add(engine.world, newBodies);

    // Optimization: Create instance map for collision lookup
    const instanceMap = new Map<string, any>();
    currentRoom.instances.forEach(i => instanceMap.set(i.id, i));

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
        if (!objA || !objB) return;

        const runCollisionLogic = (targetBody: Matter.Body, targetObj: GameObject, otherObj: GameObject, otherBody: Matter.Body) => {
          const scripts = targetObj.logic?.scripts || [];

          for (const s of scripts) {
            if (
              s.startsWith(`collision:${otherObj.name}:`) ||
              (otherObj.behavior && s.startsWith(`collision:${otherObj.behavior}:`)) ||
              s === `collision:${otherObj.name}` ||
              (otherObj.behavior && s === `collision:${otherObj.behavior}`)
            ) {
              const action = s.split(' DO ')[1] || s.split(':').slice(2).join(':');
              if (action) {
                collisionQueue.push(() =>
                  executeAction(action, targetBody, targetObj, `Collision:${otherObj.name}`, otherBody)
                );
              }
            } else if (s.startsWith('on_collision:')) {
              if (otherObj.name === 'Player' || otherObj.behavior === 'player' || isPlayer(otherObj)) {
                const action = s.split(' DO ')[1] || s.split(':').slice(1).join(':');
                if (action) {
                  collisionQueue.push(() =>
                    executeAction(action, targetBody, targetObj, `Collision:PlayerGuard`, otherBody)
                  );
                }
              }
            }
          }
        };

        runCollisionLogic(pair.bodyA, objA, objB, pair.bodyB);
        runCollisionLogic(pair.bodyB, objB, objA, pair.bodyA);

        // Also run visual logic listeners for on_collision
        const fireCollisionListeners = (targetBody: Matter.Body, targetObj: GameObject, otherObj: GameObject, otherBody: Matter.Body) => {
          targetObj.logic?.listeners?.forEach((l: any) => {
            if (l.eventId === 'on_collision') {
              // Only fire for player collisions by default
              if (otherObj.name === 'Player' || otherObj.behavior === 'player' || isPlayer(otherObj)) {
                collisionQueue.push(() => executeListenerLogic(l, targetBody, targetObj, 'CollisionListener'));
              }
            } else if (l.eventId === `collision:${otherObj.name}` || l.eventId === `collision:${otherObj.behavior}`) {
              collisionQueue.push(() => executeListenerLogic(l, targetBody, targetObj, 'CollisionListener'));
            }
          });
        };
        fireCollisionListeners(pair.bodyA, objA, objB, pair.bodyB);
        fireCollisionListeners(pair.bodyB, objB, objA, pair.bodyA);

        // Keep events ONLY for non-critical systems
        const eventDataA = {
          targetId: pair.bodyA.label,
          otherId: pair.bodyB.label,
          otherName: objB.name,
          otherBehavior: objB.behavior
        };

        const eventDataB = {
          targetId: pair.bodyB.label,
          otherId: pair.bodyA.label,
          otherName: objA.name,
          otherBehavior: objA.behavior
        };

        DeviceEventEmitter.emit(`collision:${objB.name}`, eventDataA);
        DeviceEventEmitter.emit('on_collision', eventDataA);

        DeviceEventEmitter.emit(`collision:${objA.name}`, eventDataB);
        DeviceEventEmitter.emit('on_collision', eventDataB);

        // Automatic Sound Triggers for Collisions (e.g. Bullets Impact)
        if (objA.behavior === 'bullet' && objA.sounds?.hit) playSoundEffect(objA.sounds.hit);
        if (objB.behavior === 'bullet' && objB.sounds?.hit) playSoundEffect(objB.sounds.hit);
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
    const update = () => {
      if (!isActiveRef.current) return;
      if (!isPlayingRef.current) { frameId = requestAnimationFrame(update); return; }
      const now = Date.now();

      // Refresh body cache — avoid full traversal every frame if possible
      // (Matter.Composite.allBodies is O(N) but can be expensive with many nested composites)
      if (bodiesUpdateCounter++ % 2 === 0 || !cachedBodies) {
        cachedBodies = Matter.Composite.allBodies(engine.world);
      }

      // Calculate FPS
      fpsFrames++;
      if (now - fpsLastTime >= 1000) {
        fpsShared.value = fpsFrames;
        fpsFrames = 0;
        fpsLastTime = now;
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

        let nVx = b.velocity.x;
        let nVy = b.velocity.y;

        // Jump Handling (Direct detection + Coyote Time + Jump Buffer)
        const onGround = checkGroundDirect(b);
        if (onGround) (pb as any).lastOnGroundTime = now;

        const canJump = onGround || (now - ((pb as any).lastOnGroundTime || 0) < 300); // More generous 300ms
        let didJump = false;

        if (inputJump.current === 1 || inputTap.current === 1) {
          if (!pb.jumpedThisPress && canJump) {
            // "Hard Jump": Physically lift the body 2 pixels to clear any floor friction/stuck state
            Matter.Body.setPosition(b, { x: b.position.x, y: b.position.y - 2 });
            // Set the exact jump velocity requested by the object properties
            const jmp = c.jumpStrength !== undefined ? c.jumpStrength : 12;
            nVy = -jmp;
            didJump = true;
            pb.jumpedThisPress = true;
          }
        } else {
          pb.jumpedThisPress = false;
        }

        // Horizontal Movement
        if (inputLeft.current === 1) {
          nVx = -(c.moveSpeed || 5) * 0.8;
          if (pb.sv && pb.sv.flipX) pb.sv.flipX.value = -1;
        } else if (inputRight.current === 1) {
          nVx = (c.moveSpeed || 5) * 0.8;
          if (pb.sv && pb.sv.flipX) pb.sv.flipX.value = 1;
        } else {
          nVx *= 0.85;
        }

        // Vertical Movement
        if (inputUp.current === 1) {
          nVy = -(c.moveSpeed || 5) * 0.8;
        } else if (inputDown.current === 1) {
          nVy = (c.moveSpeed || 5) * 0.8;
        } else if (engine.gravity.y === 0) {
          nVy *= 0.85;
        }

        Matter.Body.setVelocity(b, { x: nVx, y: nVy });

        // Emit events AFTER velocity is set so scripts can override it if they wish
        if (didJump) {
          DeviceEventEmitter.emit('builtin_jump', { targetId: b.label });
          if (pb.obj.sounds?.jump) playSoundEffect(pb.obj.sounds.jump);
        }
        if (inputLeft.current === 1) {
          DeviceEventEmitter.emit('builtin_left', { targetId: b.label });
        } else if (inputRight.current === 1) {
          DeviceEventEmitter.emit('builtin_right', { targetId: b.label });
        }
        if (inputUp.current === 1) {
          DeviceEventEmitter.emit('builtin_up', { targetId: b.label });
        } else if (inputDown.current === 1) {
          DeviceEventEmitter.emit('builtin_down', { targetId: b.label });
        }

        // Automatic Running Sound (approx once every 300ms)
        if (onGround && Math.abs(b.velocity.x) > 1 && pb.obj.sounds?.run) {
          if (!pb.lastRunSoundTime || now - pb.lastRunSoundTime > 300) {
            playSoundEffect(pb.obj.sounds.run);
            pb.lastRunSoundTime = now;
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

      // 1. Cleanup expired dynamic elements (bullets, etc)
      for (let i = dynamicRef.length - 1; i >= 0; i--) {
        const d = dynamicRef[i];
        if (d.expires && now > d.expires) {
          if (d.body) Matter.World.remove(engine.world, d.body);
          dynamicRef.splice(i, 1);
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
              if (s.listenerData) executeListenerLogic(s.listenerData, body, info, 'LifeLost');
              s.triggerCount = (s.triggerCount || 0) + 1;
              s.lastAction = 'on_life_lost';
            });
          }
          if (count <= 0 && info.lastCount > 0) {
            info.scripts.filter((s: any) => s.cmd === 'on_zero_lives').forEach((s: any) => {
              if (s.listenerData) executeListenerLogic(s.listenerData, body, info, 'ZeroLives');
              s.triggerCount = (s.triggerCount || 0) + 1;
              s.lastAction = 'on_zero_lives';
            });
          }
          info.lastCount = count;
        }

        // General Triggers (Tick & Timer)
        info.scripts.forEach((script: any) => {
          if (script.cmd === 'on_tick') {
            if (script.listenerData) executeListenerLogic(script.listenerData, body, info, 'TickLoop');
            else if (script.actionPart) executeAction(script.actionPart, body, info, 'TickLoop');
            script.triggerCount = (script.triggerCount || 0) + 1;
            script.lastAction = script.actionPart || 'Listener';
          } else if (script.cmd === 'on_timer' && script.timerMs > 0) {
            if (!script.lastRun) script.lastRun = now;
            if (now - script.lastRun > script.timerMs) {
              if (script.listenerData) executeListenerLogic(script.listenerData, body, info, 'TimerLoop');
              else if (script.actionPart) executeAction(script.actionPart, body, info, 'TimerLoop');
              script.lastRun = now;
              script.triggerCount = (script.triggerCount || 0) + 1;
              script.lastAction = script.actionPart || 'Listener';
            }
          }
        });
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

        // Position Sync Optimization: Only update SV if body moved
        if (body.isStatic && body.position.x === (body as any).lastX && body.position.y === (body as any).lastY) continue;

        const col = info.obj?.physics?.collision;
        const offsetX = col?.offsetX || 0;
        const offsetY = col?.offsetY || 0;
        const scale = info.obj?.physics?.scale || 1;
        const sv = info.sv || svMap.get(body.label);

        if (sv && sv.x && sv.y) {
          sv.x.value = body.position.x - (info.width / 2 + offsetX) * scale;
          sv.y.value = body.position.y - (info.height / 2 + offsetY) * scale;
          sv.rot.value = body.angle;
          (body as any).lastX = body.position.x;
          (body as any).lastY = body.position.y;
        }
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
                if (l.eventId === 'on_tick' || l.eventId?.startsWith('on_timer')) {
                  let cmd = l.eventId;
                  let timerMs = 1000;
                  if (l.eventId.startsWith('on_timer')) {
                    cmd = 'on_timer';
                    timerMs = parseInt(l.eventId.split(':')[1]) || 1000;
                  }
                  scripts.push({
                    cmd,
                    timerMs,
                    lastRun: performance.now(),
                    triggerCount: 0,
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

              node._logicState = {
                obj: liveObj,
                scripts: scripts.filter(Boolean),
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
      const currentRoomInLoop = roomRef.current;
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

          cameraX.value = cameraRef.current.x;
          cameraY.value = cameraRef.current.y;
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
      soundObjectsRef.current.forEach(async (s) => {
        try {
          await s.stopAsync();
          await s.unloadAsync();
        } catch (e) { }
      });
      soundObjectsRef.current.clear();
    };
  }, [visible, currentRoom?.id, restartKey, instanceSharedValues, allSprites, allAnimations, currentProject?.objects]);

  const staticElements = useMemo(() => {
    if (!currentRoom || !currentRoom.instances) return null;
    const layers = currentRoom.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }];

    return layers.map((layer: RoomLayer) => {
      // Skip invisible layers entirely — no iteration needed
      if (!layer.visible) return null;

      return (currentRoom.instances || []).map((inst: any, index: number) => {
        const targetLayerId = inst.layerId || (layers[0]?.id || 'default');
        if (!inst || targetLayerId !== layer.id) return null;
        if (!instanceSharedValues[index]) return null;

        const liveObj = liveObjectsRef.current.get(inst.id) || objectMap.get(inst.objectId);
        if (!liveObj || liveObj.behavior === 'gui_container') return null;

        // --- O(1) Sprite Lookup via Map ---
        const appearance = liveObj.appearance || { type: 'sprite', spriteId: null };
        const sprite = spriteMap.get(appearance.spriteId || '');

        const isGrid = !!sprite?.grid?.enabled;
        const fw = isGrid ? sprite.grid.frameWidth : sprite?.width;
        const fh = isGrid ? sprite.grid.frameHeight : sprite?.height;
        const width = isGrid ? fw : (liveObj.width || inst.width || fw || 32);
        const height = isGrid ? fh : (liveObj.height || inst.height || fh || 32);

        // NOTE: Per-instance viewport culling is done inside animatedStyle (UI thread worklet)
        // so we never mount/unmount components — just set display:none on the UI thread.

        return (
          <PhysicsBody
            key={`${inst.id}-${restartKey}`}
            sprite={sprite}
            spriteId={appearance.spriteId || undefined}
            sprites={allSprites}
            isRemote={!!(currentProject as any)?.isRemote}
            onFetch={handleFetchAsset}
            sv={instanceSharedValues[index]}
            width={width}
            height={height}
            name={liveObj?.name}
            nonce={nonce}
            onTap={() => {
              DeviceEventEmitter.emit('builtin_tap', { targetId: inst.id });
              if (liveObj?.logic?.triggers?.onTap) {
                DeviceEventEmitter.emit(liveObj.logic.triggers.onTap!);
              }
            }}
            variables={(liveObj?.text || liveObj?.behavior === 'sprite_repeater' || liveObj?.behavior === 'progress_bar') ? variables : undefined}
            localVariables={(liveObj?.text || liveObj?.behavior === 'sprite_repeater' || liveObj?.behavior === 'progress_bar') ? localVariables[inst.id] : undefined}
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
          />
        );
      });
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
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      onPress={(e) => {
                        inputTap.current = 1;
                        variablesRef.current.tap_x = e.nativeEvent.locationX;
                        variablesRef.current.tap_y = e.nativeEvent.locationY;
                        DeviceEventEmitter.emit('builtin_tap', { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
                        DeviceEventEmitter.emit('on_screen_tap', { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
                      }}
                    />
                    {staticElements}
                    {(dynamicElements || []).filter(d => d?.gameObject?.behavior !== 'gui_container').map(d => {
                      if (!d || !d.sv) return null;
                      return (
                        <PhysicsBody
                          key={`${d.id}-${restartKey}`}
                          sprite={spriteMap.get(d.sprite?.id) || d.sprite}
                          spriteId={d.sprite?.id}
                          isRemote={!!(currentProject as any)?.isRemote}
                          onFetch={handleFetchAsset}
                          sv={d.sv}
                          width={d.width}
                          height={d.height}
                          name={d.name}
                          variables={(d.gameObject.text || d.gameObject.behavior === 'sprite_repeater' || d.gameObject.behavior === 'progress_bar') ? variables : undefined}
                          nonce={nonce}
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
                          debug={debug}
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
                        debug={debug}
                      />
                    ))}
                  </Animated.View>
                </Animated.View>
              </View>
            </View>
          </View>

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
              {debug && <FPSCounter fps={fpsShared} />}
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

          <View style={styles.floatingControls}>
            <View style={styles.dpad} pointerEvents="box-none">
              {currentRoom?.settings?.showControls?.joystick?.enabled ? (
                <VirtualJoystick
                  settings={currentRoom.settings.showControls.joystick}
                  onMove={handleJoystickMove}
                  onRelease={handleJoystickRelease}
                />
              ) : (
                <>
                  {currentRoom?.settings?.showControls?.left !== false && (
                    <Pressable
                      style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.7 }]}
                      onPressIn={() => { inputLeft.current = 1; }}
                      onPressOut={() => { inputLeft.current = 0; }}
                    >
                      <ArrowLeft color="#fff" size={30} />
                    </Pressable>
                  )}
                  {currentRoom?.settings?.showControls?.right !== false && (
                    <Pressable
                      style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.7 }]}
                      onPressIn={() => { inputLeft.current = 0; inputRight.current = 1; }}
                      onPressOut={() => { inputRight.current = 0; }}
                    >
                      <ArrowRight color="#fff" size={30} />
                    </Pressable>
                  )}
                </>
              )}
            </View>
            <View style={styles.actions}>
              {currentRoom?.settings?.showControls?.shoot !== false && (
                <Pressable
                  style={({ pressed }) => [styles.floatingBtn, styles.shootBtn, { marginBottom: 10 }, pressed && { opacity: 0.7 }]}
                  onPressIn={() => { inputShoot.current = 1; }}
                  onPressOut={() => { inputShoot.current = 0; }}
                >
                  <Bolt color="#fff" size={24} />
                </Pressable>
              )}
              {currentRoom?.settings?.showControls?.jump !== false && (
                <Pressable
                  style={({ pressed }) => [
                    styles.floatingBtn,
                    styles.jumpBtn,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                    inputJump.current === 1 && { backgroundColor: 'rgba(79, 172, 254, 0.8)' }
                  ]}
                  onPressIn={() => {
                    inputJump.current = 1;
                    DeviceEventEmitter.emit('on_jump_press');
                  }}
                  onPressOut={() => { inputJump.current = 0; }}
                >
                  <ChevronUp color="#fff" size={30} />
                </Pressable>
              )}
            </View>
          </View>

          {debug && showDebugSidebar && (
            <View style={styles.debugSidebar}>
              <View style={styles.debugSidebarHeader}>
                <Text style={styles.debugTitle}>ENGINE DEBUG</Text>
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
                    <View key={inst.id} style={{ marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333', pb: 4 }}>
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

                <Text style={styles.debugLabel}>INSTANCES</Text>
                <Text style={styles.debugValue}>Static: {(currentRoom?.instances || []).length}</Text>
                <Text style={styles.debugValue}>Dynamic: {dynamicElements.length}</Text>

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
                  const inst = currentRoom?.instances?.find(i => i.id === instId);
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

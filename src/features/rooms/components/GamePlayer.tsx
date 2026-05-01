import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, DeviceEventEmitter, TextInput, Image, Pressable, Modal, Dimensions } from 'react-native';
import { styles } from './GamePlayer.styles';
import Matter from 'matter-js';
import { X, RotateCcw, Play as PlayIcon, Pause, ArrowLeft, ArrowRight, ChevronUp, Bolt } from 'lucide-react-native';
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
  useDerivedValue
} from 'react-native-reanimated';
import { useWindowDimensions } from 'react-native';

import base64js from 'base64-js';

const SPRITE_CACHE = new Map<string, string>();

const pixelsToBmp = (pixels: string[][], spriteId: string) => {
  if (!pixels || pixels.length === 0) return null;

  const originalWidth = pixels[0]?.length || 0;
  const originalHeight = pixels.length || 0;
  if (originalWidth === 0 || originalHeight === 0) return null;

  // Internal upscaling to achieve pixel-perfect look on high-res screens
  const UPSCALE = 1;
  const width = originalWidth * UPSCALE;
  const height = originalHeight * UPSCALE;

  const pixelHash = originalWidth * originalHeight;
  const cacheKey = `${spriteId}_${pixelHash}_${pixels[0]?.[0] || ''}_v2`;

  if (SPRITE_CACHE.has(cacheKey)) return SPRITE_CACHE.get(cacheKey);

  // 32-bit BMP (BGRA) with BI_BITFIELDS
  const rowSize = width * 4;
  const pixelDataSize = rowSize * height;
  const headerSize = 70; // 14 (file) + 40 (DIB) + 16 (masks)
  const fileSize = headerSize + pixelDataSize;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // BMP File Header
  view.setUint16(0, 0x4D42, true); // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, headerSize, true); // Offset to pixel data

  // DIB Header (BITMAPINFOHEADER)
  view.setUint32(14, 40, true); // Header size
  view.setUint32(18, width, true);
  view.setUint32(22, -height, true); // Top-down
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 32, true); // 32 bits
  view.setUint32(30, 3, true); // BI_BITFIELDS
  view.setUint32(34, pixelDataSize, true);

  // Masks at offset 54
  view.setUint32(54, 0x00FF0000, true); // Red
  view.setUint32(58, 0x0000FF00, true); // Green
  view.setUint32(62, 0x000000FF, true); // Blue
  view.setUint32(66, 0xFF000000, true); // Alpha

  for (let y = 0; y < height; y++) {
    const originalY = Math.floor(y / UPSCALE);
    for (let x = 0; x < width; x++) {
      const originalX = Math.floor(x / UPSCALE);
      const color = pixels[originalY][originalX] || 'transparent';
      let r = 0, g = 0, b = 0, a = 0;

      if (color !== 'transparent') {
        const hex = color.startsWith('#') ? color.slice(1) : 'FFFFFF';
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
        a = 255;
      }

      const offset = headerSize + (y * rowSize) + (x * 4);
      buffer[offset] = b;
      buffer[offset + 1] = g;
      buffer[offset + 2] = r;
      buffer[offset + 3] = a;
    }
  }

  const base64 = `data:image/bmp;base64,${base64js.fromByteArray(buffer)}`;
  SPRITE_CACHE.set(cacheKey, base64);
  return base64;
};

const PhysicsBody = ({ sprite, sv, width = 32, height = 32, onTap, name, spriteId, isRemote, onFetch, variables, nonce, localVariables, obj, debug, animations, sprites, override, globalFrameTimer }: {
  sprite: any,
  sv: any,
  width?: number,
  height?: number,
  nonce?: number,
  onTap?: () => void,
  name?: string,
  spriteId?: string,
  isRemote?: boolean,
  onFetch?: (id: string, type?: 'sprite' | 'animation') => void,
  variables: Record<string, number>,
  localVariables?: Record<string, number>,
  obj: any,
  debug?: boolean,
  animations?: any[],
  sprites?: any[],
  override?: { spriteId?: string, animName?: string },
  globalFrameTimer: SharedValue<number>
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

  // Animation frame calculation moved to worklet
  const frameIndex = useDerivedValue(() => {
    if (!activeState || !activeState.anim || activeState.anim.frameCount <= 1) return 0;
    const fps = activeState.anim.fps || 10;
    const interval = 1000 / fps;
    const elapsed = globalFrameTimer.value % (activeState.anim.frameCount * interval);
    const frame = Math.floor(elapsed / interval);
    return activeState.anim.loop ? frame : Math.min(frame, activeState.anim.frameCount - 1);
  });

  const activeState = useMemo(() => {
    const stateNames = ['idle', 'move', 'jump', 'hit', 'dead'];

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

    let targetSprite = override?.spriteId ? (sprites?.find(s => s.id === override.spriteId) || sprite) : sprite;
    let targetAnimName = searchStr;

    if (!override?.spriteId && searchStr.includes(':')) {
      const [sName, aName] = searchStr.split(':');
      targetAnimName = aName;
      const foundSprite = sprites?.find((s: any) => s.name === sName);
      if (foundSprite) targetSprite = foundSprite;
    }

    if (!targetSprite) return null;

    const trimmedTargetAnimName = targetAnimName.trim();
    const foundAnim = targetSprite.animations?.find((a: any) => a.name.trim() === trimmedTargetAnimName);
    return foundAnim ? { anim: foundAnim, sprite: targetSprite } : null;
  }, [sprite, localAnimState, obj?.animations, obj?.appearance?.animationState, override, sprites]);

  const currentSprite = activeState?.sprite || sprite;

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
    if (!sprite && isRemote && spriteId && onFetch) {
      onFetch(spriteId, obj.appearance?.type || 'sprite');
    }
  }, [sprite, spriteId, isRemote]);

  const lastResolvedText = useRef<{ content: string, vars: string, result: string }>({ content: '', vars: '', result: '' });

  const resolveText = (content: string) => {
    if (!content) return '';

    const contentTrimmed = content.trim().toLowerCase();
    
    // 1. Direct variable match fallback (if user just typed "var_0" without {})
    const localDirectKey = localVariables ? Object.keys(localVariables).find(k => k.toLowerCase() === contentTrimmed) : null;
    const globalDirectKey = Object.keys(variables).find(k => k.toLowerCase() === contentTrimmed);
    if (localDirectKey || globalDirectKey) {
      return String(localDirectKey ? localVariables![localDirectKey] : variables[globalDirectKey!]);
    }

    // 2. Template match
    // Using a quick stringify of relevant variables for cache key
    const relevantVars = content.match(/\{([\w\s]+)\}/g) || [];
    const varValues = relevantVars.map(v => {
      const name = v.slice(1, -1).trim().toLowerCase();
      const localKey = localVariables ? Object.keys(localVariables).find(k => k.toLowerCase() === name) : null;
      const globalKey = Object.keys(variables).find(k => k.toLowerCase() === name);
      
      const val = localKey ? localVariables![localKey] : (globalKey ? variables[globalKey] : '0');
      return `${name}:${val}`;
    }).join('|');

    if (lastResolvedText.current.content === content && lastResolvedText.current.vars === varValues) {
      return lastResolvedText.current.result;
    }

    const result = content.replace(/\{([\w\s]+)\}/g, (match, varName) => {
      const trimmedName = varName.trim();
      if (localVariables) {
        const found = Object.keys(localVariables).find(k => k.toLowerCase() === trimmedName.toLowerCase());
        if (found) return localVariables[found].toString();
      }
      const foundGlobal = Object.keys(variables).find(k => k.toLowerCase() === trimmedName.toLowerCase());
      if (foundGlobal !== undefined) return variables[foundGlobal].toString();
      
      // Default to 0 if the variable hasn't been initialized yet
      return '0';
    });

    lastResolvedText.current = { content, vars: varValues, result };
    return result;
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (!sv || !sv.x || !sv.y) return { display: 'none' as const };
    return {
      transform: [
        { translateX: sv.x.value },
        { translateY: sv.y.value },
        { rotate: `${sv.rot.value}rad` }
      ],
      borderColor: debug ? (sv.isColliding?.value ? '#ff0000' : '#00ff00') : 'transparent',
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    if (!activeState || !activeState.anim || !currentSprite?.grid?.enabled) return {};
    const frameWidth = currentSprite.grid.frameWidth;
    const frameHeight = currentSprite.grid.frameHeight;
    const scaleW = width / frameWidth;
    const scaleH = height / frameHeight;

    return {
      left: -frameIndex.value * frameWidth * scaleW,
      top: -(activeState.anim.row || 0) * frameHeight * scaleH,
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
    return pixelsToBmp(currentSprite.pixels, currentSprite.id);
  }, [currentSprite?.id, currentSprite?.uri, width, height]);

  const content = bmpUri && !obj?.text ? (
    (currentSprite?.grid?.enabled) ? (
      (currentDimId !== currentSprite.id) ? null : (
        <View style={{ width, height, overflow: 'hidden' }}>
          <Animated.Image
            source={{ uri: bmpUri }}
            style={[
              {
                width: (imgDimensions.w || currentSprite.width || (currentSprite.grid.frameWidth * (activeState?.anim?.frameCount || 1))) * (width / currentSprite.grid.frameWidth),
                height: (imgDimensions.h || currentSprite.height || (currentSprite.grid.frameHeight * 1)) * (height / currentSprite.grid.frameHeight),
                position: 'absolute',
              },
              imageAnimatedStyle
            ]}
            resizeMode="stretch"
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
        />
      </View>
    ) : (
      <Image
        source={{ uri: bmpUri }}
        style={{ width, height }}
        resizeMode="stretch"
      />
    )
  ) : obj?.text ? (
    <View style={{ width, height, justifyContent: 'center', alignItems: obj.text.textAlign === 'center' ? 'center' : obj.text.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text
        key={`text-${nonce}`}
        style={{
          color: obj.text.color || '#FFF',
          fontSize: obj.text.fontSize || 16,
          fontFamily: obj.text.fontFamily === 'pixel' ? 'Pixel' : undefined,
          textAlign: obj.text.textAlign
        }}>
        {resolveText(obj.text.content)}
      </Text>
    </View>
  ) : (
    <View style={{ width, height, backgroundColor: '#333', borderRadius: 4, borderWidth: 1, borderColor: '#555', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#666', fontSize: 8 }}>?</Text>
    </View>
  );

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
              top: 0,
              left: 0,
              width,
              height,
              borderWidth: 2,
              pointerEvents: 'none',
              zIndex: 9999,
            },
            debugBoxStyle
          ]}
        />
      )}
    </Animated.View>
  );
};

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

export default function GamePlayer({ visible, onClose, projectOverride, debug }: { visible: boolean; onClose: () => void; projectOverride?: any; debug?: boolean }) {
  const storeProject = useProjectStore(s => s.activeProject);
  const activeRoomId = useProjectStore(s => s.activeRoomId);
  const fetchRemoteAsset = useProjectStore(s => s.fetchRemoteAsset);
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
  const gameWidth = currentRoom?.width || 800;
  const gameHeight = currentRoom?.height || 600;
  const scaleX = screenWidth / gameWidth;
  const scaleY = screenHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);

  const [restartKey, setRestartKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [nonce, setNonce] = useState(0);
  const isPlayingRef = useRef(true);
  const varCooldowns = useRef<Record<string, number>>({});
  const lastRestartRef = useRef(0);
  const [dynamicElements, setDynamicElements] = useState<{
    gameObject: any; id: string; sprite: any; sv: any; width: number; height: number; name: string
  }[]>([]);

  // Streaming state
  const [streamedSprites, setStreamedSprites] = useState<Map<string, any>>(new Map());
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
        setStreamedSprites(prev => new Map(prev).set(id, data));
      }
    } catch (err) {
      console.warn('Failed to stream asset:', id, err);
    }
  }, [fetchRemoteAsset, streamedSprites, streamedAnimations]);

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
    return Array.from({ length: currentRoom.instances.length }).map(() => ({
      x: makeMutable(0), y: makeMutable(0), rot: makeMutable(0),
      isColliding: makeMutable(0),
      animState: makeMutable(0), // 0: idle, 1: move, 2: jump, 3: hit, 4: dead
    }));
  }, [currentRoom?.id, (currentRoom?.instances || []).length, restartKey]);

  const [variables, setVariables] = useState<Record<string, number>>(currentProject?.variables?.global || { score: 0 });
  const variablesRef = useRef<Record<string, number>>(currentProject?.variables?.global || { score: 0 });
  const [localVariables, setLocalVariables] = useState<Record<string, Record<string, number>>>({});
  const localVariablesRef = useRef<Record<string, Record<string, number>>>({});

  const inputLeft = useRef(0);
  const inputRight = useRef(0);
  const inputJump = useRef(0);
  const inputShoot = useRef(0);
  const inputTap = useRef(0);
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

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const updateGlobalVar = useCallback((name: string, amount: number | string, isSet: boolean = false) => {
    const now = Date.now();
    const cooldownKey = `global_${name}`;
    if (!isSet && varCooldowns.current[cooldownKey] && now - varCooldowns.current[cooldownKey] < 50) return;
    varCooldowns.current[cooldownKey] = now;

    const currentVal = Number(variablesRef.current[name]) || 0;
    const numAmount = Number(amount) || 0;
    const newVal = isSet ? numAmount : currentVal + numAmount;
    const next = { ...variablesRef.current, [name]: newVal };
    variablesRef.current = next;

    // Restore immediate update for reactivity
    setVariables({ ...next });
    setNonce(n => n + 1);
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
    const next = {
      ...localVariablesRef.current,
      [bodyId]: { ...current, [name]: newVal }
    };
    localVariablesRef.current = next;

    // Restore immediate update and nonce for reactivity
    setLocalVariables({ ...next });
    setNonce(n => n + 1);
  }, []);

  const [instanceOverrides, setInstanceOverrides] = useState<Record<string, { spriteId?: string, animName?: string }>>({});
  const instanceOverridesRef = useRef<Record<string, any>>({});
  useEffect(() => { instanceOverridesRef.current = instanceOverrides; }, [instanceOverrides]);

  // Sync refs to state at a throttled rate for UI rendering (as backup)
  useEffect(() => {
    if (!visible || !isPlaying) return;
    const interval = setInterval(() => {
      setVariables({ ...variablesRef.current });
      setLocalVariables({ ...localVariablesRef.current });
    }, 500); // Throttled to 500ms
    return () => clearInterval(interval);
  }, [visible, isPlaying]);

  useEffect(() => {
    if (!visible || !currentRoom) return;
    inputLeft.current = 0;
    inputRight.current = 0;
    inputJump.current = 0;
    inputShoot.current = 0;
    inputTap.current = 0;
    setDynamicElements([]);
    setInstanceOverrides({});
    setLocalVariables({});
    localVariablesRef.current = {};

    // Reset global variables to project defaults on every play session
    const defaultGlobals = { ...(currentProject?.variables?.global || {}) };
    variablesRef.current = defaultGlobals;
    setVariables(defaultGlobals);
    varCooldowns.current = {};

    const isActiveRef = { current: true };

    const engine = Matter.Engine.create({
      enableSleeping: false,
      positionIterations: 10,
      velocityIterations: 10,
      gravity: { x: 0, y: (currentRoom?.settings?.gravity ?? 9.8) / 10 }
    });
    let physicsFrameCounter = 0;
    const newBodies: Matter.Body[] = [];
    const playerBodies: { body: Matter.Body; obj: GameObject; sv?: any; isPlayer?: boolean; jumpedThisPress?: boolean; onGround?: boolean }[] = [];
    const emitters: { body: Matter.Body; obj: GameObject; lastSpawn: number }[] = [];
    const dynamicRef: {
      name: any; id: string; gameObject: any; body: Matter.Body; sv: any; expires?: number; sprite: any; width: number; height: number
    }[] = [];
    const subscriptions: any[] = [];
    const svMap = new Map<string, any>();

    const resolveValue = (valStr: string, currentBody: Matter.Body, currentObj?: GameObject): number => {
      if (!valStr) return 0;

      // Handle simple math: a+b, a-b
      const mathMatch = valStr.match(/^(.+?)\s*([\+\-])\s*(.+)$/);
      if (mathMatch) {
        const left = resolveValue(mathMatch[1].trim(), currentBody, currentObj);
        const right = resolveValue(mathMatch[3].trim(), currentBody, currentObj);
        return mathMatch[2] === '+' ? left + right : left - right;
      }

      const num = parseFloat(valStr);
      if (!isNaN(num) && !valStr.includes('.') && !valStr.includes('_')) return num; // Simple number

      // Handle property access: player.x, this.y, enemy.vx
      if (valStr.includes('.')) {
        const [target, prop] = valStr.split('.');
        let targetBody: Matter.Body | null = null;

        if (target === 'this') {
          targetBody = currentBody;
        } else {
          // Find first body matching behavior or name
          const allBodies = Matter.Composite.allBodies(engine.world);
          targetBody = allBodies.find(b => {
            const info = (b as any).gameInfo;
            return info?.obj?.behavior === target || info?.obj?.name === target;
          }) || null;
        }

        if (targetBody) {
          if (prop === 'x') return targetBody.position.x;
          if (prop === 'y') return targetBody.position.y;
          if (prop === 'vx') return targetBody.velocity.x;
          if (prop === 'vy') return targetBody.velocity.y;
          if (prop === 'width') return (targetBody as any).gameInfo?.width || 0;
          if (prop === 'height') return (targetBody as any).gameInfo?.height || 0;
        }
      }

      // Check global variables
      if (variablesRef.current[valStr] !== undefined) return variablesRef.current[valStr];

      // Check local variables
      const bodyId = (currentBody as any).label;
      if (localVariablesRef.current[bodyId]?.[valStr] !== undefined) return localVariablesRef.current[bodyId][valStr];
      if (currentObj?.variables?.local?.[valStr] !== undefined) return currentObj.variables.local[valStr];

      return num || 0;
    };

    const isPlayer = (o?: GameObject) => {
      if (!o) return false;
      const name = o.name?.toLowerCase() || '';
      const behavior = o.behavior?.toLowerCase() || '';
      return name.includes('player') || behavior.includes('player');
    };

    const executeAction = (actionData: string | { cmd: string, parts: string[] }, body: Matter.Body, obj?: GameObject, source: string = 'unknown', otherBody?: Matter.Body) => {
      if (!isPlayingRef.current) return;
      
      let finalAction = actionData;

      // --- Natural Syntax Transpiler ---
      if (typeof actionData === 'string') {
        const trimmed = actionData.trim();
        
        // Pattern: target.prop op value (e.g. self.x += 10, other.health -= 5)
        const match = trimmed.match(/^([\w]+)\.([\w]+)\s*([\+\-]?=)\s*(.*)$/);
        if (match) {
          const [_, target, prop, op, val] = match;
          const targetBody = target === 'self' ? body : (target === 'other' ? otherBody : null);
          
          if (targetBody) {
            // Mapping common properties to internal commands
            if (prop === 'x') finalAction = op === '=' ? `set_x:${val}` : `add_x:${val}`;
            else if (prop === 'y') finalAction = op === '=' ? `set_y:${val}` : `add_y:${val}`;
            else if (prop === 'vx') finalAction = `set_vx:${val}`;
            else if (prop === 'vy') finalAction = `set_vy:${val}`;
            else if (prop === 'angle') finalAction = op === '=' ? `set_angle:${val}` : `add_angle:${val}`;
            else {
              // Assume it's a local variable
              const command = op === '=' ? 'lvar_set' : 'lvar_add';
              const sign = op === '-=' ? '-' : '';
              finalAction = `${command}:${prop}:${sign}${val}`;
            }
            
            // If target was 'other', we need to execute on that body instead
            if (target === 'other' && otherBody) {
              executeAction(finalAction, otherBody, (otherBody as any).gameInfo?.obj, `${source}:TargetOther`);
              return;
            }
          }
        } else {
          // Pattern: var op value (e.g. score += 1) - Assume global variable if no dot
          const varMatch = trimmed.match(/^([\w]+)\s*([\+\-]?=)\s*(.*)$/);
          if (varMatch) {
            const [_, varName, op, val] = varMatch;
            const command = op === '=' ? 'var_set' : 'var_add';
            const sign = op === '-=' ? '-' : '';
            finalAction = `${command}:${varName}:${sign}${val}`;
          }
        }
      }

      const isParsed = typeof finalAction !== 'string';
      let cmd = isParsed ? (finalAction as any).cmd : finalAction.split(':')[0].trim();
      let parts = isParsed ? (finalAction as any).parts : finalAction.split(':').map(p => p.trim());

      // Skip 'do' prefix if present
      if (cmd.toLowerCase() === 'do') {
        parts = parts.slice(1);
        cmd = parts[0] || '';
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
        Matter.Body.setVelocity(body, { x: body.velocity.x, y: -(obj?.physics?.jumpStrength || 10) * 0.6 });
      } else if (cmd === 'move_left') {
        Matter.Body.setVelocity(body, { x: -(obj?.physics?.moveSpeed || 5) * 0.8, y: body.velocity.y });
      } else if (cmd === 'move_right') {
        Matter.Body.setVelocity(body, { x: (obj?.physics?.moveSpeed || 5) * 0.8, y: body.velocity.y });
      } else if (cmd === 'stop_x') {
        Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
      } else if (cmd === 'set_vx') {
        Matter.Body.setVelocity(body, { x: resolveValue(parts[1], body, obj), y: body.velocity.y });
      } else if (cmd === 'set_vy') {
        Matter.Body.setVelocity(body, { x: body.velocity.x, y: resolveValue(parts[1], body, obj) });
      } else if (cmd === 'set_x') {
        Matter.Body.setPosition(body, { x: resolveValue(parts[1], body, obj), y: body.position.y });
      } else if (cmd === 'set_y') {
        Matter.Body.setPosition(body, { x: body.position.x, y: resolveValue(parts[1], body, obj) });
      } else if (cmd === 'add_x') {
        Matter.Body.setPosition(body, { x: body.position.x + resolveValue(parts[1], body, obj), y: body.position.y });
      } else if (cmd === 'add_y') {
        Matter.Body.setPosition(body, { x: body.position.x, y: body.position.y + resolveValue(parts[1], body, obj) });
      } else if (cmd === 'set_angle') {
        Matter.Body.setAngle(body, resolveValue(parts[1], body, obj) * Math.PI / 180);
      } else if (cmd === 'add_angle') {
        Matter.Body.setAngle(body, body.angle + (resolveValue(parts[1], body, obj) * Math.PI / 180));
      } else if (cmd === 'point_towards') {
        const target = parts[1];
        const allBodies = Matter.Composite.allBodies(engine.world);
        const targetBody = allBodies.find(b => {
          const info = (b as any).gameInfo;
          return info?.obj?.behavior === target || info?.obj?.name === target;
        });
        if (targetBody) {
          const ang = Math.atan2(targetBody.position.y - body.position.y, targetBody.position.x - body.position.x);
          Matter.Body.setAngle(body, ang);
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
        updateLocalVar(body.label, name, amount, obj?.variables?.local);
      } else if (cmd === 'lvar_set') {
        const name = parts[1];
        const val = resolveValue(parts[2], body, obj);
        updateLocalVar(body.label, name, val, obj?.variables?.local, true);
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
      } else if (cmd === 'create_instance') {
        const targetId = parts[1];
        let targetX = body.position.x;
        let targetY = body.position.y;
        if (parts.length >= 4) {
          targetX += resolveValue(parts[2], body, obj);
          targetY += resolveValue(parts[3], body, obj);
        }
        spawnInstance(targetId, targetX, targetY);
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
      }
    };

    const checkCondition = (conditionStr: string, body: Matter.Body, obj?: GameObject) => {
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

    const executeListenerLogic = (listener: any, body: Matter.Body, obj: GameObject, source: string) => {
      // 1. Legacy support
      if (listener.action) executeAction(listener.action, body, obj, source);
      if (listener.condition && checkCondition(listener.condition, body, obj)) {
        if (listener.conditionAction) executeAction(listener.conditionAction, body, obj, source + ':Cond');
      }

      // 2. New Logic Editor support
      if (listener.immediateActions) {
        listener.immediateActions.forEach((act: string) => {
          if (act) executeAction(act, body, obj, source + ':Imm');
        });
      }
      
      if (listener.subConditions) {
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
        // Skip events handled elsewhere: on_timer/on_tick run in game loop, on_start runs at spawn, on_tap handled by builtin_tap
        if (l.eventId?.startsWith('on_timer') || l.eventId === 'on_tick' || l.eventId === 'on_start' || l.eventId === 'on_tap') return;

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
        // Visual logic listeners for on_tap
        obj.logic?.listeners?.forEach((l: any) => {
          if (l.eventId === 'on_tap') {
            executeListenerLogic(l, body, obj, 'TapListener');
          }
        });
      });
      subscriptions.push(tapSub);
    };

    const spawnInstance = (objectId: string, x: number, y: number, isParticle = false, settings?: any) => {
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
        : Matter.Bodies.rectangle(x, y, width, height, { isStatic, friction: physics.friction || 0.1, restitution: physics.restitution || 0.1, label: spawnId });

      if (isParticle && settings) {
        const angle = (settings.angle || 0) + (Math.random() * (settings.spread || 45) - (settings.spread || 45) / 2);
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
          timerMs,
          lastTrigger: Date.now()
        };
      }) || [];

      // Process Visual Logic Editor listeners
      pObj.logic?.listeners?.forEach((l: any) => {
        if (l.eventId?.startsWith('on_timer') || l.eventId === 'on_tick' || l.eventId === 'on_start') {
          const cmd = l.eventId.startsWith('on_timer') ? 'on_timer' : l.eventId;
          const p = l.eventId.split(':');
          let timerMs = 1000;
          if (cmd === 'on_timer' && p.length > 1) {
            timerMs = parseInt(p[1], 10) || 1000;
          }
          parsedScripts.push({
            cmd,
            parts: p,
            actionPart: '', // Actions are handled by listenerData
            timerMs,
            lastTrigger: Date.now(),
            listenerData: l
          });
        }
      });

      (body as any).gameInfo = {
        width,
        height,
        obj: pObj,
        scripts: parsedScripts,
        spawnTime: Date.now()
      };

      // Run 'on_start' scripts immediately for spawned instance
      parsedScripts.forEach((script: any) => {
        if (script.cmd === 'on_start') {
          if (script.listenerData) executeListenerLogic(script.listenerData, body, pObj, 'SpawnStart');
          else if (script.actionPart) executeAction(script.actionPart, body, pObj, 'SpawnStart');
        }
      });

      const sv = {
        x: makeMutable(x - width / 2),
        y: makeMutable(y - height / 2),
        rot: makeMutable(0),
        isColliding: makeMutable(0),
        animState: makeMutable(0)
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
        name: pObj.name
      });
    };

    // Declare roomStartTime BEFORE the instances loop so spawnTime is set correctly
    const roomStartTime = Date.now();
    const collisionCooldowns = new Map<string, number>();

    (currentRoom?.instances || []).forEach((inst: any, index: number) => {
      if (!inst) return;
      const layers = currentRoom.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }];
      const layer = layers.find(l => l.id === (inst.layerId || layers[0].id));
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
          timerMs,
          lastTrigger: Date.now()
        };
      }) || [];

      // Process Visual Logic Editor listeners
      obj.logic?.listeners?.forEach(l => {
        if (l.eventId?.startsWith('on_timer') || l.eventId === 'on_tick') {
          const cmd = l.eventId.startsWith('on_timer') ? 'on_timer' : 'on_tick';
          const p = l.eventId.split(':');
          let timerMs = 1000;
          if (cmd === 'on_timer' && p.length > 1) {
            timerMs = parseInt(p[1], 10) || 1000;
          }
          parsedScripts.push({
            cmd,
            parts: p,
            actionPart: '', // Actions are handled by listenerData
            timerMs,
            lastTrigger: Date.now(),
            listenerData: l
          });
        }
      });

      const physics = obj.physics || {};
      const isStatic = (physics.isStatic || !physics.enabled || obj.behavior === 'emitter') && obj.behavior !== 'player';

      const pObj = objectMap.get(inst.objectId);
      if (!pObj) return;

      const sprite = spriteMap.get(pObj.appearance?.spriteId || '');
      const isGrid = !!sprite?.grid?.enabled;
      const fw = isGrid ? sprite.grid.frameWidth : sprite?.width;
      const fh = isGrid ? sprite.grid.frameHeight : sprite?.height;

      let width = isGrid ? fw : (pObj.width || fw || 32);
      let height = isGrid ? fh : (pObj.height || fh || 32);

      const body = Matter.Bodies.rectangle(inst.x + width / 2, inst.y + height / 2, width, height, {
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

      (body as any).gameInfo = {
        width,
        height,
        scripts: parsedScripts,
        constantVx: obj.logic?.constantVelocityX,
        obj,
        spawnTime: roomStartTime
      };

      // Run 'on_start' scripts deferred so the engine/React state is settled
      const _onStartScripts = parsedScripts.filter((s: any) => s.cmd === 'on_start');
      if (_onStartScripts.length > 0) {
        const _body = body;
        const _obj = obj;
        setTimeout(() => {
          if (!isActiveRef.current) return;
          _onStartScripts.forEach((script: any) => {
            if (script.listenerData) executeListenerLogic(script.listenerData, _body, _obj, 'StartTrigger');
            else if (script.actionPart) executeAction(script.actionPart, _body, _obj, 'StartTrigger');
          });
        }, 100);
      }

      const sv = instanceSharedValues[index];
      if (sv) {
        sv.x.value = inst.x;
        sv.y.value = inst.y;
        sv.rot.value = (inst.angle || 0) * Math.PI / 180;
        sv.isColliding.value = 0;
        svMap.set(inst.id, sv);
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

      attachListeners(body, obj);
    });

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
              (otherObj.behavior && s.startsWith(`collision:${otherObj.behavior}:`))
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

    Matter.Events.on(engine, 'collisionActive', (event) => {
      event.pairs.forEach(pair => {
        // Simple ground check: if collision normal is pointing up
        if (pair.collision.normal.y < -0.5) {
          const pbA = playerBodies.find(p => p.body.label === pair.bodyA.label);
          if (pbA) pbA.onGround = true;
          const pbB = playerBodies.find(p => p.body.label === pair.bodyB.label);
          if (pbB) pbB.onGround = true;
        }
      });
    });

    let frameId: number;
    let fpsFrames = 0;
    let fpsLastTime = Date.now();
    let lastSyncedLength = 0;

    const update = () => {
      if (!isActiveRef.current) return;
      if (!isPlayingRef.current) { frameId = requestAnimationFrame(update); return; }
      const now = Date.now();

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

      // Reset player ground state before each engine update or processing
      playerBodies.forEach(pb => { (pb as any).onGround = false; });

      // 1. Run Physics Engine
      Matter.Engine.update(engine, 1000 / 60);
      physicsFrameCounter++;

      // Tick event
      DeviceEventEmitter.emit('on_tick');

      // 2. Process Player Inputs & Actions
      playerBodies.forEach(pb => {
        const b = pb.body;
        const c = pb.obj.physics || {};
        const combat = pb.obj.combat || {};

        let nVx = b.velocity.x;
        let nVy = b.velocity.y;

        // Jump Handling
        if (inputJump.current === 1 || inputTap.current === 1) {
          if (!pb.jumpedThisPress && (pb as any).onGround) {
            nVy = -Math.max(c.jumpStrength || 10, 13);
            DeviceEventEmitter.emit('builtin_jump', { targetId: b.label });
          }
          pb.jumpedThisPress = true;
        } else {
          pb.jumpedThisPress = false;
        }

        // Horizontal Movement
        if (inputLeft.current === 1) {
          nVx = -(c.moveSpeed || 5) * 0.8;
          DeviceEventEmitter.emit('builtin_left', { targetId: b.label });
        } else if (inputRight.current === 1) {
          nVx = (c.moveSpeed || 5) * 0.8;
          DeviceEventEmitter.emit('builtin_right', { targetId: b.label });
        } else {
          nVx *= 0.85;
        }

        Matter.Body.setVelocity(b, { x: nVx, y: nVy });

        // Update animation state based on velocity
        let anim = 0; // idle
        if (Math.abs(nVx) > 0.5) anim = 1; // move
        if (Math.abs(nVy) > 1) anim = 2; // jump/fall
        if (pb.sv) pb.sv.animState.value = anim;

        // Combat
        if (inputShoot.current === 1) {
          if (combat?.canShoot && combat?.bulletObjectId) {
            const dir = b.velocity.x >= 0 ? 0 : 180;
            spawnInstance(combat.bulletObjectId, b.position.x + (dir === 0 ? 20 : -20), b.position.y, true, {
              speed: combat.shootSpeed || 7,
              angle: dir,
              lifetime: 1500
            });
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
        if (now - e.lastSpawn > 1000 / (s.rate || 5)) {
          e.lastSpawn = now;
          spawnInstance(s.particleObjectId, e.body.position.x, e.body.position.y, true, { ...(s || {}), angle: e.body.angle * 180 / Math.PI });
        }
      });

      // Update Dynamic Elements & Cleanup
      let dynamicChanged = false;
      for (let i = dynamicRef.length - 1; i >= 0; i--) {
        const d = dynamicRef[i];

        // Apply custom gravity scale if needed
        const gScale = (d.body as any).gravityScale;
        if (gScale !== undefined && gScale !== 1) {
          Matter.Body.applyForce(d.body, d.body.position, {
            x: 0,
            y: d.body.mass * (engine.gravity.y * engine.gravity.scale) * (gScale - 1)
          });
        }

        if (d.expires && now > d.expires) {
          Matter.World.remove(engine.world, d.body);
          dynamicRef.splice(i, 1);
          dynamicChanged = true;
        } else {
          d.sv.x.value = d.body.position.x - d.width / 2;
          d.sv.y.value = d.body.position.y - d.height / 2;
          d.sv.rot.value = d.body.angle;

          // Run scripts for dynamic elements
          const info = (d.body as any).gameInfo;
          if (info?.scripts) {
            for (let s = 0; s < info.scripts.length; s++) {
              const script = info.scripts[s];
              if (script.cmd === 'on_tick') {
                if (script.listenerData) executeListenerLogic(script.listenerData, d.body, info.obj, 'DynTick');
                else if (script.actionPart) executeAction(script.actionPart, d.body, info.obj, 'DynTick');
              } else if (script.cmd === 'on_timer' && script.timerMs > 0) {
                if (now - script.lastTrigger >= script.timerMs) {
                  script.lastTrigger = now;
                  if (script.listenerData) executeListenerLogic(script.listenerData, d.body, info.obj, 'DynTimer');
                  else if (script.actionPart) executeAction(script.actionPart, d.body, info.obj, 'DynTimer');
                }
              }
            }
          }
        }
      }
      const bodyCount = newBodies.length;
      for (let i = 0; i < bodyCount; i++) {
        const body = newBodies[i];
        const info = (body as any).gameInfo;
        if (!info) continue;

        // 1. Always run scripts for this body
        if (info.scripts && info.scripts.length > 0) {
          for (let s = 0; s < info.scripts.length; s++) {
            const script = info.scripts[s];
            if (script.cmd === 'on_tick') {
              if (script.listenerData) executeListenerLogic(script.listenerData, body, info.obj, 'TickLoop');
              else if (script.actionPart) executeAction(script.actionPart, body, info.obj, 'TickLoop');
            } else if (script.cmd === 'on_timer' && script.timerMs > 0) {
              if (now - script.lastTrigger >= script.timerMs) {
                script.lastTrigger = now;
                if (script.listenerData) executeListenerLogic(script.listenerData, body, info.obj, 'TimerLoop');
                else if (script.actionPart) executeAction(script.actionPart, body, info.obj, 'TimerLoop');
              }
            }
          }
        }

        if (info.constantVx !== undefined) {
          Matter.Body.setVelocity(body, { x: info.constantVx, y: body.velocity.y });
        }

        // 2. Position Sync Optimization
        if (body.isStatic && body.position.x === (body as any).lastX && body.position.y === (body as any).lastY) continue;

        const sv = instanceSharedValues[i];
        if (sv && sv.x && sv.y) {
          sv.x.value = body.position.x - info.width / 2;
          sv.y.value = body.position.y - info.height / 2;
          sv.rot.value = body.angle;
          (body as any).lastX = body.position.x;
          (body as any).lastY = body.position.y;
        }
      }

      if (dynamicChanged || dynamicRef.length !== lastSyncedLength) {
        // Optimized: Only copy essential data for React state
        const elements = [];
        for (let i = 0; i < dynamicRef.length; i++) {
          const dx = dynamicRef[i];
          elements.push({
            id: dx.id,
            gameObject: dx.gameObject,
            sprite: dx.sprite,
            sv: dx.sv,
            width: dx.width,
            height: dx.height,
            name: dx.name
          });
        }
        setDynamicElements(elements);
        lastSyncedLength = dynamicRef.length;
      }

      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);

    return () => {
      isActiveRef.current = false;
      cancelAnimationFrame(frameId);
      subscriptions.forEach(s => s?.remove());
      Matter.Events.off(engine);
      Matter.Engine.clear(engine);
      Matter.World.clear(engine.world, false);
    };
  }, [visible, currentRoom?.id, restartKey, instanceSharedValues, allSprites, allAnimations]);

  const staticElements = useMemo(() => {
    if (!currentRoom || !currentRoom.instances) return null;
    const layers = currentRoom.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }];

    return layers.map((layer: RoomLayer) => {
      if (!layer.visible) return null;

      return (currentRoom.instances || []).map((inst: any, index: number) => {
        const targetLayerId = inst.layerId || (layers[0]?.id || 'default');
        if (!inst || targetLayerId !== layer.id) return null;
        if (!instanceSharedValues[index]) return null;

        const obj = objectMap.get(inst.objectId);
        if (!obj) return null;

        const appearance = obj.appearance || { type: 'sprite', spriteId: null };
        const sprite = (currentProject?.sprites || []).find(s => s.id === appearance.spriteId) || streamedSprites.get(appearance.spriteId || '');

        const isGrid = !!sprite?.grid?.enabled;
        const fw = isGrid ? sprite.grid.frameWidth : sprite?.width;
        const fh = isGrid ? sprite.grid.frameHeight : sprite?.height;
        const width = isGrid ? fw : (obj.width || inst.width || fw || 32);
        const height = isGrid ? fh : (obj.height || inst.height || fh || 32);

        return (
          <PhysicsBody
            key={inst.id}
            sprite={sprite}
            spriteId={appearance.spriteId || undefined}
            sprites={allSprites}
            isRemote={!!(currentProject as any)?.isRemote}
            onFetch={handleFetchAsset}
            sv={instanceSharedValues[index]}
            width={width}
            height={height}
            name={obj?.name}
            nonce={nonce}
            onTap={() => {
              DeviceEventEmitter.emit('builtin_tap', { targetId: inst.id });
              if (obj?.logic?.triggers?.onTap) {
                DeviceEventEmitter.emit(obj.logic.triggers.onTap!);
              }
            }}
            variables={variables}
            localVariables={localVariables[inst.id]}
            obj={obj}
            override={instanceOverrides[inst.id]}
            debug={debug}
            globalFrameTimer={globalFrameTimer}
          />
        );
      });
    });
  }, [currentRoom, instanceSharedValues, objectMap, spriteMap, currentProject, handleFetchAsset, variables, localVariables, nonce, globalFrameTimer]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { width: screenWidth, height: screenHeight }]}>
        <View style={styles.gameViewport}>
          <View style={[
            styles.canvas,
            {
              width: gameWidth,
              height: gameHeight,
              transform: [{ scale }]
            }
          ]}>
            {staticElements}
            {(dynamicElements || []).map(d => {
              if (!d || !d.sv) return null;
              return (
                <PhysicsBody
                  key={d.id}
                  sprite={spriteMap.get(d.sprite?.id) || d.sprite}
                  spriteId={d.sprite?.id}
                  isRemote={!!(currentProject as any)?.isRemote}
                  onFetch={handleFetchAsset}
                  sv={d.sv}
                  width={d.width}
                  height={d.height}
                  name={d.name}
                  variables={variables}
                  nonce={nonce}
                  localVariables={localVariables[d.id]}
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
                />
              );
            })}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={(e) => {
                inputTap.current = 1;
                DeviceEventEmitter.emit('builtin_tap', { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
              }}
            />
          </View>
          <View style={styles.topOverlay}>
            <TouchableOpacity onPress={onClose} style={styles.miniBtn}><X color="#fff" size={18} /></TouchableOpacity>
            <View style={styles.topRight}>
              {debug && <FPSCounter fps={fpsShared} />}
              <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.miniBtn}>{isPlaying ? <Pause color="#fff" size={14} /> : <PlayIcon color="#fff" size={14} />}</TouchableOpacity>
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
            <View style={styles.dpad}>
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
                  onPressIn={() => { inputRight.current = 1; }}
                  onPressOut={() => { inputRight.current = 0; }}
                >
                  <ArrowRight color="#fff" size={30} />
                </Pressable>
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
                  style={({ pressed }) => [styles.floatingBtn, styles.jumpBtn, pressed && { opacity: 0.7 }]}
                  onPressIn={() => { inputJump.current = 1; }}
                  onPressOut={() => { inputJump.current = 0; }}
                >
                  <ChevronUp color="#fff" size={30} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}


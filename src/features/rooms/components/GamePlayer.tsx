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
  SharedValue
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

const PhysicsBody = ({ sprite, sv, width = 32, height = 32, onTap, name, spriteId, isRemote, onFetch, variables, nonce, localVariables, obj, debug }: {
  sprite: any,
  sv: any,
  width?: number,
  height?: number,
  nonce?: number,
  onTap?: () => void,
  name?: string,
  spriteId?: string,
  isRemote?: boolean,
  onFetch?: (id: string) => void,
  variables: Record<string, number>,
  localVariables?: Record<string, number>,
  obj: any,
  debug?: boolean
}) => {
  useEffect(() => {
    if (!sprite && isRemote && spriteId && onFetch) {
      onFetch(spriteId);
    }
  }, [sprite, spriteId, isRemote]);

  const resolveText = (content: string) => {
    if (!content) return '';
    return content.replace(/\{([\w\s]+)\}/g, (match, varName) => {
      const trimmedName = varName.trim();
      // Check local variables (case-insensitive)
      if (localVariables) {
        const found = Object.keys(localVariables).find(k => k.toLowerCase() === trimmedName.toLowerCase());
        if (found) return localVariables[found].toString();
      }
      const foundGlobal = Object.keys(variables).find(k => k.toLowerCase() === trimmedName.toLowerCase());
      if (foundGlobal !== undefined) return variables[foundGlobal].toString();

      return match;
    });
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

  const debugBoxStyle = useAnimatedStyle(() => {
    if (!debug || !sv?.isColliding) return { display: 'none' as const };
    return {
      borderColor: sv.isColliding.value ? '#ff0000' : '#00ff00',
      backgroundColor: sv.isColliding.value ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 255, 0, 0.2)',
    };
  });

  const bmpUri = useMemo(() => {
    if (!sprite) return null;
    if (sprite.type === 'imported') return sprite.uri;
    if (!sprite.pixels) return null;
    return pixelsToBmp(sprite.pixels, sprite.id);
  }, [sprite?.id, sprite?.uri, width, height]);

  const content = bmpUri && !obj?.text ? (
    <Image
      source={{ uri: bmpUri }}
      style={{ width, height }}
      resizeMode="stretch"
    />
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
  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.round(fps.value)} FPS`,
    defaultValue: `${Math.round(fps.value)} FPS`,
  } as any));
  return (
    <View style={styles.fpsOverlay}>
      <AnimatedTextInput underlineColorAndroid="transparent" editable={false} pointerEvents="none" style={styles.fpsText} animatedProps={animatedProps} />
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
    objectId: any; id: string; sprite: any; sv: any; width: number; height: number; name: string
  }[]>([]);

  // Streaming state
  const [streamedSprites, setStreamedSprites] = useState<Map<string, any>>(new Map());

  const handleFetchAsset = useCallback(async (id: string) => {
    if (streamedSprites.has(id)) return;
    try {
      const data = await fetchRemoteAsset(id);
      setStreamedSprites(prev => new Map(prev).set(id, data));
    } catch (err) {
      console.warn('Failed to stream asset:', id, err);
    }
  }, [fetchRemoteAsset, streamedSprites]);

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

  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  useEffect(() => {
    localVariablesRef.current = localVariables;
  }, [localVariables]);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const updateGlobalVar = useCallback((name: string, amount: number, isSet: boolean = false) => {
    const now = Date.now();
    const cooldownKey = `global_${name}`;
    if (!isSet && varCooldowns.current[cooldownKey] && now - varCooldowns.current[cooldownKey] < 50) return;
    varCooldowns.current[cooldownKey] = now;

    const currentVal = variablesRef.current[name] || 0;
    const newVal = isSet ? amount : currentVal + amount;
    const next = { ...variablesRef.current, [name]: newVal };
    variablesRef.current = next;

    // Immediate throttled update for UI
    setVariables({ ...next });
    setNonce(n => n + 1);
  }, []);

  const updateLocalVar = useCallback((bodyId: string, name: string, amount: number, defaultVars: any, isSet: boolean = false) => {
    const now = Date.now();
    const cooldownKey = `local_${bodyId}_${name}`;
    if (!isSet && varCooldowns.current[cooldownKey] && now - varCooldowns.current[cooldownKey] < 50) return;
    varCooldowns.current[cooldownKey] = now;

    const current = localVariablesRef.current[bodyId] || { ...defaultVars };
    const currentVal = current[name] || 0;
    const newVal = isSet ? amount : currentVal + amount;
    const next = {
      ...localVariablesRef.current,
      [bodyId]: { ...current, [name]: newVal }
    };
    localVariablesRef.current = next;

    // Immediate throttled update for UI
    setLocalVariables({ ...next });
    setNonce(n => n + 1);
  }, []);

  // Sync refs to state at a throttled rate for UI rendering
  useEffect(() => {
    if (!visible || !isPlaying) return;
    const interval = setInterval(() => {
      setVariables({ ...variablesRef.current });
      setLocalVariables({ ...localVariablesRef.current });
    }, 100);
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
    const isActiveRef = { current: true };

    const engine = Matter.Engine.create({
      enableSleeping: false,
      positionIterations: 10,
      velocityIterations: 10,
      gravity: { x: 0, y: (currentRoom?.settings?.gravity ?? 9.8) / 10 }
    });
    let physicsFrameCounter = 0;
    const newBodies: Matter.Body[] = [];
    const playerBodies: { body: Matter.Body; obj: GameObject; isPlayer?: boolean; jumpedThisPress?: boolean; onGround?: boolean }[] = [];
    const emitters: { body: Matter.Body; obj: GameObject; lastSpawn: number }[] = [];
    const dynamicRef: {
      name: any; id: string; objectId?: string; body: Matter.Body; sv: any; expires?: number; sprite: any; width: number; height: number
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

    const executeAction = (actionData: string | { cmd: string, parts: string[] }, body: Matter.Body, obj?: GameObject, source: string = 'unknown') => {
      if (!isPlayingRef.current) return;
      const isParsed = typeof actionData !== 'string';
      const cmd = isParsed ? (actionData as any).cmd : actionData.split(':')[0];
      const parts = isParsed ? (actionData as any).parts : actionData.split(':');
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
      }
    };

    const attachListeners = (body: Matter.Body, obj: GameObject) => {
      obj.logic?.listeners?.forEach(l => {
        const sub = DeviceEventEmitter.addListener(l.eventId, (data: any) => {
          // If the event has a targetId, only react if it matches this body
          if (data?.targetId && String(data.targetId) !== String(body.label)) return;

          // For on_collision events, only fire if the other object is the player
          if (l.eventId === 'on_collision') {
            if (data?.otherName !== 'Player' && data?.otherBehavior !== 'player') return;
          }

          if (l.condition) {
            const lhsRaw = l.condition.split(/[><=!+]/)[0].trim();
            const op = l.condition.match(/[><=!]+/)?.[0] || '==';
            const rhsRaw = l.condition.split(/[><=!+]/).pop()?.trim() || '0';

            const lhs = resolveValue(lhsRaw, body, obj);
            const rhs = resolveValue(rhsRaw, body, obj);

            let met = false;
            if (op === '<') met = lhs < rhs;
            else if (op === '>') met = lhs > rhs;
            else if (op === '==') met = lhs === rhs;
            else if (op === '!=') met = lhs !== rhs;

            if (met && l.conditionAction) {
              executeAction(l.conditionAction, body, obj, `Listener:${l.eventId}:Cond`);
            }
          }

          if (l.action) {
            executeAction(l.action, body, obj, `Listener:${l.eventId}`);
          }
        });
        subscriptions.push(sub);
      });
    };

    const spawnInstance = (objectId: string, x: number, y: number, isParticle = false, settings?: any) => {
      const pObj = objectMapRef.current.get(objectId);
      if (!pObj) return;
      const physics = pObj.physics || {};
      const appearance = pObj.appearance || {};
      const sprite = spriteMapRef.current.get(appearance.spriteId || '');

      const width = isParticle ? 16 : (sprite?.width || 32);
      const height = isParticle ? 16 : (sprite?.height || 32);
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
      (body as any).gameInfo = {
        width,
        height,
        obj: pObj,
        spawnTime: Date.now()
      };

      const sv = { x: makeMutable(x - width / 2), y: makeMutable(y - height / 2), rot: makeMutable(0), isColliding: makeMutable(0) };
      svMap.set(body.label, sv);

      dynamicRef.push({
        id: body.label,
        objectId,
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

      // Pre-parse scripts
      const parsedScripts = obj.logic?.scripts?.map(s => {
        const p = s.split(':');
        return { cmd: p[0], parts: p };
      }) || [];

      const physics = obj.physics || {};
      const isStatic = (physics.isStatic || !physics.enabled || obj.behavior === 'emitter') && obj.behavior !== 'player';
      const sprite = spriteMap.get(obj.appearance?.spriteId || '');
      const width = inst.width || sprite?.width || 32;
      const height = inst.height || sprite?.height || 32;

      const body = Matter.Bodies.rectangle(inst.x + width / 2, inst.y + height / 2, width, height, {
        isStatic,
        isSensor: !physics.enabled,
        collisionFilter: physics.enabled ? { category: 0x0001, mask: 0xFFFFFFFF, group: 0 } : { category: 0x0000, mask: 0x0000, group: 0 },
        friction: obj.behavior === 'player' ? 0.001 : (physics.friction || 0.1),
        frictionAir: obj.behavior === 'player' ? 0.02 : 0.01,
        restitution: physics.restitution || 0.1,
        density: physics.density || 0.001,
        inertia: obj.behavior === 'player' ? Infinity : undefined,
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

      newBodies.push(body);
      if (obj.behavior === 'player') playerBodies.push({
        body,
        obj,
        isPlayer: true,
        jumpedThisPress: false
      });
      if (obj.behavior === 'emitter' || obj.behavior === 'particle') emitters.push({ body, obj, lastSpawn: 0 });

      attachListeners(body, obj);

      const sv = instanceSharedValues[index];
      if (sv) {
        sv.x.value = inst.x;
        sv.y.value = inst.y;
        sv.rot.value = 0;
        sv.isColliding.value = 0;
        svMap.set(inst.id, sv);
      }
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

        const runCollisionLogic = (targetBody: Matter.Body, targetObj: GameObject, otherObj: GameObject) => {
          const scripts = targetObj.logic?.scripts || [];

          for (const s of scripts) {
            if (
              s.startsWith(`collision:${otherObj.name}:`) ||
              (otherObj.behavior && s.startsWith(`collision:${otherObj.behavior}:`))
            ) {
              const action = s.split(' DO ')[1] || s.split(':').slice(2).join(':');
              if (action) {
                collisionQueue.push(() =>
                  executeAction(action, targetBody, targetObj, `Collision:${otherObj.name}`)
                );
              }
            } else if (s.startsWith('on_collision:')) {
              if (otherObj.name === 'Player' || otherObj.behavior === 'player' || isPlayer(otherObj)) {
                const action = s.split(' DO ')[1] || s.split(':').slice(1).join(':');
                if (action) {
                  collisionQueue.push(() =>
                    executeAction(action, targetBody, targetObj, `Collision:PlayerGuard`)
                  );
                }
              }
            }
          }
        };

        runCollisionLogic(pair.bodyA, objA, objB);
        runCollisionLogic(pair.bodyB, objB, objA);

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
        DeviceEventEmitter.emit(`collision:${objA.name}`, eventDataB);
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
        }
      }
      const bodyCount = newBodies.length;
      for (let i = 0; i < bodyCount; i++) {
        const body = newBodies[i];
        const info = (body as any).gameInfo;
        if (!info || (body.isStatic && body.position.x === (body as any).lastX && body.position.y === (body as any).lastY)) continue;

        const sv = instanceSharedValues[i];
        if (sv && sv.x && sv.y) {
          sv.x.value = body.position.x - info.width / 2;
          sv.y.value = body.position.y - info.height / 2;
          sv.rot.value = body.angle;
          (body as any).lastX = body.position.x;
          (body as any).lastY = body.position.y;

          // Run 'on_tick' scripts every frame
          if (info.scripts && info.scripts.length > 0) {
            for (let s = 0; s < info.scripts.length; s++) {
              const script = info.scripts[s];
              if (script.cmd === 'on_tick') {
                // Execute the action part of the on_tick:ACTION script
                const actionPart = script.parts.slice(1).join(':');
                if (actionPart) executeAction(actionPart, body, info.obj, 'TickLoop');
              }
            }
          }

          if (info.constantVx !== undefined) {
            Matter.Body.setVelocity(body, { x: info.constantVx, y: body.velocity.y });
          }
        }
      }

      if (dynamicChanged || dynamicRef.length !== lastSyncedLength) {
        setDynamicElements([...dynamicRef.map(dx => ({
          id: dx.id,
          objectId: dx.objectId,
          sprite: dx.sprite,
          sv: dx.sv,
          width: dx.width,
          height: dx.height,
          name: dx.name
        }))]);
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
  }, [visible, currentRoom?.id, restartKey, instanceSharedValues]);

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
        const sprite = spriteMap.get(obj?.appearance?.spriteId || '');

        return (
          <PhysicsBody
            key={inst.id}
            sprite={sprite}
            spriteId={obj?.appearance?.spriteId || undefined}
            isRemote={!!(currentProject as any)?.isRemote}
            onFetch={handleFetchAsset}
            sv={instanceSharedValues[index]}
            width={inst.width || sprite?.width || 32}
            height={inst.height || sprite?.height || 32}
            name={obj?.name}
            nonce={nonce}
            onTap={obj?.logic?.triggers?.onTap ? () => DeviceEventEmitter.emit(obj.logic.triggers.onTap!) : undefined}
            variables={variables}
            localVariables={localVariables[inst.id]}
            obj={obj}
            debug={debug}
          />
        );
      });
    });
  }, [currentRoom, instanceSharedValues, objectMap, spriteMap, currentProject, handleFetchAsset, variables, localVariables, nonce]);

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
                  obj={d.objectId ? objectMap.get(d.objectId) : {}}
                  debug={debug}
                  onTap={() => DeviceEventEmitter.emit('builtin_tap', { targetId: d.id })}
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
              <FPSCounter fps={fpsShared} />
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
              <Pressable
                style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.7 }]}
                onPressIn={() => { inputLeft.current = 1; }}
                onPressOut={() => { inputLeft.current = 0; }}
              >
                <ArrowLeft color="#fff" size={30} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.7 }]}
                onPressIn={() => { inputRight.current = 1; }}
                onPressOut={() => { inputRight.current = 0; }}
              >
                <ArrowRight color="#fff" size={30} />
              </Pressable>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.floatingBtn, styles.shootBtn, { marginBottom: 10 }, pressed && { opacity: 0.7 }]}
                onPressIn={() => { inputShoot.current = 1; }}
                onPressOut={() => { inputShoot.current = 0; }}
              >
                <Bolt color="#fff" size={24} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.floatingBtn, styles.jumpBtn, pressed && { opacity: 0.7 }]}
                onPressIn={() => { inputJump.current = 1; }}
                onPressOut={() => { inputJump.current = 0; }}
              >
                <ChevronUp color="#fff" size={30} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}


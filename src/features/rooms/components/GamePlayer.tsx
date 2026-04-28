import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, DeviceEventEmitter, TextInput, Image, Pressable, Modal, Dimensions } from 'react-native';
import Matter from 'matter-js';
import { X, RotateCcw, Play as PlayIcon, Pause, ArrowLeft, ArrowRight, ChevronUp, Bolt } from 'lucide-react-native';
import { theme } from '../../../theme';
import { useProjectStore, GameObject } from '../../../store/useProjectStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  makeMutable,
  useAnimatedProps,
  SharedValue
} from 'react-native-reanimated';

import base64js from 'base64-js';

const SPRITE_CACHE = new Map<string, string>();

const pixelsToBmp = (pixels: string[][], spriteId: string) => {
  if (!pixels || pixels.length === 0) return null;

  const originalWidth = pixels[0]?.length || 0;
  const originalHeight = pixels.length || 0;
  if (originalWidth === 0 || originalHeight === 0) return null;

  // Internal upscaling to achieve pixel-perfect look on high-res screens
  const UPSCALE = 8;
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

const PhysicsBody = React.memo(({ sprite, sv, size = 32, onTap, name, spriteId, isRemote, onFetch }: {
  sprite: any,
  sv: any,
  size?: number,
  onTap?: () => void,
  name?: string,
  spriteId?: string,
  isRemote?: boolean,
  onFetch?: (id: string) => void
}) => {
  useEffect(() => {
    if (!sprite && isRemote && spriteId && onFetch) {
      onFetch(spriteId);
    }
  }, [sprite, spriteId, isRemote]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: sv.x.value },
        { translateY: sv.y.value },
        { rotate: `${sv.rot.value}rad` }
      ],
    };
  });

  const bmpUri = useMemo(() => {
    if (!sprite) return null;
    if (sprite.type === 'imported') return sprite.uri;
    if (!sprite.pixels) return null;
    return pixelsToBmp(sprite.pixels, sprite.id);
  }, [sprite?.id, JSON.stringify(sprite?.pixels), sprite?.uri]);

  const content = bmpUri ? (
    <Image
      source={{ uri: bmpUri }}
      style={{ width: size, height: size }}
      resizeMode="stretch"
    />
  ) : (
    <View style={{ width: size, height: size, backgroundColor: '#333', borderRadius: 4, borderWidth: 1, borderColor: '#555', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#666', fontSize: 8 }}>?</Text>
    </View>
  );

  return (
    <Animated.View style={[styles.instance, animatedStyle, { width: size, height: size }]} pointerEvents={onTap ? 'auto' : 'none'}>
      {onTap ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onTap} style={{ flex: 1 }}>
          {content}
        </TouchableOpacity>
      ) : content}
    </Animated.View>
  );
});

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

export default function GamePlayer({ visible, onClose, projectOverride }: { visible: boolean; onClose: () => void; projectOverride?: any }) {
  const storeProject = useProjectStore(s => s.activeProject);
  const fetchRemoteAsset = useProjectStore(s => s.fetchRemoteAsset);
  const currentProject = projectOverride || storeProject;
  const currentRoom = (currentProject?.rooms || [])[0];
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Calculate scaling to fit screen
  const gameWidth = currentRoom?.width || 800;
  const gameHeight = currentRoom?.height || 600;
  const scaleX = screenWidth / gameWidth;
  const scaleY = screenHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const [restartKey, setRestartKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);
  const [dynamicElements, setDynamicElements] = useState<{ id: string; sprite: any; sv: any; size: number; name: string }[]>([]);

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

  const instanceSharedValues = useMemo(() => {
    if (!currentRoom || !currentRoom.instances) return [];
    return Array.from({ length: currentRoom.instances.length }).map(() => ({
      x: makeMutable(0), y: makeMutable(0), rot: makeMutable(0),
    }));
  }, [currentRoom?.id, (currentRoom?.instances || []).length, restartKey]);

  const inputLeft = useSharedValue(0);
  const inputRight = useSharedValue(0);
  const inputJump = useSharedValue(0);
  const inputShoot = useSharedValue(0);
  const fpsShared = useSharedValue(60);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (!visible || !currentRoom) return;
    setDynamicElements([]);
    const isActiveRef = { current: true };

    const engine = Matter.Engine.create({
      enableSleeping: true,
      gravity: { x: 0, y: (currentRoom?.settings?.gravity ?? 9.8) / 10 }
    });
    const newBodies: Matter.Body[] = [];
    const playerBodies: { body: Matter.Body; obj: GameObject }[] = [];
    const emitters: { body: Matter.Body; obj: GameObject; lastSpawn: number }[] = [];
    const dynamicRef: {
      name: any; id: string; body: Matter.Body; sv: any; expires?: number; sprite: any; size: number
    }[] = [];
    const subscriptions: any[] = [];

    const attachListeners = (body: Matter.Body, obj: GameObject) => {
      obj.logic?.listeners?.forEach(l => {
        const sub = DeviceEventEmitter.addListener(l.eventId, () => {
          if (!isPlayingRef.current) return;
          if (l.action === 'jump') Matter.Body.setVelocity(body, { x: body.velocity.x, y: -(obj.physics.jumpStrength || 10) * 0.6 });
          else if (l.action === 'move_left') Matter.Body.setVelocity(body, { x: -(obj.physics.moveSpeed || 5) * 0.8, y: body.velocity.y });
          else if (l.action === 'move_right') Matter.Body.setVelocity(body, { x: (obj.physics.moveSpeed || 5) * 0.8, y: body.velocity.y });
          else if (l.action === 'stop_x') Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
          else if (l.action.startsWith('create_instance:')) {
            const targetId = l.action.split(':')[1];
            spawnInstance(targetId, body.position.x, body.position.y);
          }
        });
        subscriptions.push(sub);
      });
    };

    const spawnInstance = (objectId: string, x: number, y: number, isParticle = false, settings?: any) => {
      const pObj = currentProject?.objects.find(o => o.id === objectId);
      if (!pObj) return;
      const physics = pObj.physics || {};
      const appearance = pObj.appearance || {};
      const size = isParticle ? 16 : 32;
      const isStatic = !isParticle && (physics.isStatic || !physics.enabled);

      const body = isParticle
        ? Matter.Bodies.circle(x, y, 8, { frictionAir: 0.02, restitution: 0.5, density: 0.0005, label: 'p_' + Date.now() + Math.random() })
        : Matter.Bodies.rectangle(x, y, 32, 32, { isStatic, friction: physics.friction || 0.1, restitution: physics.restitution || 0.1, label: 'dyn_' + Date.now() + Math.random() });

      if (isParticle && settings) {
        const angle = (settings.angle || 0) + (Math.random() * (settings.spread || 45) - (settings.spread || 45) / 2);
        const rad = angle * Math.PI / 180;
        Matter.Body.setVelocity(body, { x: Math.cos(rad) * (settings.speed || 2), y: Math.sin(rad) * (settings.speed || 2) });
        (body as any).gravityScale = settings.gravityScale ?? 1;
      }

      if (!isParticle) attachListeners(body, pObj);

      Matter.World.add(engine.world, body);
      const sv = { x: makeMutable(x - size / 2), y: makeMutable(y - size / 2), rot: makeMutable(0) };
      const sprite = spriteMap.get(appearance.spriteId || '');

      dynamicRef.push({
        id: body.label,
        body,
        sv,
        sprite,
        size,
        expires: isParticle ? Date.now() + (settings?.lifetime || 1000) : undefined,
        name: undefined
      });
    };

    (currentRoom?.instances || []).forEach((inst: any, index: number) => {
      if (!inst) return;
      const obj = objectMap.get(inst.objectId);
      if (!obj) return;
      const physics = obj.physics || {};
      const isStatic = physics.isStatic || !physics.enabled || obj.behavior === 'emitter';
      const body = Matter.Bodies.rectangle(inst.x + 16, inst.y + 16, 32, 32, {
        isStatic, friction: physics.friction || 0.1, frictionAir: 0.05,
        restitution: physics.restitution || 0.1, density: physics.density || 0.001,
        inertia: obj.behavior === 'player' ? Infinity : undefined, label: inst.id
      });
      newBodies.push(body);
      if (obj.behavior === 'player') playerBodies.push({ body, obj });
      if (obj.behavior === 'emitter' || obj.behavior === 'particle') emitters.push({ body, obj, lastSpawn: 0 });

      attachListeners(body, obj);

      const sv = instanceSharedValues[index];
      if (sv) { sv.x.value = inst.x; sv.y.value = inst.y; sv.rot.value = 0; }
    });

    Matter.World.add(engine.world, newBodies);

    // Optimization: Create instance map for collision lookup
    const instanceMap = new Map<string, any>();
    currentRoom.instances.forEach(i => instanceMap.set(i.id, i));

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const instA = instanceMap.get(pair.bodyA.label);
        const instB = instanceMap.get(pair.bodyB.label);
        const objA = objectMap.get(instA?.objectId || '');
        const objB = objectMap.get(instB?.objectId || '');
        if (objA?.logic?.triggers?.onCollision) DeviceEventEmitter.emit(objA.logic.triggers.onCollision);
        if (objB?.logic?.triggers?.onCollision) DeviceEventEmitter.emit(objB.logic.triggers.onCollision);
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

      // 1. Process Player Inputs & Actions
      playerBodies.forEach(pb => {
        const b = pb.body;
        const c = pb.obj.physics || {};
        const combat = pb.obj.combat || {};

        let nVx = b.velocity.x;
        let nVy = b.velocity.y;

        if (inputJump.value === 1) {
          nVy = -(c.jumpStrength || 10) * 0.5;
          inputJump.value = 0;
        }

        if (inputShoot.value === 1) {
          if (combat?.canShoot && combat?.bulletObjectId) {
            const dir = b.velocity.x >= 0 ? 0 : 180;
            spawnInstance(combat.bulletObjectId, b.position.x + (dir === 0 ? 20 : -20), b.position.y, true, {
              speed: combat.shootSpeed || 7,
              angle: dir,
              lifetime: 1500
            });
          }
          inputShoot.value = 0;
        }

        if (inputLeft.value === 1) nVx = -(c.moveSpeed || 5) * 0.8;
        else if (inputRight.value === 1) nVx = (c.moveSpeed || 5) * 0.8;
        else nVx *= 0.85; // Faster stop when no input

        Matter.Body.setVelocity(b, { x: nVx, y: nVy });
      });

      // 2. Run Physics Engine
      Matter.Engine.update(engine, 1000 / 60);

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
          d.sv.x.value = d.body.position.x - d.size / 2;
          d.sv.y.value = d.body.position.y - d.size / 2;
          d.sv.rot.value = d.body.angle;
        }
      }
      newBodies.forEach((body, i) => {
        if (body.isStatic && body.position.x === body.position.x) return; // Skip static once settled
        const sv = instanceSharedValues[i];
        if (sv) {
          sv.x.value = body.position.x - 16;
          sv.y.value = body.position.y - 16;
          sv.rot.value = body.angle;
        }
      });

      if (dynamicChanged || dynamicRef.length !== lastSyncedLength) {
        setDynamicElements([...dynamicRef.map(dx => ({ id: dx.id, sprite: dx.sprite, sv: dx.sv, size: dx.size, name: dx.name }))]);
        lastSyncedLength = dynamicRef.length;
      }

      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);

    return () => {
      isActiveRef.current = false;
      cancelAnimationFrame(frameId);
      subscriptions.forEach(s => s?.remove());
      Matter.Events.off(engine, 'collisionStart');
      Matter.Engine.clear(engine);
      Matter.World.clear(engine.world, false);
    };
  }, [visible, currentRoom?.id, restartKey, instanceSharedValues, objectMap, spriteMap]);

  const staticElements = useMemo(() => {
    if (!currentRoom || !currentRoom.instances) return null;
    return (currentRoom.instances || []).map((inst: any, index: number) => {
      if (!inst || !instanceSharedValues[index]) return null;
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
          name={obj?.name}
          onTap={obj?.logic?.triggers?.onTap ? () => DeviceEventEmitter.emit(obj.logic.triggers.onTap!) : undefined}
        />
      );
    });
  }, [currentRoom, instanceSharedValues, objectMap, spriteMap, currentProject, handleFetchAsset]);

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
                  size={d.size}
                  name={d.name}
                />
              );
            })}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={(e) => {
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
                onPressIn={() => { inputLeft.value = 1; DeviceEventEmitter.emit('builtin_left'); }}
                onPressOut={() => inputLeft.value = 0}
              >
                <ArrowLeft color="#fff" size={30} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.7 }]}
                onPressIn={() => { inputRight.value = 1; DeviceEventEmitter.emit('builtin_right'); }}
                onPressOut={() => inputRight.value = 0}
              >
                <ArrowRight color="#fff" size={30} />
              </Pressable>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.floatingBtn, styles.shootBtn, { marginBottom: 10 }, pressed && { opacity: 0.7 }]}
                onPressIn={() => { inputShoot.value = 1; DeviceEventEmitter.emit('builtin_shoot'); }}
              >
                <Bolt color="#fff" size={24} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.floatingBtn, styles.jumpBtn, pressed && { opacity: 0.7 }]}
                onPressIn={() => { inputJump.value = 1; DeviceEventEmitter.emit('builtin_jump'); }}
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

const styles = StyleSheet.create({
  container: { 
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000', 
    zIndex: 9999 
  },
  gameViewport: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#000' 
  },
  canvas: { backgroundColor: '#000', overflow: 'hidden', position: 'relative' },
  instance: { position: 'absolute' },
  topOverlay: { position: 'absolute', top: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, pointerEvents: 'box-none' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  fpsOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, borderRadius: 4 },
  fpsText: { color: '#44ff44', fontSize: 10, fontWeight: 'bold', width: 40 },
  floatingControls: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 30, paddingBottom: 40, pointerEvents: 'box-none' },
  dpad: { flexDirection: 'row', gap: 15 },
  actions: { flexDirection: 'column', alignItems: 'center' },
  floatingBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  jumpBtn: { borderColor: '#4facfe' },
  shootBtn: { borderColor: '#ff4b2b', backgroundColor: 'rgba(255, 75, 43, 0.3)' },
});

import React, { JSX, useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Switch, Image, StyleSheet } from 'react-native';
import { Info, Palette, Bolt, Share2, Settings, X, Plus, Trash2, Heart, Music, Target, Layers, Play, ArrowLeft, ArrowRight, Pause, ChevronUp, Zap, MousePointer2, HelpCircle, Layout, Globe, Activity, ChevronDown, ChevronRight, Database, Cpu, GitBranch, Code, Monitor, ZoomIn, ZoomOut, RotateCcw, FileCode, Image as ImageIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../../../theme';
import { GameObject, useProjectStore } from '../../../../store/useProjectStore';
import { styles } from './ObjectInspectorModal.styles';

interface ObjectInspectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedObject: GameObject | null;
  setSelectedObject: (obj: GameObject | null) => void;
  currentProject: any;
  updateObject: (id: string, updates: Partial<GameObject>) => void;
  setSpritePickerVisible: (visible: boolean) => void;
  setAnimationPickerVisible?: (visible: boolean) => void;
  setActionPickerVisible: (visible: boolean) => void;
  setEventPickerVisible: (visible: boolean) => void;
  setPropertyPickerVisible: (visible: boolean) => void;
  statePickerVisible?: boolean;
  setStatePickerVisible?: (visible: boolean) => void;
  soundPickerVisible?: boolean;
  setSoundPickerVisible?: (visible: boolean) => void;
  pickingForEngineState?: string | null;
  setPickingForEngineState?: (state: string | null) => void;
  renderSpritePreview: (spriteId: string | null, size?: number) => JSX.Element;
  onSelectSprite?: (spriteId: string) => void;
  activeListenerIndex: number | null;
  setActiveListenerIndex: (index: number | null) => void;
  activeSubIndex: number | null;
  setActiveSubIndex: (index: number | null) => void;
  activePropertyIndex: number | null;
  setActivePropertyIndex: (index: number | null) => void;
}



const VariableRow = ({
  varKey,
  value,
  onRename,
  onChangeValue,
  onPromote,
  onDelete,
  isGlobal = false
}: any) => {
  const [localKey, setLocalKey] = useState(varKey);

  useEffect(() => {
    setLocalKey(varKey);
  }, [varKey]);

  return (
    <View style={styles.variableRow}>
      {isGlobal ? (
        <Text style={[styles.varName, { opacity: 0.7 }]}>{varKey}</Text>
      ) : (
        <TextInput
          style={styles.varName}
          value={localKey}
          onChangeText={setLocalKey}
          onBlur={() => {
            if (localKey !== varKey && localKey.trim() !== '') {
              onRename(varKey, localKey);
            } else {
              setLocalKey(varKey);
            }
          }}
        />
      )}
      <TextInput
        style={styles.varValue}
        value={String(value)}
        onChangeText={onChangeValue}
      />
      <View style={styles.varActions}>
        {!isGlobal && onPromote && (
          <TouchableOpacity onPress={onPromote}>
            <Globe size={14} color={theme.colors.secondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDelete}>
          <Trash2 size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CollisionPreview = ({ obj, renderSpritePreview, currentProject }: { obj: any, renderSpritePreview: any, currentProject: any }) => {
  const sprite = (currentProject?.sprites || []).find((s: any) => s.id === obj.appearance.spriteId);
  const isGrid = !!sprite?.grid?.enabled;
  const fw = isGrid ? (sprite?.grid?.frameWidth || sprite?.width || 32) : (sprite?.width || obj.width || 32);
  const fh = isGrid ? (sprite?.grid?.frameHeight || sprite?.height || 32) : (sprite?.height || obj.height || 32);

  const objW = fw;
  const objH = fh;

  const col = obj.physics?.collision || {
    type: 'rectangle',
    width: obj.width || objW || 32,
    height: obj.height || objH || 32,
    offsetX: 0,
    offsetY: 0
  };

  const baseSize = 64;
  const scale = baseSize / Math.max(objW, objH, 1);

  const shapeWidth = (col.type === 'circle' ? (col.radius || objW / 2) * 2 : (col.width ?? objW));
  const shapeHeight = (col.type === 'circle' ? (col.radius || objW / 2) * 2 : (col.height ?? objH));

  // Aspect ratio scaling for the sprite preview
  const displayW = objW * scale;
  const displayH = objH * scale;

  // Center-relative offsets
  const left = (displayW / 2) - (shapeWidth * scale / 2) + (col.offsetX || 0) * scale;
  const top = (displayH / 2) - (shapeHeight * scale / 2) + (col.offsetY || 0) * scale;

  return (
    <View style={{ width: baseSize, height: baseSize, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderColor: '#333' }}>
      <View style={{ width: displayW, height: displayH, backgroundColor: 'transparent' }}>
        {renderSpritePreview(obj.appearance.spriteId, Math.max(displayW + 8, displayH + 8))}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            borderWidth: 1.5,
            borderColor: '#00D1FF',
            backgroundColor: 'rgba(0, 209, 255, 0.25)',
            borderRadius: col.type === 'circle' ? 999 : 2,
            width: shapeWidth * scale + 8,
            height: shapeHeight * scale + 8,
            left: left,
            top: top,
          }}
        />
        {/* Pivot indicator */}
        <View
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#FFF',
            left: left + (shapeWidth * scale / 2) + 2,
            top: top + (shapeHeight * scale / 2) + 2,
          }}
        />
      </View>
    </View>
  );
};

const ViewportPreview = ({ obj, renderSpritePreview, currentProject, onSwitchToCode }: { obj: any, renderSpritePreview: any, currentProject: any, onSwitchToCode: () => void }) => {
  const [zoom, setZoom] = useState(100); // Default zoom at 100%
  const sprite = (currentProject?.sprites || []).find((s: any) => s.id === obj.appearance.spriteId);
  const isGrid = !!sprite?.grid?.enabled;
  const fw = isGrid ? (sprite?.grid?.frameWidth || sprite?.width || 32) : (sprite?.width || obj.width || 32);
  const fh = isGrid ? (sprite?.grid?.frameHeight || sprite?.height || 32) : (sprite?.height || obj.height || 32);

  const objW = fw;
  const objH = fh;

  const col = obj.physics?.collision || {
    type: 'rectangle',
    width: obj.width || objW || 32,
    height: obj.height || objH || 32,
    offsetX: 0,
    offsetY: 0
  };

  const shapeWidth = (col.type === 'circle' ? (col.radius || objW / 2) * 2 : (col.width ?? objW));
  const shapeHeight = (col.type === 'circle' ? (col.radius || objW / 2) * 2 : (col.height ?? objH));

  const scale = zoom / 100;
  const spriteSize = Math.max(objW, objH, 1) * scale;

  // Collision Shape Dimensions scaled
  const shapeW = shapeWidth * scale;
  const shapeH = shapeHeight * scale;
  const offX = (col.offsetX || 0) * scale;
  const offY = (col.offsetY || 0) * scale;

  // We want to render a beautiful grid centered in the viewport.
  // The spacing of our visual grid in pixels is, say, 16 pixels scaled by zoom.
  const gridSpacing = 16 * scale;
  const gridIndices = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0D10', position: 'relative', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      {/* Dynamic Grid */}
      <View style={{ position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', opacity: 0.15 }} pointerEvents="none">
        {gridIndices.map((idx) => (
          <React.Fragment key={`grid-${idx}`}>
            {/* Vertical grid lines */}
            <View
              style={{
                position: 'absolute',
                width: 1,
                height: '200%',
                backgroundColor: '#FFF',
                left: '50%',
                transform: [{ translateX: idx * gridSpacing }]
              }}
            />
            {/* Horizontal grid lines */}
            <View
              style={{
                position: 'absolute',
                height: 1,
                width: '200%',
                backgroundColor: '#FFF',
                top: '50%',
                transform: [{ translateY: idx * gridSpacing }]
              }}
            />
          </React.Fragment>
        ))}
      </View>

      {/* Origin Axis Rulers crossing in the exact center */}
      {/* X Axis (Red-ish) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          height: 1.5,
          width: '100%',
          backgroundColor: '#EF4444',
          opacity: 0.45,
          top: '50%',
        }}
      />
      {/* Y Axis (Green-ish) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 1.5,
          height: '100%',
          backgroundColor: '#10B981',
          opacity: 0.45,
          left: '50%',
        }}
      />

      {/* Central workspace contents container */}
      <View style={{ justifyContent: 'center', alignItems: 'center', width: spriteSize, height: spriteSize }}>
        {/* Sprite image preview */}
        <View style={{ opacity: 0.95 }}>
          {renderSpritePreview(obj.appearance.spriteId, spriteSize)}
        </View>

        {/* Collision overlay */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            borderWidth: 2,
            borderColor: '#00D1FF',
            backgroundColor: 'rgba(0, 209, 255, 0.25)',
            borderRadius: col.type === 'circle' ? 999 : 2,
            width: shapeW,
            height: shapeH,
            // Center the collision shape and apply coordinates offsets
            transform: [
              { translateX: offX },
              { translateY: offY }
            ]
          }}
        />

        {/* Pivot orange crosshair at center */}
        <View pointerEvents="none" style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#FF8C00', backgroundColor: '#0D0F12', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: '#FF8C00' }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', width: 14, height: 1.5, backgroundColor: '#FF8C00', transform: [{ translateX: 0 }] }} />
        <View pointerEvents="none" style={{ position: 'absolute', width: 1.5, height: 14, backgroundColor: '#FF8C00', transform: [{ translateY: 0 }] }} />
      </View>

      {/* TOP RIGHT BADGE: Zoom percentage */}
      <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(10, 12, 16, 0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: theme.colors.primary, fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>{zoom.toFixed(1)}%</Text>
      </View>

      {/* BOTTOM RIGHT: Floating Zoom Controls */}
      <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 6, backgroundColor: 'rgba(10, 12, 16, 0.85)', padding: 4, borderRadius: 2, borderWidth: 1, borderColor: '#222' }}>
        <TouchableOpacity
          onPress={() => setZoom(z => Math.max(10, z - 10))}
          style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16191E', borderRadius: 2, borderWidth: 1, borderColor: '#333' }}
        >
          <ZoomOut size={12} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setZoom(100)}
          style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16191E', borderRadius: 2, borderWidth: 1, borderColor: '#333' }}
        >
          <RotateCcw size={12} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setZoom(z => Math.min(2000, z + 10))}
          style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16191E', borderRadius: 2, borderWidth: 1, borderColor: '#333' }}
        >
          <ZoomIn size={12} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ParticlePreview = ({ settings, particleSprite }: { settings: any, particleSprite: any }) => {
  const [p, setP] = useState<{ id: number, x: number, y: number, vx: number, vy: number, life: number }[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  useEffect(() => {
    if (!settings.enabled || !settings.particleObjectId) { setP([]); return; }

    const update = () => {
      const now = Date.now();
      setP(prev => {
        const next = prev.map(pt => ({
          ...pt,
          x: pt.x + pt.vx,
          y: pt.y + pt.vy,
          life: pt.life - 16
        })).filter(pt => pt.life > 0);

        const interval = 1000 / (settings.rate || 5);
        if (now - lastSpawnRef.current > interval) {
          lastSpawnRef.current = now;
          const angle = (Math.random() * (settings.spread || 45) - (settings.spread || 45) / 2) - 90;
          const rad = angle * Math.PI / 180;
          next.push({
            id: Math.random(),
            x: 50, y: 80,
            vx: Math.cos(rad) * (settings.speed || 2) * 0.5,
            vy: Math.sin(rad) * (settings.speed || 2) * 0.5,
            life: settings.lifetime || 1000
          });
        }
        return next;
      });
      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [settings.enabled, settings.particleObjectId, settings.rate, settings.spread, settings.speed, settings.lifetime]);

  return (
    <View style={styles.previewContainer}>
      {p.map(pt => (
        <View
          key={pt.id}
          style={[
            styles.previewParticle,
            {
              left: `${pt.x}%`,
              top: `${pt.y}%`,
              backgroundColor: particleSprite?.color || theme.colors.primary,
              opacity: pt.life / settings.lifetime
            }
          ]}
        />
      ))}
      <View style={styles.previewSource} />
    </View>
  );
};

export default function ObjectInspectorModal({
  visible, onClose, selectedObject, setSelectedObject, currentProject, updateObject,
  setSpritePickerVisible, setAnimationPickerVisible,
  setActionPickerVisible, setEventPickerVisible, setPropertyPickerVisible,
  statePickerVisible, setStatePickerVisible,
  soundPickerVisible, setSoundPickerVisible,
  pickingForEngineState, setPickingForEngineState,
  renderSpritePreview, onSelectSprite,
  activeListenerIndex, setActiveListenerIndex,
  activeSubIndex, setActiveSubIndex,
  activePropertyIndex, setActivePropertyIndex
}: ObjectInspectorModalProps) {
  const navigation = useNavigation();
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  const [isAddingSubForIndex, setIsAddingSubForIndex] = useState<number | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<'preview' | 'code'>('preview');

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    about: true,
    appearance: false,
    animations: false,
    physics: false,
    combat: false,
    sounds: false,
    logic: false,
    variables: true,
    emitter: false,
    text: true,
    progress_bar: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [collapsedListeners, setCollapsedListeners] = useState<Record<number, boolean>>({});
  const [collapsedSubSections, setCollapsedSubSections] = useState<Record<string, boolean>>({});

  // Autocomplete state
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [activeInputInfo, setActiveInputInfo] = useState<{ type: 'event' | 'condition' | 'action', index: number, subIndex?: number | null, actionIndex?: number | null } | null>(null);

  const suggestions = useMemo(() => {
    if (!suggestionQuery) return [];

    const query = suggestionQuery.toLowerCase().split(/[ .><=!+*/%^(),]/).pop() || '';
    if (!query && !suggestionQuery.endsWith('.') && !suggestionQuery.endsWith('(')) return [];

    const allKeywords = [
      'self', 'other', 'Global', 'room_width', 'room_height', 'time',
      'clamp(', 'min(', 'max(', 'abs(', 'floor(', 'random(',
      'jump', 'move_left', 'move_right', 'stop_x', 'restart_room', 'go_to_room:',
      'set_value', 'add_value', 'tween_to', 'bind_to_variable', 'on_empty', 'on_full',
      'damage', 'heal', 'set_count', 'on_life_lost', 'on_zero_lives',
      'save_game', 'load_game',
      'current_count', 'max_count', 'value', 'health',
      'start_sound:', 'stop_sound:', 'on_start_sound', 'on_start_sound:', 'on_stop_sound', 'on_stop_sound:',
      'on_start', 'on_tick', 'on_timer:', 'on_collision', 'on_tap',
      ...(currentProject?.objects?.map((o: any) => o.name) || []),
      ...(Object.keys(currentProject?.variables?.global || {}).map((v: any) => v)),
      ...(currentProject?.sounds?.map((s: any) => s.name) || [])
    ];

    return allKeywords.filter(k => k.toLowerCase().startsWith(query.toLowerCase()) && k.toLowerCase() !== query.toLowerCase());
  }, [suggestionQuery, currentProject]);

  const toggleListenerCollapse = (index: number) => {
    setCollapsedListeners(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleSubSectionCollapse = (listenerIndex: number, type: 'do' | 'if') => {
    const key = `${listenerIndex}-${type}`;
    setCollapsedSubSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applySuggestion = (suggestion: string) => {
    if (!activeInputInfo) return;
    const { type, index, subIndex } = activeInputInfo;
    const newListeners = [...safeObject.logic.listeners];

    const replaceLastWord = (text: string) => {
      const regex = /[a-zA-Z0-9_(]*$/;
      return text.replace(regex, suggestion);
    };

    if (type === 'event') {
      newListeners[index].eventId = replaceLastWord(newListeners[index].eventId);
    } else if (type === 'condition' && subIndex != null) {
      newListeners[index].subConditions[subIndex].condition = replaceLastWord(newListeners[index].subConditions[subIndex].condition);
    }

    updateField('logic.listeners', newListeners);
    setSuggestionQuery('');
  };

  const SuggestionsBar = () => {
    if (suggestions.length === 0) return null;
    return (
      <View style={{ backgroundColor: '#1A1D23', borderBottomWidth: 1, borderBottomColor: '#333', paddingVertical: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 8 }}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => applySuggestion(s)}
              style={{ backgroundColor: theme.colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.primary + '30' }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (!visible || !selectedObject) return null;

  const safeObject = {
    ...selectedObject,
    health: selectedObject.health || { max: 100, current: 100 },
    animations: selectedObject.animations || {},
    appearance: {
      ...selectedObject.appearance,
      animationSpeed: selectedObject.appearance?.animationSpeed || 100,
      ySortOffset: selectedObject.appearance?.ySortOffset || 0,
    },
    physics: {
      enabled: true,
      isStatic: false,
      applyGravity: true,
      friction: 0.1,
      density: 0.001,
      jumpStrength: 10,
      moveSpeed: 5,
      ignoreCollision: false,
      ...selectedObject.physics,
    },
    combat: {
      canShoot: false,
      maxBullets: 3,
      bulletObjectId: null,
      damage: 10,
      shootSpeed: 5,
      canShootInAir: true,
      canMelee: false,
      meleeDamage: 20,
      canMeleeInAir: true,
      explodes: false,
      ...selectedObject.combat,
    },
    sounds: selectedObject.sounds || {},
    variables: {
      local: (selectedObject.variables as any)?.local ||
        (selectedObject.variables && typeof selectedObject.variables === 'object' && !('local' in selectedObject.variables) ? selectedObject.variables : {}) ||
        {},
    },
    logic: {
      triggers: { onTap: '', onCollision: '', ...selectedObject.logic?.triggers },
      listeners: (selectedObject.logic?.listeners || []).map((l: any) => {
        if (l.subConditions) return l;
        // Migrate old format
        const hasCondition = !!l.condition;
        return {
          eventId: l.eventId || '',
          immediateActions: hasCondition ? [] : (l.actions || []),
          subConditions: hasCondition ? [{
            condition: l.condition,
            actions: l.actions || [],
            elseActions: l.elseActions
          }] : []
        };
      }),
    },
    emitter: {
      enabled: false,
      particleObjectId: null,
      rate: 5,
      lifetime: 1000,
      speed: 2,
      spread: 45,
      gravityScale: 0,
      burst: false,
      ...selectedObject.emitter,
    },
    progress_bar: {
      minValue: 0,
      maxValue: 100,
      currentValue: 100,
      fillColor: theme.colors.primary,
      direction: 'horizontal',
      ...selectedObject.progress_bar,
    },
  };

  const openSoundPicker = (type: string) => {
    if (!setSoundPickerVisible) return;

    (global as any).handleSoundSelect = (soundName: string | null) => {
      if (!safeObject) return;
      const currentSounds = safeObject.sounds || {};
      updateObject(safeObject.id, {
        sounds: {
          ...currentSounds,
          [type]: soundName || undefined
        }
      });
      (global as any).handleSoundSelect = null;
    };

    setSoundPickerVisible(true);
  };

  const globalVars = currentProject?.variables?.global || {};

  const otherObjects = useMemo(() => {
    return (currentProject?.objects || []).filter((obj: GameObject) => obj.id !== safeObject.id);
  }, [currentProject?.objects, safeObject.id]);

  const selectedSprite = useMemo(() => {
    return (currentProject?.sprites || []).find((s: any) => s.id === safeObject.appearance?.spriteId);
  }, [currentProject?.sprites, safeObject.appearance?.spriteId]);

  const allSprites = useMemo(() => {
    return currentProject?.sprites || [];
  }, [currentProject?.sprites]);

  const [pickingSecondaryIndex, setPickingSecondaryIndex] = useState(-1); // -1 for primary, >=0 for additional

  const handleSpriteSelectLocal = (spriteId: string) => {
    const repeaterType = (global as any).pickingForRepeater;
    if (repeaterType) {
      if (repeaterType === 'active') updateField('sprite_repeater.activeSpriteId', spriteId);
      else if (repeaterType === 'inactive') updateField('sprite_repeater.inactiveSpriteId', spriteId);
      (global as any).pickingForRepeater = null;
    } else if (pickingSecondaryIndex === -1) {
      updateField('appearance.spriteId', spriteId);

      // Auto-update dimensions and collision to match sprite
      const sprite = allSprites.find((s: any) => s.id === spriteId);
      if (sprite) {
        const isGrid = !!sprite.grid?.enabled;
        const sw = isGrid ? (sprite.grid.frameWidth || sprite.width) : sprite.width;
        const sh = isGrid ? (sprite.grid.frameHeight || sprite.height) : sprite.height;

        updateObject(safeObject.id, {
          width: sw || 32,
          height: sh || 32,
          physics: {
            ...safeObject.physics,
            collision: {
              ...(safeObject.physics.collision || { type: 'rectangle', offsetX: 0, offsetY: 0 }),
              width: sw || 32,
              height: sh || 32
            }
          }
        });
      }
    } else {
      const currentIds = [...(safeObject.appearance.additionalSpriteIds || [])];
      if (pickingSecondaryIndex < currentIds.length) {
        currentIds[pickingSecondaryIndex] = spriteId;
      } else {
        currentIds.push(spriteId);
      }
      updateField('appearance.additionalSpriteIds', currentIds);
    }
    setSpritePickerVisible?.(false);
  };

  // Register global callbacks for pickers
  useEffect(() => {
    if (visible) {
      (global as any).lastSpritePickerCallback = handleSpriteSelectLocal;
      (global as any).handleActionSelect = handleActionSelect;
      (global as any).handleEventSelect = handleEventSelect;
      (global as any).handlePropertySelect = handlePropertySelect;
      (global as any).handleStateSelect = handleStateSelect;
    }
    return () => {
      (global as any).lastSpritePickerCallback = null;
      (global as any).handleActionSelect = null;
      (global as any).handleEventSelect = null;
      (global as any).handlePropertySelect = null;
      (global as any).handleStateSelect = null;
    };
  }, [visible, activeListenerIndex, activeSubIndex, activePropertyIndex, safeObject, pickingForEngineState]);

  const updateField = (path: string, value: any) => {
    const parts = path.split('.');
    if (parts.length === 1) {
      updateObject(safeObject.id, { [parts[0]]: value });
    } else if (parts.length === 2) {
      updateObject(safeObject.id, {
        [parts[0]]: { ...(safeObject as any)[parts[0]], [parts[1]]: value },
      });
    } else if (parts.length === 3) {
      updateObject(safeObject.id, {
        [parts[0]]: {
          ...(safeObject as any)[parts[0]],
          [parts[1]]: { ...(safeObject as any)[parts[0]][parts[1]], [parts[2]]: value },
        },
      });
    }
  };

  const handleActionSelect = (actionStr: string) => {
    const currentListeners = safeObject.logic?.listeners || [];
    const newListeners = [...currentListeners];
    if (activeListenerIndex !== null) {
      const listener = { ...newListeners[activeListenerIndex] };

      if (activeSubIndex === null) {
        // Intelligent Appending: if the last action ends with ':', append to it.
        const actions = [...(listener.immediateActions || [])];
        const targetIdx = activeActionIndex !== null ? activeActionIndex : actions.length - 1;

        if (targetIdx >= 0 && actions[targetIdx] && actions[targetIdx].endsWith(':')) {
          actions[targetIdx] = actions[targetIdx] + actionStr;
        } else if (targetIdx >= 0 && activeActionIndex !== null && actions[targetIdx] !== undefined) {
          actions[targetIdx] = actions[targetIdx] + (actions[targetIdx] ? ' ' : '') + actionStr;
        } else {
          actions.push(actionStr);
        }
        listener.immediateActions = actions;
      } else {
        // Adding to Sub-Condition (THEN or ELSE)
        const sub = { ...listener.subConditions[activeSubIndex] };
        const targetKey = (global as any).pickingForElse ? 'elseActions' : 'actions';
        const actions = [...(sub[targetKey] || [])];
        const targetIdx = activeActionIndex !== null ? activeActionIndex : actions.length - 1;

        if (targetIdx >= 0 && actions[targetIdx] && actions[targetIdx].endsWith(':')) {
          actions[targetIdx] = actions[targetIdx] + actionStr;
        } else if (targetIdx >= 0 && activeActionIndex !== null && actions[targetIdx] !== undefined) {
          actions[targetIdx] = actions[targetIdx] + (actions[targetIdx] ? ' ' : '') + actionStr;
        } else {
          actions.push(actionStr);
        }
        sub[targetKey] = actions;

        if ((global as any).pickingForElse) (global as any).pickingForElse = false;
        listener.subConditions = [...listener.subConditions];
        listener.subConditions[activeSubIndex] = sub;
      }

      newListeners[activeListenerIndex] = listener;
    } else {
      newListeners.push({ eventId: '', immediateActions: [actionStr], subConditions: [] });
    }
    updateField('logic.listeners', newListeners);
    setActionPickerVisible(false);
    setActiveSubIndex(null);
  };

  const handleEventSelect = (eventId: string) => {
    const currentListeners = safeObject.logic?.listeners || [];
    if (activeListenerIndex !== null) {
      const newListeners = [...currentListeners];
      const listener = { ...newListeners[activeListenerIndex] };

      if (activeSubIndex !== null) {
        // Appending to EXISTING SUB-CONDITION
        const sub = { ...listener.subConditions[activeSubIndex] };
        const oldCond = sub.condition || '';
        const newVal = oldCond + (oldCond ? ' ' : '') + eventId;
        sub.condition = newVal;
        listener.subConditions = [...listener.subConditions];
        listener.subConditions[activeSubIndex] = sub;
        newListeners[activeListenerIndex] = listener;
      } else {
        // Appending to MAIN EVENT
        const oldId = listener.eventId || '';
        const newVal = oldId + (oldId ? ' ' : '') + eventId;
        newListeners[activeListenerIndex] = { ...listener, eventId: newVal };
      }
      updateField('logic.listeners', newListeners);
    } else if (isAddingSubForIndex !== null) {
      // Adding NEW SUB-CONDITION from list
      const newListeners = [...currentListeners];
      const listener = { ...newListeners[isAddingSubForIndex] };
      listener.subConditions = [...(listener.subConditions || [])];

      let condition = eventId;
      let extra: any = {};

      if (eventId === 'if') condition = '';
      else if (eventId === 'if_else') { condition = ''; extra = { elseActions: [] }; }
      else if (eventId === 'wait_until') condition = 'wait until: ';

      listener.subConditions.push({ condition, actions: [], ...extra });
      newListeners[isAddingSubForIndex] = listener;
      updateField('logic.listeners', newListeners);
      setIsAddingSubForIndex(null);
    } else {
      // Create new listener
      const newListeners = [...currentListeners];
      newListeners.push({ eventId, immediateActions: [], subConditions: [] });
      updateField('logic.listeners', newListeners);
    }
    setEventPickerVisible(false);
  };

  const handleStateSelect = (animName: string | null) => {
    if (pickingForEngineState === 'appearance.animationState') {
      updateField('appearance.animationState', animName);
    } else if (pickingForEngineState) {
      updateField(`animations.${pickingForEngineState}`, animName);
    }
    setStatePickerVisible?.(false);
    setPickingForEngineState?.(null);
  };

  const handlePropertySelect = (propStr: string) => {
    const currentListeners = safeObject.logic?.listeners || [];
    if (activePropertyIndex !== null) {
      const newListeners = [...currentListeners];
      const listener = { ...newListeners[activePropertyIndex] };

      if (activeSubIndex !== null) {
        const sub = { ...listener.subConditions[activeSubIndex] };
        const currentCond = sub.condition || '';
        const lastChar = currentCond.trim().slice(-1);
        const isOp = ['>', '<', '=', '!'].includes(lastChar);
        const newVal = currentCond + (currentCond && !isOp ? ' ' : '') + propStr;
        sub.condition = newVal;
        listener.subConditions = [...listener.subConditions];
        listener.subConditions[activeSubIndex] = sub;
      } else {
        const currentEvent = listener.eventId || '';
        const newVal = currentEvent + (currentEvent ? ' ' : '') + propStr;
        listener.eventId = newVal;
      }
      newListeners[activePropertyIndex] = listener;
      updateField('logic.listeners', newListeners);
    }
    setPropertyPickerVisible(false);
    setActiveSubIndex(null);
  };

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={styles.inspectorOverlay}>
          <View style={styles.inspectorContent}>
            <View style={styles.inspectorHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Activity size={18} color={theme.colors.primary} />
                <Text style={styles.inspectorTitle}>Inspector</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}>
                <Text style={[styles.saveText, { color: '#000' }]}>DONE</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, flexDirection: 'row' }}>
              {/* LEFT COLUMN: Variables, Physics, Combat */}
              <View style={{ width: '25%', borderRightWidth: 1, borderRightColor: '#222' }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, padding: 8 }}>
                  <Section
                    title="Variables"
                    icon={<Database size={14} color="#FBBF24" />}
                    expanded={expandedSections.variables}
                    onToggle={() => toggleSection('variables')}
                  >
                    <View style={{ gap: 4 }}>
                      <Text style={styles.subSectionTitleCompact}>LOCAL VARIABLES</Text>
                      {Object.entries(safeObject.variables.local || {}).map(([key, value], index) => (
                        <VariableRow
                          key={`local-${index}`}
                          varKey={key}
                          value={value}
                          onRename={(oldKey: string, newKey: string) => {
                            const newLocal = { ...safeObject.variables.local };
                            newLocal[newKey] = value;
                            delete newLocal[oldKey];
                            updateField('variables.local', newLocal);
                          }}
                          onChangeValue={(v: string) => {
                            const newLocal = { ...safeObject.variables.local, [key]: v };
                            updateField('variables.local', newLocal);
                          }}
                          onPromote={() => useProjectStore.getState().promoteVariableToGlobal(safeObject.id, key)}
                          onDelete={() => useProjectStore.getState().deleteLocalVariable(safeObject.id, key)}
                        />
                      ))}
                      <TouchableOpacity
                        style={[styles.addButtonCompact, { padding: 6 }]}
                        onPress={() => {
                          const newLocal = { ...safeObject.variables.local, [`var_${Object.keys(safeObject.variables.local || {}).length}`]: 0 };
                          updateField('variables.local', newLocal);
                        }}
                      >
                        <Plus size={12} color={theme.colors.primary} />
                        <Text style={styles.addButtonTextSmall}>ADD LOCAL VARIABLE</Text>
                      </TouchableOpacity>

                      <View style={[styles.divider, { marginVertical: 8 }]} />

                      <Text style={styles.subSectionTitleCompact}>GLOBAL VARIABLES</Text>
                      {Object.entries(globalVars).map(([key, value], index) => (
                        <VariableRow
                          key={`global-${index}`}
                          varKey={key}
                          value={value}
                          isGlobal={true}
                          onChangeValue={(v: string) => {
                            const newGlobals = { ...currentProject.variables.global, [key]: v };
                            useProjectStore.getState().updateProject({ variables: { global: newGlobals } });
                          }}
                          onDelete={() => useProjectStore.getState().deleteGlobalVariable(key)}
                        />
                      ))}
                    </View>
                  </Section>

                  <Section
                    title="Physics"
                    icon={<Zap size={14} color={theme.colors.warning} />}
                    expanded={expandedSections.physics}
                    onToggle={() => toggleSection('physics')}
                  >
                    <SwitchRow label="Enabled" value={safeObject.physics.enabled} onToggle={(v: boolean) => updateField('physics.enabled', v)} />
                    <SwitchRow label="Sticky HUD" value={safeObject.isHUD || false} onToggle={(v: boolean) => updateField('isHUD', v)} />

                    {safeObject.physics.enabled && (
                      <>
                        <PropertyRow label="Dimensions">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            <InputGroup
                              label="W"
                              value={(safeObject.width || 32).toString()}
                              onChange={(v: string) => {
                                const val = parseInt(v) || 0;
                                updateObject(safeObject.id, {
                                  width: val,
                                  physics: {
                                    ...safeObject.physics,
                                    collision: {
                                      ...(safeObject.physics.collision || { type: 'rectangle', offsetX: 0, offsetY: 0 }),
                                      width: val
                                    }
                                  }
                                });
                              }}
                              keyboardType="numeric"
                            />
                            <InputGroup
                              label="H"
                              value={(safeObject.height || 32).toString()}
                              onChange={(v: string) => {
                                const val = parseInt(v) || 0;
                                updateObject(safeObject.id, {
                                  height: val,
                                  physics: {
                                    ...safeObject.physics,
                                    collision: {
                                      ...(safeObject.physics.collision || { type: 'rectangle', offsetX: 0, offsetY: 0 }),
                                      height: val
                                    }
                                  }
                                });
                              }}
                              keyboardType="numeric"
                            />
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Type">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              onPress={() => updateField('physics.isStatic', !safeObject.physics.isStatic)}
                              style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: safeObject.physics.isStatic ? theme.colors.primary : '#16191E', borderWidth: 1, borderColor: '#333' }}
                            >
                              <Text style={{ color: safeObject.physics.isStatic ? '#000' : '#888', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>STATIC</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => updateField('physics.applyGravity', !safeObject.physics.applyGravity)}
                              style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: safeObject.physics.applyGravity ? theme.colors.primary : '#16191E', borderWidth: 1, borderColor: '#333' }}
                            >
                              <Text style={{ color: safeObject.physics.applyGravity ? '#000' : '#888', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>GRAVITY</Text>
                            </TouchableOpacity>
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Collision">
                          <TouchableOpacity
                            onPress={() => updateField('physics.ignoreCollision', !safeObject.physics.ignoreCollision)}
                            style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: safeObject.physics.ignoreCollision ? '#333' : theme.colors.primary, borderWidth: 1, borderColor: '#333' }}
                          >
                            <Text style={{ color: safeObject.physics.ignoreCollision ? '#888' : '#000', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                              {safeObject.physics.ignoreCollision ? 'GHOST' : 'SOLID'}
                            </Text>
                          </TouchableOpacity>
                        </PropertyRow>

                        <PropertyRow label="Movement">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            <InputGroup label="SPD" value={safeObject.physics.moveSpeed.toString()} onChange={(v: string) => updateField('physics.moveSpeed', parseFloat(v) || 0)} keyboardType="numeric" />
                            <InputGroup label="JMP" value={safeObject.physics.jumpStrength.toString()} onChange={(v: string) => updateField('physics.jumpStrength', parseFloat(v) || 0)} keyboardType="numeric" />
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Friction">
                          <InputGroup label="0.1" value={safeObject.physics.friction.toString()} onChange={(v: string) => updateField('physics.friction', parseFloat(v) || 0)} keyboardType="numeric" />
                        </PropertyRow>

                        <PropertyRow label="Scale">
                          <InputGroup label="1.0" value={(safeObject.physics.scale || 1).toString()} onChange={(v: string) => updateField('physics.scale', parseFloat(v) || 1)} keyboardType="numeric" />
                        </PropertyRow>

                        <View style={styles.divider} />
                        <Text style={styles.subSectionTitleCompact}>COLLISION SHAPE</Text>

                        <PropertyRow label="Shape">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            {['rectangle', 'circle'].map(shape => (
                              <TouchableOpacity
                                key={shape}
                                onPress={() => updateField('physics.collision.type', shape)}
                                style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: (safeObject.physics.collision?.type || 'rectangle') === shape ? theme.colors.primary : '#16191E', borderWidth: 1, borderColor: '#333' }}
                              >
                                <Text style={{ color: (safeObject.physics.collision?.type || 'rectangle') === shape ? '#000' : '#888', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>{shape.toUpperCase()}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </PropertyRow>

                        {(safeObject.physics.collision?.type || 'rectangle') === 'rectangle' ? (
                          <PropertyRow label="Size">
                            <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                              <InputGroup
                                label="W"
                                value={(safeObject.physics.collision?.width ?? safeObject.width ?? 32).toString()}
                                onChange={(v: string) => updateField('physics.collision.width', parseInt(v) || 0)}
                                keyboardType="numeric"
                              />
                              <InputGroup
                                label="H"
                                value={(safeObject.physics.collision?.height ?? safeObject.height ?? 32).toString()}
                                onChange={(v: string) => updateField('physics.collision.height', parseInt(v) || 0)}
                                keyboardType="numeric"
                              />
                            </View>
                          </PropertyRow>
                        ) : (
                          <PropertyRow label="Radius">
                            <InputGroup
                              label="R"
                              value={(safeObject.physics.collision?.radius ?? (safeObject.width || 32) / 2).toString()}
                              onChange={(v: string) => updateField('physics.collision.radius', parseInt(v) || 0)}
                              keyboardType="numeric"
                            />
                          </PropertyRow>
                        )}

                        <PropertyRow label="Pivot Offset">
                          <TouchableOpacity
                            onPress={() => {
                              updateField('physics.collision.offsetX', 0);
                              updateField('physics.collision.offsetY', 0);
                            }}
                            style={{ position: 'absolute', right: -60, top: 0, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: theme.colors.surfaceElevated, borderRadius: 4, borderWidth: 1, borderColor: '#444' }}
                          >
                            <Text style={{ color: theme.colors.primary, fontSize: 8, fontWeight: 'bold' }}>CENTER</Text>
                          </TouchableOpacity>
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            <InputGroup
                              label="X"
                              value={(safeObject.physics.collision?.offsetX ?? 0).toString()}
                              onChange={(v: string) => updateField('physics.collision.offsetX', parseInt(v) || 0)}
                              keyboardType="numeric"
                            />
                            <InputGroup
                              label="Y"
                              value={(safeObject.physics.collision?.offsetY ?? 0).toString()}
                              onChange={(v: string) => updateField('physics.collision.offsetY', parseInt(v) || 0)}
                              keyboardType="numeric"
                            />
                          </View>
                        </PropertyRow>

                        <View style={styles.divider} />
                      </>
                    )}
                  </Section>

                  {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy' || safeObject.behavior === 'bullet') && (
                    <Section
                      title="Combat"
                      icon={<Target size={14} color="#EF4444" />}
                      expanded={expandedSections.combat}
                      onToggle={() => toggleSection('combat')}
                    >
                      {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy') && (
                        <>
                          <SwitchRow
                            label="Can Shoot"
                            value={safeObject.combat.canShoot}
                            onToggle={(v: boolean) => {
                              updateField('combat.canShoot', v);
                              if (v && !safeObject.combat.bulletObjectId) {
                                const firstOther = (currentProject?.objects || []).find((o: any) => o.id !== safeObject.id);
                                if (firstOther) updateField('combat.bulletObjectId', firstOther.id);
                              }
                            }}
                          />
                          {safeObject.combat.canShoot && (
                            <View style={{ marginTop: 4, gap: 6 }}>
                              <PropertyRow label="Projectile">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                  {(currentProject?.objects || []).filter((o: any) => o.id !== safeObject.id).map((obj: any) => (
                                    <TouchableOpacity
                                      key={obj.id}
                                      style={[
                                        styles.miniObjectSelect,
                                        safeObject.combat.bulletObjectId === obj.id && styles.miniObjectSelectActive,
                                        { padding: 4, minWidth: 60, height: 40 }
                                      ]}
                                      onPress={() => updateField('combat.bulletObjectId', obj.id)}
                                    >
                                      {renderSpritePreview(obj.appearance.spriteId, 16)}
                                      <Text style={[styles.miniObjectText, { fontSize: 8 }]}>{obj.name}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </PropertyRow>

                              <PropertyRow label="Max Bullets">
                                <InputGroup label="QTY" value={safeObject.combat.maxBullets.toString()} onChange={(v: string) => updateField('combat.maxBullets', parseInt(v) || 0)} keyboardType="numeric" />
                              </PropertyRow>
                              <PropertyRow label="Damage">
                                <InputGroup label="DMG" value={safeObject.combat.damage.toString()} onChange={(v: string) => updateField('combat.damage', parseInt(v) || 0)} keyboardType="numeric" />
                              </PropertyRow>
                              <PropertyRow label="Shoot Speed">
                                <InputGroup label="SPD" value={safeObject.combat.shootSpeed.toString()} onChange={(v: string) => updateField('combat.shootSpeed', parseFloat(v) || 0)} keyboardType="numeric" />
                              </PropertyRow>
                              <SwitchRow label="Shoot in Air" value={safeObject.combat.canShootInAir} onToggle={(v: boolean) => updateField('combat.canShootInAir', v)} />
                            </View>
                          )}
                          <View style={styles.divider} />
                          <SwitchRow label="Can Melee" value={safeObject.combat.canMelee} onToggle={(v: boolean) => updateField('combat.canMelee', v)} />
                          {safeObject.combat.canMelee && (
                            <View style={{ marginTop: 4, gap: 6 }}>
                              <PropertyRow label="Melee Dmg">
                                <InputGroup label="20" value={safeObject.combat.meleeDamage.toString()} onChange={(v: string) => updateField('combat.meleeDamage', parseInt(v) || 0)} keyboardType="numeric" />
                              </PropertyRow>
                              <SwitchRow label="Melee in Air" value={safeObject.combat.canMeleeInAir} onToggle={(v: boolean) => updateField('combat.canMeleeInAir', v)} />
                            </View>
                          )}
                        </>
                      )}

                      {(safeObject.behavior === 'bullet' || safeObject.behavior === 'enemy') && (
                        <SwitchRow label="Explode" value={safeObject.combat.explodes} onToggle={(v: boolean) => updateField('combat.explodes', v)} />
                      )}
                    </Section>
                  )}
                  {safeObject.behavior === 'progress_bar' && (
                    <Section
                      title="Progress Bar"
                      icon={<Layers size={14} color="#10B981" />}
                      expanded={expandedSections.progress_bar}
                      onToggle={() => toggleSection('progress_bar')}
                    >
                      <PropertyRow label="Dimensions">
                        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                          <InputGroup
                            label="W"
                            value={(safeObject.width || 150).toString()}
                            onChange={(v: string) => updateField('width', parseInt(v) || 0)}
                            keyboardType="numeric"
                          />
                          <InputGroup
                            label="H"
                            value={(safeObject.height || 20).toString()}
                            onChange={(v: string) => updateField('height', parseInt(v) || 0)}
                            keyboardType="numeric"
                          />
                        </View>
                      </PropertyRow>
                      <PropertyRow label="Range">
                        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                          <InputGroup label="MIN" value={safeObject.progress_bar.minValue.toString()} onChange={(v: string) => updateField('progress_bar.minValue', parseFloat(v) || 0)} keyboardType="numeric" />
                          <InputGroup label="MAX" value={safeObject.progress_bar.maxValue.toString()} onChange={(v: string) => updateField('progress_bar.maxValue', parseFloat(v) || 0)} keyboardType="numeric" />
                        </View>
                      </PropertyRow>
                      <PropertyRow label="Current">
                        <InputGroup label="VAL" value={safeObject.progress_bar.currentValue.toString()} onChange={(v: string) => updateField('progress_bar.currentValue', parseFloat(v) || 0)} keyboardType="numeric" />
                      </PropertyRow>
                      <PropertyRow label="Link Var">
                        <InputGroup label="VAR" value={safeObject.progress_bar.linkedVariable || ''} onChange={(v: string) => updateField('progress_bar.linkedVariable', v)} />
                      </PropertyRow>
                      <PropertyRow label="Direction">
                        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                          {(['horizontal', 'vertical', 'radial'] as const).map(dir => (
                            <TouchableOpacity
                              key={dir}
                              onPress={() => updateField('progress_bar.direction', dir)}
                              style={{ flex: 1, padding: 4, borderRadius: 2, backgroundColor: safeObject.progress_bar.direction === dir ? theme.colors.primary : '#16191E', borderWidth: 1, borderColor: '#333' }}
                            >
                              <Text style={{ color: safeObject.progress_bar.direction === dir ? '#000' : '#888', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                                {dir.slice(0, 3).toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </PropertyRow>
                      <PropertyRow label="Fill Color">
                        <ColorGrid
                          selectedColor={safeObject.progress_bar.fillColor}
                          onSelect={(c) => updateField('progress_bar.fillColor', c)}
                        />
                      </PropertyRow>
                      <PropertyRow label="BG Color">
                        <ColorGrid
                          selectedColor={safeObject.progress_bar.backgroundColor || '#333'}
                          onSelect={(c) => updateField('progress_bar.backgroundColor', c)}
                        />
                      </PropertyRow>
                      <PropertyRow label="Border">
                        <View style={{ gap: 6 }}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <InputGroup
                              label="WIDTH"
                              value={(safeObject.progress_bar.borderWidth ?? 1).toString()}
                              onChange={(v) => updateField('progress_bar.borderWidth', parseInt(v) || 0)}
                              keyboardType="numeric"
                              width="40%"
                            />
                            <TouchableOpacity
                              style={{ flex: 1, height: 28, backgroundColor: safeObject.progress_bar.borderColor || '#555', borderRadius: 4, borderWidth: 1, borderColor: '#FFF2' }}
                            />
                          </View>
                          <ColorGrid
                            selectedColor={safeObject.progress_bar.borderColor || '#555'}
                            onSelect={(c) => updateField('progress_bar.borderColor', c)}
                          />
                        </View>
                      </PropertyRow>
                    </Section>
                  )}
                  {safeObject.behavior === 'sprite_repeater' && safeObject.sprite_repeater && (
                    <Section
                      title="Sprite Repeater"
                      icon={<Heart size={14} color="#F43F5E" />}
                      expanded={expandedSections.sprite_repeater || true}
                      onToggle={() => toggleSection('sprite_repeater')}
                    >
                      <View style={{ gap: 8 }}>
                        <PropertyRow label="Counts">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            <InputGroup label="MAX" value={safeObject.sprite_repeater!.maxCount.toString()} onChange={(v: string) => updateField('sprite_repeater.maxCount', parseInt(v) || 0)} keyboardType="numeric" />
                            <InputGroup label="START" value={safeObject.sprite_repeater!.currentCount.toString()} onChange={(v: string) => updateField('sprite_repeater.currentCount', parseInt(v) || 0)} keyboardType="numeric" />
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Link Var">
                          <InputGroup label="VAR" value={safeObject.sprite_repeater!.linkedVariable || ''} onChange={(v: string) => updateField('sprite_repeater.linkedVariable', v)} />
                        </PropertyRow>

                        <PropertyRow label="Sprites">
                          <View style={{ flex: 1, gap: 6 }}>
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16191E', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#333' }}
                              onPress={() => {
                                (global as any).pickingForRepeater = 'active';
                                setSpritePickerVisible(true);
                              }}
                            >
                              {renderSpritePreview(safeObject.sprite_repeater!.activeSpriteId, 20)}
                              <Text style={{ color: '#888', fontSize: 10 }}>ACTIVE ICON</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16191E', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#333' }}
                              onPress={() => {
                                (global as any).pickingForRepeater = 'inactive';
                                setSpritePickerVisible(true);
                              }}
                            >
                              {renderSpritePreview(safeObject.sprite_repeater!.inactiveSpriteId, 20)}
                              <Text style={{ color: '#888', fontSize: 10 }}>INACTIVE ICON</Text>
                            </TouchableOpacity>
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Layout">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            {['horizontal', 'vertical'].map(l => (
                              <TouchableOpacity
                                key={l}
                                onPress={() => updateField('sprite_repeater.layout', l)}
                                style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: safeObject.sprite_repeater!.layout === l ? theme.colors.primary : '#16191E', borderWidth: 1, borderColor: '#333' }}
                              >
                                <Text style={{ color: safeObject.sprite_repeater!.layout === l ? '#000' : '#888', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                                  {l.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Style">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                            <InputGroup label="SIZE" value={safeObject.sprite_repeater!.iconSize.toString()} onChange={(v: string) => updateField('sprite_repeater.iconSize', parseInt(v) || 0)} keyboardType="numeric" />
                            <InputGroup label="GAP" value={safeObject.sprite_repeater!.spacing.toString()} onChange={(v: string) => updateField('sprite_repeater.spacing', parseInt(v) || 0)} keyboardType="numeric" />
                          </View>
                        </PropertyRow>
                      </View>
                    </Section>
                  )}
                </ScrollView>
              </View>

              {/* CENTER COLUMN: Tabbed Workspace */}
              <View style={{ flex: 1, backgroundColor: '#0D0F12', borderRightWidth: 1, borderRightColor: '#222' }}>
                {/* GODOT-STYLE TAB BAR */}
                <View style={{ flexDirection: 'row', backgroundColor: '#16191E', borderBottomWidth: 1, borderBottomColor: '#222', paddingHorizontal: 8, height: 36, alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    <TouchableOpacity
                      onPress={() => setActiveCenterTab('preview')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        height: 35,
                        backgroundColor: activeCenterTab === 'preview' ? '#0D0F12' : 'transparent',
                        borderBottomWidth: activeCenterTab === 'preview' ? 2 : 0,
                        borderBottomColor: theme.colors.primary,
                      }}
                    >
                      <ImageIcon size={12} color={activeCenterTab === 'preview' ? theme.colors.primary : '#888'} />
                      <Text style={{ color: activeCenterTab === 'preview' ? theme.colors.text : '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 }}>2D VIEWPORT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveCenterTab('code')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        height: 35,
                        backgroundColor: activeCenterTab === 'code' ? '#0D0F12' : 'transparent',
                        borderBottomWidth: activeCenterTab === 'code' ? 2 : 0,
                        borderBottomColor: theme.colors.primary,
                      }}
                    >
                      <FileCode size={12} color={activeCenterTab === 'code' ? theme.colors.primary : '#888'} />
                      <Text style={{ color: activeCenterTab === 'code' ? theme.colors.text : '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 }}>SCRIPT / LOGIC</Text>
                    </TouchableOpacity>
                  </View>

                  {/* <View style={{ paddingRight: 8 }}>
                    <Text style={{ color: '#555', fontSize: 9, fontFamily: 'monospace' }}>
                      {activeCenterTab === 'preview' ? 'VIEW: 2D_CANVAS' : `LISTENERS: ${safeObject.logic.listeners.length}`}
                    </Text>
                  </View> */}
                </View>

                {activeCenterTab === 'preview' ? (
                  <ViewportPreview obj={safeObject} renderSpritePreview={renderSpritePreview} currentProject={currentProject} onSwitchToCode={() => setActiveCenterTab('code')} />
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 40, paddingTop: 8 }}>
                    <Section
                      title="Logic & Actions"
                      icon={<Cpu size={14} color="#60A5FA" />}
                      expanded={expandedSections.logic}
                      onToggle={() => toggleSection('logic')}
                    >
                      <SuggestionsBar />
                      <View style={styles.logicContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.subSectionTitleCompact}>EVENTS & ACTIONS</Text>
                          <TouchableOpacity
                            onPress={() => {
                              const next: Record<number, boolean> = {};
                              safeObject.logic.listeners.forEach((_: any, i: number) => next[i] = true);
                              setCollapsedListeners(next);
                            }}
                          >
                            <Text style={{ color: theme.colors.textMuted, fontSize: 8 }}>COLLAPSE ALL</Text>
                          </TouchableOpacity>
                        </View>
                        {safeObject.logic.listeners.map((listener: any, index: number) => {
                          const isCollapsed = collapsedListeners[index];
                          return (
                            <View key={index} style={styles.listenerCard}>
                              {/* TRIGGER HEADER */}
                              <View style={styles.listenerHeader}>
                                <TouchableOpacity
                                  onPress={() => toggleListenerCollapse(index)}
                                  style={{ padding: 4 }}
                                >
                                  {isCollapsed ? (
                                    <ChevronRight size={12} color={theme.colors.primary} />
                                  ) : (
                                    <ChevronDown size={12} color={theme.colors.primary} />
                                  )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.listenerTriggerLabel}
                                  onPress={() => {
                                    setActiveListenerIndex(index);
                                    setActiveSubIndex(null);
                                    setIsAddingSubForIndex(null);
                                    setEventPickerVisible(true);
                                  }}
                                >
                                  <Zap size={12} color={theme.colors.primary} fill={theme.colors.primary + '30'} />
                                  <Text style={styles.triggerText}>
                                    {listener.eventId ? listener.eventId.toUpperCase() : 'SELECT TRIGGER'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.deleteButtonSmall}
                                  onPress={() => {
                                    const newListeners = safeObject.logic.listeners.filter((_: any, i: number) => i !== index);
                                    updateField('logic.listeners', newListeners);
                                  }}
                                >
                                  <Trash2 size={12} color="#F43F5E" />
                                </TouchableOpacity>
                              </View>

                              {!isCollapsed && (
                                <View style={{ paddingBottom: 8 }}>
                                  {/* EVENT INPUT */}
                                  <View style={{ padding: 8, paddingBottom: 4 }}>
                                    <View style={styles.actionInputWrapper}>
                                      <TextInput
                                        style={styles.actionInput}
                                        value={listener.eventId}
                                        placeholder="Event (e.g. on_tap, collision:Player)"
                                        placeholderTextColor="#444"
                                        onFocus={() => setActiveInputInfo({ type: 'event', index })}
                                        onChangeText={(v) => {
                                          const newListeners = [...safeObject.logic.listeners];
                                          newListeners[index] = { ...newListeners[index], eventId: v };
                                          updateField('logic.listeners', newListeners);
                                          setSuggestionQuery(v);
                                        }}
                                      />
                                      <TouchableOpacity
                                        onPress={() => {
                                          setActiveListenerIndex(index);
                                          setActiveSubIndex(null);
                                          setIsAddingSubForIndex(null);
                                          setEventPickerVisible(true);
                                        }}
                                      >
                                        <Plus size={14} color={theme.colors.primary} />
                                      </TouchableOpacity>
                                    </View>
                                  </View>

                                  {/* IMMEDIATE ACTIONS */}
                                  <View style={styles.actionBlock}>
                                    {(listener.immediateActions || []).map((act: string, aIdx: number) => (
                                      <View key={aIdx} style={styles.actionRow}>
                                        <Play size={10} color="#27AE60" />
                                        <View style={styles.actionInputWrapper}>
                                          <TextInput
                                            style={styles.actionInput}
                                            value={act}
                                            onChangeText={(v) => {
                                              const newListeners = [...safeObject.logic.listeners];
                                              newListeners[index].immediateActions[aIdx] = v;
                                              updateField('logic.listeners', newListeners);
                                            }}
                                            onFocus={() => {
                                              setActiveListenerIndex(index);
                                              setActiveActionIndex(aIdx);
                                            }}
                                          />
                                          <TouchableOpacity
                                            onPress={() => {
                                              setActiveListenerIndex(index);
                                              setActiveActionIndex(aIdx);
                                              setActionPickerVisible(true);
                                            }}
                                          >
                                            <Plus size={14} color={theme.colors.primary} />
                                          </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity
                                          onPress={() => {
                                            const newListeners = [...safeObject.logic.listeners];
                                            newListeners[index].immediateActions.splice(aIdx, 1);
                                            updateField('logic.listeners', newListeners);
                                          }}
                                        >
                                          <X size={12} color="#555" />
                                        </TouchableOpacity>
                                      </View>
                                    ))}
                                    <TouchableOpacity
                                      onPress={() => {
                                        setActiveListenerIndex(index);
                                        setActiveSubIndex(null);
                                        setActiveActionIndex(null);
                                        setActionPickerVisible(true);
                                      }}
                                      style={{ marginTop: 4 }}
                                    >
                                      <Text style={{ color: '#27AE60', fontSize: 9, fontWeight: 'bold' }}>+ ADD ACTION</Text>
                                    </TouchableOpacity>
                                  </View>

                                  {/* SUB-CONDITIONS */}
                                  {(listener.subConditions || []).map((sc: any, scIdx: number) => (
                                    <View key={scIdx} style={styles.conditionBlock}>
                                      <View style={styles.conditionHeader}>
                                        <GitBranch size={10} color={theme.colors.secondary} />
                                        <View style={[styles.actionInputWrapper, { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderColor: theme.colors.secondary + '30', minHeight: 24, paddingVertical: 2 }]}>
                                          <TextInput
                                            style={[styles.actionInput, { color: theme.colors.secondary }]}
                                            value={sc.condition}
                                            placeholder="IF (condition)"
                                            placeholderTextColor="#444"
                                            onFocus={() => setActiveInputInfo({ type: 'condition', index, subIndex: scIdx })}
                                            onChangeText={(v) => {
                                              const newListeners = [...safeObject.logic.listeners];
                                              newListeners[index].subConditions[scIdx].condition = v;
                                              updateField('logic.listeners', newListeners);
                                              setSuggestionQuery(v);
                                            }}
                                          />
                                          <TouchableOpacity
                                            onPress={() => {
                                              setActiveListenerIndex(index);
                                              setActiveSubIndex(scIdx);
                                              setIsAddingSubForIndex(null);
                                              setEventPickerVisible(true);
                                            }}
                                            style={{ paddingHorizontal: 4 }}
                                          >
                                            <Plus size={12} color={theme.colors.secondary} />
                                          </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity onPress={() => {
                                          const newListeners = [...safeObject.logic.listeners];
                                          newListeners[index].subConditions.splice(scIdx, 1);
                                          updateField('logic.listeners', newListeners);
                                        }}>
                                          <X size={12} color="#555" />
                                        </TouchableOpacity>
                                      </View>

                                      <View style={styles.subActionBlock}>
                                        {(sc.actions || []).map((act: string, aIdx: number) => (
                                          <View key={aIdx} style={styles.actionRow}>
                                            <Text style={{ color: '#27AE60', fontSize: 8, fontWeight: 'bold' }}>THEN</Text>
                                            <View style={styles.actionInputWrapper}>
                                              <TextInput
                                                style={styles.actionInput}
                                                value={act}
                                                onChangeText={(v) => {
                                                  const newListeners = [...safeObject.logic.listeners];
                                                  newListeners[index].subConditions[scIdx].actions[aIdx] = v;
                                                  updateField('logic.listeners', newListeners);
                                                }}
                                                onFocus={() => {
                                                  setActiveListenerIndex(index);
                                                  setActiveSubIndex(scIdx);
                                                  setActiveActionIndex(aIdx);
                                                }}
                                              />
                                              <TouchableOpacity onPress={() => {
                                                setActiveListenerIndex(index);
                                                setActiveSubIndex(scIdx);
                                                setActiveActionIndex(aIdx);
                                                setActionPickerVisible(true);
                                              }}>
                                                <Plus size={14} color={theme.colors.primary} />
                                              </TouchableOpacity>
                                            </View>
                                            <TouchableOpacity
                                              onPress={() => {
                                                const newListeners = [...safeObject.logic.listeners];
                                                newListeners[index].subConditions[scIdx].actions.splice(aIdx, 1);
                                                updateField('logic.listeners', newListeners);
                                              }}
                                            >
                                              <X size={12} color="#555" />
                                            </TouchableOpacity>
                                          </View>
                                        ))}
                                        <TouchableOpacity
                                          onPress={() => {
                                            setActiveListenerIndex(index);
                                            setActiveSubIndex(scIdx);
                                            setActiveActionIndex(null);
                                            setActionPickerVisible(true);
                                          }}
                                          style={{ marginTop: 2 }}
                                        >
                                          <Text style={{ color: '#27AE60', fontSize: 8, fontWeight: 'bold' }}>+ ADD THEN</Text>
                                        </TouchableOpacity>

                                        {sc.elseActions && (
                                          <View style={{ marginTop: 8 }}>
                                            <Text style={{ color: '#F43F5E', fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>ELSE</Text>
                                            {(sc.elseActions || []).map((act: string, aIdx: number) => (
                                              <View key={aIdx} style={styles.actionRow}>
                                                <Text style={{ color: '#F43F5E', fontSize: 8, fontWeight: 'bold' }}>ELSE</Text>
                                                <View style={styles.actionInputWrapper}>
                                                  <TextInput
                                                    style={styles.actionInput}
                                                    value={act}
                                                    onChangeText={(v) => {
                                                      const newListeners = [...safeObject.logic.listeners];
                                                      newListeners[index].subConditions[scIdx].elseActions[aIdx] = v;
                                                      updateField('logic.listeners', newListeners);
                                                    }}
                                                    onFocus={() => {
                                                      setActiveListenerIndex(index);
                                                      setActiveSubIndex(scIdx);
                                                      setActiveActionIndex(aIdx);
                                                      (global as any).pickingForElse = true;
                                                    }}
                                                  />
                                                  <TouchableOpacity onPress={() => {
                                                    setActiveListenerIndex(index);
                                                    setActiveSubIndex(scIdx);
                                                    setActiveActionIndex(aIdx);
                                                    (global as any).pickingForElse = true;
                                                    setActionPickerVisible(true);
                                                  }}>
                                                    <Plus size={14} color={theme.colors.primary} />
                                                  </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity
                                                  onPress={() => {
                                                    const newListeners = [...safeObject.logic.listeners];
                                                    newListeners[index].subConditions[scIdx].elseActions.splice(aIdx, 1);
                                                    updateField('logic.listeners', newListeners);
                                                  }}
                                                >
                                                  <X size={12} color="#555" />
                                                </TouchableOpacity>
                                              </View>
                                            ))}
                                            <TouchableOpacity
                                              onPress={() => {
                                                setActiveListenerIndex(index);
                                                setActiveSubIndex(scIdx);
                                                setActiveActionIndex(null);
                                                (global as any).pickingForElse = true;
                                                setActionPickerVisible(true);
                                              }}
                                            >
                                              <Text style={{ color: '#F43F5E', fontSize: 8, fontWeight: 'bold' }}>+ ADD ELSE</Text>
                                            </TouchableOpacity>
                                          </View>
                                        )}
                                      </View>
                                    </View>
                                  ))}

                                  <TouchableOpacity
                                    onPress={() => {
                                      setActiveListenerIndex(null);
                                      setActiveSubIndex(null);
                                      setIsAddingSubForIndex(index);
                                      setEventPickerVisible(true);
                                    }}
                                    style={{ marginLeft: 20, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                  >
                                    <GitBranch size={10} color={theme.colors.secondary} />
                                    <Text style={{ color: theme.colors.secondary, fontSize: 8, fontWeight: 'bold' }}>+ ADD SUBCONDITION</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}

                        <TouchableOpacity
                          onPress={() => {
                            setActiveListenerIndex(null);
                            setActiveSubIndex(null);
                            setIsAddingSubForIndex(null);
                            setEventPickerVisible(true);
                          }}
                          style={[styles.addButtonCompact, { marginTop: 10 }]}
                        >
                          <Plus size={14} color={theme.colors.primary} />
                          <Text style={styles.addButtonTextSmall}>NEW EVENT LISTENER</Text>
                        </TouchableOpacity>
                      </View>
                    </Section>
                  </ScrollView>
                )}
              </View>

              {/* RIGHT COLUMN: Preview, Identity, Appearance, Audio */}
              <View style={{ width: '30%', borderLeftWidth: 1, borderLeftColor: '#222' }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, padding: 8 }}>
                  {/* Sprite Preview Section */}


                  <Section
                    title="Identity"
                    icon={<Info size={14} color={theme.colors.primary} />}
                    expanded={expandedSections.about}
                    onToggle={() => toggleSection('about')}
                  >
                    <PropertyRow label="Name">
                      <InputGroup label="Name" value={safeObject.name} onChange={(v: string) => updateField('name', v)} />
                    </PropertyRow>

                    {safeObject.behavior === 'gui_container' && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: theme.colors.primary,
                          padding: 12,
                          borderRadius: 2,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          marginTop: 12,
                          marginBottom: 10
                        }}
                        onPress={() => {
                          onClose();
                          // @ts-ignore
                          navigation.navigate('GUIBuilder', { guiObjectId: safeObject.id });
                        }}
                      >
                        <Monitor size={18} color="#000" />
                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>EDIT GUI LAYOUT</Text>
                      </TouchableOpacity>
                    )}

                    {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy') && (
                      <PropertyRow label="Max Health">
                        <InputGroup
                          label="100"
                          value={safeObject.health.max.toString()}
                          onChange={(v: string) => updateField('health.max', parseInt(v) || 0)}
                          keyboardType="numeric"
                        />
                      </PropertyRow>
                    )}
                  </Section>

                  {safeObject.behavior !== 'text' && (
                    <Section
                      title="Appearance"
                      icon={<Palette size={16} color={theme.colors.secondary} />}
                      expanded={expandedSections.appearance}
                      onToggle={() => toggleSection('appearance')}
                    >
                      <PropertyRow label="Sprite Sheet">
                        <TouchableOpacity
                          style={styles.spriteSelectButtonCompact}
                          onPress={() => {
                            setPickingSecondaryIndex(-1);
                            setSpritePickerVisible?.(true);
                          }}
                        >
                          <View style={styles.spritePreviewContainerSmall}>
                            {renderSpritePreview(safeObject.appearance.spriteId, 24)}
                          </View>
                          <Text style={styles.spriteSelectLabelSmall} numberOfLines={1}>
                            {selectedSprite?.name || 'SELECT...'}
                          </Text>
                          <ChevronDown size={14} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      </PropertyRow>

                      <View style={{ marginTop: 8 }}>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>EXTENSIONS</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {(safeObject.appearance.additionalSpriteIds || []).map((id: string, index: number) => {
                            const s = (currentProject?.sprites || []).find((spr: any) => spr.id === id);
                            return (
                              <TouchableOpacity
                                key={`${id}-${index}`}
                                style={{ padding: 2, paddingHorizontal: 6, borderRadius: 2, backgroundColor: '#16191E', borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                onPress={() => {
                                  setPickingSecondaryIndex(index);
                                  setSpritePickerVisible?.(true);
                                }}
                              >
                                <View style={{ width: 16, height: 16, borderRadius: 2, overflow: 'hidden' }}>
                                  {renderSpritePreview(id, 16)}
                                </View>
                                <Text style={{ color: '#888', fontSize: 10 }}>{s?.name || '???'}</Text>
                                <TouchableOpacity onPress={() => {
                                  const newIds = [...(safeObject.appearance.additionalSpriteIds || [])];
                                  newIds.splice(index, 1);
                                  updateField('appearance.additionalSpriteIds', newIds);
                                }}>
                                  <Trash2 size={10} color={theme.colors.error} />
                                </TouchableOpacity>
                              </TouchableOpacity>
                            );
                          })}
                          <TouchableOpacity
                            style={{ padding: 2, paddingHorizontal: 8, borderRadius: 2, backgroundColor: '#1A1D23', borderStyle: 'dashed', borderWidth: 1, borderColor: '#444', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            onPress={() => {
                              setPickingSecondaryIndex((safeObject.appearance.additionalSpriteIds || []).length);
                              setSpritePickerVisible?.(true);
                            }}
                          >
                            <Plus size={12} color={theme.colors.primary} />
                            <Text style={{ color: theme.colors.primary, fontSize: 9, fontWeight: 'bold' }}>ADD</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 }}>
                        <PropertyRow label="Initial State">
                          <TouchableOpacity
                            style={{ flex: 1, padding: 4, borderRadius: 2, backgroundColor: '#16191E', borderWidth: 1, borderColor: '#333' }}
                            onPress={() => {
                              setPickingForEngineState?.('appearance.animationState');
                              setStatePickerVisible?.(true);
                            }}
                          >
                            <Text style={{ fontSize: 10, textAlign: 'center', color: safeObject.appearance.animationState ? theme.colors.primary : '#555' }}>
                              {safeObject.appearance.animationState ? safeObject.appearance.animationState.toUpperCase() : 'DEFAULT'}
                            </Text>
                          </TouchableOpacity>
                        </PropertyRow>

                        {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy') && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 8, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>BEHAVIOR STATES</Text>
                            {['idle', 'move', 'jump', 'hit', 'dead', 'melee', 'shoot'].map(engineState => {
                              const mappedName = (safeObject.animations as any)[engineState];
                              return (
                                <PropertyRow key={engineState} label={engineState}>
                                  <TouchableOpacity
                                    style={{ width: '100%', padding: 4, borderRadius: 2, backgroundColor: '#16191E', borderWidth: 1, borderColor: '#333' }}
                                    onPress={() => {
                                      setPickingForEngineState?.(engineState);
                                      setStatePickerVisible?.(true);
                                    }}
                                  >
                                    <Text style={{ fontSize: 9, textAlign: 'center', color: mappedName ? theme.colors.primary : '#444' }}>
                                      {mappedName ? mappedName.toUpperCase() : 'NONE'}
                                    </Text>
                                  </TouchableOpacity>
                                </PropertyRow>
                              );
                            })}
                          </View>
                        )}
                      </View>

                      {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy' || safeObject.behavior === 'particle') && (
                        <PropertyRow label="Anim Speed">
                          <InputGroup
                            label="100"
                            value={safeObject.appearance.animationSpeed.toString()}
                            onChange={(v: string) => updateField('appearance.animationSpeed', parseInt(v) || 0)}
                            keyboardType="numeric"
                          />
                        </PropertyRow>
                      )}

                      <PropertyRow label="Depth Offset">
                        <InputGroup
                          label="0"
                          value={(safeObject.appearance.ySortOffset || 0).toString()}
                          onChange={(v: string) => updateField('appearance.ySortOffset', parseInt(v) || 0)}
                          keyboardType="numeric"
                        />
                      </PropertyRow>

                      {safeObject.behavior === 'button' && (
                        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 }}>
                          <Text style={{ color: theme.colors.textMuted, fontSize: 8, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>BUTTON VISUALS</Text>
                          <PropertyRow label="On Click">
                            <TouchableOpacity
                              style={styles.spriteSelectButtonCompact}
                              onPress={() => {
                                (global as any).lastSpritePickerCallback = (id: string) => {
                                  updateField('button.clickSpriteId', id);
                                  setSpritePickerVisible?.(false);
                                };
                                setSpritePickerVisible?.(true);
                              }}
                            >
                              <View style={styles.spritePreviewContainerSmall}>
                                {renderSpritePreview(safeObject.button?.clickSpriteId ?? null, 24)}
                              </View>
                              <Text style={styles.spriteSelectLabelSmall} numberOfLines={1}>
                                {(currentProject?.sprites || []).find((s: any) => s.id === safeObject.button?.clickSpriteId)?.name || 'SELECT...'}
                              </Text>
                            </TouchableOpacity>
                          </PropertyRow>
                          <PropertyRow label="On Release">
                            <TouchableOpacity
                              style={styles.spriteSelectButtonCompact}
                              onPress={() => {
                                (global as any).lastSpritePickerCallback = (id: string) => {
                                  updateField('button.releaseSpriteId', id);
                                  setSpritePickerVisible?.(false);
                                };
                                setSpritePickerVisible?.(true);
                              }}
                            >
                              <View style={styles.spritePreviewContainerSmall}>
                                {renderSpritePreview(safeObject.button?.releaseSpriteId ?? null, 24)}
                              </View>
                              <Text style={styles.spriteSelectLabelSmall} numberOfLines={1}>
                                {(currentProject?.sprites || []).find((s: any) => s.id === safeObject.button?.releaseSpriteId)?.name || 'SELECT...'}
                              </Text>
                            </TouchableOpacity>
                          </PropertyRow>
                        </View>
                      )}
                    </Section>
                  )}

                  <Section
                    title="Audio"
                    icon={<Music size={14} color="#10B981" />}
                    expanded={expandedSections.sounds}
                    onToggle={() => toggleSection('sounds')}
                  >
                    {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy' || safeObject.behavior === 'bullet') && (
                      <View style={{ gap: 4 }}>
                        {(safeObject.behavior === 'bullet' ? ['hit'] : ['jump', 'shoot', 'melee', 'hit', 'dead', 'run']).map(sound => (
                          <PropertyRow key={sound} label={sound === 'hit' && safeObject.behavior === 'bullet' ? 'Impact' : sound}>
                            <TouchableOpacity
                              style={[styles.soundPicker, { backgroundColor: '#16191E', padding: 6 }]}
                              onPress={() => openSoundPicker(sound)}
                            >
                              <Play size={10} color={theme.colors.primary} />
                              <Text style={[styles.soundText, { fontSize: 9 }]} numberOfLines={1}>
                                {safeObject.sounds?.[sound as keyof typeof safeObject.sounds] || 'SELECT...'}
                              </Text>
                            </TouchableOpacity>
                          </PropertyRow>
                        ))}
                      </View>
                    )}

                    {(safeObject.behavior !== 'player' && safeObject.behavior !== 'enemy' && safeObject.behavior !== 'bullet') && (
                      <Text style={styles.infoTextSmall}>No audio slots.</Text>
                    )}
                  </Section>

                  {(safeObject.behavior === 'emitter' || safeObject.behavior === 'particle') && (
                    <Section
                      title="Emitter"
                      icon={<Zap size={14} color="#7000FF" />}
                      expanded={expandedSections.emitter}
                      onToggle={() => toggleSection('emitter')}
                    >
                      <ParticlePreview
                        settings={safeObject.emitter}
                        particleSprite={(currentProject?.sprites || []).find((s: { id: string | null; }) => s.id === (currentProject?.objects || []).find((o: { id: string | null; }) => o.id === safeObject.emitter.particleObjectId)?.appearance.spriteId)}
                      />

                      <SwitchRow label="Enabled" value={safeObject.emitter.enabled} onToggle={(v: boolean) => updateField('emitter.enabled', v)} />
                      {safeObject.emitter.enabled && (
                        <View style={{ marginTop: 4, gap: 6 }}>
                          <PropertyRow label="Particle">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              {(currentProject?.objects || []).filter((o: any) => o.id !== safeObject.id).map((obj: any) => (
                                <TouchableOpacity
                                  key={obj.id}
                                  style={[
                                    styles.miniObjectSelect,
                                    safeObject.emitter.particleObjectId === obj.id && styles.miniObjectSelectActive,
                                    { padding: 4, minWidth: 60, height: 40 }
                                  ]}
                                  onPress={() => updateField('emitter.particleObjectId', obj.id)}
                                >
                                  {renderSpritePreview(obj.appearance.spriteId, 16)}
                                  <Text style={[styles.miniObjectText, { fontSize: 8 }]}>{obj.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </PropertyRow>

                          <PropertyRow label="Rate/Life">
                            <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                              <InputGroup label="PPS" value={safeObject.emitter.rate.toString()} onChange={(v: string) => updateField('emitter.rate', parseInt(v) || 0)} keyboardType="numeric" />
                              <InputGroup label="MS" value={safeObject.emitter.lifetime.toString()} onChange={(v: string) => updateField('emitter.lifetime', parseInt(v) || 0)} keyboardType="numeric" />
                            </View>
                          </PropertyRow>

                          <PropertyRow label="Physics">
                            <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                              <InputGroup label="SPD" value={safeObject.emitter.speed.toString()} onChange={(v: string) => updateField('emitter.speed', parseFloat(v) || 0)} keyboardType="numeric" />
                              <InputGroup label="GRAV" value={safeObject.emitter.gravityScale.toString()} onChange={(v: string) => updateField('emitter.gravityScale', parseFloat(v) || 0)} keyboardType="numeric" />
                            </View>
                          </PropertyRow>

                          <PropertyRow label="Spread">
                            <InputGroup label="45" value={safeObject.emitter.spread.toString()} onChange={(v: string) => updateField('emitter.spread', parseInt(v) || 0)} keyboardType="numeric" />
                          </PropertyRow>
                          <SwitchRow label="Burst" value={safeObject.emitter.burst} onToggle={(v: boolean) => updateField('emitter.burst', v)} />
                        </View>
                      )}
                    </Section>
                  )}

                  {safeObject.behavior === 'text' && (
                    <Section
                      title="Text"
                      icon={<Layout size={14} color="#FFFFFF" />}
                      expanded={expandedSections.text || true}
                      onToggle={() => toggleSection('text')}
                    >
                      <View style={{ gap: 6 }}>
                        <PropertyRow label="Content">
                          <TextInput
                            style={[styles.inspectorInputCompact, { minHeight: 60, textAlignVertical: 'top' }]}
                            multiline
                            value={safeObject.text?.content || ''}
                            onChangeText={(v) => updateField('text.content', v)}
                            placeholder="SCORE: {score}"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                          />
                        </PropertyRow>

                        <PropertyRow label="Font">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                            {['default', 'pixel'].map(f => (
                              <TouchableOpacity
                                key={f}
                                style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: safeObject.text?.fontFamily === f ? theme.colors.primary : '#16191E', borderWidth: 1, borderColor: '#333' }}
                                onPress={() => updateField('text.fontFamily', f)}
                              >
                                <Text style={{ color: safeObject.text?.fontFamily === f ? '#000' : '#888', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>{f.toUpperCase()}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Style">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                            <InputGroup label="SIZE" value={safeObject.text?.fontSize?.toString() || '24'} onChange={(v: string) => updateField('text.fontSize', parseInt(v) || 12)} keyboardType="numeric" />
                            <InputGroup label="COLOR" value={safeObject.text?.color || '#FFFFFF'} onChange={(v: string) => updateField('text.color', v)} />
                          </View>
                        </PropertyRow>

                        <PropertyRow label="Align">
                          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                            {['left', 'center', 'right'].map(a => (
                              <TouchableOpacity
                                key={a}
                                style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: safeObject.text?.textAlign === a ? theme.colors.primary : '#16191E', borderWidth: 1, borderColor: '#333' }}
                                onPress={() => updateField('text.textAlign', a)}
                              >
                                <Text style={{ color: safeObject.text?.textAlign === a ? '#000' : '#888', fontSize: 8, textAlign: 'center', fontWeight: 'bold' }}>{a.toUpperCase()}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </PropertyRow>
                      </View>
                    </Section>
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Sub-components for cleaner JSX
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Section = ({ title, icon, expanded, onToggle, children }: SectionProps) => (
  <View style={styles.inspectorSectionCompact}>
    <TouchableOpacity style={styles.sectionHeaderAccordion} onPress={onToggle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={styles.sectionLabel}>{title}</Text>
      </View>
      <ChevronDown size={12} color={theme.colors.textMuted} style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }] }} />
    </TouchableOpacity>
    {expanded && <View style={styles.sectionContent}>{children}</View>}
  </View>
);

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

const PropertyRow = ({ label, children }: PropertyRowProps) => (
  <View style={styles.propertyRow}>
    <Text style={styles.propertyLabel}>{label}</Text>
    <View style={styles.propertyValue}>{children}</View>
  </View>
);

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
  width?: any;
}

const InputGroup = ({ label, value, onChange, keyboardType = 'default', width = '100%' }: InputGroupProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    // Only sync from store if we're not in the middle of editing (not empty)
    // and the value actually changed.
    if (localValue !== '' && localValue !== value) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <View style={[styles.inputGroupCompact, { width }]}>
      <TextInput
        style={styles.inspectorInputCompact}
        value={localValue}
        onChangeText={(text) => {
          setLocalValue(text);
          onChange(text);
        }}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor="rgba(255,255,255,0.2)"
        disableFullscreenUI={true}
      />
    </View>
  );
};

interface SwitchRowProps {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

const SwitchRow = ({ label, value, onToggle }: SwitchRowProps) => (
  <View style={styles.switchRowCompact}>
    <Text style={styles.propertyLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#222', true: theme.colors.primary + '80' }}
      thumbColor={value ? theme.colors.primary : '#444'}
    />
  </View>
);

const ColorGrid = ({ selectedColor, onSelect }: { selectedColor: string, onSelect: (color: string) => void }) => {
  const colors = [
    'transparent', '#EF4444', '#F59E0B', '#FBBF24', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
    '#EC4899', '#F43F5E', '#FFFFFF', '#999999', '#555555', '#333333', '#111111', '#000000'
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {colors.map(c => (
        <TouchableOpacity
          key={c}
          onPress={() => onSelect(c)}
          style={{
            width: 20,
            height: 20,
            backgroundColor: c === 'transparent' ? '#16191E' : c,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: selectedColor === c ? '#FFF' : 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {c === 'transparent' && (
            <View style={{ width: '140%', height: 1, backgroundColor: '#EF4444', transform: [{ rotate: '45deg' }] }} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};
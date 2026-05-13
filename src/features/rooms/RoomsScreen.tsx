import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, DeviceEventEmitter, Alert, useWindowDimensions, Modal, Switch } from 'react-native';
import { theme } from '../../theme';
import {
  Grid3X3, ChevronLeft, ChevronRight, Box, Settings,
  MousePointer2, Copy, X, ZoomIn, ZoomOut, HelpCircle, Layout,
  ArrowRight, ArrowDown, Layers, ChevronUp, ChevronDown,
  ArrowUpToLine, ArrowDownToLine, Eye, EyeOff, Lock, Unlock, Plus, Trash2, Edit3,
  MousePointer, Move, Grid
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { useProjectStore, ObjectInstance } from '../../store/useProjectStore';
import { PixelSprite } from '../../components/PixelSprite';
import { Svg, Rect, Path } from 'react-native-svg';
import { styles } from './RoomsScreen.styles';
import { ColorPickerWrapper } from '../../components/ColorPicker';




const DraggableInstance = ({ inst, obj, scale, gridSize, onDragStart, onDragEnd, onRotateEnd, sprite, activeTool, onToolAction, isPlacing, isSelected, onSelect }: any) => {
  const translateX = useSharedValue(Number(inst?.x) || 0);
  const translateY = useSharedValue(Number(inst?.y) || 0);
  const isGrid = !!sprite?.grid?.enabled;
  const gs = gridSize || 32;
  const fw = isGrid ? (sprite?.grid?.frameWidth || gs) : (sprite?.width || gs);
  const fh = isGrid ? (sprite?.grid?.frameHeight || gs) : (sprite?.height || gs);
  const width = useSharedValue(Number(isGrid ? fw : (inst?.width || obj?.width || fw)) || 32);
  const height = useSharedValue(Number(isGrid ? fh : (inst?.height || obj?.height || fh)) || 32);
  const rotation = useSharedValue(Number(inst?.angle) || 0);

  // Sync shared values if inst prop changes
  React.useEffect(() => {
    if (!inst) return;
    translateX.value = Number(inst.x) || 0;
    translateY.value = Number(inst.y) || 0;
    const isGrid = !!sprite?.grid?.enabled;
    const fw = isGrid ? (sprite?.grid?.frameWidth || gridSize) : (sprite?.width || gridSize);
    const fh = isGrid ? (sprite?.grid?.frameHeight || gridSize) : (sprite?.height || gridSize);
    width.value = Number(isGrid ? fw : (inst.width || obj?.width || fw)) || 32;
    height.value = Number(isGrid ? fh : (inst.height || obj?.height || fh)) || 32;
  }, [inst?.x, inst?.y, inst?.width, inst?.height, obj?.width, obj?.height, sprite?.width, sprite?.height, sprite?.grid?.enabled, sprite?.grid?.frameWidth, sprite?.grid?.frameHeight]);

  const dragGesture = Gesture.Pan()
    .enabled(activeTool === 'move')
    .onStart(() => {
      if (onDragStart) {
        runOnJS(onDragStart)();
      }
      if (onSelect) {
        runOnJS(onSelect)();
      }
    })
    .onUpdate((e) => {
      const currentGs = gridSize || 32;
      const sv = scale?.value || 1;
      const rawX = Number(inst?.x || 0) + (e.translationX / sv);
      const rawY = Number(inst?.y || 0) + (e.translationY / sv);
      translateX.value = Math.round(rawX / currentGs) * currentGs;
      translateY.value = Math.round(rawY / currentGs) * currentGs;
    })
    .onEnd(() => {
      if (onDragEnd) {
        runOnJS(onDragEnd)(inst?.id, translateX.value, translateY.value);
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (activeTool === 'erase' || activeTool === 'duplicate') {
        if (onToolAction) {
          runOnJS(onToolAction)(activeTool, inst);
        }
      } else {
        if (onSelect) {
          runOnJS(onSelect)();
        }
      }
    });

  const composedGesture = Gesture.Simultaneous(dragGesture, tapGesture);

  const instanceStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        pointerEvents={isPlacing ? 'none' : 'auto'}
        style={[
          styles.instance,
          instanceStyle,
          {
            position: 'absolute',
            zIndex: 100,
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? theme.colors.primary : (activeTool === 'erase' ? 'rgba(239, 68, 68, 0.5)' : activeTool === 'duplicate' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,0,0,0.3)'),
            backgroundColor: isSelected ? 'rgba(0, 209, 255, 0.2)' : 'rgba(0, 209, 255, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'visible', // Ensure arrows are not clipped
          }
        ]}
      >
        {obj?.behavior === 'text' ? (
          <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 4 }}>
            <Text
              style={{
                color: obj.text?.color || '#FFF',
                fontSize: (obj.text?.fontSize || 16) * 0.8, // Scale down slightly for editor
                fontFamily: obj.text?.fontFamily === 'pixel' ? 'Pixel' : undefined,
                textAlign: 'center'
              }}
              numberOfLines={2}
            >
              {obj.text?.content || '(Text)'}
            </Text>
          </View>
        ) : obj?.behavior === 'progress_bar' ? (
          <View style={{ width: '100%', height: '100%', backgroundColor: obj.progress_bar?.backgroundColor || '#333', borderRadius: 2, borderWidth: 1, borderColor: '#555', overflow: 'hidden' }}>
            <View style={{
              width: obj.progress_bar?.direction === 'vertical' ? '100%' : '70%',
              height: obj.progress_bar?.direction === 'vertical' ? '70%' : '100%',
              backgroundColor: obj.progress_bar?.fillColor || '#10B981',
              position: 'absolute',
              bottom: 0,
              left: 0
            }} />
          </View>
        ) : obj?.behavior === 'gui_container' ? (
          <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 209, 255, 0.2)', borderWidth: 1, borderColor: '#00D1FF', borderStyle: 'dashed' }}>
            <Layout color="#00D1FF" size={24} />
          </View>
        ) : obj?.behavior === 'tilemap' ? (
          <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {Object.keys(inst?.tileData || {}).length === 0 ? (
              <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10B981', borderStyle: 'dashed' }}>
                <Grid color="#10B981" size={16} />
                <Text style={{ color: '#10B981', fontSize: 7, marginTop: 2, fontWeight: 'bold' }}>Tilemap</Text>
              </View>
            ) : (
              Object.entries(inst?.tileData || {}).map(([key, value]) => {
                const [colStr, rowStr] = key.split(',');
                const col = parseInt(colStr, 10);
                const row = parseInt(rowStr, 10);
                const tileIndex = parseInt(value, 10);

                return (
                  <View
                    key={key}
                    style={{
                      position: 'absolute',
                      left: col * gs,
                      top: row * gs,
                      width: gs,
                      height: gs,
                    }}
                  >
                    <PixelSprite
                      sprite={sprite}
                      size={gs}
                      originalSize={true}
                      frameIndex={tileIndex}
                    />
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <PixelSprite
            sprite={sprite}
            size={gridSize}
            originalSize={true}
            animationState={obj?.appearance?.animationState}
          />
        )}

        {isSelected && (
          <View style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'box-none', zIndex: 1000, overflow: 'visible', justifyContent: 'center', alignItems: 'center' }}>
            {activeTool === 'move' && (
              <>
                {/* Y Axis (Red - pointing up) */}
                <View style={{
                  position: 'absolute',
                  bottom: '50%',
                  left: '50%',
                  width: 2,
                  height: 60,
                  backgroundColor: '#ff4d4d',
                  marginLeft: -1,
                  opacity: 0.8
                }}>
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    left: -3,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 4,
                    borderRightWidth: 4,
                    borderBottomWidth: 6,
                    borderStyle: 'solid',
                    backgroundColor: 'transparent',
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderBottomColor: '#ff4d4d',
                  }} />
                </View>
                {/* X Axis (Blue - pointing right) */}
                <View style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 60,
                  height: 2,
                  backgroundColor: '#4d94ff',
                  marginTop: -1,
                  opacity: 0.8
                }}>
                  <View style={{
                    position: 'absolute',
                    right: -4,
                    top: -3,
                    width: 0,
                    height: 0,
                    borderTopWidth: 4,
                    borderBottomWidth: 4,
                    borderLeftWidth: 6,
                    borderStyle: 'solid',
                    backgroundColor: 'transparent',
                    borderTopColor: 'transparent',
                    borderBottomColor: 'transparent',
                    borderLeftColor: '#4d94ff',
                  }} />
                </View>
              </>
            )}
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const RoomSettingInput = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    // Only sync from store if we're not in the middle of editing (not empty)
    // and the value actually changed.
    if (localValue !== '' && Number(localValue) !== value) {
      setLocalValue(value.toString());
    }
  }, [value]);

  return (
    <View style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        style={styles.settingInput}
        value={localValue}
        onChangeText={(v) => {
          setLocalValue(v);
          const num = Number(v);
          if (!isNaN(num) && v !== '') {
            onChange(num);
          }
        }}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textMuted}
      />
    </View>
  );
};

const HexColorInput = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (localValue !== '' && localValue.toUpperCase() !== value.toUpperCase()) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <TextInput
      style={[styles.settingInput, { textAlign: 'left', width: '100%', paddingVertical: 8 }]}
      value={localValue.toUpperCase()}
      onChangeText={(v) => {
        setLocalValue(v);
        if (v.startsWith('#') && (v.length === 4 || v.length === 7)) {
          onChange(v);
        } else if (!v.startsWith('#') && (v.length === 3 || v.length === 6)) {
          onChange('#' + v);
        }
      }}
      placeholder="#HEX"
      placeholderTextColor={theme.colors.textMuted}
      maxLength={7}
    />
  );
};

export default function RoomsScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { activeProject: currentProject, updateRoom, addInstanceToRoom, updateInstancePosition, updateInstanceSize, updateInstanceAngle, updateInstanceTileData, removeInstanceFromRoom, reorderInstance, addRoom, addLayer, removeLayer, updateLayer, reorderLayer, activeRoomId, setActiveRoomId, updateSprite } = useProjectStore();
  const [showGrid, setShowGrid] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'move' | 'erase' | 'duplicate'>('select');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cameraTargetPickerVisible, setCameraTargetPickerVisible] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  const [activeTileIndex, setActiveTileIndex] = useState<number | null>(null);
  const [isEraserMode, setIsEraserMode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const currentRoom = useMemo(() =>
    (currentProject?.rooms || []).find((r: any) => r.id === activeRoomId) || (currentProject?.rooms || [])[0],
    [currentProject, activeRoomId]);

  const activeLayer = useMemo(() => {
    return currentRoom?.layers?.find((l: any) => l.id === activeLayerId);
  }, [currentRoom?.layers, activeLayerId]);

  useEffect(() => {
    if (activeLayer?.tilesetSpriteId && activeTileIndex === null) {
      setActiveTileIndex(0);
    }
  }, [activeLayer?.id, activeLayer?.tilesetSpriteId]);

  useEffect(() => {
    if (!activeRoomId && currentProject?.rooms?.length) {
      setActiveRoomId(currentProject.rooms[0].id);
    }
  }, [currentProject?.rooms, activeRoomId]);

  const [expandedSections, setExpandedSections] = useState({
    layers: true,
    instance: true,
    settings: true,
    camera: false,
    controls: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (currentRoom && currentRoom.layers?.length) {
      // If activeLayerId is null or doesn't exist in current room, pick the first one
      if (!activeLayerId || !currentRoom.layers.find(l => l.id === activeLayerId)) {
        // Find the last layer (top-most) to be the default active one
        setActiveLayerId(currentRoom.layers[currentRoom.layers.length - 1].id);
      }
    }
  }, [activeRoomId, currentRoom?.layers?.length]);

  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  useEffect(() => {
    if (!currentRoom) return;

    if (!isUndoRedoRef.current) {
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(JSON.parse(JSON.stringify(currentRoom.instances)));
      if (newHistory.length > 50) newHistory.shift();
      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
    }
    isUndoRedoRef.current = false;
  }, [currentRoom?.instances]);

  useEffect(() => {
    const undoSub = DeviceEventEmitter.addListener('room_undo', () => {
      if (historyIndexRef.current > 0 && currentRoom) {
        historyIndexRef.current -= 1;
        const prevState = historyRef.current[historyIndexRef.current];
        isUndoRedoRef.current = true;
        updateRoom(currentRoom.id, { instances: prevState });
      }
    });

    const redoSub = DeviceEventEmitter.addListener('room_redo', () => {
      if (historyIndexRef.current < historyRef.current.length - 1 && currentRoom) {
        historyIndexRef.current += 1;
        const nextState = historyRef.current[historyIndexRef.current];
        isUndoRedoRef.current = true;
        updateRoom(currentRoom.id, { instances: nextState });
      }
    });

    return () => {
      undoSub.remove();
      redoSub.remove();
    };
  }, [currentRoom?.id]);

  const roomWidth = currentRoom?.width || 800;
  const roomHeight = currentRoom?.height || 600;

  const handleCreateRoom = () => {
    if (!currentProject) return;
    const newRoom = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Room ${(currentProject.rooms || []).length + 1}`,
      width: 800,
      height: 600,
      instances: [],
      layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
      settings: {
        showControls: { left: true, right: true, jump: true, shoot: true },
        gravity: 9.8,
        backgroundColor: '#2E333D',
        showGrid: true,
        gridSize: 32
      }
    };
    addRoom(newRoom);
    setActiveRoomId(newRoom.id);
    historyRef.current = [];
    historyIndexRef.current = -1;
  };

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);
  const GRID_SIZE = currentRoom?.settings?.gridSize ?? 32;

  const gridLines = useMemo(() => {
    const hLines = [];
    const vLines = [];
    const buffer = 2000;
    const startX = -buffer;
    const endX = roomWidth + buffer;
    const startY = -buffer;
    const endY = roomHeight + buffer;

    for (let x = Math.floor(startX / GRID_SIZE) * GRID_SIZE; x <= endX; x += GRID_SIZE) {
      vLines.push(x);
    }
    for (let y = Math.floor(startY / GRID_SIZE) * GRID_SIZE; y <= endY; y += GRID_SIZE) {
      hLines.push(y);
    }
    return { hLines, vLines };
  }, [roomWidth, roomHeight, GRID_SIZE]);

  const handleDragEnd = (instId: string, x: number, y: number) => {
    if (currentRoom) {
      updateInstancePosition(currentRoom.id, instId, x, y);
    }
  };

  const handleResizeEnd = (instId: string, width: number, height: number) => {
    if (currentRoom) {
      updateInstanceSize(currentRoom.id, instId, width, height);
    }
  };

  const handleToolAction = (tool: string, inst: any) => {
    if (!currentRoom) return;
    if (tool === 'erase') {
      removeInstanceFromRoom(currentRoom.id, inst.id);
    } else if (tool === 'duplicate') {
      addInstanceToRoom(currentRoom.id, {
        ...inst,
        id: Math.random().toString(36).substr(2, 9),
        x: inst.x + GRID_SIZE,
        y: inst.y + GRID_SIZE,
      });
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 0.2) {
        scale.value = withSpring(0.2);
        savedScale.value = 0.2;
      } else if (scale.value > 8) {
        scale.value = withSpring(8);
        savedScale.value = 8;
      }
    });

  const panGesture = Gesture.Pan()
    .enabled((activeTool === 'select' || activeTool === 'move') && !isDragging)
    .onUpdate((e) => {
      const selectedInst = selectedInstanceId ? currentRoom?.instances?.find(i => i.id === selectedInstanceId) : null;
      const selectedObj = selectedInst ? (currentProject?.objects || []).find(o => o.id === selectedInst.objectId) : null;
      const isPaintingInstance = !!(selectedInst && selectedObj?.behavior === 'tilemap' && (activeTileIndex !== null || isEraserMode));
      const isPaintingLayer = !!(activeLayer?.tilesetSpriteId && (activeTileIndex !== null || isEraserMode));

      if ((isPaintingLayer || isPaintingInstance) && activeTool === 'select' && !selectedObjectId) {
        // Continuous painting
        const viewW = viewport.width || screenWidth;
        const viewH = viewport.height || screenHeight;
        const realX = (roomWidth / 2) + (e.x - (viewW / 2) - offsetX.value) / scale.value;
        const realY = (roomHeight / 2) + (e.y - (viewH / 2) - offsetY.value) / scale.value;
        runOnJS(handleTilemapPaint)(realX, realY);
      } else {
        offsetX.value = savedOffsetX.value + e.translationX;
        offsetY.value = savedOffsetY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    });

  const handleTilemapPaint = (x: number, y: number) => {
    if (!currentRoom) return;

    // 1. Check if we have a selected tilemap instance
    const selectedInst = selectedInstanceId ? currentRoom.instances?.find(i => i.id === selectedInstanceId) : null;
    const selectedObj = selectedInst ? (currentProject?.objects || []).find(o => o.id === selectedInst.objectId) : null;

    if (selectedInst && selectedObj?.behavior === 'tilemap') {
      // Paint on the individual instance in relative coordinates
      const relativeX = x - selectedInst.x;
      const relativeY = y - selectedInst.y;
      const col = Math.floor(relativeX / GRID_SIZE);
      const row = Math.floor(relativeY / GRID_SIZE);

      const key = `${col},${row}`;
      const tileData = { ...(selectedInst.tileData || {}) };

      if (isEraserMode) {
        delete tileData[key];
      } else if (activeTileIndex !== null) {
        tileData[key] = activeTileIndex.toString();
      } else {
        return;
      }

      updateInstanceTileData(currentRoom.id, selectedInst.id, tileData);
      return;
    }

    // 2. Otherwise paint on the active layer (Backwards Compatibility)
    if (!activeLayerId) return;
    const layer = currentRoom.layers.find(l => l.id === activeLayerId);
    if (!layer || !layer.tilesetSpriteId) return;

    const col = Math.floor(x / GRID_SIZE);
    const row = Math.floor(y / GRID_SIZE);

    const key = `${col},${row}`;
    const tileData = { ...(layer.tileData || {}) };

    if (isEraserMode) {
      delete tileData[key];
    } else if (activeTileIndex !== null) {
      tileData[key] = activeTileIndex.toString();
    } else {
      return;
    }

    updateLayer(currentRoom.id, activeLayerId, { tileData });
  };

  const handlePlaceObject = (x: number, y: number) => {
    if (!selectedObjectId || !currentRoom) return;

    // Hit detection: Don't place a new object if we clicked on an existing one
    const hitInstance = (currentRoom.instances || []).find(inst => {
      const obj = (currentProject?.objects || []).find(o => o.id === inst.objectId);
      const sprite = (currentProject?.sprites || []).find(s => s.id === obj?.appearance.spriteId);
      const isGrid = !!sprite?.grid?.enabled;
      const fw = isGrid ? (sprite?.grid?.frameWidth || 32) : (sprite?.width || GRID_SIZE);
      const fh = isGrid ? (sprite?.grid?.frameHeight || 32) : (sprite?.height || GRID_SIZE);
      const w = isGrid ? fw : (inst.width || fw);
      const h = isGrid ? fh : (inst.height || fh);
      return x >= inst.x && x <= inst.x + w && y >= inst.y && y <= inst.y + h;
    });

    if (hitInstance) return;

    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

    // Get object dimensions
    const obj = (currentProject?.objects || []).find(o => o.id === selectedObjectId);
    const sprite = (currentProject?.sprites || []).find(s => s.id === obj?.appearance.spriteId);
    const frameW = obj?.width || ((sprite?.grid?.enabled && sprite.grid.frameWidth) ? sprite.grid.frameWidth : (sprite?.width || 32));
    const frameH = obj?.height || ((sprite?.grid?.enabled && sprite.grid.frameHeight) ? sprite.grid.frameHeight : (sprite?.height || 32));

    addInstanceToRoom(currentRoom.id, {
      id: Math.random().toString(36).substr(2, 9),
      objectId: selectedObjectId,
      x: snappedX,
      y: snappedY,
      width: frameW,
      height: frameH,
      layerId: activeLayerId || (currentRoom.layers?.[0]?.id || 'default')
    });
  };

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const viewW = viewport.width || screenWidth;
      const viewH = viewport.height || screenHeight;
      const realX = (roomWidth / 2) + (e.x - (viewW / 2) - offsetX.value) / scale.value;
      const realY = (roomHeight / 2) + (e.y - (viewH / 2) - offsetY.value) / scale.value;

      const selectedInst = selectedInstanceId ? currentRoom?.instances?.find(i => i.id === selectedInstanceId) : null;
      const selectedObj = selectedInst ? (currentProject?.objects || []).find(o => o.id === selectedInst.objectId) : null;
      const isPaintingInstance = !!(selectedInst && selectedObj?.behavior === 'tilemap' && (activeTileIndex !== null || isEraserMode));
      const isPaintingLayer = !!(activeLayer?.tilesetSpriteId && (activeTileIndex !== null || isEraserMode));

      if ((isPaintingLayer || isPaintingInstance) && !selectedObjectId) {
        runOnJS(handleTilemapPaint)(realX, realY);
      } else if (selectedObjectId) {
        runOnJS(handlePlaceObject)(realX, realY);
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, tapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value }
    ],
  }));

  const handleZoomIn = () => {
    const newScale = Math.min(scale.value + 0.2, 4);
    scale.value = withTiming(newScale);
    savedScale.value = newScale;
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale.value - 0.2, 0.5);
    scale.value = withTiming(newScale);
    savedScale.value = newScale;
  };

  return (
    <View style={styles.container}>
      {/* Floating Left Tool Palette */}
      <View style={styles.floatingLeftTools}>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'select' && styles.toolActive]}
          onPress={() => {
            setActiveTool('select');
            setSelectedObjectId(null);
          }}
        >
          <MousePointer2 color={activeTool === 'select' ? theme.colors.primary : theme.colors.text} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'move' && styles.toolActive]}
          onPress={() => {
            setActiveTool('move');
            setSelectedObjectId(null);
          }}
        >
          <Move color={activeTool === 'move' ? theme.colors.primary : theme.colors.text} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'duplicate' && styles.toolActive]}
          onPress={() => {
            setActiveTool('duplicate');
            setSelectedObjectId(null);
          }}
        >
          <Copy color={activeTool === 'duplicate' ? theme.colors.primary : theme.colors.text} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'erase' && styles.toolActive]}
          onPress={() => {
            setActiveTool('erase');
            setSelectedObjectId(null);
          }}
        >
          <X color={activeTool === 'erase' ? theme.colors.primary : theme.colors.text} size={16} />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View
        style={[styles.mainEditorArea, { backgroundColor: currentRoom?.settings?.backgroundColor || '#1E2228' }]}
        onLayout={(e) => setViewport(e.nativeEvent.layout)}
      >
        <GestureDetector gesture={composedGesture}>
          <View style={styles.gestureOverlay}>
            <Animated.View style={[styles.room, animatedStyle, { width: roomWidth, height: roomHeight }]}>
              {/* Render Instances Grouped by Layer */}
              {(currentRoom?.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }]).map((layer, idx, allLayers) => {
                if (!layer.visible) return null;

                const tilesetSprite = currentProject?.sprites.find(s => s.id === layer.tilesetSpriteId);
                const tileData = layer.tileData || {};
                const hasTiles = Object.keys(tileData).length > 0;

                const layerInstances = (currentRoom?.instances || [])
                  .filter(inst => (inst.layerId || allLayers[0].id) === layer.id);

                return (
                  <React.Fragment key={`editor-layer-${layer.id}`}>
                    {hasTiles && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: roomWidth,
                          height: roomHeight,
                          pointerEvents: 'none',
                          zIndex: idx * 10
                        }}
                      >
                        {Object.entries(tileData).map(([key, value]) => {
                          const [colStr, rowStr] = key.split(',');
                          const col = parseInt(colStr, 10);
                          const row = parseInt(rowStr, 10);
                          const tileIndex = parseInt(value, 10);

                          return (
                            <View
                              key={key}
                              style={{
                                position: 'absolute',
                                left: col * GRID_SIZE,
                                top: row * GRID_SIZE,
                                width: GRID_SIZE,
                                height: GRID_SIZE,
                              }}
                            >
                              <PixelSprite
                                sprite={tilesetSprite}
                                size={GRID_SIZE}
                                originalSize={true}
                                frameIndex={tileIndex}
                              />
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {layerInstances.map((inst) => {
                      const obj = (currentProject?.objects || []).find(o => o.id === inst.objectId);
                      const sprite = (currentProject?.sprites || []).find(s => s.id === obj?.appearance.spriteId);

                      return (
                        <DraggableInstance
                          key={inst.id}
                          inst={inst}
                          obj={obj}
                          scale={scale}
                          gridSize={GRID_SIZE}
                          onDragStart={() => setIsDragging(true)}
                          onDragEnd={(instId: any, x: any, y: any) => {
                            setIsDragging(false);
                            handleDragEnd(instId, x, y);
                          }}
                          onToolAction={handleToolAction}
                          sprite={sprite}
                          activeTool={activeTool}
                          isPlacing={!!selectedObjectId && activeTool === 'select'}
                          isSelected={selectedInstanceId === inst.id}
                          onSelect={() => {
                            if (!layer.locked) {
                              setSelectedInstanceId(inst.id);
                              setSelectedObjectId(null); // Cancel placement mode when selecting an object
                            }
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Room Boundary Rectangle */}
              <View style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: roomWidth,
                height: roomHeight,
                borderWidth: 2,
                borderColor: theme.colors.primary,
                backgroundColor: currentRoom?.settings?.backgroundColor || 'rgba(46, 51, 61, 0.4)',
                pointerEvents: 'none',
                zIndex: -1
              }} />




              {/* Infinite Grid Layer - Always on Top */}
              {showGrid && (
                <View style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10000 }}>
                  {gridLines.hLines.map((y, i) => (
                    <View key={`h-${i}`} pointerEvents="none" style={[styles.gridLineH, {
                      top: y,
                      width: roomWidth + 4000,
                      left: -2000,
                      opacity: y >= 0 && y <= roomHeight ? 0.3 : 0.1
                    }]} />
                  ))}
                  {gridLines.vLines.map((x, i) => (
                    <View key={`v-${i}`} pointerEvents="none" style={[styles.gridLineV, {
                      left: x,
                      height: roomHeight + 4000,
                      top: -2000,
                      opacity: x >= 0 && x <= roomWidth ? 0.3 : 0.1
                    }]} />
                  ))}
                </View>
              )}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
            <ZoomIn color={theme.colors.text} size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
            <ZoomOut color={theme.colors.text} size={16} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid Toggle */}
      <TouchableOpacity
        style={[styles.toggleButton, !showGrid && styles.toggleButtonOff]}
        onPress={() => setShowGrid(!showGrid)}
      >
        <Grid3X3 color={showGrid ? theme.colors.primary : theme.colors.textMuted} size={16} />
      </TouchableOpacity>

      {/* Sidebar Toggle */}
      <TouchableOpacity
        style={[styles.sidebarToggle, sidebarOpen ? styles.sidebarToggleOpen : null]}
        onPress={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <ChevronRight color={theme.colors.text} size={16} /> : <ChevronLeft color={theme.colors.text} size={16} />}
      </TouchableOpacity>

      {/* Right Sidebar */}
      {sidebarOpen && (
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.sidebarSection}>
              <View style={styles.sectionHeader}>
                <Layout color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Rooms</Text>
                <TouchableOpacity onPress={handleCreateRoom} style={{ marginLeft: 'auto' }}>
                  <Text style={{ color: theme.colors.primary, fontSize: 20, fontWeight: 'bold' }}>+</Text>
                </TouchableOpacity>
              </View>
              {(currentProject?.rooms || []).map(room => (
                <TouchableOpacity
                  key={room.id}
                  style={[styles.roomTab, activeRoomId === room.id && styles.roomTabActive]}
                  onPress={() => {
                    setActiveRoomId(room.id);
                    historyRef.current = [];
                    historyIndexRef.current = -1;
                  }}
                >
                  <Text style={{ color: activeRoomId === room.id ? theme.colors.primary : theme.colors.text }}>
                    {room.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sidebarSection}>
              <View style={styles.sectionHeader}>
                <Box color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Objects</Text>
              </View>

              {(currentProject?.objects || []).length === 0 ? (
                <View style={styles.emptySidebar}>
                  <HelpCircle color={theme.colors.textMuted} size={24} />
                  <Text style={styles.emptySidebarText}>No objects created yet.</Text>
                </View>
              ) : (
                <View style={styles.objectGrid}>
                  {(currentProject?.objects || []).map((obj) => (
                    <TouchableOpacity
                      key={obj.id}
                      style={[
                        styles.objectItem,
                        selectedObjectId === obj.id && styles.objectItemActive
                      ]}
                      onPress={() => setSelectedObjectId(obj.id === selectedObjectId ? null : obj.id)}
                    >
                      <View style={styles.objectPreview}>
                        {obj.behavior === 'text' ? (
                          <Layout size={20} color={theme.colors.primary} />
                        ) : obj.behavior === 'progress_bar' ? (
                          <View style={{ width: 24, height: 8, backgroundColor: obj.progress_bar?.fillColor || '#10B981', borderRadius: 1 }} />
                        ) : (
                          <PixelSprite
                            sprite={(currentProject?.sprites || []).find(s => s.id === obj.appearance.spriteId)}
                            size={32}
                            animationState={obj.appearance.animationState}
                          />
                        )}
                      </View>
                      <Text style={styles.objectName} numberOfLines={1}>{obj.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.sidebarSection}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection('layers')}
                activeOpacity={0.7}
              >
                <Layers color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Layers</Text>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={(e) => {
                    e.stopPropagation();
                    currentRoom && addLayer(currentRoom.id);
                  }}>
                    <Plus color={theme.colors.primary} size={16} />
                  </TouchableOpacity>
                  {expandedSections.layers ? <ChevronUp color={theme.colors.textMuted} size={14} /> : <ChevronDown color={theme.colors.textMuted} size={14} />}
                </View>
              </TouchableOpacity>

              {expandedSections.layers && (
                (!currentRoom || !currentRoom.layers || currentRoom.layers.length === 0) ? (
                  <View style={styles.emptySidebar}>
                    <Text style={styles.emptySidebarText}>No layers defined.</Text>
                  </View>
                ) : (
                  <View style={styles.layersList}>
                    {[...(currentRoom.layers || [])].reverse().map((layer, revIdx) => {
                      const isActive = activeLayerId === layer.id;
                      return (
                        <View
                          key={layer.id}
                          style={[
                            styles.layerItem,
                            isActive && styles.layerItemActive
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.layerInfo}
                            onPress={() => {
                              if (isActive) {
                                Alert.prompt(
                                  'Rename Layer',
                                  'Enter new name',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'OK', onPress: (name: any) => name && updateLayer(currentRoom.id, layer.id, { name }) }
                                  ],
                                  'plain-text',
                                  layer.name
                                );
                              } else {
                                setActiveLayerId(layer.id);
                              }
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' }}>
                              {layer.tilesetSpriteId ? (
                                <Grid3X3 color={isActive ? theme.colors.primary : theme.colors.textMuted} size={12} />
                              ) : (
                                <Box color={isActive ? theme.colors.primary : theme.colors.textMuted} size={12} />
                              )}
                              <Text style={[styles.layerName, isActive && { fontWeight: 'bold', color: theme.colors.primary }]} numberOfLines={1}>
                                {layer.name}
                              </Text>
                            </View>

                            {isActive && layer.tilesetSpriteId && (
                              <View style={{ marginTop: 4, paddingLeft: 18 }}>
                                <Text style={{ fontSize: 9, color: theme.colors.textMuted, fontStyle: 'italic' }}>
                                  Tileset: {currentProject?.sprites.find(s => s.id === layer.tilesetSpriteId)?.name || 'Unknown'}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          <View style={styles.layerActions}>
                            {selectedInstanceId && !isActive && (
                              <TouchableOpacity
                                onPress={() => {
                                  updateRoom(currentRoom.id, {
                                    instances: currentRoom.instances.map(i =>
                                      i.id === selectedInstanceId ? { ...i, layerId: layer.id } : i
                                    )
                                  });
                                }}
                                style={{
                                  padding: 4,
                                  backgroundColor: 'rgba(255,255,255,0.04)',
                                  borderRadius: 4,
                                }}
                              >
                                <ArrowUpToLine color={theme.colors.primary} size={12} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => reorderLayer(currentRoom.id, layer.id, 'forward')}
                              disabled={revIdx === 0}
                              style={{
                                padding: 4,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderRadius: 4,
                                opacity: revIdx === 0 ? 0.2 : 1
                              }}
                            >
                              <ChevronUp color={theme.colors.text} size={12} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => reorderLayer(currentRoom.id, layer.id, 'backward')}
                              disabled={revIdx === currentRoom.layers.length - 1}
                              style={{
                                padding: 4,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderRadius: 4,
                                opacity: revIdx === currentRoom.layers.length - 1 ? 0.2 : 1
                              }}
                            >
                              <ChevronDown color={theme.colors.text} size={12} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => updateLayer(currentRoom.id, layer.id, { visible: !layer.visible })}
                              style={{
                                padding: 4,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderRadius: 4,
                              }}
                            >
                              {layer.visible ? <Eye color={theme.colors.text} size={12} /> : <EyeOff color={theme.colors.textMuted} size={12} />}
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => updateLayer(currentRoom.id, layer.id, { locked: !layer.locked })}
                              style={{
                                padding: 4,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderRadius: 4,
                              }}
                            >
                              {layer.locked ? <Lock color={theme.colors.primary} size={12} /> : <Unlock color={theme.colors.textMuted} size={12} />}
                            </TouchableOpacity>
                            {currentRoom.layers.length > 1 && (
                              <TouchableOpacity
                                onPress={() => {
                                  Alert.alert(
                                    'Delete Layer',
                                    `Are you sure you want to delete "${layer.name}"? ALL objects on this layer will also be deleted.`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { text: 'Delete', style: 'destructive', onPress: () => removeLayer(currentRoom.id, layer.id) }
                                    ]
                                  );
                                }}
                                style={{
                                  padding: 4,
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  borderRadius: 4,
                                }}
                              >
                                <Trash2 color={theme.colors.error || '#EF4444'} size={12} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
            </View>

            {selectedInstanceId && currentRoom && (
              <View style={styles.sidebarSection}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection('instance')}
                  activeOpacity={0.7}
                >
                  <MousePointer color={theme.colors.primary} size={16} />
                  <Text style={styles.sectionTitle}>Selection</Text>
                  <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => setSelectedInstanceId(null)}>
                      <X color={theme.colors.textMuted} size={14} />
                    </TouchableOpacity>
                    {expandedSections.instance ? <ChevronUp color={theme.colors.textMuted} size={14} /> : <ChevronDown color={theme.colors.textMuted} size={14} />}
                  </View>
                </TouchableOpacity>

                {expandedSections.instance && (
                  <View style={styles.settingsList}>
                    {(() => {
                      const inst = currentRoom.instances.find(i => i.id === selectedInstanceId);
                      if (!inst) return null;
                      const obj = currentProject?.objects.find(o => o.id === inst.objectId);
                      return (
                        <View style={{ gap: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {obj?.behavior === 'text' ? (
                              <Layout size={18} color={theme.colors.primary} />
                            ) : (
                              <PixelSprite
                                sprite={currentProject?.sprites.find(s => s.id === obj?.appearance.spriteId)}
                                size={24}
                                animationState={obj?.appearance?.animationState}
                              />
                            )}
                            <Text style={{ color: '#fff', marginLeft: 8, fontSize: 14 }}>{obj?.name || 'Unknown Object'}</Text>
                          </View>

                          {obj?.behavior === 'text' && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 2, borderLeftWidth: 2, borderLeftColor: theme.colors.primary }}>
                              <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginBottom: 4 }}>TEXT CONTENT</Text>
                              <Text style={{ color: '#fff', fontSize: 12, fontFamily: obj.text?.fontFamily === 'pixel' ? 'Pixel' : undefined }}>
                                {obj.text?.content || '(Empty)'}
                              </Text>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Position</Text>
                            <Text style={{ color: theme.colors.text, fontSize: 11 }}>{inst.x}, {inst.y}</Text>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Layer</Text>
                            <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: 'bold' }}>
                              {currentRoom.layers.find(l => l.id === (inst.layerId || currentRoom.layers?.[0]?.id || 'default'))?.name || 'Layer 1'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[styles.toggleRow, { marginTop: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                            onPress={() => {
                              removeInstanceFromRoom(currentRoom.id, selectedInstanceId);
                              setSelectedInstanceId(null);
                            }}
                          >
                            <Trash2 color="#ef4444" size={14} />
                            <Text style={{ color: '#ef4444', marginLeft: 8, fontSize: 12 }}>Remove Instance</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            )}

            {selectedInstanceId && currentRoom && (() => {
              const inst = currentRoom.instances.find(i => i.id === selectedInstanceId);
              if (!inst) return null;
              const obj = currentProject?.objects.find(o => o.id === inst.objectId);
              if (obj?.behavior !== 'tilemap') return null;

              const tilesetSprite = currentProject?.sprites.find(s => s.id === obj.appearance.spriteId);

              return (
                <View style={styles.sidebarSection}>
                  <View style={[styles.sectionHeader, { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 }]}>
                    <Grid3X3 color={theme.colors.primary} size={16} />
                    <Text style={styles.sectionTitle}>Tilemap Instance Painter</Text>
                  </View>

                  <View style={{ padding: 12, gap: 12 }}>
                    {!tilesetSprite ? (
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>No Sprite Assigned</Text>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontStyle: 'italic' }}>
                          Assign a sprite to this object in the Objects Screen first to use it as a tileset!
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={{ gap: 2 }}>
                          <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Active Tileset Sprite</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                            <PixelSprite sprite={tilesetSprite} size={24} />
                            <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: 'bold' }}>{tilesetSprite.name}</Text>
                          </View>
                        </View>

                        {/* Tile Slicing Width & Height Inputs */}
                        {(() => {
                          const tileW = tilesetSprite.grid?.frameWidth ?? 32;
                          const tileH = tilesetSprite.grid?.frameHeight ?? 32;
                          return (
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                              <View style={{ flex: 1, gap: 4 }}>
                                <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>Tile Width (px)</Text>
                                <TextInput
                                  style={{
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    paddingVertical: 4,
                                    paddingHorizontal: 8,
                                    borderRadius: 4,
                                    fontSize: 11,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)'
                                  }}
                                  keyboardType="numeric"
                                  value={String(tileW)}
                                  onChangeText={(val) => {
                                    const num = parseInt(val, 10);
                                    if (!isNaN(num) && num > 0) {
                                      updateSprite(tilesetSprite.id, {
                                        grid: {
                                          enabled: true,
                                          frameWidth: num,
                                          frameHeight: tileH
                                        }
                                      });
                                    }
                                  }}
                                />
                              </View>
                              <View style={{ flex: 1, gap: 4 }}>
                                <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>Tile Height (px)</Text>
                                <TextInput
                                  style={{
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    paddingVertical: 4,
                                    paddingHorizontal: 8,
                                    borderRadius: 4,
                                    fontSize: 11,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)'
                                  }}
                                  keyboardType="numeric"
                                  value={String(tileH)}
                                  onChangeText={(val) => {
                                    const num = parseInt(val, 10);
                                    if (!isNaN(num) && num > 0) {
                                      updateSprite(tilesetSprite.id, {
                                        grid: {
                                          enabled: true,
                                          frameWidth: tileW,
                                          frameHeight: num
                                        }
                                      });
                                    }
                                  }}
                                />
                              </View>
                            </View>
                          );
                        })()}

                        {/* Brush / Eraser Mode */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              paddingVertical: 8,
                              borderRadius: 4,
                              backgroundColor: !isEraserMode ? theme.colors.primary : 'rgba(255,255,255,0.05)',
                              borderWidth: 1,
                              borderColor: !isEraserMode ? theme.colors.primary : 'rgba(255,255,255,0.1)'
                            }}
                            onPress={() => setIsEraserMode(false)}
                          >
                            <Edit3 size={14} color={!isEraserMode ? '#000' : '#fff'} />
                            <Text style={{ color: !isEraserMode ? '#000' : '#fff', fontSize: 12, fontWeight: 'bold' }}>Brush</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              paddingVertical: 8,
                              borderRadius: 4,
                              backgroundColor: isEraserMode ? theme.colors.error : 'rgba(255,255,255,0.05)',
                              borderWidth: 1,
                              borderColor: isEraserMode ? theme.colors.error : 'rgba(255,255,255,0.1)'
                            }}
                            onPress={() => setIsEraserMode(true)}
                          >
                            <Trash2 size={14} color={isEraserMode ? '#fff' : '#fff'} />
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Eraser</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Tile Palette Grid */}
                        {!isEraserMode && (() => {
                          const frameWidth = tilesetSprite.grid?.frameWidth || 32;
                          const frameHeight = tilesetSprite.grid?.frameHeight || 32;
                          const width = tilesetSprite.width || frameWidth;
                          const height = tilesetSprite.height || frameHeight;
                          const cols = Math.floor(width / frameWidth) || 1;
                          const rows = Math.floor(height / frameHeight) || 1;
                          const totalFrames = cols * rows;

                          const tiles = [];
                          for (let i = 0; i < totalFrames; i++) {
                            tiles.push(i);
                          }

                          return (
                            <View style={{ gap: 6 }}>
                              <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Select Tile Frame</Text>
                              <ScrollView
                                nestedScrollEnabled={true}
                                style={{ maxHeight: 180, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4 }}
                                contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8 }}
                              >
                                {tiles.map((idx) => {
                                  const isSelected = activeTileIndex === idx;
                                  return (
                                    <TouchableOpacity
                                      key={idx}
                                      style={{
                                        padding: 2,
                                        borderRadius: 4,
                                        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                                        borderWidth: 2,
                                        borderColor: isSelected ? theme.colors.primary : 'rgba(255,255,255,0.1)',
                                      }}
                                      onPress={() => {
                                        setActiveTileIndex(idx);
                                        setIsEraserMode(false);
                                      }}
                                    >
                                      <PixelSprite sprite={tilesetSprite} size={32} originalSize={true} frameIndex={idx} />
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          );
                        })()}

                        <Text style={{ color: theme.colors.textMuted, fontSize: 10, textAlign: 'center', fontStyle: 'italic', marginTop: 4 }}>
                          Drag on canvas in "Select" mode to paint tiles inside this instance!
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })()}


            <View style={styles.sidebarSection}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection('settings')}
                activeOpacity={0.7}
              >
                <Settings color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Room Settings</Text>
                <View style={{ marginLeft: 'auto' }}>
                  {expandedSections.settings ? <ChevronUp color={theme.colors.textMuted} size={14} /> : <ChevronDown color={theme.colors.textMuted} size={14} />}
                </View>
              </TouchableOpacity>

              {expandedSections.settings && (
                <View style={styles.settingsList}>
                  <RoomSettingInput
                    label="Width"
                    value={roomWidth}
                    onChange={(v) => currentRoom && updateRoom(currentRoom.id, { width: v })}
                  />
                  <RoomSettingInput
                    label="Height"
                    value={roomHeight}
                    onChange={(v) => currentRoom && updateRoom(currentRoom.id, { height: v })}
                  />
                  <RoomSettingInput
                    label="Gravity"
                    value={currentRoom?.settings?.gravity ?? 9.8}
                    onChange={(v) => currentRoom && updateRoom(currentRoom.id, {
                      settings: { ...(currentRoom.settings || {}), gravity: v }
                    })}
                  />
                  <RoomSettingInput
                    label="Grid Size"
                    value={currentRoom?.settings?.gridSize ?? 32}
                    onChange={(v) => currentRoom && updateRoom(currentRoom.id, {
                      settings: { ...(currentRoom.settings || {}), gridSize: Math.max(1, v) }
                    })}
                  />

                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.settingLabel, { marginBottom: 8 }]}>Background Color</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          backgroundColor: currentRoom?.settings?.backgroundColor || '#2E333D',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.1)'
                        }}
                        onPress={() => setColorPickerVisible(true)}
                      />
                      <View style={{ flex: 1 }}>
                        <HexColorInput
                          value={currentRoom?.settings?.backgroundColor || '#2E333D'}
                          onChange={(c) => currentRoom && updateRoom(currentRoom.id, {
                            settings: { ...(currentRoom.settings || {}), backgroundColor: c }
                          })}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.sidebarSection}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection('camera')}
                activeOpacity={0.7}
              >
                <HelpCircle color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Camera</Text>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Switch
                    value={currentRoom?.settings?.camera?.enabled ?? false}
                    onValueChange={(enabled) => {
                      if (!currentRoom) return;
                      const cam = currentRoom.settings?.camera || { targetObjectId: null, smoothing: 0.1, zoom: 1, enabled: false };
                      updateRoom(currentRoom.id, {
                        settings: { ...currentRoom.settings, camera: { ...cam, enabled } }
                      });
                    }}
                    trackColor={{ false: '#333', true: theme.colors.primary + '80' }}
                    thumbColor={(currentRoom?.settings?.camera?.enabled) ? theme.colors.primary : '#666'}
                  />
                  {expandedSections.camera ? <ChevronUp color={theme.colors.textMuted} size={14} /> : <ChevronDown color={theme.colors.textMuted} size={14} />}
                </View>
              </TouchableOpacity>

              {expandedSections.camera && (
                <View style={styles.settingsList}>
                  <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Follow</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setCameraTargetPickerVisible(true)}
                    >
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {currentRoom?.settings?.camera?.targetObjectId
                          ? (currentProject?.objects || []).find(o => o.id === currentRoom.settings?.camera?.targetObjectId)?.name || 'None'
                          : 'None'
                        }
                      </Text>
                      <ChevronDown color={theme.colors.textMuted} size={14} />
                    </TouchableOpacity>
                  </View>

                  <RoomSettingInput
                    label="Smoothing (0-1)"
                    value={currentRoom?.settings?.camera?.smoothing ?? 0.1}
                    onChange={(v) => {
                      if (!currentRoom) return;
                      const cam = currentRoom.settings?.camera || { targetObjectId: null, smoothing: 0.1, zoom: 1, enabled: true };
                      updateRoom(currentRoom.id, {
                        settings: { ...currentRoom.settings, camera: { ...cam, smoothing: Math.max(0, Math.min(1, v)) } }
                      });
                    }}
                  />

                  <RoomSettingInput
                    label="Zoom"
                    value={currentRoom?.settings?.camera?.zoom ?? 1}
                    onChange={(v) => {
                      if (!currentRoom) return;
                      const cam = currentRoom.settings?.camera || { targetObjectId: null, smoothing: 0.1, zoom: 1, enabled: true };
                      updateRoom(currentRoom.id, {
                        settings: { ...currentRoom.settings, camera: { ...cam, zoom: Math.max(0.1, v) } }
                      });
                    }}
                  />

                  <TouchableOpacity
                    style={[styles.toggleRow, currentRoom?.settings?.ySort && styles.toggleRowActive, { marginTop: 8 }]}
                    onPress={() => {
                      if (!currentRoom) return;
                      updateRoom(currentRoom.id, {
                        settings: { ...(currentRoom.settings || {}), ySort: !currentRoom.settings?.ySort }
                      });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Move color={currentRoom?.settings?.ySort ? theme.colors.primary : theme.colors.textMuted} size={14} />
                      <Text style={[styles.toggleText, currentRoom?.settings?.ySort && styles.toggleTextActive]}>
                        Y-Sorting (RPG Style)
                      </Text>
                    </View>
                    <View style={[styles.toggleIndicator, currentRoom?.settings?.ySort && styles.toggleIndicatorActive]} />
                  </TouchableOpacity>

                  {currentRoom?.settings?.ySort && (
                    <RoomSettingInput
                      label="Y-Sort Offset"
                      value={currentRoom?.settings?.ySortAmount ?? 0}
                      onChange={(v) => {
                        if (!currentRoom) return;
                        updateRoom(currentRoom.id, {
                          settings: { ...(currentRoom.settings || {}), ySortAmount: v }
                        });
                      }}
                    />
                  )}
                </View>
              )}
            </View>

            <View style={styles.sidebarSection}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection('controls')}
                activeOpacity={0.7}
              >
                <Grid3X3 color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Built-in Controls</Text>
                <View style={{ marginLeft: 'auto' }}>
                  {expandedSections.controls ? <ChevronUp color={theme.colors.textMuted} size={14} /> : <ChevronDown color={theme.colors.textMuted} size={14} />}
                </View>
              </TouchableOpacity>

              {expandedSections.controls && (
                <View style={{ gap: 8 }}>
                  {['left', 'right', 'up', 'down', 'jump', 'shoot', 'joystick'].map((btn) => {
                    const controls = currentRoom?.settings?.showControls as any;
                    const isShowing = btn === 'joystick' ? controls?.joystick?.enabled : controls?.[btn];
                    return (
                      <View key={btn}>
                        <TouchableOpacity
                          style={[styles.toggleRow, isShowing && styles.toggleRowActive]}
                          onPress={() => {
                            if (!currentRoom) return;
                            const newControls = { ...(currentRoom.settings?.showControls || { left: true, right: true, up: false, down: false, jump: true, shoot: true, joystick: { enabled: false, dead_zone: 10, stick_range: 50, output_mode: 'vector', persistence: false } }) };

                            if (btn === 'joystick') {
                              newControls.joystick = { ...(newControls.joystick || { enabled: false, dead_zone: 10, stick_range: 50, output_mode: 'vector', persistence: false }), enabled: !isShowing };
                            } else {
                              (newControls as any)[btn] = !isShowing;
                            }

                            updateRoom(currentRoom.id, {
                              settings: { ...(currentRoom.settings || {}), showControls: newControls }
                            });
                          }}
                        >
                          <Text style={[styles.toggleText, isShowing && styles.toggleTextActive]}>
                            {btn.charAt(0).toUpperCase() + btn.slice(1)}
                          </Text>
                          <View style={[styles.toggleIndicator, isShowing && styles.toggleIndicatorActive]} />
                        </TouchableOpacity>

                        {btn === 'joystick' && isShowing && (
                          <View style={{ marginTop: 6, padding: 6, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, gap: 4 }}>
                            <RoomSettingInput
                              label="Dead Zone"
                              value={controls?.joystick?.dead_zone ?? 10}
                              onChange={(v) => {
                                if (!currentRoom) return;
                                const controls = currentRoom.settings?.showControls;
                                const newControls = { ...controls };
                                const defaultJoystick = { enabled: true, dead_zone: 10, stick_range: 50, output_mode: 'vector' as const, persistence: false };
                                newControls.joystick = { ...(controls?.joystick || defaultJoystick), dead_zone: Math.max(0, v) };
                                updateRoom(currentRoom.id, { settings: { ...currentRoom.settings, showControls: newControls } });
                              }}
                            />
                            <RoomSettingInput
                              label="Stick Range"
                              value={controls?.joystick?.stick_range ?? 50}
                              onChange={(v) => {
                                if (!currentRoom) return;
                                const controls = currentRoom.settings?.showControls;
                                const newControls = { ...controls };
                                const defaultJoystick = { enabled: true, dead_zone: 10, stick_range: 50, output_mode: 'vector' as const, persistence: false };
                                newControls.joystick = { ...(controls?.joystick || defaultJoystick), stick_range: Math.max(10, v) };
                                updateRoom(currentRoom.id, { settings: { ...currentRoom.settings, showControls: newControls } });
                              }}
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>Output Mode</Text>
                              <View style={{ flexDirection: 'row', gap: 4 }}>
                                {['vector', 'angle', 'magnitude'].map(mode => (
                                  <TouchableOpacity
                                    key={mode}
                                    style={{ padding: 4, paddingHorizontal: 8, backgroundColor: controls?.joystick?.output_mode === mode ? theme.colors.primary : '#222', borderRadius: 4 }}
                                    onPress={() => {
                                      if (!currentRoom) return;
                                      const controls = currentRoom.settings?.showControls;
                                      const newControls = { ...controls };
                                      const defaultJoystick = { enabled: true, dead_zone: 10, stick_range: 50, output_mode: 'vector' as const, persistence: false };
                                      newControls.joystick = { ...(controls?.joystick || defaultJoystick), output_mode: mode as any };
                                      updateRoom(currentRoom.id, { settings: { ...currentRoom.settings, showControls: newControls } });
                                    }}
                                  >
                                    <Text style={{ fontSize: 9, color: controls?.joystick?.output_mode === mode ? '#000' : '#888' }}>{mode.toUpperCase()}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                            <TouchableOpacity
                              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}
                              onPress={() => {
                                if (!currentRoom) return;
                                const controls = currentRoom.settings?.showControls;
                                const newControls = { ...controls };
                                const defaultJoystick = { enabled: true, dead_zone: 10, stick_range: 50, output_mode: 'vector' as const, persistence: false };
                                newControls.joystick = { ...(controls?.joystick || defaultJoystick), persistence: !controls?.joystick?.persistence };
                                updateRoom(currentRoom.id, { settings: { ...currentRoom.settings, showControls: newControls } });
                              }}
                            >
                              <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>Persistence</Text>
                              <Switch
                                value={controls?.joystick?.persistence || false}
                                onValueChange={(val) => {
                                  if (!currentRoom) return;
                                  const controls = currentRoom.settings?.showControls;
                                  const newControls = { ...controls };
                                  const defaultJoystick = { enabled: true, dead_zone: 10, stick_range: 50, output_mode: 'vector' as const, persistence: false };
                                  newControls.joystick = { ...(controls?.joystick || defaultJoystick), persistence: val };
                                  updateRoom(currentRoom.id, { settings: { ...currentRoom.settings, showControls: newControls } });
                                }}
                                trackColor={{ false: '#333', true: theme.colors.primary + '80' }}
                                thumbColor={(controls?.joystick?.persistence) ? theme.colors.primary : '#666'}
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
      <CameraTargetPicker
        visible={cameraTargetPickerVisible}
        onClose={() => setCameraTargetPickerVisible(false)}
        currentProject={currentProject}
        currentRoom={currentRoom}
        updateRoom={updateRoom}
      />
      <ColorPickerModal
        visible={colorPickerVisible}
        onClose={() => setColorPickerVisible(false)}
        color={currentRoom?.settings?.backgroundColor || '#2E333D'}
        onColorChange={(c: string) => currentRoom && updateRoom(currentRoom.id, {
          settings: { ...(currentRoom.settings || {}), backgroundColor: c }
        })}
      />
    </View>
  );
}

const CameraTargetPicker = ({ visible, onClose, currentProject, currentRoom, updateRoom }: any) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.pickerContent, { maxHeight: '100%', width: '100%' }]}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Follow Target</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={theme.colors.textMuted} size={18} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.pickerGrid}>
            <TouchableOpacity
              style={[
                styles.pickerGridItem,
                !currentRoom?.settings?.camera?.targetObjectId && styles.pickerGridItemActive
              ]}
              onPress={() => {
                const cam = currentRoom.settings?.camera || { targetObjectId: null, smoothing: 0.1, zoom: 1, enabled: true };
                updateRoom(currentRoom.id, {
                  settings: { ...currentRoom.settings, camera: { ...cam, targetObjectId: null } }
                });
                onClose();
              }}
            >
              <View style={styles.pickerPreviewBox}>
                <X color={theme.colors.textMuted} size={24} />
              </View>
              <Text style={[styles.pickerGridLabel, !currentRoom?.settings?.camera?.targetObjectId && styles.pickerGridLabelActive]} numberOfLines={1}>None</Text>
            </TouchableOpacity>

            {(currentProject?.objects || []).map((obj: any) => {
              const sprite = currentProject?.sprites.find((s: any) => s.id === obj.appearance?.spriteId);
              return (
                <TouchableOpacity
                  key={obj.id}
                  style={[
                    styles.pickerGridItem,
                    currentRoom?.settings?.camera?.targetObjectId === obj.id && styles.pickerGridItemActive
                  ]}
                  onPress={() => {
                    const cam = currentRoom.settings?.camera || { targetObjectId: null, smoothing: 0.1, zoom: 1, enabled: true };
                    updateRoom(currentRoom.id, {
                      settings: { ...currentRoom.settings, camera: { ...cam, targetObjectId: obj.id } }
                    });
                    onClose();
                  }}
                >
                  <View style={styles.pickerPreviewBox}>
                    <PixelSprite
                      sprite={sprite}
                      size={40}
                      animationState={obj.appearance?.animationState}
                    />
                  </View>
                  <Text style={[styles.pickerGridLabel, currentRoom?.settings?.camera?.targetObjectId === obj.id && styles.pickerGridLabelActive]} numberOfLines={1}>
                    {obj.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const ColorPickerModal = ({ visible, onClose, color, onColorChange }: any) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.pickerContent, { width: 420, padding: 24, alignItems: 'center' }]}>
          <View style={[styles.pickerHeader, { width: '100%', marginBottom: 20, borderBottomWidth: 0 }]}>
            <Text style={styles.pickerTitle}>Background Color</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={theme.colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <ColorPickerWrapper
            color={color}
            onColorChange={onColorChange}
          />

          <View style={{
            marginTop: 20,
            width: '100%',
            height: 44,
            backgroundColor: color,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 12
          }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', opacity: 0.8 }} />
            <Text style={{
              color: '#fff',
              fontFamily: 'Pixel',
              fontSize: 14,
              letterSpacing: 1
            }}>
              {color.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: theme.colors.primary,
              paddingVertical: 14,
              borderRadius: 2,
              width: '100%',
              alignItems: 'center',
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4
            }}
            onPress={onClose}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Apply Selection</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};


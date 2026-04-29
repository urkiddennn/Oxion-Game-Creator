import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, DeviceEventEmitter, Alert, useWindowDimensions } from 'react-native';
import { theme } from '../../theme';
import {
  Grid3X3, ChevronLeft, ChevronRight, Box, Settings,
  MousePointer2, Copy, X, ZoomIn, ZoomOut, HelpCircle, Layout,
  ArrowRight, ArrowDown, Layers, ChevronUp, ChevronDown,
  ArrowUpToLine, ArrowDownToLine, Eye, EyeOff, Lock, Unlock, Plus, Trash2, Edit3,
  MousePointer, Move
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { useProjectStore } from '../../store/useProjectStore';
import { Svg, Rect, Path } from 'react-native-svg';
import { styles } from './RoomsScreen.styles';

const PixelSprite = React.memo(({ sprite, size, originalSize = false }: { sprite: any, size: number, originalSize?: boolean }) => {
  if (!sprite) return <View style={{ width: size, height: size, backgroundColor: '#4ade80', borderRadius: 4, borderWidth: 1, borderColor: '#22c55e' }} />;

  if (sprite.type === 'imported') {
    const width = originalSize ? (sprite.width || size) : size;
    const height = originalSize ? (sprite.height || size) : size;
    return <Image source={{ uri: sprite.uri }} style={{ width, height, resizeMode: 'contain' }} />;
  }

  const rows = sprite.pixels?.length || 1;
  const cols = sprite.pixels?.[0]?.length || 1;
  const pixelSize = size / Math.max(rows, cols);

  // Path pooling optimization
  const colorPaths: { [key: string]: string } = {};

  sprite.pixels?.forEach((row: string[], r: number) => {
    row.forEach((color: string, c: number) => {
      if (color === 'transparent' || !color) return;
      if (!colorPaths[color]) colorPaths[color] = '';

      const x = c * pixelSize;
      const y = r * pixelSize;
      colorPaths[color] += `M${x},${y}h${pixelSize}v${pixelSize}h-${pixelSize}z `;
    });
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Object.entries(colorPaths).map(([color, pathData]) => (
        <Path key={color} d={pathData} fill={color} />
      ))}
    </Svg>
  );
});

const DraggableInstance = ({ inst, obj, scale, gridSize, onDragEnd, sprite, activeTool, onToolAction, isPlacing, isSelected, onSelect }: any) => {
  const translateX = useSharedValue(inst.x);
  const translateY = useSharedValue(inst.y);
  const width = useSharedValue(inst.width || sprite?.width || gridSize);
  const height = useSharedValue(inst.height || sprite?.height || gridSize);

  // Sync shared values if inst prop changes
  React.useEffect(() => {
    translateX.value = inst.x;
    translateY.value = inst.y;
    width.value = inst.width || sprite?.width || gridSize;
    height.value = inst.height || sprite?.height || gridSize;
  }, [inst.x, inst.y, inst.width, inst.height, sprite?.width, sprite?.height]);

  const dragGesture = Gesture.Pan()
    .enabled(activeTool === 'move')
    .onStart(() => {
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      const rawX = inst.x + (e.translationX / scale.value);
      const rawY = inst.y + (e.translationY / scale.value);
      translateX.value = Math.round(rawX / gridSize) * gridSize;
      translateY.value = Math.round(rawY / gridSize) * gridSize;
    })
    .onEnd(() => {
      runOnJS(onDragEnd)(inst.id, translateX.value, translateY.value);
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (activeTool === 'erase' || activeTool === 'duplicate') {
        runOnJS(onToolAction)(activeTool, inst);
      } else {
        runOnJS(onSelect)();
      }
    });

  const composedGesture = Gesture.Simultaneous(dragGesture, tapGesture);

  const instanceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
    width: width.value,
    height: height.value,
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
        ) : (
          <PixelSprite sprite={sprite} size={gridSize} originalSize={true} />
        )}
        
        {isSelected && (
          <View style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000, overflow: 'visible' }}>
            {/* Y Axis (Red - pointing up) */}
            <View style={{
              position: 'absolute',
              bottom: '50%',
              left: '50%',
              width: 2,
              height: Math.max(height.value * 0.6, 60),
              backgroundColor: '#ff4d4d',
              marginLeft: -1,
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
              width: Math.max(width.value * 0.6, 60),
              height: 2,
              backgroundColor: '#4d94ff',
              marginTop: -1,
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
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const RoomSettingInput = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    if (Number(localValue) !== value) {
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

export default function RoomsScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { activeProject: currentProject, updateRoom, addInstanceToRoom, updateInstancePosition, updateInstanceSize, removeInstanceFromRoom, reorderInstance, addRoom, addLayer, removeLayer, updateLayer, reorderLayer, activeRoomId, setActiveRoomId } = useProjectStore();
  const [showGrid, setShowGrid] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'move' | 'erase' | 'duplicate'>('select');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!activeRoomId && currentProject?.rooms?.length) {
      setActiveRoomId(currentProject.rooms[0].id);
    }
  }, [currentProject?.rooms, activeRoomId]);

  const currentRoom = useMemo(() =>
    (currentProject?.rooms || []).find((r: any) => r.id === activeRoomId) || (currentProject?.rooms || [])[0],
    [currentProject, activeRoomId]);

  useEffect(() => {
    if (currentRoom && currentRoom.layers?.length) {
      // If activeLayerId is null or doesn't exist in current room, pick the first one
      if (!activeLayerId || !currentRoom.layers.find(l => l.id === activeLayerId)) {
        setActiveLayerId(currentRoom.layers[0].id);
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
  const GRID_SIZE = 32;

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
    .enabled(activeTool === 'select')
    .onUpdate((e) => {
      offsetX.value = savedOffsetX.value + e.translationX;
      offsetY.value = savedOffsetY.value + e.translationY;
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    });

  const handlePlaceObject = (x: number, y: number) => {
    if (!selectedObjectId || !currentRoom) return;

    // Hit detection: Don't place a new object if we clicked on an existing one
    const hitInstance = (currentRoom.instances || []).find(inst => {
      const obj = (currentProject?.objects || []).find(o => o.id === inst.objectId);
      const w = inst.width || GRID_SIZE;
      const h = inst.height || GRID_SIZE;
      return x >= inst.x && x <= inst.x + w && y >= inst.y && y <= inst.y + h;
    });

    if (hitInstance) return;

    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    addInstanceToRoom(currentRoom.id, {
      id: Math.random().toString(36).substr(2, 9),
      objectId: selectedObjectId,
      x: snappedX,
      y: snappedY,
      layerId: activeLayerId || (currentRoom.layers?.[0]?.id || 'default')
    });
  };

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      if (selectedObjectId) {
        // Correct for camera offset, scale, and room centering relative to the actual viewport
        const viewW = viewport.width || screenWidth;
        const viewH = viewport.height || screenHeight;
        const realX = (roomWidth / 2) + (e.x - (viewW / 2) - offsetX.value) / scale.value;
        const realY = (roomHeight / 2) + (e.y - (viewH / 2) - offsetY.value) / scale.value;
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
        style={styles.mainEditorArea}
        onLayout={(e) => setViewport(e.nativeEvent.layout)}
      >
        <GestureDetector gesture={composedGesture}>
          <View style={styles.gestureOverlay}>
            <Animated.View style={[styles.room, animatedStyle, { width: roomWidth, height: roomHeight }]}>
            {/* Render Instances Grouped by Layer */}
            {(currentRoom?.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }]).map((layer, idx, allLayers) => {
              if (!layer.visible) return null;

              return (currentRoom?.instances || [])
                .filter(inst => (inst.layerId || allLayers[0].id) === layer.id)
                .map((inst) => {
                  const obj = (currentProject?.objects || []).find(o => o.id === inst.objectId);
                  const sprite = (currentProject?.sprites || []).find(s => s.id === obj?.appearance.spriteId);

                  return (
                    <DraggableInstance
                      key={inst.id}
                      inst={inst}
                      obj={obj}
                      scale={scale}
                      gridSize={GRID_SIZE}
                      onDragEnd={handleDragEnd}
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
                });
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
              backgroundColor: 'rgba(46, 51, 61, 0.4)',
              pointerEvents: 'none',
              zIndex: -1
            }} />


            {/* Infinite Grid Layer */}
            {showGrid && (
              <View style={{ position: 'absolute', pointerEvents: 'none', zIndex: -2 }}>
                {Array.from({ length: 120 }).map((_, i) => (
                  <View key={`h-${i}`} pointerEvents="none" style={[styles.gridLineH, { 
                    top: (i - 60) * GRID_SIZE, 
                    width: 4000, 
                    left: -2000,
                    opacity: (i - 60) * GRID_SIZE >= 0 && (i - 60) * GRID_SIZE <= roomHeight ? 0.3 : 0.1
                  }]} />
                ))}
                {Array.from({ length: 120 }).map((_, i) => (
                  <View key={`v-${i}`} pointerEvents="none" style={[styles.gridLineV, { 
                    left: (i - 60) * GRID_SIZE, 
                    height: 4000, 
                    top: -2000,
                    opacity: (i - 60) * GRID_SIZE >= 0 && (i - 60) * GRID_SIZE <= roomWidth ? 0.3 : 0.1
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
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                        ) : (
                          <PixelSprite sprite={(currentProject?.sprites || []).find(s => s.id === obj.appearance.spriteId)} size={32} />
                        )}
                      </View>
                      <Text style={styles.objectName} numberOfLines={1}>{obj.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.sidebarSection}>
              <View style={styles.sectionHeader}>
                <Layers color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Layers</Text>
                <TouchableOpacity onPress={() => currentRoom && addLayer(currentRoom.id)} style={{ marginLeft: 'auto' }}>
                  <Plus color={theme.colors.primary} size={16} />
                </TouchableOpacity>
              </View>

              {(!currentRoom || !currentRoom.layers || currentRoom.layers.length === 0) ? (
                <View style={styles.emptySidebar}>
                  <Text style={styles.emptySidebarText}>No layers defined.</Text>
                </View>
              ) : (
                <View style={styles.layersList}>
                  {/* Render in reverse order (Front at top) */}
                  {[...(currentRoom.layers || [])].reverse().map((layer, revIdx) => {
                    const idx = currentRoom.layers.length - 1 - revIdx;
                    const isActive = activeLayerId === layer.id;

                    return (
                      <View
                        key={layer.id}
                        style={[
                          styles.layerItem, 
                          isActive && { borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: 'rgba(0, 209, 255, 0.05)' }
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
                              if (selectedInstanceId) {
                                // If an object is selected, move it to this layer
                                updateRoom(currentRoom.id, {
                                  instances: currentRoom.instances.map(i => 
                                    i.id === selectedInstanceId ? { ...i, layerId: layer.id } : i
                                  )
                                });
                              }
                              setActiveLayerId(layer.id);
                            }
                          }}
                          onLongPress={() => {
                            if (currentRoom.layers.length <= 1) {
                              Alert.alert('Cannot Delete', 'A room must have at least one layer.');
                              return;
                            }
                            Alert.alert(
                              'Delete Layer',
                              `Are you sure you want to delete "${layer.name}"? ALL objects on this layer will also be deleted.`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => removeLayer(currentRoom.id, layer.id) }
                              ]
                            );
                          }}
                        >
                          <Text style={[styles.layerName, isActive && { fontWeight: 'bold', color: theme.colors.primary }]} numberOfLines={1}>
                            {layer.name}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.layerActions}>
                          <TouchableOpacity onPress={() => updateLayer(currentRoom.id, layer.id, { visible: !layer.visible })}>
                            {layer.visible ? <Eye color={theme.colors.text} size={14} /> : <EyeOff color={theme.colors.textMuted} size={14} />}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => updateLayer(currentRoom.id, layer.id, { locked: !layer.locked })}>
                            {layer.locked ? <Lock color={theme.colors.primary} size={14} /> : <Unlock color={theme.colors.textMuted} size={14} />}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {selectedInstanceId && currentRoom && (
              <View style={styles.sidebarSection}>
                <View style={styles.sectionHeader}>
                  <MousePointer color={theme.colors.primary} size={16} />
                  <Text style={styles.sectionTitle}>Selection</Text>
                  <TouchableOpacity onPress={() => setSelectedInstanceId(null)} style={{ marginLeft: 'auto' }}>
                    <X color={theme.colors.textMuted} size={14} />
                  </TouchableOpacity>
                </View>

                {(() => {
                  const inst = currentRoom.instances.find(i => i.id === selectedInstanceId);
                  if (!inst) return null;
                  const obj = currentProject?.objects.find(o => o.id === inst.objectId);
                  return (
                    <View style={styles.settingsList}>
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {obj?.behavior === 'text' ? (
                            <Layout size={18} color={theme.colors.primary} />
                          ) : (
                            <PixelSprite sprite={currentProject?.sprites.find(s => s.id === obj?.appearance.spriteId)} size={24} />
                          )}
                          <Text style={{ color: '#fff', marginLeft: 8, fontSize: 14 }}>{obj?.name || 'Unknown Object'}</Text>
                        </View>
                        
                        {obj?.behavior === 'text' && (
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8, borderLeftWidth: 2, borderLeftColor: theme.colors.primary }}>
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
                    </View>
                  );
                })()}
              </View>
            )}

            <View style={styles.sidebarSection}>
              <View style={styles.sectionHeader}>
                <Settings color={theme.colors.primary} size={16} />
                <Text style={styles.sectionTitle}>Room Settings</Text>
              </View>
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
              </View>

              <View style={{ marginTop: 24 }}>
                <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 12 }]}>Built-in Controls</Text>
                <View style={{ gap: 8 }}>
                  {['left', 'right', 'jump', 'shoot'].map((btn) => {
                    const isShowing = (currentRoom?.settings?.showControls as any)?.[btn];
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={[styles.toggleRow, isShowing && styles.toggleRowActive]}
                        onPress={() => {
                          if (!currentRoom) return;
                          const newControls = {
                            ...(currentRoom.settings?.showControls || { left: true, right: true, jump: true, shoot: true }),
                            [btn]: !isShowing
                          };
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
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}


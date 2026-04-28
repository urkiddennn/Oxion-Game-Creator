import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, DeviceEventEmitter } from 'react-native';
import { theme } from '../../theme';
import {
  Grid3X3, ChevronLeft, ChevronRight, Box, Settings,
  MousePointer2, Copy, X, ZoomIn, ZoomOut, HelpCircle, Layout
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

const PixelSprite = React.memo(({ sprite, size }: { sprite: any, size: number }) => {
  if (!sprite) return <View style={{ width: size, height: size, backgroundColor: '#4ade80', borderRadius: 4, borderWidth: 1, borderColor: '#22c55e' }} />;

  if (sprite.type === 'imported') {
    return <Image source={{ uri: sprite.uri }} style={{ width: size, height: size, resizeMode: 'contain' }} />;
  }

  const pixelSize = size / 16;

  // Path pooling optimization: Group pixels by color and draw them in one go
  const colorPaths: { [key: string]: string } = {};

  sprite.pixels?.forEach((row: string[], r: number) => {
    row.forEach((color: string, c: number) => {
      if (color === 'transparent' || !color) return;
      if (!colorPaths[color]) colorPaths[color] = '';

      const x = c * pixelSize;
      const y = r * pixelSize;
      // Draw a square path: move to (x,y), draw relative line to (x+size,y), (x+size,y+size), (x,y+size)
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

const DraggableInstance = ({ inst, obj, scale, gridSize, onDragEnd, sprite }: any) => {
  const translateX = useSharedValue(inst.x);
  const translateY = useSharedValue(inst.y);

  // Sync shared values if inst prop changes
  React.useEffect(() => {
    translateX.value = inst.x;
    translateY.value = inst.y;
  }, [inst.x, inst.y]);

  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      const rawX = inst.x + (e.translationX / scale.value);
      const rawY = inst.y + (e.translationY / scale.value);
      translateX.value = Math.round(rawX / gridSize) * gridSize;
      translateY.value = Math.round(rawY / gridSize) * gridSize;
    })
    .onEnd(() => {
      runOnJS(onDragEnd)(inst.id, translateX.value, translateY.value);
    });

  const instanceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        style={[
          styles.instance,
          instanceStyle,
          {
            width: gridSize,
            height: gridSize,
            position: 'absolute',
            zIndex: 100,
            borderWidth: 1,
            borderColor: 'rgba(255,0,0,0.3)' // Helpful red border to see where it is
          }
        ]}
      >
        <PixelSprite sprite={sprite} size={gridSize} />
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
  const { activeProject: currentProject, updateRoom, addInstanceToRoom, updateInstancePosition, addRoom } = useProjectStore();
  const [showGrid, setShowGrid] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRoomId && currentProject?.rooms?.length) {
      setActiveRoomId(currentProject.rooms[0].id);
    }
  }, [currentProject?.rooms, activeRoomId]);

  const currentRoom = useMemo(() =>
    (currentProject?.rooms || []).find((r: any) => r.id === activeRoomId) || (currentProject?.rooms || [])[0],
    [currentProject, activeRoomId]);

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
        gravity: 9.8
      }
    };
    addRoom(newRoom);
    setActiveRoomId(newRoom.id);
    historyRef.current = [];
    historyIndexRef.current = -1;
  };

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const GRID_SIZE = 32;

  const handleDragEnd = (instId: string, x: number, y: number) => {
    if (currentRoom) {
      updateInstancePosition(currentRoom.id, instId, x, y);
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
        savedScale.value = 0.5;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      }
    });

  const handlePlaceObject = (x: number, y: number) => {
    if (!selectedObjectId || !currentRoom) return;
    const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE;
    addInstanceToRoom(currentRoom.id, {
      id: Math.random().toString(36).substr(2, 9),
      objectId: selectedObjectId,
      x: snappedX,
      y: snappedY
    });
  };

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      if (selectedObjectId) {
        runOnJS(handlePlaceObject)(e.x, e.y);
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
          style={[styles.toolButton, !selectedObjectId && styles.toolActive]}
          onPress={() => setSelectedObjectId(null)}
        >
          <MousePointer2 color={!selectedObjectId ? theme.colors.primary : theme.colors.text} size={16} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Copy color={theme.colors.text} size={16} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <X color={theme.colors.text} size={16} />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainEditorArea}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.room, animatedStyle, { width: roomWidth, height: roomHeight }]}>
            {showGrid && (
              <>
                {Array.from({ length: Math.ceil(roomHeight / GRID_SIZE) + 1 }).map((_, i) => (
                  <View key={`h-${i}`} style={[styles.gridLineH, { top: i * GRID_SIZE }]} />
                ))}
                {Array.from({ length: Math.ceil(roomWidth / GRID_SIZE) + 1 }).map((_, i) => (
                  <View key={`v-${i}`} style={[styles.gridLineV, { left: i * GRID_SIZE }]} />
                ))}
              </>
            )}

            {/* Placed Instances */}
            {currentRoom?.instances.map((inst) => {
              // Directly lookup from the activeProject to ensure reactivity
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
                  sprite={sprite}
                />
              );
            })}
          </Animated.View>
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
                        <PixelSprite sprite={(currentProject?.sprites || []).find(s => s.id === obj.appearance.spriteId)} size={40} />
                      </View>
                      <Text style={styles.objectName} numberOfLines={1}>{obj.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  floatingLeftTools: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: '#16191E',
    padding: 6,
    borderRadius: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 100,
  },
  toolButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: '#1E2228',
  },
  toolActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  mainEditorArea: {
    flex: 1,
    backgroundColor: '#1E2228',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  room: {
    backgroundColor: '#2E333D',
    borderWidth: 1,
    borderColor: '#3F4551',
    // Removed overflow: hidden to prevent objects from being clipped
  },
  instance: {
    position: 'absolute',
    left: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 209, 255, 0.1)', // Subtle blue glow to see the area
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#16191E',
    padding: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 50,
  },
  zoomButton: {
    padding: 6,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 36,
    height: 36,
    backgroundColor: '#16191E',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 100,
  },
  toggleButtonOff: {
    opacity: 0.6,
  },
  sidebarToggle: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -16,
    width: 20,
    height: 32,
    backgroundColor: '#16191E',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: theme.colors.border,
    zIndex: 110,
  },
  sidebarToggleOpen: {
    right: 180,
  },
  sidebar: {
    width: 180,
    backgroundColor: '#16191E',
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    paddingTop: 8,
    zIndex: 105,
  },
  sidebarSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roomTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E2228',
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roomTabActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  objectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  objectItem: {
    width: '47%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E2228',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  objectItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  objectPreview: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  objectName: {
    color: theme.colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },
  emptySidebar: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptySidebarText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  settingsList: {
    gap: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  settingInput: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#2E333D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 50,
    textAlign: 'right',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E2228',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleRowActive: {
    borderColor: theme.colors.primary + '40',
    backgroundColor: theme.colors.primary + '05',
  },
  toggleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: theme.colors.text,
  },
  toggleIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3F4551',
  },
  toggleIndicatorActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

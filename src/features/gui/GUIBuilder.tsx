import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, DeviceEventEmitter, Alert, useWindowDimensions, TextInput } from 'react-native';
import { theme } from '../../theme';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Trash2,
  Layers, Move, Layout, Eye, EyeOff, Box, Settings, ArrowRight,
  Maximize2, Minimize2, MousePointer,
  X
} from 'lucide-react-native';
import { useProjectStore, GUINode, GameObject } from '../../store/useProjectStore';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { PixelSprite } from '../../components/PixelSprite';
import { MousePointer2, Hand } from 'lucide-react-native';

// --- Recursive Tree Component ---
const TreeItem = ({ node, level = 0, onSelect, isSelected, onToggleVisibility, onRemove, onMove, allObjects }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const obj = allObjects.find((o: any) => o.id === node.objectId);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.treeItem,
          isSelected && styles.treeItemActive,
          { paddingLeft: 12 + level * 16 }
        ]}
        onPress={() => onSelect(node)}
      >
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={{ width: 20 }}>
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} color="#666" /> : <ChevronRight size={14} color="#666" />
          ) : null}
        </TouchableOpacity>
        <Box size={14} color={isSelected ? theme.colors.primary : "#888"} style={{ marginRight: 6 }} />
        <Text style={[styles.treeItemText, isSelected && { color: theme.colors.primary, fontWeight: 'bold' }]} numberOfLines={1}>
          {node.name}
        </Text>

        <View style={styles.treeItemActions}>
          <TouchableOpacity onPress={() => onToggleVisibility(node)}>
            {node.visible ? <Eye size={12} color="#888" /> : <EyeOff size={12} color="#444" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(node)}>
            <Trash2 size={12} color="#888" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {isExpanded && hasChildren && (
        <View>
          {node.children.map((child: GUINode) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              isSelected={isSelected && isSelected.id === child.id}
              onToggleVisibility={onToggleVisibility}
              onRemove={onRemove}
              onMove={onMove}
              allObjects={allObjects}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// --- Main Builder Component ---
export default function GUIBuilder({ route, navigation }: any) {
  const { guiObjectId } = route.params;
  const { activeProject, updateGUIHierarchy, streamedSprites } = useProjectStore();
  const guiObject = useProjectStore(state => state.activeProject?.objects.find(o => o.id === guiObjectId));
  const allObjects = activeProject?.objects || [];
  const allSprites = useMemo(() => [
    ...(activeProject?.sprites || []),
    ...Array.from(streamedSprites?.values() || [])
  ], [activeProject?.sprites, streamedSprites]);

  const [selectedNode, setSelectedNode] = useState<GUINode | null>(null);
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [tool, setTool] = useState<'select' | 'hand'>('select');
  
  const scale = useSharedValue(0.8);
  const savedScale = useSharedValue(0.8);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Dragging state
  const dragInfo = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, nodeId: '' });

  const handleDragStart = (node: GUINode, pageX: number, pageY: number) => {
    if (tool !== 'select') return;
    dragInfo.current = {
      startX: pageX,
      startY: pageY,
      initialX: node.x,
      initialY: node.y,
      nodeId: node.id
    };
    setSelectedNode(node);
  };

  const GRID_SIZE = 40;

  const handleDragMove = (pageX: number, pageY: number) => {
    const { startX, startY, initialX, initialY, nodeId } = dragInfo.current;
    if (!nodeId || tool !== 'select') return;

    const dx = (pageX - startX) / scale.value;
    const dy = (pageY - startY) / scale.value;

    const targetX = initialX + dx;
    const targetY = initialY + dy;

    handleUpdateNode(nodeId, { 
      x: Math.round(targetX / GRID_SIZE) * GRID_SIZE, 
      y: Math.round(targetY / GRID_SIZE) * GRID_SIZE 
    });
  };

  const handleDragEnd = () => {
    dragInfo.current.nodeId = '';
  };

  // Auto-fit zoom on mount
  useEffect(() => {
    const horizontalZoom = (screenWidth - (showHierarchy ? 240 : 80) - (selectedNode ? 240 : 80)) / 800;
    const verticalZoom = (screenHeight - 200) / 600;
    const targetZoom = Math.min(horizontalZoom, verticalZoom, 0.8);
    scale.value = targetZoom;
    savedScale.value = targetZoom;
  }, [screenWidth, screenHeight, showHierarchy, !!selectedNode]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (tool === 'hand') {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      if (tool === 'hand') {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.1, Math.min(5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  const hierarchy = useMemo(() => guiObject?.gui_hierarchy?.root || [], [guiObject]);

  const findAndReplaceNode = (nodes: GUINode[], targetId: string, updates: Partial<GUINode>): GUINode[] => {
    return nodes.map(node => {
      if (node.id === targetId) return { ...node, ...updates };
      if (node.children) return { ...node, children: findAndReplaceNode(node.children, targetId, updates) };
      return node;
    });
  };

  const removeNode = (nodes: GUINode[], targetId: string): GUINode[] => {
    return nodes.filter(node => node.id !== targetId).map(node => ({
      ...node,
      children: removeNode(node.children || [], targetId)
    }));
  };

  const handleUpdateNode = (id: string, updates: Partial<GUINode>) => {
    const newRoot = findAndReplaceNode(hierarchy, id, updates);
    updateGUIHierarchy(guiObjectId, newRoot);
    if (selectedNode?.id === id) {
      setSelectedNode({ ...selectedNode, ...updates });
    }
  };

  const handleAddNode = (parent: GUINode | null = null) => {
    const newNode: GUINode = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Element',
      objectId: allObjects[0]?.id || '',
      x: 0,
      y: 0,
      visible: true,
      children: []
    };

    if (!parent) {
      updateGUIHierarchy(guiObjectId, [...hierarchy, newNode]);
    } else {
      const newRoot = findAndReplaceNode(hierarchy, parent.id, {
        children: [...(parent.children || []), newNode]
      });
      updateGUIHierarchy(guiObjectId, newRoot);
    }
  };

  const handleRemoveNode = (node: GUINode) => {
    Alert.alert('Delete Element', `Remove ${node.name} and all its children?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          updateGUIHierarchy(guiObjectId, removeNode(hierarchy, node.id));
          if (selectedNode?.id === node.id) setSelectedNode(null);
        }
      }
    ]);
  };

  const renderCanvasNode = (node: GUINode, parentX = 0, parentY = 0) => {
    const obj = allObjects.find(o => o.id === node.objectId);
    const isSelected = selectedNode?.id === node.id;
    const width = node.width || obj?.width || 32;
    const height = node.height || obj?.height || 32;

    if (!node.visible) return null;

    return (
      <View 
        key={node.id} 
        style={{ position: 'absolute', left: node.x, top: node.y, zIndex: isSelected ? 100 : 1 }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => handleDragStart(node, e.nativeEvent.pageX, e.nativeEvent.pageY)}
        onResponderMove={(e) => handleDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
        onResponderRelease={() => {
          handleDragEnd();
          // Selection logic: if we didn't move much, select it
          setSelectedNode(node);
        }}
      >
        <View
          style={[
            styles.canvasElement,
            isSelected && styles.canvasElementActive,
            { width, height }
          ]}
        >
          {obj?.behavior === 'progress_bar' && (
            <View style={{ width, height, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#444' }}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '70%', backgroundColor: '#10B981' }} />
            </View>
          )}
          {obj?.behavior === 'sprite_repeater' && (
            <View style={{ width, height, flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 }}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 2 }} />
              ))}
            </View>
          )}
          {obj?.appearance?.spriteId && obj.behavior !== 'progress_bar' && obj.behavior !== 'sprite_repeater' && (
            <PixelSprite
              sprite={allSprites.find(s => s.id === obj.appearance.spriteId)}
              size={Math.max(width, height)}
            />
          )}
          {!obj?.appearance?.spriteId && obj?.behavior !== 'progress_bar' && obj?.behavior !== 'sprite_repeater' && (
            <View style={{ width, height, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#444', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 8 }}>{node.name}</Text>
            </View>
          )}
        </View>
        {node.children.map(child => renderCanvasNode(child, 0, 0))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{guiObject?.name || 'GUI Builder'}</Text>
            <Text style={styles.headerSubtitle}>Editing Hierarchical GUI</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setTool('select')}
            style={[styles.headerBtn, tool === 'select' && { backgroundColor: theme.colors.primary }]}
          >
            <MousePointer2 size={16} color={tool === 'select' ? "#000" : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTool('hand')}
            style={[styles.headerBtn, tool === 'hand' && { backgroundColor: theme.colors.primary }]}
          >
            <Hand size={16} color={tool === 'hand' ? "#000" : "#fff"} />
          </TouchableOpacity>
          <View style={styles.vDivider} />
          <TouchableOpacity
            onPress={() => setShowHierarchy(!showHierarchy)}
            style={[styles.headerBtn, showHierarchy && { backgroundColor: theme.colors.primary }]}
          >
            <Layers size={16} color={showHierarchy ? "#000" : "#fff"} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainArea}>
        {/* LEFT SIDEBAR: TREE */}
        {showHierarchy && (
          <View style={styles.leftSidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>HIERARCHY</Text>
              <TouchableOpacity onPress={() => handleAddNode()}><Plus size={16} color={theme.colors.primary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {hierarchy.map(node => (
                <TreeItem
                  key={node.id}
                  node={node}
                  allObjects={allObjects}
                  isSelected={selectedNode}
                  onSelect={setSelectedNode}
                  onToggleVisibility={(n: GUINode) => handleUpdateNode(n.id, { visible: !n.visible })}
                  onRemove={handleRemoveNode}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* CENTER: CANVAS */}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.canvasArea}>
            <Animated.View style={[styles.canvasWrapper, animatedCanvasStyle]}>
              <View style={[styles.screenBounds, { width: 800, height: 600, overflow: 'hidden' }]}>
                {/* Grid Background */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1 }}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <View key={`v-${i}`} style={{ position: 'absolute', left: i * 40, top: 0, bottom: 0, width: 1, backgroundColor: '#fff' }} />
                  ))}
                  {Array.from({ length: 15 }).map((_, i) => (
                    <View key={`h-${i}`} style={{ position: 'absolute', top: i * 40, left: 0, right: 0, height: 1, backgroundColor: '#fff' }} />
                  ))}
                </View>

                {hierarchy.length === 0 && (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#444', fontSize: 16 }}>Empty GUI Container</Text>
                    <Text style={{ color: '#333', fontSize: 12 }}>Add elements from the left sidebar</Text>
                  </View>
                )}
                {hierarchy.map(node => renderCanvasNode(node))}
              </View>
              <Text style={{ color: '#666', fontSize: 10, marginTop: 10 }}>
                Elements: {hierarchy.length}
              </Text>
            </Animated.View>

            <View style={styles.canvasOverlay}>
              <Text style={styles.canvasInfo}>800 x 600 (Screen Space)</Text>
            </View>
          </View>
        </GestureDetector>

        {/* RIGHT SIDEBAR: INSPECTOR */}
        {selectedNode && (
          <View style={styles.rightSidebar}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.sidebarTitle}>ELEMENT PROPERTIES</Text>
                <TouchableOpacity onPress={() => setSelectedNode(null)}>
                  <X size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.propRow}>
                <Text style={styles.propLabel}>Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputText}
                    value={selectedNode.name}
                    onChangeText={(val) => handleUpdateNode(selectedNode.id, { name: val })}
                    placeholder="Element Name"
                    placeholderTextColor="#444"
                  />
                </View>
              </View>

              <View style={styles.propRow}>
                <Text style={styles.propLabel}>Object</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {allObjects.map(obj => (
                    <TouchableOpacity
                      key={obj.id}
                      onPress={() => handleUpdateNode(selectedNode.id, { objectId: obj.id })}
                      style={[styles.objSelect, selectedNode.objectId === obj.id && styles.objSelectActive]}
                    >
                      <Text style={[styles.objSelectText, selectedNode.objectId === obj.id && { color: '#000' }]}>{obj.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.propRow}>
                <Text style={styles.propLabel}>Position (Relative)</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>X</Text>
                    <View style={styles.numInput}>
                      <TextInput
                        style={styles.numInputText}
                        value={selectedNode.x.toString()}
                        onChangeText={(val) => handleUpdateNode(selectedNode.id, { x: parseInt(val) || 0 })}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Y</Text>
                    <View style={styles.numInput}>
                      <TextInput
                        style={styles.numInputText}
                        value={selectedNode.y.toString()}
                        onChangeText={(val) => handleUpdateNode(selectedNode.id, { y: parseInt(val) || 0 })}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.propRow}>
                <Text style={styles.propLabel}>Size (Override)</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Width</Text>
                    <View style={styles.numInput}>
                      <TextInput
                        style={styles.numInputText}
                        value={(selectedNode.width || 0).toString()}
                        onChangeText={(val) => handleUpdateNode(selectedNode.id, { width: parseInt(val) || 0 })}
                        keyboardType="numeric"
                        placeholder="Auto"
                        placeholderTextColor="#444"
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Height</Text>
                    <View style={styles.numInput}>
                      <TextInput
                        style={styles.numInputText}
                        value={(selectedNode.height || 0).toString()}
                        onChangeText={(val) => handleUpdateNode(selectedNode.id, { height: parseInt(val) || 0 })}
                        keyboardType="numeric"
                        placeholder="Auto"
                        placeholderTextColor="#444"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.propRow}>
                <Text style={styles.propLabel}>Hierarchy</Text>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleAddNode(selectedNode)}
                >
                  <Plus size={14} color="#000" />
                  <Text style={styles.actionBtnText}>ADD CHILD</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C10' },
  header: {
    height: 50,
    backgroundColor: '#16191E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  headerSubtitle: { color: '#666', fontSize: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2E333D', borderRadius: 2 },
  vDivider: { width: 1, height: 20, backgroundColor: '#333', marginHorizontal: 8 },
  zoomText: { color: '#888', fontSize: 12, width: 40, textAlign: 'center' },

  mainArea: { flex: 1, flexDirection: 'row' },

  leftSidebar: { width: 220, borderRightWidth: 1, borderRightColor: '#222', backgroundColor: '#111' },
  sidebarHeader: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#222' },
  sidebarTitle: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  treeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 8 },
  treeItemActive: { backgroundColor: 'rgba(0, 209, 255, 0.1)' },
  treeItemText: { flex: 1, color: '#BBB', fontSize: 12 },
  treeItemActions: { flexDirection: 'row', gap: 8, opacity: 0.5 },

  canvasArea: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  canvasWrapper: { width: 2000, height: 2000, justifyContent: 'center', alignItems: 'center' },
  screenBounds: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  canvasOverlay: { position: 'absolute', bottom: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 2 },
  canvasInfo: { color: '#666', fontSize: 10 },
  canvasElement: { borderWidth: 1, borderColor: 'transparent' },
  canvasElementActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(0, 209, 255, 0.1)' },

  rightSidebar: { width: 250, borderLeftWidth: 1, borderLeftColor: '#222', backgroundColor: '#111' },
  emptyInspector: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  emptyText: { color: '#444', fontSize: 12 },

  propRow: { marginBottom: 15 },
  propLabel: { color: '#888', fontSize: 11, marginBottom: 8 },
  inputWrapper: { backgroundColor: '#16191E', padding: 6, borderRadius: 2, borderWidth: 1, borderColor: '#333' },
  inputText: { color: '#FFF', fontSize: 12, padding: 0 },
  numInput: { backgroundColor: '#16191E', padding: 4, borderRadius: 2, borderWidth: 1, borderColor: '#333', alignItems: 'center', height: 28, justifyContent: 'center' },
  numInputText: { color: theme.colors.primary, fontSize: 12, fontWeight: 'bold', width: '100%', textAlign: 'center', padding: 0 },
  miniLabel: { color: '#444', fontSize: 9, marginBottom: 4 },

  objSelect: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#1E2228', borderRadius: 2, marginRight: 6, borderWidth: 1, borderColor: '#333' },
  objSelectActive: { backgroundColor: theme.colors.primary },
  objSelectText: { color: '#888', fontSize: 10 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, padding: 8, borderRadius: 2 },
  actionBtnText: { color: '#000', fontSize: 10, fontWeight: 'bold' }
});

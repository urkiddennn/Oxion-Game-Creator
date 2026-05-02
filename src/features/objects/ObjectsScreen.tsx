import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, TextInput, Switch, Image, Alert } from 'react-native';
import { useProjectStore, GameObject, Sprite } from '../../store/useProjectStore';
import { styles } from './ObjectsScreen.styles';
import { theme } from '../../theme';
import { Plus, ChevronRight, User, MousePointer2, Timer, Heart, Move, Bolt, Layout, HelpCircle, Square, Info, Palette, Settings, Image as ImageIcon, X, Share2, Trash2, Activity } from 'lucide-react-native';
import { PixelSprite } from '../../components/PixelSprite';
import ObjectModals from './components/ObjectModals';

const BEHAVIORS = [
  { id: 'player', label: 'Player', icon: User, color: '#00D1FF' },
  { id: 'solid', label: 'Solid', icon: Square, color: '#94A3B8' },
  { id: 'button', label: 'Button', icon: MousePointer2, color: '#FF00D1' },
  { id: 'timer', label: 'Timer', icon: Timer, color: '#FFD700' },
  { id: 'health', label: 'Health/Lives', icon: Heart, color: '#EF4444' },
  { id: 'moveable', label: 'Moveable', icon: Move, color: '#10B981' },
  { id: 'emitter', label: 'Particle Emitter', icon: Bolt, color: '#7000FF' },
  { id: 'popup', label: 'Pop-up Text', icon: Layout, color: '#94A3B8' },
  { id: 'text', label: 'Text Object', icon: Layout, color: '#FFFFFF' },
  { id: 'progress_bar', label: 'Progress Bar', icon: Activity, color: '#10B981' },
];



export default function ObjectsScreen() {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [spritePickerVisible, setSpritePickerVisible] = useState(false);
  const [animationPickerVisible, setAnimationPickerVisible] = useState(false);
  const [actionPickerVisible, setActionPickerVisible] = useState(false);
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [pickingForEngineState, setPickingForEngineState] = useState<string | null>(null);
  const [activeListenerIndex, setActiveListenerIndex] = useState<number | null>(null);
  const [activeSubIndex, setActiveSubIndex] = useState<number | null>(null);
  const [activePropertyIndex, setActivePropertyIndex] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const { activeProject: currentProject, addObject, updateObject } = useProjectStore();
  const selectedObject = (currentProject?.objects || []).find((o: any) => o.id === selectedObjectId) || null;

  const setSelectedObject = (obj: GameObject | null) => {
    setSelectedObjectId(obj ? obj.id : null);
  };

  const handleCreateObject = (behaviorId: string) => {
    const newObj: GameObject = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New ${behaviorId.charAt(0).toUpperCase() + behaviorId.slice(1)}`,
      type: 'Actor',
      behavior: behaviorId,
      health: {
        max: 100,
        current: 100,
      },
      animations: {
        idle: undefined,
        move: undefined,
        jump: undefined,
        hit: undefined,
        dead: undefined,
        melee: undefined,
        shoot: undefined,
      },
      appearance: {
        type: 'sprite',
        spriteId: null,
        animationState: undefined,
        animationSpeed: 100,
      },
      physics: {
        enabled: true,
        isStatic: behaviorId === 'solid' || behaviorId === 'progress_bar',
        applyGravity: behaviorId !== 'solid' && behaviorId !== 'bullet' && behaviorId !== 'progress_bar',
        friction: 0.1,
        restitution: 0.2,
        density: 0.001,
        jumpStrength: behaviorId === 'player' ? 10 : 0,
        moveSpeed: behaviorId === 'player' ? 5 : 0,
        ignoreCollision: false,
      },
      combat: {
        canShoot: behaviorId === 'player',
        maxBullets: 3,
        bulletObjectId: null,
        damage: 10,
        shootSpeed: 5,
        canShootInAir: true,
        canMelee: behaviorId === 'player',
        meleeDamage: 20,
        canMeleeInAir: true,
        explodes: false,
      },
      sounds: {},
      logic: {
        triggers: {},
        listeners: [],
      },
      variables: {
        local: {},
      },
      text: behaviorId === 'text' ? {
        content: 'Score: {score}',
        fontFamily: 'pixel',
        fontSize: 24,
        color: '#FFFFFF',
        textAlign: 'center',
      } : undefined,
      width: (behaviorId === 'progress_bar' || behaviorId === 'sprite_repeater') ? 150 : 32,
      height: (behaviorId === 'progress_bar' || behaviorId === 'sprite_repeater') ? 20 : 32,
      progress_bar: behaviorId === 'progress_bar' ? {
        minValue: 0,
        maxValue: 100,
        currentValue: 100,
        fillColor: '#10B981',
        backgroundColor: '#333333',
        borderColor: '#555555',
        borderWidth: 1,
        direction: 'horizontal',
        linkedVariable: ''
      } : undefined,
      sprite_repeater: behaviorId === 'sprite_repeater' ? {
        maxCount: 5,
        currentCount: 5,
        activeSpriteId: null,
        inactiveSpriteId: null,
        layout: 'horizontal',
        spacing: 4,
        iconSize: 24,
        linkedVariable: ''
      } : undefined,
    };
    addObject(newObj);
    setCreateModalVisible(false);
  };

  const openInspector = (obj: GameObject) => {
    setSelectedObject(obj);
    setInspectorVisible(true);
  };

  const renderSpritePreview = (spriteId: string | null, size: number = 32) => {
    const sprite = (currentProject?.sprites || []).find(s => s.id === spriteId);
    if (!sprite) return <View style={{ width: size, height: size, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', borderRadius: 4 }} />;

    if (sprite.type === 'imported') {
      return <PixelSprite sprite={sprite} size={size} />;
    }

    return (
      <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
        {sprite.pixels?.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((color, c) => (
              <View key={c} style={{ width: size / 16, height: size / 16, backgroundColor: color }} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={currentProject?.objects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={6}
        key={"grid-6"}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.objectCard}
            onPress={() => openInspector(item)}
            onLongPress={() => {
              Alert.alert(
                "Delete Object",
                `Delete "${item.name}"? This will also remove all instances of it from your rooms.`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => useProjectStore.getState().removeObject(item.id) }
                ]
              );
            }}
          >
            <View style={styles.objectInfo}>
              <Text style={styles.objectName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.objectBehavior} numberOfLines={1}>{item.behavior}</Text>
            </View>
            <View style={[styles.objectIcon, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
              {renderSpritePreview(item.appearance.spriteId, 32)}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={{ width: 48, height: 48, backgroundColor: theme.colors.surfaceElevated, borderRadius: 24, marginBottom: 10 }} />
            <Text style={styles.emptyText}>No objects yet. Tap the + button to create one.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Plus color={theme.colors.background} size={32} />
      </TouchableOpacity>

      {createModalVisible || inspectorVisible || spritePickerVisible || animationPickerVisible || actionPickerVisible || eventPickerVisible || propertyPickerVisible ? (
        <ObjectModals
          createModalVisible={createModalVisible}
          setCreateModalVisible={setCreateModalVisible}
          inspectorVisible={inspectorVisible}
          setInspectorVisible={setInspectorVisible}
          spritePickerVisible={spritePickerVisible}
          setSpritePickerVisible={setSpritePickerVisible}
          animationPickerVisible={animationPickerVisible}
          setAnimationPickerVisible={setAnimationPickerVisible}
          actionPickerVisible={actionPickerVisible}
          setActionPickerVisible={setActionPickerVisible}
          eventPickerVisible={eventPickerVisible}
          setEventPickerVisible={setEventPickerVisible}
          propertyPickerVisible={propertyPickerVisible}
          setPropertyPickerVisible={setPropertyPickerVisible}
          statePickerVisible={statePickerVisible}
          setStatePickerVisible={setStatePickerVisible}
          pickingForEngineState={pickingForEngineState}
          setPickingForEngineState={setPickingForEngineState}
          activeListenerIndex={activeListenerIndex}
          setActiveListenerIndex={setActiveListenerIndex}
          activeSubIndex={activeSubIndex}
          setActiveSubIndex={setActiveSubIndex}
          activePropertyIndex={activePropertyIndex}
          setActivePropertyIndex={setActivePropertyIndex}
          selectedObject={selectedObject}
          setSelectedObject={setSelectedObject}
          currentProject={currentProject}
          updateObject={updateObject}
          handleCreateObject={handleCreateObject}
          renderSpritePreview={renderSpritePreview}
        />
      ) : null}
    </View>
  );
}


import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, TextInput, Switch, Image } from 'react-native';
import { useProjectStore, GameObject, Sprite } from '../../store/useProjectStore';
import { styles } from './ObjectsScreen.styles';
import { theme } from '../../theme';
import { Plus, ChevronRight, User, MousePointer2, Timer, Heart, Move, Bolt, Layout, HelpCircle, Box, Info, Palette, Settings, Image as ImageIcon, X, Share2, Trash2 } from 'lucide-react-native';

const BEHAVIORS = [
  { id: 'player', label: 'Player', icon: User, color: '#00D1FF' },
  { id: 'solid', label: 'Solid', icon: Box, color: '#94A3B8' },
  { id: 'button', label: 'Button', icon: MousePointer2, color: '#FF00D1' },
  { id: 'timer', label: 'Timer', icon: Timer, color: '#FFD700' },
  { id: 'health', label: 'Health/Lives', icon: Heart, color: '#EF4444' },
  { id: 'moveable', label: 'Moveable', icon: Move, color: '#10B981' },
  { id: 'particle', label: 'Particle Emitter', icon: Bolt, color: '#7000FF' },
  { id: 'popup', label: 'Pop-up Text', icon: Layout, color: '#94A3B8' },
  { id: 'text', label: 'Text Object', icon: Layout, color: '#FFFFFF' },
];

const ObjectModals = React.lazy(() => import('./components/ObjectModals'));

export default function ObjectsScreen() {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [spritePickerVisible, setSpritePickerVisible] = useState(false);
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
        spriteId: null,
        animationSpeed: 100,
      },
      physics: {
        enabled: true,
        isStatic: behaviorId === 'solid',
        applyGravity: behaviorId !== 'solid' && behaviorId !== 'bullet',
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
    if (!sprite) return <Box color={theme.colors.textMuted} size={size} />;

    if (sprite.type === 'imported') {
      return <Image source={{ uri: sprite.uri }} style={{ width: size, height: size, resizeMode: 'contain' }} />;
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
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.objectCard} onPress={() => openInspector(item)}>
            <View style={[styles.objectIcon, { backgroundColor: theme.colors.surfaceElevated }]}>
              {renderSpritePreview(item.appearance.spriteId)}
            </View>
            <View style={styles.objectInfo}>
              <Text style={styles.objectName}>{item.name}</Text>
              <Text style={styles.objectBehavior}>{item.behavior}</Text>
            </View>
            <TouchableOpacity 
              style={{ padding: 8 }}
              onPress={(e) => {
                e.stopPropagation();
                useProjectStore.getState().removeObject(item.id);
              }}
            >
              <Trash2 color={theme.colors.error} size={20} />
            </TouchableOpacity>
            <ChevronRight color={theme.colors.textMuted} size={20} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <HelpCircle color={theme.colors.textMuted} size={48} />
            <Text style={styles.emptyText}>No objects yet. Tap the + button to create one.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Plus color={theme.colors.background} size={32} />
      </TouchableOpacity>

      {createModalVisible || inspectorVisible || spritePickerVisible ? (
        <React.Suspense fallback={null}>
          <ObjectModals
            createModalVisible={createModalVisible}
            setCreateModalVisible={setCreateModalVisible}
            inspectorVisible={inspectorVisible}
            setInspectorVisible={setInspectorVisible}
            spritePickerVisible={spritePickerVisible}
            setSpritePickerVisible={setSpritePickerVisible}
            selectedObject={selectedObject}
            setSelectedObject={setSelectedObject}
            currentProject={currentProject}
            updateObject={updateObject}
            handleCreateObject={handleCreateObject}
            renderSpritePreview={renderSpritePreview}
          />
        </React.Suspense>
      ) : null}
    </View>
  );
}


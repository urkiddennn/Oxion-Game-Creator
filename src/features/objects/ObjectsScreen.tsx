import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, TextInput, Switch, Image } from 'react-native';
import { useProjectStore, GameObject, Sprite } from '../../store/useProjectStore';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  objectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  objectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  objectInfo: {
    flex: 1,
  },
  objectName: {
    ...theme.typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  objectBehavior: {
    ...theme.typography.caption,
    textTransform: 'capitalize',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  closeText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  behaviorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 32,
  },
  behaviorButton: {
    width: '45%',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  behaviorIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  behaviorLabel: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inspectorOverlay: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  inspectorContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  inspectorTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  saveText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  inspectorSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionLabel: {
    ...theme.typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
    opacity: 0.5,
  },
  subSectionTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listenerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
    backgroundColor: '#1E2228',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  miniLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginBottom: 4,
  },
  miniInput: {
    backgroundColor: '#2E333D',
    borderRadius: 6,
    padding: 8,
    color: theme.colors.text,
    fontSize: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    marginTop: 8,
  },
  addButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readonlyValue: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    fontSize: 14,
    backgroundColor: '#1E2228',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputLabel: {
    ...theme.typography.caption,
    marginBottom: 4,
    color: theme.colors.textMuted,
  },
  inspectorInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appearancePicker: {
    marginTop: 8,
  },
  spriteSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  spritePreviewContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#1E2228',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  spriteSelectInfo: {
    flex: 1,
  },
  spriteSelectLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  spriteSelectSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 20,
  },
  pickerItem: {
    width: '30%',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  pickerPreview: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  emptyPicker: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyPickerText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyPickerSub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  logicPanel: {
    gap: 12,
  },
  switchLabel: {
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    ...theme.typography.caption,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 200,
  },
});

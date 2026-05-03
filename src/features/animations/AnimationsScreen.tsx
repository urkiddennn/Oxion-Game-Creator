import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, TextInput, Switch, Modal } from 'react-native';
import { theme } from '../../theme';
import { useProjectStore, AnimationAsset, Sprite } from '../../store/useProjectStore';
import { Plus, Trash2, Play, Pause, ChevronRight, ChevronLeft, Film, Image as ImageIcon, Scissors, Grid, ChevronDown, X as LucideX } from 'lucide-react-native';
import { PixelSprite } from '../../components/PixelSprite';

const NumericInput = ({ value, onChange, style }: { value: number, onChange: (v: number) => void, style?: any }) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    if (localValue !== '' && Number(localValue) !== value) {
      setLocalValue(value.toString());
    }
  }, [value]);

  return (
    <TextInput
      style={style}
      keyboardType="numeric"
      value={localValue}
      onChangeText={(v) => {
        setLocalValue(v);
        const num = parseInt(v);
        if (!isNaN(num)) {
          onChange(num);
        }
      }}
    />
  );
};

export default function AnimationsScreen() {
  const { activeProject, addAnimation, updateAnimation, removeAnimation } = useProjectStore();
  const [selectedAnimId, setSelectedAnimId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isSpritePickerVisible, setIsSpritePickerVisible] = useState(false);
  const [isSlicerVisible, setIsSlicerVisible] = useState(false);
  const [slicerConfig, setSlicerConfig] = useState({
    spriteId: '',
    rows: 1,
    cols: 1,
    name: 'New Animation'
  });

  const selectedAnim = useMemo(() =>
    activeProject?.animations?.find(a => a.id === selectedAnimId),
    [activeProject?.animations, selectedAnimId]
  );

  // Animation logic
  useEffect(() => {
    let timer: any;
    if (isPlaying && selectedAnim && selectedAnim.frames.length > 0) {
      timer = setInterval(() => {
        setCurrentFrameIndex(prev => {
          if (prev >= selectedAnim.frames.length - 1) {
            return selectedAnim.loop ? 0 : prev;
          }
          return prev + 1;
        });
      }, 1000 / (selectedAnim.frameRate || 10));
    }
    return () => clearInterval(timer);
  }, [isPlaying, selectedAnim]);

  const handleCreateAnim = () => {
    const newAnim: AnimationAsset = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Animation ${(activeProject?.animations?.length || 0) + 1}`,
      frames: [],
      frameRate: 10,
      loop: true,
    };
    addAnimation(newAnim);
    setSelectedAnimId(newAnim.id);
  };

  const handleSlice = () => {
    const sprite = activeProject?.sprites.find(s => s.id === slicerConfig.spriteId);
    if (!sprite || !sprite.width || !sprite.height) return;

    const frameWidth = sprite.width / slicerConfig.cols;
    const frameHeight = sprite.height / slicerConfig.rows;
    const frameIds: string[] = [];

    // Create frames
    for (let r = 0; r < slicerConfig.rows; r++) {
      for (let c = 0; c < slicerConfig.cols; c++) {
        const frameId = `${sprite.id}_f${r}_${c}`;
        const newFrame: Sprite = {
          id: frameId,
          name: `${slicerConfig.name} Frame ${frameIds.length + 1}`,
          type: 'imported',
          uri: sprite.uri,
          width: sprite.width,
          height: sprite.height,
          crop: {
            x: c * frameWidth,
            y: r * frameHeight,
            width: frameWidth,
            height: frameHeight
          }
        };
        useProjectStore.getState().addSprite(newFrame);
        frameIds.push(frameId);
      }
    }

    // Create animation
    const newAnim: AnimationAsset = {
      id: Math.random().toString(36).substr(2, 9),
      name: slicerConfig.name,
      frames: frameIds,
      frameRate: 10,
      loop: true,
    };
    addAnimation(newAnim);
    setSelectedAnimId(newAnim.id);
    setIsSlicerVisible(false);
  };

  const renderAnimItem = ({ item }: { item: AnimationAsset }) => (
    <TouchableOpacity
      style={[styles.animListItem, selectedAnimId === item.id && styles.animListItemActive]}
      onPress={() => {
        setSelectedAnimId(item.id);
        setCurrentFrameIndex(0);
        setIsPlaying(false);
      }}
    >
      <Film size={20} color={selectedAnimId === item.id ? theme.colors.primary : theme.colors.textMuted} />
      <Text style={[styles.animListItemText, selectedAnimId === item.id && styles.animListItemTextActive]}>
        {item.name}
      </Text>
      <Text style={styles.animFrameCount}>{item.frames.length} frames</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Sidebar - Animation List */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Animations</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSlicerVisible(true)}>
              <Scissors size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleCreateAnim}>
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={activeProject?.animations || []}
          renderItem={renderAnimItem}
          keyExtractor={item => item.id}
          style={styles.animList}
        />
      </View>

      {/* Main Content - Editor */}
      <View style={styles.editorArea}>
        {selectedAnim ? (
          <View style={{ flex: 1 }}>
            <View style={styles.editorHeader}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.animNameInput}
                  value={selectedAnim.name}
                  onChangeText={(text) => updateAnimation(selectedAnim.id, { name: text })}
                  placeholder="Animation Name"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  removeAnimation(selectedAnim.id);
                  setSelectedAnimId(null);
                }}
              >
                <Trash2 size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            {/* Preview Section */}
            <View style={styles.previewContainer}>
              <View style={styles.previewBox}>
                {selectedAnim.frames.length > 0 ? (
                  <PixelSprite
                    sprite={activeProject?.sprites.find(s => s.id === selectedAnim.frames[currentFrameIndex])}
                    size={120}
                  />
                ) : (
                  <Text style={styles.emptyPreviewText}>No frames added</Text>
                )}
              </View>

              <View style={styles.playbackControls}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause size={24} color="#fff" fill="#fff" />
                  ) : (
                    <Play size={24} color="#fff" fill="#fff" />
                  )}
                </TouchableOpacity>

                <View style={styles.playbackInfo}>
                  <Text style={styles.playbackInfoText}>
                    Frame {selectedAnim.frames.length > 0 ? currentFrameIndex + 1 : 0} / {selectedAnim.frames.length}
                  </Text>
                  <View style={styles.speedRow}>
                    <Text style={styles.label}>FPS:</Text>
                    <NumericInput
                      style={styles.fpsInput}
                      value={selectedAnim.frameRate}
                      onChange={(v) => updateAnimation(selectedAnim.id, { frameRate: v })}
                    />
                  </View>
                  <View style={styles.loopRow}>
                    <Text style={styles.label}>Loop:</Text>
                    <Switch
                      value={selectedAnim.loop}
                      onValueChange={(val) => updateAnimation(selectedAnim.id, { loop: val })}
                      trackColor={{ false: '#333', true: theme.colors.primary }}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Timeline Section */}
            <View style={styles.timelineContainer}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineTitle}>Frames</Text>
                <TouchableOpacity
                  style={styles.addFrameButton}
                  onPress={() => setIsSpritePickerVisible(true)}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addFrameButtonText}>Add Frame</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal style={styles.framesList} contentContainerStyle={styles.framesListContent}>
                {selectedAnim.frames.map((spriteId, index) => (
                  <View key={`${spriteId}-${index}`} style={[styles.frameItem, currentFrameIndex === index && styles.frameItemActive]}>
                    <TouchableOpacity onPress={() => setCurrentFrameIndex(index)}>
                      <PixelSprite
                        sprite={activeProject?.sprites.find(s => s.id === spriteId)}
                        size={48}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeFrameBtn}
                      onPress={() => {
                        const newFrames = [...selectedAnim.frames];
                        newFrames.splice(index, 1);
                        updateAnimation(selectedAnim.id, { frames: newFrames });
                      }}
                    >
                      <X size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Film size={48} color={theme.colors.textMuted} strokeWidth={1} />
            <Text style={styles.emptyStateText}>Select or create an animation</Text>
          </View>
        )}
      </View>

      {/* Sprite Picker Modal */}
      <Modal
        visible={isSpritePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSpritePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Sprite</Text>
              <TouchableOpacity onPress={() => setIsSpritePickerVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeProject?.sprites || []}
              numColumns={3}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.spriteThumb}
                  onPress={() => {
                    if (selectedAnim) {
                      updateAnimation(selectedAnim.id, {
                        frames: [...selectedAnim.frames, item.id]
                      });
                      setIsSpritePickerVisible(false);
                    }
                  }}
                >
                  <PixelSprite sprite={item} size={64} />
                  <Text style={styles.spriteThumbName} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.spriteGrid}
            />
          </View>
        </View>
      </Modal>

      {/* Slicer Modal */}
      <Modal visible={isSlicerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', padding: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Spritesheet Slicer</Text>
              <TouchableOpacity onPress={() => setIsSlicerVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.slicerForm}>
                <Text style={styles.inputLabel}>Select Spritesheet</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spriteScroll}>
                  {activeProject?.sprites.filter(s => s.type === 'imported' && !s.crop).map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.spritePick, slicerConfig.spriteId === s.id && styles.spritePickActive]}
                      onPress={() => setSlicerConfig({ ...slicerConfig, spriteId: s.id })}
                    >
                      <View style={styles.spriteIcon}>
                        <ImageIcon size={20} color={slicerConfig.spriteId === s.id ? theme.colors.primary : theme.colors.textMuted} />
                      </View>
                      <Text style={styles.spriteName} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Columns</Text>
                    <NumericInput
                      style={styles.slicerInput}
                      value={slicerConfig.cols}
                      onChange={(v) => setSlicerConfig({ ...slicerConfig, cols: v })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Rows</Text>
                    <NumericInput
                      style={styles.slicerInput}
                      value={slicerConfig.rows}
                      onChange={(v) => setSlicerConfig({ ...slicerConfig, rows: v })}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Animation Name</Text>
                <TextInput
                  style={styles.slicerInput}
                  value={slicerConfig.name}
                  onChangeText={(v) => setSlicerConfig({ ...slicerConfig, name: v })}
                  placeholder="Run Cycle..."
                  placeholderTextColor={theme.colors.textMuted}
                />

                <TouchableOpacity 
                  style={[styles.sliceButton, !slicerConfig.spriteId && { opacity: 0.5 }]} 
                  disabled={!slicerConfig.spriteId}
                  onPress={handleSlice}
                >
                  <Scissors size={20} color="#fff" />
                  <Text style={styles.sliceButtonText}>Slice & Create Animation</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const X = ({ size, color }: { size: number, color: string }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color, fontSize: size, fontWeight: 'bold' }}>×</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    backgroundColor: '#16191E',
  },
  sidebarHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sidebarTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animList: {
    flex: 1,
  },
  animListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  animListItemActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  animListItemText: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
  },
  animListItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  animFrameCount: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  editorArea: {
    flex: 1,
    backgroundColor: '#0F1115',
  },
  editorHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#16191E',
  },
  animNameInput: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 18,
    padding: 4,
  },
  deleteButton: {
    padding: 8,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewBox: {
    width: 200,
    height: 200,
    backgroundColor: '#16191E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  emptyPreviewText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16191E',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 20,
    minWidth: 300,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackInfo: {
    flex: 1,
    gap: 8,
  },
  playbackInfoText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontSize: 12,
    marginBottom: 4,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    width: 40,
  },
  fpsInput: {
    backgroundColor: '#1E2228',
    color: theme.colors.text,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    width: 40,
    textAlign: 'center',
  },
  timelineContainer: {
    height: 140,
    backgroundColor: '#16191E',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  timelineTitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  addFrameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2E333D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addFrameButtonText: {
    ...theme.typography.caption,
    color: '#fff',
    fontSize: 11,
  },
  framesList: {
    flex: 1,
  },
  framesListContent: {
    padding: 16,
    gap: 12,
    flexDirection: 'row',
  },
  frameItem: {
    width: 64,
    height: 64,
    backgroundColor: '#1E2228',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frameItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  removeFrameBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.error,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    backgroundColor: '#16191E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  spriteGrid: {
    padding: 16,
  },
  spriteThumb: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1E2228',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  spriteThumbName: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontSize: 10,
    width: 60,
    textAlign: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  slicerForm: {
    gap: 16,
    marginTop: 10,
  },
  spriteScroll: {
    maxHeight: 100,
  },
  spritePick: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1E2228',
    marginRight: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 80,
  },
  spritePickActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  spriteIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
  },
  spriteName: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
    width: 60,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  slicerInput: {
    backgroundColor: '#1E2228',
    color: theme.colors.text,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sliceButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  sliceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

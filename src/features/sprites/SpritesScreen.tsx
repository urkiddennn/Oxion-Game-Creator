import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Switch, Alert } from 'react-native';
import { theme } from '../../theme';
import { styles } from './SpritesScreen.styles';
import { Image as ImageIcon, Plus, Upload, Palette, X, Trash2, ChevronDown, Save } from 'lucide-react-native';
import { TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import SpriteEditor from './components/SpriteEditor';
import { useProjectStore, Sprite } from '../../store/useProjectStore';

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

export default function SpritesScreen() {
  const { activeProject: currentProject, addSprite, updateSprite, removeSprite } = useProjectStore();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [previewState, setPreviewState] = useState<string | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  const selectedSprite = currentProject?.sprites.find(s => s.id === selectedSpriteId);

  React.useEffect(() => {
    if (selectedSprite?.uri) {
      Image.getSize(selectedSprite.uri, (width, height) => {
        setImgSize({ width, height });
      });
    }
  }, [selectedSprite?.id]);



  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (previewState) {
      interval = setInterval(() => {
        setCurrentFrameIndex(prev => prev + 1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [previewState]);

  const handleImport = async () => {
    setShowAddMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUri = `data:image/png;base64,${base64}`;

        const saveSprite = (w: number, h: number) => {
          const newSprite: Sprite = {
            id: Date.now().toString(),
            name: `Imported ${Date.now().toString().slice(-4)}`,
            uri: dataUri,
            type: 'imported',
            width: w,
            height: h,
            grid: {
              enabled: false, // Don't auto-enable, let user decide
              frameWidth: w,
              frameHeight: h,
            },
            animations: []
          };
          addSprite(newSprite);
        };

        if (asset.width && asset.height) {
          saveSprite(asset.width, asset.height);
        } else {
          Image.getSize(asset.uri, (w, h) => saveSprite(w, h));
        }
      } catch (err: any) {
        Alert.alert('Error', 'Failed to serialize imported image asset: ' + err.message);
      }
    }
  };

  const handleCreateSave = (pixels: string[][]) => {
    const newSprite: Sprite = {
      id: Date.now().toString(),
      name: `Pixel ${Date.now().toString().slice(-4)}`,
      pixels,
      type: 'created',
      width: 32,
      height: 32,
    };
    addSprite(newSprite);
    setShowEditor(false);
  };

  if (showEditor) {
    return <SpriteEditor onSave={handleCreateSave} onCancel={() => setShowEditor(false)} />;
  }

  const sprites = currentProject?.sprites || [];

  return (
    <View style={styles.container}>
      {sprites.length === 0 ? (
        <View style={styles.emptyState}>
          <ImageIcon color={theme.colors.textMuted} size={64} />
          <Text style={styles.text}>No Sprites Yet</Text>
          <Text style={styles.subtext}>Start by creating or importing your first asset</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.spriteGrid}>
          {sprites.map((sprite) => (
            <TouchableOpacity
              key={sprite.id}
              style={styles.spriteCard}
              onPress={() => setSelectedSpriteId(sprite.id)}
              onLongPress={() => {
                Alert.alert(
                  "Delete Sprite",
                  `Are you sure you want to delete "${sprite.name}"?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => removeSprite(sprite.id) }
                  ]
                );
              }}
            >
              <View style={styles.previewContainer}>
                {sprite.type === 'imported' ? (
                  <Image source={{ uri: sprite.uri }} style={styles.spritePreview} resizeMethod="scale" />
                ) : (
                  <View style={styles.pixelGridPreview}>
                    {sprite.pixels?.map((row, r) => (
                      <View key={r} style={styles.pixelRow}>
                        {row.map((color, c) => (
                          <View
                            key={c}
                            style={[
                              styles.pixel,
                              {
                                backgroundColor: color || 'transparent',
                                width: `${100 / row.length}%`,
                                aspectRatio: 1
                              }
                            ]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddMenu(true)}>
        <Plus color={theme.colors.background} size={28} />
      </TouchableOpacity>

      {/* Add Menu Modal */}
      <Modal visible={showAddMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddMenu(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Add New Sprite</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleImport}>
              <Upload color={theme.colors.primary} size={20} />
              <Text style={styles.menuText}>Import Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowAddMenu(false); setShowEditor(true); }}>
              <Palette color={theme.colors.primary} size={20} />
              <Text style={styles.menuText}>Create in Editor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setShowAddMenu(false)}>
              <X color={theme.colors.textMuted} size={20} />
              <Text style={[styles.menuText, { color: theme.colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sprite Details / Animation Editor Modal */}
      <Modal visible={!!selectedSpriteId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailsContent}>
            {selectedSprite && (
              <>
                <View style={styles.detailsHeader}>
                  <TextInput
                    style={styles.detailsTitle}
                    value={selectedSprite.name}
                    onChangeText={(v) => updateSprite(selectedSprite.id, { name: v })}
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setSelectedSpriteId(null)}>
                      <X size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.slicerLayout}>
                  {/* Sidebar - Settings & States */}
                  <View style={styles.slicerSidebar}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={styles.sidebarSection}>
                        <Text style={styles.sectionTitle}>Preview</Text>
                        <View style={styles.animationPreview}>
                          {(() => {
                            const w = imgSize.width || selectedSprite.width || 0;
                            const h = imgSize.height || selectedSprite.height || 0;
                            const activeAnim = selectedSprite.animations?.find(a => a.name === previewState);
                            if (!activeAnim || w === 0) return <Text style={{ color: '#444', fontSize: 10 }}>Select State</Text>;

                            const fw = Math.max(1, selectedSprite.grid?.frameWidth || 32);
                            const fh = Math.max(1, selectedSprite.grid?.frameHeight || 32);
                            const cols = Math.floor(w / fw);

                            const frameIdx = activeAnim.row + (currentFrameIndex % activeAnim.frameCount);
                            const r = Math.floor(frameIdx / cols);
                            const c = frameIdx % cols;

                            const frameSize = 64;
                            return (
                              <Image
                                source={{ uri: selectedSprite.uri }}
                                style={{
                                  width: w * (frameSize / fw),
                                  height: h * (frameSize / fh),
                                  position: 'absolute',
                                  left: -c * frameSize,
                                  top: -r * frameSize,
                                  // @ts-ignore
                                  imageRendering: 'pixelated',
                                }}
                                resizeMode="stretch"
                              />
                            );
                          })()}
                        </View>

                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>Slicing</Text>
                          <Switch
                            value={!!selectedSprite.grid?.enabled}
                            onValueChange={(v) => updateSprite(selectedSprite.id, {
                              grid: {
                                ...(selectedSprite.grid || { frameWidth: 32, frameHeight: 32 }),
                                enabled: v
                              }
                            })}
                            trackColor={{ false: '#222', true: theme.colors.primary }}
                            thumbColor="#fff"
                            ios_backgroundColor="#3e3e3e"
                            // @ts-ignore
                            style={{ transform: [{ scale: 0.6 }], height: 20, width: 30 }}
                          />
                        </View>
                        <View style={styles.inputGrid}>
                          <View style={styles.inputItem}>
                            <Text style={styles.label}>WIDTH</Text>
                            <NumericInput
                              style={styles.input}
                              value={selectedSprite.grid?.frameWidth || 32}
                              onChange={(v) => updateSprite(selectedSprite.id, {
                                grid: {
                                  ...(selectedSprite.grid || { enabled: true, frameHeight: 32 }),
                                  frameWidth: v,
                                }
                              })}
                            />
                          </View>
                          <View style={styles.inputItem}>
                            <Text style={styles.label}>HEIGHT</Text>
                            <NumericInput
                              style={styles.input}
                              value={selectedSprite.grid?.frameHeight || 32}
                              onChange={(v) => updateSprite(selectedSprite.id, {
                                grid: {
                                  ...(selectedSprite.grid || { enabled: true, frameWidth: 32 }),
                                  frameHeight: v
                                }
                              })}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.sidebarSection}>
                        <Text style={styles.sectionTitle}>Animations</Text>
                        <View style={styles.stateList}>
                          {(selectedSprite.animations || []).map((anim, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[styles.stateItem, previewState === anim.name && styles.stateActive]}
                              onPress={() => setPreviewState(anim.name)}
                            >
                              <View style={styles.stateHeader}>
                                <TextInput
                                  style={styles.stateNameInput}
                                  value={anim.name}
                                  onChangeText={(v) => {
                                    const states = [...(selectedSprite.animations || [])];
                                    states[idx].name = v;
                                    updateSprite(selectedSprite.id, { animations: states });
                                  }}
                                />
                                <TouchableOpacity
                                  onPress={() => {
                                    const states = (selectedSprite.animations || []).filter((_, i) => i !== idx);
                                    updateSprite(selectedSprite.id, { animations: states });
                                    if (previewState === anim.name) setPreviewState(null);
                                  }}
                                >
                                  <Trash2 size={14} color="#666" />
                                </TouchableOpacity>
                              </View>
                              <View style={styles.stateInputs}>
                                <View style={styles.stateInputWrap}>
                                  <Text style={styles.label}>COL</Text>
                                  <NumericInput
                                    style={styles.input}
                                    value={anim.row}
                                    onChange={(v) => {
                                      const states = [...(selectedSprite.animations || [])];
                                      states[idx].row = v;
                                      updateSprite(selectedSprite.id, { animations: states });
                                    }}
                                  />
                                </View>
                                <View style={styles.stateInputWrap}>
                                  <Text style={styles.label}>COUNT</Text>
                                  <NumericInput
                                    style={styles.input}
                                    value={anim.frameCount}
                                    onChange={(v) => {
                                      const states = [...(selectedSprite.animations || [])];
                                      states[idx].frameCount = v;
                                      updateSprite(selectedSprite.id, { animations: states });
                                    }}
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={styles.addStateBtn}
                            onPress={() => {
                              const states = selectedSprite.animations || [];
                              updateSprite(selectedSprite.id, {
                                animations: [...states, { name: 'State', row: 0, frameCount: 1, fps: 10, loop: true }]
                              });
                            }}
                          >
                            <Text style={styles.addStateText}>+ Add Animation</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScrollView>
                  </View>

                  {/* Main Area - Frame Grid */}
                  <View style={styles.slicerMain}>
                    <ScrollView style={styles.slicerScroll} showsVerticalScrollIndicator={true}>
                      <View style={styles.frameGrid}>
                        {(() => {
                          const w = imgSize.width || selectedSprite.width || 0;
                          const h = imgSize.height || selectedSprite.height || 0;
                          const fw = Math.max(1, selectedSprite.grid?.frameWidth || 32);
                          const fh = Math.max(1, selectedSprite.grid?.frameHeight || 32);
                          const cols = Math.floor(w / fw);
                          const rows = Math.floor(h / fh);
                          const count = Math.min(cols * rows, 200);

                          if (count <= 0) return <Text style={{ color: '#333', fontSize: 10, padding: 20 }}>No frames found. Check slicing W/H.</Text>;

                          return Array.from({ length: isNaN(count) ? 0 : count }).map((_, i) => {
                            const r = Math.floor(i / cols);
                            const c = i % cols;
                            return (
                              <View key={i} style={styles.frameContainer}>
                                <Text style={styles.frameIndex}>{i}</Text>
                                <View style={styles.frameBox}>
                                  <Image
                                    source={{ uri: selectedSprite.uri }}
                                    style={{
                                      width: w * (40 / fw),
                                      height: h * (40 / fh),
                                      position: 'absolute',
                                      left: -c * 40,
                                      top: -r * 40,
                                      // @ts-ignore
                                      imageRendering: 'pixelated',
                                    }}
                                    resizeMode="stretch"
                                    // @ts-ignore
                                    resizeMethod="scale"
                                  />
                                </View>
                              </View>
                            );
                          });
                        })()}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}


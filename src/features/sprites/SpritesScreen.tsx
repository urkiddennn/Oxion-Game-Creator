import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { theme } from '../../theme';
import { styles } from './SpritesScreen.styles';
import { Image as ImageIcon, Plus, Upload, Palette, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import SpriteEditor from './components/SpriteEditor';
import { useProjectStore, Sprite } from '../../store/useProjectStore';

export default function SpritesScreen() {
  const { activeProject: currentProject, addSprite } = useProjectStore();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const handleImport = async () => {
    setShowAddMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const newSprite: Sprite = {
        id: Date.now().toString(),
        name: `Imported ${Date.now().toString().slice(-4)}`,
        uri: asset.uri,
        type: 'imported',
        width: asset.width,
        height: asset.height,
      };
      addSprite(newSprite);
    }
  };

  const handleCreateSave = (pixels: string[][]) => {
    const newSprite: Sprite = {
      id: Date.now().toString(),
      name: `Pixel ${Date.now().toString().slice(-4)}`,
      pixels,
      type: 'created',
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
            <View key={sprite.id} style={styles.spriteCard}>
              <View style={styles.previewContainer}>
                {sprite.type === 'imported' ? (
                  <Image source={{ uri: sprite.uri }} style={styles.spritePreview} />
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
              <Text style={styles.spriteLabel} numberOfLines={1}>
                {sprite.name || `Sprite ${sprite.id.slice(-4)}`}
              </Text>
            </View>
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
    </View>
  );
}


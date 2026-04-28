import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { theme } from '../../theme';
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
      const newSprite: Sprite = {
        id: Date.now().toString(),
        name: `Imported ${Date.now().toString().slice(-4)}`,
        uri: result.assets[0].uri,
        type: 'imported',
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: 16,
  },
  subtext: {
    ...theme.typography.caption,
    marginTop: 8,
  },
  spriteGrid: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  spriteCard: {
    width: '11.5%', // Approx 8 per row
    aspectRatio: 1,
    backgroundColor: '#1E2228',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#16191E',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spritePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  pixelGridPreview: {
    width: '100%',
    height: '100%',
  },
  pixelRow: {
    flexDirection: 'row',
    flex: 1,
  },
  pixel: {
    flex: 1,
  },
  spriteLabel: {
    display: 'none', // Hide labels in 8-column view to keep it clean
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    backgroundColor: '#16191E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8,
  },
  menuTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  menuText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { X, Image as ImageIcon } from 'lucide-react-native';
import ObjectCreatorModal from './modals/ObjectCreatorModal';
import ObjectInspectorModal from './modals/ObjectInspectorModal';
import { theme } from '../../../theme';

export default function ObjectModals({
  createModalVisible, setCreateModalVisible,
  inspectorVisible, setInspectorVisible,
  spritePickerVisible, setSpritePickerVisible,
  selectedObject, setSelectedObject,
  currentProject, updateObject, handleCreateObject, renderSpritePreview
}: any) {
  return (
    <>
      <ObjectCreatorModal 
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSelectBehavior={handleCreateObject}
      />

      <ObjectInspectorModal 
        visible={inspectorVisible}
        onClose={() => setInspectorVisible(false)}
        selectedObject={selectedObject}
        setSelectedObject={setSelectedObject}
        currentProject={currentProject}
        updateObject={updateObject}
        setSpritePickerVisible={setSpritePickerVisible}
        renderSpritePreview={renderSpritePreview}
      />

      {/* Sprite Picker Modal - Kept here for convenience or could be split too */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={spritePickerVisible}
        onRequestClose={() => setSpritePickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sprite</Text>
              <TouchableOpacity onPress={() => setSpritePickerVisible(false)}>
                <X color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.pickerGrid}>
                {currentProject?.sprites.map((sprite: any) => (
                  <TouchableOpacity 
                    key={sprite.id} 
                    style={styles.pickerItem}
                    onPress={() => {
                      if (!selectedObject) return;
                      const appearance = selectedObject.appearance || { spriteId: null, animationSpeed: 100 };
                      updateObject(selectedObject.id, { 
                        appearance: { ...appearance, spriteId: sprite.id } 
                      });
                      setSelectedObject({ 
                        ...selectedObject, 
                        appearance: { ...appearance, spriteId: sprite.id } 
                      });
                      setSpritePickerVisible(false);
                    }}
                  >
                    <View style={styles.pickerPreview}>
                      {renderSpritePreview(sprite.id, 40)}
                    </View>
                    <Text style={styles.pickerLabel} numberOfLines={1}>{sprite.name}</Text>
                  </TouchableOpacity>
                ))}
                
                {currentProject?.sprites.length === 0 && (
                  <View style={styles.emptyPicker}>
                    <ImageIcon size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyPickerText}>No Sprites Yet</Text>
                    <Text style={styles.emptyPickerSub}>Go to the Sprites tab to create or import some!</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
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
});

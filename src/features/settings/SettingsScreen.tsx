import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image } from 'react-native';
import { theme } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import { Settings as SettingsIcon, LogOut, Shield, Database, Bell, X, Box, Image as ImageIcon } from 'lucide-react-native';
import React from 'react';

export default function SettingsScreen() {
  const { activeProject: currentProject, closeProject, updateProject } = useProjectStore();
  const [spritePickerVisible, setSpritePickerVisible] = React.useState(false);

  const renderSpritePreview = (spriteId: string | undefined, size: number = 32) => {
    const sprite = (currentProject?.sprites || []).find(s => s.id === spriteId);
    if (!sprite) return <Box color={theme.colors.textMuted} size={size} />;

    if (sprite.type === 'imported') {
      return <Image source={{ uri: sprite.uri }} style={{ width: size, height: size, resizeMode: 'contain', borderRadius: 4 }} />;
    }

    const pixelSize = size / 16;
    return (
      <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
        {sprite.pixels?.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((color, c) => (
              <View key={c} style={{ width: pixelSize, height: pixelSize, backgroundColor: color }} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <SettingsIcon color={theme.colors.primary} size={32} />
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Identity</Text>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Game Name</Text>
          <TextInput
            style={styles.nameInput}
            value={currentProject?.name}
            onChangeText={(text) => updateProject({ name: text })}
            placeholder="Game Title"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={[styles.pickerContainer, { marginTop: 12 }]}>
          <Text style={styles.pickerLabel}>Game Icon</Text>
          <View style={styles.iconRow}>
            <TouchableOpacity
              style={styles.iconPreview}
              onPress={() => setSpritePickerVisible(true)}
            >
              {renderSpritePreview(currentProject?.iconSpriteId, 64)}
            </TouchableOpacity>
            <View style={styles.iconInfo}>
              <Text style={styles.iconHint}>This icon represents your game in the community portal.</Text>
              <TouchableOpacity onPress={() => setSpritePickerVisible(true)}>
                <Text style={styles.changeLink}>Change Icon</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Settings</Text>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Main Room (Starts first)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomList}>
            {(currentProject?.rooms || []).map(room => (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.roomChip,
                  currentProject?.mainRoomId === room.id && styles.roomChipActive
                ]}
                onPress={() => updateProject({ mainRoomId: room.id })}
              >
                <Text style={[
                  styles.roomChipText,
                  currentProject?.mainRoomId === room.id && styles.roomChipTextActive
                ]}>{room.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Settings</Text>
        <SettingItem icon={Shield} label="Project Permissions" />
        <SettingItem icon={Database} label="Storage & Export" />
        <SettingItem icon={Bell} label="Notifications" />
      </View>

      <TouchableOpacity
        style={styles.dangerButton}
        onPress={() => closeProject()}
      >
        <LogOut color={theme.colors.error} size={20} />
        <Text style={styles.dangerText}>Close Project</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={spritePickerVisible}
        onRequestClose={() => setSpritePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Game Icon</Text>
              <TouchableOpacity onPress={() => setSpritePickerVisible(false)}>
                <X color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.spriteGrid}>
                {currentProject?.sprites.map((sprite: any) => (
                  <TouchableOpacity
                    key={sprite.id}
                    style={styles.spriteItem}
                    onPress={() => {
                      updateProject({ iconSpriteId: sprite.id });
                      setSpritePickerVisible(false);
                    }}
                  >
                    <View style={styles.spritePreview}>
                      {renderSpritePreview(sprite.id, 48)}
                    </View>
                    <Text style={styles.spriteLabel} numberOfLines={1}>{sprite.name}</Text>
                  </TouchableOpacity>
                ))}

                {(currentProject?.sprites || []).length === 0 && (
                  <View style={styles.emptyPicker}>
                    <ImageIcon size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyPickerText}>No Sprites Yet</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SettingItem({ icon: Icon, label }: any) {
  return (
    <TouchableOpacity style={styles.item}>
      <View style={styles.itemLeft}>
        <Icon color={theme.colors.textSecondary} size={20} />
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <Text style={styles.itemValue}>Configure</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconPreview: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  iconInfo: {
    flex: 1,
  },
  iconHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  changeLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  spriteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  spriteItem: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
  },
  spritePreview: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  spriteLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  emptyPicker: {
    flex: 1,
    alignItems: 'center',
    padding: 40,
  },
  emptyPickerText: {
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  roomList: {
    flexDirection: 'row',
  },
  roomChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roomChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roomChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  roomChipTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  itemValue: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  dangerButton: {
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.error + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    marginBottom: 40,
  },
  dangerText: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image } from 'react-native';
import { theme } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import { Settings as SettingsIcon, LogOut, Shield, Database, Bell, X, Box, Image as ImageIcon, Trash2, Globe } from 'lucide-react-native';
import { Alert } from 'react-native';
import React from 'react';

export default function SettingsScreen() {
  const { activeProject: currentProject, closeProject, updateProject, removeProject, exportToWeb } = useProjectStore();
  const [spritePickerVisible, setSpritePickerVisible] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);
  const [exportStatus, setExportStatus] = React.useState('Preparing...');

  const handleDeleteProject = () => {
    if (!currentProject) return;
    
    Alert.alert(
      'Delete Project',
      `Are you sure you want to permanently delete "${currentProject.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const name = currentProject.name;
            closeProject();
            removeProject(name);
          }
        },
      ]
    );
  };

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
        <Text style={[styles.sectionTitle, { width: '100%' }]}>Project Settings</Text>
        <View style={styles.gridContainer}>
          <SettingItem icon={Shield} label="Permissions" />
          
          <TouchableOpacity 
            style={styles.item} 
            onPress={async () => {
              setIsExporting(true);
              setExportProgress(0);
              
              // Simulate progress
              setExportStatus('Processing assets...');
              for(let i=0; i<=33; i++) { setExportProgress(i); await new Promise(r => setTimeout(r, 30)); }
              
              setExportStatus('Compiling runtime...');
              for(let i=34; i<=66; i++) { setExportProgress(i); await new Promise(r => setTimeout(r, 30)); }
              
              setExportStatus('Packaging HTML...');
              for(let i=67; i<=100; i++) { setExportProgress(i); await new Promise(r => setTimeout(r, 30)); }
              
              const res = await exportToWeb();
              setIsExporting(false);
              if (!res.success) Alert.alert('Export Failed', res.error);
            }}
          >
            <View style={styles.itemLeft}>
              <Globe color={theme.colors.primary} size={20} />
              <Text style={styles.itemLabel}>Web Export</Text>
            </View>
            <Text style={styles.itemValue}>Ready</Text>
          </TouchableOpacity>

          <SettingItem icon={Database} label="Storage" />
          <SettingItem icon={Bell} label="Alerts" />
        </View>
      </View>

      <TouchableOpacity
        style={styles.dangerButton}
        onPress={() => closeProject()}
      >
        <LogOut color={theme.colors.text} size={20} />
        <Text style={styles.dangerText}>Close Project</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dangerButton, { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error + '40', marginTop: 0 }]}
        onPress={handleDeleteProject}
      >
        <Trash2 color={theme.colors.error} size={20} />
        <Text style={[styles.dangerText, { color: theme.colors.error }]}>Delete Project Permanently</Text>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={isExporting}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24, alignItems: 'center' }]}>
            <Globe color={theme.colors.primary} size={48} />
            <Text style={[styles.modalTitle, { marginTop: 16, fontSize: 18 }]}>Building Web App</Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 20 }}>{exportStatus}</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${exportProgress}%` }]} />
            </View>
            
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold', marginTop: 10 }}>{exportProgress}%</Text>
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontSize: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 9,
  },
  nameInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    padding: 10,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconPreview: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
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
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4,
  },
  changeLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 14,
  },
  spriteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  spriteItem: {
    width: '33.33%',
    padding: 4,
    alignItems: 'center',
  },
  spritePreview: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  spriteLabel: {
    color: theme.colors.textSecondary,
    fontSize: 9,
  },
  emptyPicker: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  emptyPickerText: {
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  roomList: {
    flexDirection: 'row',
  },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    borderRadius: 2,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roomChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roomChipText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  roomChipTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  item: {
    width: '49%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 80,
  },
  itemLeft: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  itemLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  itemValue: {
    color: theme.colors.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  dangerButton: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.error + '10',
    padding: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    marginBottom: 40,
    marginTop: 8,
  },
  dangerText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 13,
  },
});

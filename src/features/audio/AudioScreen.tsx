import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { theme } from '../../theme';
import { Music, Play, Plus, Trash2, Download, Volume2, Square } from 'lucide-react-native';
import { useProjectStore, SoundAsset } from '../../store/useProjectStore';
import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer } from 'expo-audio';

export default function AudioScreen() {
  const { activeProject, addSound, removeSound } = useProjectStore();
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null);
  const [sound, setSound] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const sounds = useMemo(() => 
    activeProject?.sounds?.filter(s => s.type === 'imported') || [],
    [activeProject?.sounds]
  );

  useEffect(() => {
    return sound ? () => { sound.release(); } : undefined;
  }, [sound]);

  const handleImportSound = async () => {
    console.log('Attempting to open document picker...');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'application/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav'],
        copyToCacheDirectory: true,
      });

      console.log('Picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newSound: SoundAsset = {
          id: Math.random().toString(36).substr(2, 9),
          name: asset.name,
          type: 'imported',
          uri: asset.uri
        };
        addSound(newSound);
        setSelectedSoundId(newSound.id);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to import sound file');
    }
  };

  const playSound = async (uri: string) => {
    try {
      if (sound) {
        sound.release();
      }
      
      const newSound = createAudioPlayer(uri);
      setSound(newSound);
      setIsPlaying(true);
      newSound.play();
      
      const subscription = newSound.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          subscription.remove();
        }
      });
    } catch (err) {
      Alert.alert('Error', 'Could not play audio file');
    }
  };

  const stopSound = async () => {
    if (sound) {
      sound.pause();
      setIsPlaying(false);
    }
  };

  const handleDeleteSound = (id: string) => {
    Alert.alert('Delete Sound', 'Are you sure you want to remove this sound?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: () => {
          removeSound(id);
          if (selectedSoundId === id) setSelectedSoundId(null);
        }
      }
    ]);
  };

  const selectedAsset = sounds.find(s => s.id === selectedSoundId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Volume2 color={theme.colors.primary} size={18} />
          <Text style={styles.headerTitle}>Audio Assets</Text>
        </View>
        <TouchableOpacity style={styles.importButton} onPress={handleImportSound}>
          <Plus color={theme.colors.background} size={16} />
          <Text style={styles.importButtonText}>Import from Files</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {sounds.length === 0 ? (
          <View style={styles.emptyState}>
            <Download color={theme.colors.textMuted} size={40} />
            <Text style={styles.emptyText}>No audio files imported yet</Text>
            <Text style={styles.emptySubtext}>Import .wav, .mp3, or .m4a files to use them in your game</Text>
          </View>
        ) : (
          sounds.map((s) => (
            <TouchableOpacity 
              key={s.id} 
              style={[styles.soundItem, selectedSoundId === s.id && styles.soundItemActive]}
              onPress={() => setSelectedSoundId(s.id)}
            >
              <View style={styles.soundIcon}>
                <Music color={selectedSoundId === s.id ? theme.colors.primary : theme.colors.textMuted} size={16} />
              </View>
              <View style={styles.soundInfo}>
                <Text style={[styles.soundName, selectedSoundId === s.id && styles.soundNameActive]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.soundType}>Audio Asset</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.playAction} 
                  onPress={() => s.uri && playSound(s.uri)}
                >
                  <Play fill={theme.colors.text} size={14} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteAction} onPress={() => handleDeleteSound(s.id)}>
                  <Trash2 color={theme.colors.error} size={14} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedSoundId && selectedAsset && (
        <View style={styles.footer}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected Asset:</Text>
            <Text style={styles.selectedName} numberOfLines={1}>{selectedAsset.name}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.testBtn, isPlaying && styles.testBtnPlaying]} 
            onPress={() => isPlaying ? stopSound() : selectedAsset.uri && playSound(selectedAsset.uri)}
          >
            {isPlaying ? (
              <Square fill={theme.colors.background} color={theme.colors.background} size={16} />
            ) : (
              <Play fill={theme.colors.background} color={theme.colors.background} size={16} />
            )}
            <Text style={styles.testBtnText}>{isPlaying ? 'Stop' : 'Test Sound'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    gap: 4,
  },
  importButtonText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  soundItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '05',
  },
  soundIcon: {
    width: 32,
    height: 32,
    borderRadius: 2,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  soundNameActive: {
    color: theme.colors.primary,
  },
  soundType: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playAction: {
    padding: 4,
  },
  deleteAction: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 220,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  selectedName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    gap: 6,
    minWidth: 110,
    justifyContent: 'center',
  },
  testBtnPlaying: {
    backgroundColor: theme.colors.error,
  },
  testBtnText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: 'bold',
  },
});

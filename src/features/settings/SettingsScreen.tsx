import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image } from 'react-native';
import { theme } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import { Settings as SettingsIcon, LogOut, Shield, Database, Bell, X, Box, Image as ImageIcon, Trash2, Globe, Smartphone } from 'lucide-react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import React from 'react';



export default function SettingsScreen() {
  const { activeProject: currentProject, closeProject, updateProject, removeProject, exportToWeb } = useProjectStore();
  const [spritePickerVisible, setSpritePickerVisible] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);
  const [exportStatus, setExportStatus] = React.useState('Preparing...');

  // APK Build Agent State
  const [showApkSetup, setShowApkSetup] = React.useState(false);
  const [showApkProgress, setShowApkProgress] = React.useState(false);
  
  // Dynamically resolve local host computer IP in Expo Go
  const getDynamicHostIp = () => {
    try {
      const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGoLaunchMetadata?.debuggerHost;
      if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
          return `http://${ip}:3001`;
        }
      }
    } catch (e) {
      console.log('Failed to detect developer machine IP from Metro bundler', e);
    }
    return 'http://localhost:3001';
  };

  const [buildAgentUrl, setBuildAgentUrl] = React.useState(getDynamicHostIp());
  const [expoToken, setExpoToken] = React.useState('');
  const [bundleIdentifier, setBundleIdentifier] = React.useState(
    currentProject ? `com.oxion.${currentProject.name.toLowerCase().replace(/[^a-z0-9]/g, '')}` : 'com.oxion.game'
  );
  const [expoOwner, setExpoOwner] = React.useState('');
  const [easProjectId, setEasProjectId] = React.useState('');
  const [expoSlug, setExpoSlug] = React.useState('');
  const [apkBuildStatus, setApkBuildStatus] = React.useState('');
  const [apkBuildLog, setApkBuildLog] = React.useState('');

  // Load saved credentials on mount
  React.useEffect(() => {
    const loadApkSettings = async () => {
      try {
        const token = await AsyncStorage.getItem('oxion_apk_expo_token');
        const owner = await AsyncStorage.getItem('oxion_apk_expo_owner');
        const savedBundle = await AsyncStorage.getItem(`oxion_apk_bundle_${currentProject?.id}`);
        const savedUrl = await AsyncStorage.getItem('oxion_apk_build_agent_url');
        const savedEasProjectId = await AsyncStorage.getItem(`oxion_apk_eas_project_id_${currentProject?.id}`);
        const savedExpoSlug = await AsyncStorage.getItem(`oxion_apk_expo_slug_${currentProject?.id}`);
        
        if (token) setExpoToken(token);
        if (owner) setExpoOwner(owner);
        if (savedBundle) setBundleIdentifier(savedBundle);
        if (savedEasProjectId) setEasProjectId(savedEasProjectId);
        if (savedExpoSlug) setExpoSlug(savedExpoSlug);
        if (savedUrl) {
          setBuildAgentUrl(savedUrl);
        } else {
          setBuildAgentUrl(getDynamicHostIp());
        }
      } catch (e) {
        console.warn('Failed to load APK settings', e);
      }
    };
    loadApkSettings();
  }, [currentProject?.id]);

  // Handle build execution and live logging feedback
  const handleStartApkBuild = async () => {
    if (!expoToken) {
      Alert.alert('Missing Expo Token', 'Please enter your Expo Personal Access Token.');
      return;
    }
    if (!bundleIdentifier) {
      Alert.alert('Missing Bundle Identifier', 'Please enter a valid package name, e.g. com.yourname.mygame');
      return;
    }
    if (!buildAgentUrl) {
      Alert.alert('Missing Agent URL', 'Please enter a valid Build Agent URL.');
      return;
    }

    // Save inputs
    try {
      await AsyncStorage.setItem('oxion_apk_expo_token', expoToken);
      await AsyncStorage.setItem('oxion_apk_expo_owner', expoOwner);
      await AsyncStorage.setItem('oxion_apk_build_agent_url', buildAgentUrl);
      if (currentProject) {
        await AsyncStorage.setItem(`oxion_apk_bundle_${currentProject.id}`, bundleIdentifier);
        await AsyncStorage.setItem(`oxion_apk_eas_project_id_${currentProject.id}`, easProjectId);
        await AsyncStorage.setItem(`oxion_apk_expo_slug_${currentProject.id}`, expoSlug);
      }
    } catch (e) {
      console.warn('Failed to save APK settings', e);
    }

    setShowApkSetup(false);
    setShowApkProgress(true);
    setApkBuildStatus('Processing and packing local game assets...');
    setApkBuildLog(`Serializing images and audio into portable standalone bundles...`);

    try {
      // 1. Convert all local file URIs to Base64 Data URIs for portable standalone assets (sprites + sounds)
      const processedSprites = await Promise.all(
        (currentProject?.sprites || []).map(async (sprite) => {
          if (sprite.type === 'imported' && sprite.uri && sprite.uri.startsWith('file://')) {
            try {
              const base64 = await FileSystem.readAsStringAsync(sprite.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              return {
                ...sprite,
                uri: `data:image/png;base64,${base64}`,
              };
            } catch (err) {
              console.warn(`Failed to convert sprite ${sprite.name} to base64`, err);
              return sprite;
            }
          }
          return sprite;
        })
      );

      const processedSounds = await Promise.all(
        (currentProject?.sounds || []).map(async (sound) => {
          if (sound.type === 'imported' && sound.uri && sound.uri.startsWith('file://')) {
            try {
              const base64 = await FileSystem.readAsStringAsync(sound.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const ext = sound.uri.endsWith('.mp3') ? 'mp3' : 'wav';
              return {
                ...sound,
                uri: `data:audio/${ext};base64,${base64}`,
              };
            } catch (err) {
              console.warn(`Failed to convert sound ${sound.name} to base64`, err);
              return sound;
            }
          }
          return sound;
        })
      );

      const processedProject = {
        ...currentProject,
        sprites: processedSprites,
        sounds: processedSounds,
      };

      setApkBuildStatus('Initializing build on local agent...');
      setApkBuildLog(`Connecting to local agent on ${buildAgentUrl}...`);

      const buildRequestPayload = {
        expoToken,
        projectConfig: {
          name: currentProject?.name || 'Oxion Game',
          slug: expoSlug ? expoSlug.trim() : (currentProject?.name || 'oxion-game').toLowerCase().replace(/[^a-z0-9]/g, '-'),
          owner: expoOwner || undefined,
          bundleIdentifier,
          easProjectId: easProjectId || undefined
        },
        gameData: processedProject
      };

      const response = await fetch(`${buildAgentUrl}/api/v1/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer oxion_dev_build_key'
        },
        body: JSON.stringify(buildRequestPayload)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || `Server responded with status code ${response.status}`);
      }

      const resData = await response.json();
      const { buildId, statusUrl, logUrl } = resData;

      // Map polling URLs dynamically based on the configured agent host
      const parsedStatusUrl = statusUrl.startsWith('http') ? statusUrl : `${buildAgentUrl}${statusUrl}`;
      const parsedLogUrl = logUrl.startsWith('http') ? logUrl : `${buildAgentUrl}${logUrl}`;

      setApkBuildStatus('Build Accepted. Launching EAS build process...');
      setApkBuildLog(prev => `${prev}\n\n✅ Build scheduled with ID: ${buildId}\nMonitoring compiler process stream...\n`);

      // Start Polling Loop
      let isFinished = false;
      const pollTimer = setInterval(async () => {
        if (isFinished) return;
        try {
          const statusRes = await fetch(parsedStatusUrl);
          const statusData = await statusRes.json();
          
          const logRes = await fetch(parsedLogUrl);
          const rawLogText = await logRes.text();
          setApkBuildLog(rawLogText);

          if (statusData.status === 'success') {
            isFinished = true;
            clearInterval(pollTimer);
            setApkBuildStatus('SUCCESS: APK build completed! Check EAS Dashboard.');
            Alert.alert('Build Succeeded!', 'Your Android APK build completed successfully!');
          } else if (statusData.status === 'failed') {
            isFinished = true;
            clearInterval(pollTimer);
            setApkBuildStatus(`FAILED: ${statusData.error}`);
            Alert.alert('Build Failed', statusData.error || 'Check local logs for compile details.');
          } else {
            setApkBuildStatus('Local agent running EAS compilation...');
          }
        } catch (pollErr) {
          console.warn('Log polling error:', pollErr);
        }
      }, 3000);

    } catch (err: any) {
      setApkBuildStatus('FAILED: Could not contact build agent');
      setApkBuildLog(prev => `${prev}\n\n❌ Error: ${err.message}\n\nPlease verify that your local build service is running on ${buildAgentUrl}!`);
    }
  };


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
            const id = currentProject.id;
            closeProject();
            removeProject(id);
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
              <Text style={styles.itemLabel}>Web Export (Experimental)</Text>
            </View>
            <Text style={styles.itemValue}>Ready</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.item} 
            onPress={() => setShowApkSetup(true)}
          >
            <View style={styles.itemLeft}>
              <Smartphone color={theme.colors.primary} size={20} />
              <Text style={styles.itemLabel}>APK Build (Experimental)</Text>
            </View>
            <Text style={styles.itemValue}>Local Agent</Text>
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
            <Text style={[styles.modalTitle, { marginTop: 16, fontSize: 18 }]}>Building Web App (Experimental)</Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 20 }}>{exportStatus}</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${exportProgress}%` }]} />
            </View>
            
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold', marginTop: 10 }}>{exportProgress}%</Text>
          </View>
        </View>
      </Modal>

      {/* APK SETUP MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showApkSetup}
        onRequestClose={() => setShowApkSetup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%', padding: 16 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Smartphone color={theme.colors.primary} size={20} />
                <Text style={styles.modalTitle}>APK Build Setup (Experimental)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowApkSetup(false)}>
                <X color={theme.colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 16, lineHeight: 16 }}>
                Configure your Expo credentials and mobile packaging properties to package your Oxion game into an Android APK through your local build agent.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Local Build Agent URL</Text>
                <TextInput
                  style={styles.formInput}
                  value={buildAgentUrl}
                  onChangeText={setBuildAgentUrl}
                  placeholder="e.g. http://192.168.1.50:3001"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Expo Access Token</Text>
                <TextInput
                  style={styles.formInput}
                  value={expoToken}
                  onChangeText={setExpoToken}
                  secureTextEntry={true}
                  placeholder="Paste your personal access token (EXPO_TOKEN)"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Bundle Identifier (Package Name)</Text>
                <TextInput
                  style={styles.formInput}
                  value={bundleIdentifier}
                  onChangeText={setBundleIdentifier}
                  placeholder="e.g. com.yourname.mygame"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Expo Owner Account (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={expoOwner}
                  onChangeText={setExpoOwner}
                  placeholder="Your Expo Username / Org"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>EAS Project ID (Optional for custom accounts)</Text>
                <TextInput
                  style={styles.formInput}
                  value={easProjectId}
                  onChangeText={setEasProjectId}
                  placeholder="e.g. 96f74b74-c465-42b8-b118-d4451765b06d"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Expo Project Slug (Optional override)</Text>
                <TextInput
                  style={styles.formInput}
                  value={expoSlug}
                  onChangeText={setExpoSlug}
                  placeholder="e.g. game3"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={styles.buildSubmitButton}
                onPress={handleStartApkBuild}
              >
                <Smartphone color="#000" size={18} />
                <Text style={styles.buildSubmitText}>Trigger Local APK Build</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* APK PROGRESS & REAL-TIME LOGS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showApkProgress}
        onRequestClose={() => {
          if (apkBuildStatus.startsWith('SUCCESS') || apkBuildStatus.startsWith('FAILED')) {
            setShowApkProgress(false);
          } else {
            Alert.alert('Build in progress', 'The build is executing on your local build agent. Closing this view will not stop the build.');
            setShowApkProgress(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', padding: 16 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Smartphone color={theme.colors.primary} size={20} />
                <Text style={styles.modalTitle}>Local APK Compiler (Experimental)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowApkProgress(false)}>
                <X color={theme.colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12, flex: 1, minHeight: 380 }}>
              <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
                {apkBuildStatus}
              </Text>
              
              <View style={styles.logConsole}>
                <ScrollView 
                  ref={(ref) => ref?.scrollToEnd({ animated: true })}
                  showsVerticalScrollIndicator={true}
                  style={{ flex: 1 }}
                >
                  <Text style={styles.logText}>
                    {apkBuildLog || 'Waiting for log stream...'}
                  </Text>
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.modalControlBtn, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setShowApkProgress(false)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 12 }}>Dismiss View</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    padding: 8,
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
    borderRadius: 2,
    padding: 6,
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
    borderRadius: 2,
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
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 1,
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
    borderRadius: 1,
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
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 2,
    padding: 8,
    color: theme.colors.text,
    fontSize: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buildSubmitButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 2,
    marginTop: 16,
  },
  buildSubmitText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  logConsole: {
    flex: 1,
    backgroundColor: '#0a0a0d',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 2,
    padding: 8,
    minHeight: 250,
    marginTop: 8,
  },
  logText: {
    color: '#39ff14', // Neon terminal green
    fontFamily: process.platform === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    lineHeight: 14,
  },
  modalControlBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  }
});

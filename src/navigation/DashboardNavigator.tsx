import React, { Suspense, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, ActivityIndicator, DeviceEventEmitter, Alert } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Menu, Save, Settings, Box, Music, Palette,
  Layout, Play, Undo, RotateCcw, Folder, FileText, Bug, Film
} from 'lucide-react-native';
import { theme } from '../theme';
import GamePlayer from '../features/rooms/components/GamePlayer';
import { useProjectStore } from '../store/useProjectStore';
import { FileSystemManager } from '../utils/fileSystemManager';

const SpritesScreen = React.lazy(() => import('../features/sprites/SpritesScreen'));
const ObjectsScreen = React.lazy(() => import('../features/objects/ObjectsScreen'));
const RoomsScreen = React.lazy(() => import('../features/rooms/RoomsScreen'));
const AudioScreen = React.lazy(() => import('../features/audio/AudioScreen'));
const SettingsScreen = React.lazy(() => import('../features/settings/SettingsScreen'));

const Tab = createBottomTabNavigator();

function TopToolbar({ state, navigation, onPlay, onDebug }: any) {
  const [menuVisible, setMenuVisible] = useState(false);
  const closeProject = useProjectStore((state) => state.closeProject);

  return (
    <>
      <View style={styles.topToolbar}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => setMenuVisible(true)}>
            <Menu color={theme.colors.text} size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => {
              const activeProject = useProjectStore.getState().activeProject;
              if (activeProject) {
                FileSystemManager.saveProjectJson(activeProject.id, activeProject);
                Alert.alert('Success', 'Project saved successfully to device storage!');
              }
            }}
          >
            <Save color={theme.colors.text} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const Icon = getIcon(route.name);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.dispatch(
                  CommonActions.navigate({ name: route.name, merge: true })
                );
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={[styles.toolbarButton, isFocused && styles.toolbarButtonActive]}
              >
                <Icon color={isFocused ? theme.colors.primary : theme.colors.text} size={18} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.toolbarRight}>
          <TouchableOpacity style={styles.toolbarButton} onPress={onDebug}>
            <Bug color={theme.colors.secondary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={onPlay}>
            <Play fill={theme.colors.success} color={theme.colors.success} size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => DeviceEventEmitter.emit('room_undo')}>
            <Undo color={theme.colors.text} size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => DeviceEventEmitter.emit('room_redo')}>
            <RotateCcw color={theme.colors.text} size={16} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              closeProject();
            }}>
              <Folder color={theme.colors.text} size={16} />
              <Text style={styles.menuItemText}>Back to Projects</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <FileText color={theme.colors.text} size={16} />
              <Text style={styles.menuItemText}>Documentation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Settings');
            }}>
              <Settings color={theme.colors.text} size={16} />
              <Text style={styles.menuItemText}>Editor Settings</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function getIcon(name: string) {
  switch (name) {
    case 'Sprites': return Palette;
    case 'Objects': return Box;
    case 'Rooms': return Layout;
    case 'Audio': return Music;
    case 'Settings': return Settings;
    default: return Box;
  }
}

export default function DashboardNavigator() {
  const [isTesting, setIsTesting] = React.useState(false);
  const [isDebug, setIsDebug] = React.useState(false);

  return (
    <>
      <Tab.Navigator
        id="dashboard"
        tabBar={() => null}
        layout={({ children, state, navigation }) => {
          return (
            <View style={styles.editorLayout}>
              <TopToolbar
                state={state}
                navigation={navigation}
                onPlay={() => { setIsDebug(false); setIsTesting(true); }}
                onDebug={() => { setIsDebug(true); setIsTesting(true); }}
              />
              <View style={styles.contentArea}>
                <View style={styles.canvasContainer}>
                  <Suspense fallback={
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                      <Text style={styles.loadingText}>Loading engine module...</Text>
                    </View>
                  }>
                    {children}
                  </Suspense>
                </View>
              </View>
            </View>
          );
        }}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Rooms" component={RoomsScreen} options={{ title: 'Rooms' }} />
        <Tab.Screen name="Objects" component={ObjectsScreen} options={{ title: 'Objects' }} />
        <Tab.Screen name="Sprites" component={SpritesScreen} options={{ title: 'Sprites' }} />
        <Tab.Screen name="Audio" component={AudioScreen} options={{ title: 'Audio' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Tab.Navigator>

      <GamePlayer
        visible={isTesting}
        onClose={() => setIsTesting(false)}
        debug={isDebug}
      />
    </>
  );
}


const styles = StyleSheet.create({
  editorLayout: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topToolbar: {
    height: 50,
    backgroundColor: '#16191E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
  },
  toolbarButtonActive: {
    backgroundColor: '#2E333D',
    borderRadius: 4,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
  contentArea: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  floatingLeftTools: {
    position: 'absolute',
    left: 20,
    top: 20,
    backgroundColor: '#16191E',
    padding: 8,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 20,
  },
  toolButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: '#1E2228',
  },
  canvasContainer: {
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemText: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    ...theme.typography.caption,
    marginTop: 16,
    color: theme.colors.textMuted,
  },
});

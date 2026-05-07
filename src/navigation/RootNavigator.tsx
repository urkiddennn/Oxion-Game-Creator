import React, { useEffect } from 'react';
import { View } from 'react-native';
import { theme } from '../theme';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useProjectStore } from '../store/useProjectStore';
import LaunchpadScreen from '../features/launchpad/LaunchpadScreen';
import DashboardNavigator from './DashboardNavigator';
import GUIBuilder from '../features/gui/GUIBuilder';
import GamePlayer from '../features/rooms/components/GamePlayer';

// Attempt to load the pre-bundled game project configuration
let bundledProject: any = null;
try {
  bundledProject = require('../../assets/project.json');
} catch (e) {
  bundledProject = {};
}

const Stack = createStackNavigator();

export default function RootNavigator() {
  const activeProject = useProjectStore((state) => state.activeProject);
  const closeProject = useProjectStore((state) => state.closeProject);

  useEffect(() => {
    // Force launchpad on startup if not a standalone app
    const isStandalone = bundledProject && bundledProject.rooms && bundledProject.rooms.length > 0;
    if (!isStandalone) {
      closeProject();
    }
  }, []);

  const isStandalone = bundledProject && bundledProject.rooms && bundledProject.rooms.length > 0;

  if (isStandalone) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <GamePlayer
          visible={true}
          onClose={() => {}} // Standalone doesn't exit since it's the whole app
          projectOverride={bundledProject}
        />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: theme.colors.background,
        card: '#16191E',
        text: theme.colors.text,
        border: theme.colors.border,
      }
    }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!activeProject ? (
          <Stack.Screen name="Launchpad" component={LaunchpadScreen} />
        ) : (
          <Stack.Screen name="Dashboard" component={DashboardNavigator} />
        )}
        <Stack.Screen name="GUIBuilder" component={GUIBuilder} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

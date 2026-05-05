import React, { useEffect } from 'react';
import { theme } from '../theme';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useProjectStore } from '../store/useProjectStore';
import LaunchpadScreen from '../features/launchpad/LaunchpadScreen';
import DashboardNavigator from './DashboardNavigator';
import GUIBuilder from '../features/gui/GUIBuilder';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const activeProject = useProjectStore((state) => state.activeProject);
  const closeProject = useProjectStore((state) => state.closeProject);

  useEffect(() => {
    // Force launchpad on startup
    closeProject();
  }, []);

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

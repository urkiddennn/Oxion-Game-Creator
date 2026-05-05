import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
    <NavigationContainer>
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

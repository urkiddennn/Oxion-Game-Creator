import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useProjectStore } from '../store/useProjectStore';
import LaunchpadScreen from '../features/launchpad/LaunchpadScreen';
import DashboardNavigator from './DashboardNavigator';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const activeProject = useProjectStore((state) => state.activeProject);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!activeProject ? (
          <Stack.Screen name="Launchpad" component={LaunchpadScreen} />
        ) : (
          <Stack.Screen name="Dashboard" component={DashboardNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import 'react-native-gesture-handler';
import React from 'react';
import { theme } from './src/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  React.useEffect(() => {
    // Hide native navigation bar on Android
    if (Platform.OS === 'android') {
      const NavigationBar = require('expo-navigation-bar');
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }

    // Hide splash screen after 1.5 seconds or when app is ready
    setTimeout(async () => {
      await SplashScreen.hideAsync();
    }, 1500);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <RNStatusBar hidden={true} translucent={true} />
        <RootNavigator />
        <StatusBar hidden={true} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

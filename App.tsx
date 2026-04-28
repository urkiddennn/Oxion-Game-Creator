import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';

import { StatusBar as RNStatusBar } from 'react-native';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RNStatusBar hidden={true} translucent={true} />
        <RootNavigator />
        <StatusBar hidden={true} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

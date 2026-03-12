import React, { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { initBackgroundLocation } from './src/utils/backgroundTasks';
import SyncEngine from './src/services/SyncEngine';

export default function App() {
  useEffect(() => {
    initBackgroundLocation();
    SyncEngine.init();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}

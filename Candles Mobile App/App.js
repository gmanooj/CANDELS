import React from 'react';
import { NavigationContainer } from '@react-navigation/native'; // Standard container
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { SecureOfflineProvider } from './src/context/SecureOfflineContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SecureOfflineProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </SecureOfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
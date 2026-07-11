import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { SecureOfflineProvider } from './src/context/SecureOfflineContext';
import { SidebarProvider } from './src/context/SidebarContext';
import { LoadingProvider } from './src/context/LoadingContext';
import GlobalSidebar from './src/components/GlobalSidebar';
import GlobalLoader from './src/components/GlobalLoader';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SecureOfflineProvider>
            <LoadingProvider>
              <NavigationContainer>
                <SidebarProvider>
                  <AppNavigator />
                  <GlobalSidebar />
                </SidebarProvider>
              </NavigationContainer>
              <GlobalLoader />
            </LoadingProvider>
          </SecureOfflineProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack'; // Use standard stack package
import LoginScreen from '../screens/LoginScreen';
import OfflinePinScreen from '../screens/OfflinePinScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SlideViewerScreen from '../screens/SlideViewerScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
                gestureEnabled: true,
            }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OfflinePin" component={OfflinePinScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SlideViewer" component={SlideViewerScreen} />
        </Stack.Navigator>
    );
}
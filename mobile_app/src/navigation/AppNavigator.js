import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from '../screens/LandingScreen';
import IntroScreen from '../screens/IntroScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SlideViewerScreen from '../screens/SlideViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import PendingAllocationHubScreen from '../screens/PendingAllocationHubScreen';
import DigitalDeclarationScreen from '../screens/DigitalDeclarationScreen';
import ActiveWorkspaceScreen from '../screens/ActiveWorkspaceScreen';
import InvitePeopleScreen from '../screens/InvitePeopleScreen';
import WorkspaceTransitionScreen from '../screens/WorkspaceTransitionScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';
import OfflineProjectSetupScreen from '../screens/OfflineProjectSetupScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
                gestureEnabled: false,
            }}
        >
            <Stack.Screen 
                name="Landing" 
                component={LandingScreen}
                options={{ gestureEnabled: false, animationEnabled: false }}
            />
            <Stack.Screen name="Intro" component={IntroScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SlideViewer" component={SlideViewerScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="CreateTeam" component={CreateTeamScreen} />
            <Stack.Screen name="PendingAllocationHub" component={PendingAllocationHubScreen} />
            <Stack.Screen name="DigitalDeclaration" component={DigitalDeclarationScreen} />
            <Stack.Screen name="ActiveWorkspace" component={ActiveWorkspaceScreen} />
            <Stack.Screen name="InvitePeople" component={InvitePeopleScreen} />
            <Stack.Screen 
                name="WorkspaceTransition" 
                component={WorkspaceTransitionScreen}
                options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
            <Stack.Screen name="AboutUs" component={AboutUsScreen} />
            <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
            <Stack.Screen name="OfflineProjectSetup" component={OfflineProjectSetupScreen} />
        </Stack.Navigator>
    );
}
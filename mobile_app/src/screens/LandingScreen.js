import React from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import LandingAnimation from '../components/LandingAnimation';

/**
 * LandingScreen
 * 
 * The very first screen shown when the app opens.
 * Plays the full CANDELS landing animation, then navigates to Login.
 * Has no UI of its own beyond the animation component.
 */
export default function LandingScreen({ navigation }) {
    const handleAnimationComplete = () => {
        // Replace so user can't go back to the splash
        navigation.replace('Intro');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#141420" />
            <LandingAnimation onComplete={handleAnimationComplete} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#141420',
    },
});

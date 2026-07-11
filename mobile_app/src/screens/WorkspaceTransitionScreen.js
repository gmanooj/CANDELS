import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, StatusBar } from 'react-native';
import CandelsLoader from '../components/CandelsLoader';

const { width: W, height: H } = Dimensions.get('window');

/**
 * WorkspaceTransitionScreen
 * 
 * Full-screen dark animated splash that plays the complete CANDELS animation
 * before automatically forwarding to the ActiveWorkspace screen.
 * 
 * Route params: { teamCode, projectName, ...rest }
 */
export default function WorkspaceTransitionScreen({ route, navigation }) {
    const { teamCode, projectName, ...rest } = route.params || {};
    const [animDone, setAnimDone] = useState(false);

    // Fade-in the whole screen
    const fadeIn = useRef(new Animated.Value(0)).current;
    // Fade-out when animation completes
    const fadeOut = useRef(new Animated.Value(1)).current;
    // Subtle pulse on the project name text
    const textFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade screen in immediately
        Animated.timing(fadeIn, {
            toValue: 1,
            duration: 350,
            easing: Easing.ease,
            useNativeDriver: true,
        }).start();

        // Fade project name in after a small delay
        setTimeout(() => {
            Animated.timing(textFade, {
                toValue: 1,
                duration: 600,
                easing: Easing.ease,
                useNativeDriver: true,
            }).start();
        }, 400);
    }, []);

    const handleAnimComplete = () => {
        setAnimDone(true);
        // Fade out then navigate
        Animated.timing(fadeOut, {
            toValue: 0,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
        }).start(() => {
            navigation.replace('ActiveWorkspace', { teamCode, projectName, ...rest });
        });
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
            <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

            {/* Subtle background glow blobs */}
            <View style={[styles.orb, styles.orb1]} />
            <View style={[styles.orb, styles.orb2]} />

            <Animated.View style={[styles.content, { opacity: fadeOut }]}>
                {/* Brand subtitle */}
                <Animated.Text style={[styles.subtitle, { opacity: textFade }]}>
                    TEAM BRIDGE
                </Animated.Text>

                {/* CANDELS animated logo */}
                <View style={styles.loaderWrapper}>
                    <CandelsLoader size={52} onComplete={handleAnimComplete} />
                </View>

                {/* Project name appears below */}
                <Animated.Text style={[styles.projectName, { opacity: textFade }]} numberOfLines={1}>
                    {projectName ? `${projectName.toUpperCase()} WORKSPACE` : 'WORKSPACE'}
                </Animated.Text>

                <Animated.Text style={[styles.loadingHint, { opacity: textFade }]}>
                    Loading workspace modules...
                </Animated.Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    orb1: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: '#973BED',
        opacity: 0.08,
        top: -60,
        left: -60,
    },
    orb2: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#007CFF',
        opacity: 0.07,
        bottom: -40,
        right: -40,
    },
    orb: {},
    content: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 6,
        marginBottom: 28,
        textTransform: 'uppercase',
    },
    loaderWrapper: {
        marginBottom: 28,
    },
    projectName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: 0.5,
        marginBottom: 10,
        textAlign: 'center',
    },
    loadingHint: {
        fontSize: 13,
        color: '#ffffff',
        fontWeight: '500',
        letterSpacing: 0.3,
        opacity: 0.6,
    },
});

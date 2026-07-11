/**
 * LandingAnimation.js
 *
 * Full-screen dark-themed landing splash that:
 * 1. Fades in a dark background
 * 2. Shows "Team Bridge" + "Powered by" subtitle
 * 3. Plays the full CANDELS animated letter sequence with underline
 * 4. On animation complete:
 *    - Shrinks & fades "Team Bridge" + subtitle out
 *    - Moves CANDELS letters to top-left corner while scaling down
 *    - Fades background to transparent
 *    - Calls onComplete() so LoginScreen reveals itself
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import CandelsLoader, { CANDELS_ANIMATION_TOTAL_MS } from './CandelsLoader';

const { width: W, height: H } = Dimensions.get('window');

// Where CANDELS logo should land (top-left, matching LoginScreen navbar)
const TARGET_X = 16;
const TARGET_Y = Platform.OS === 'ios' ? 54 : 36;

export default function LandingAnimation({ onComplete }) {
    const [phase, setPhase] = useState('in'); // 'in' | 'hold' | 'exit' | 'done'

    // ── Shared animateds ────────────────────────────────────────────────────
    const bgOpacity        = useRef(new Animated.Value(1)).current;  // Start solid — no fade-in delay
    const contentOpacity   = useRef(new Animated.Value(0)).current;  // title + subtitle
    const loaderOpacity    = useRef(new Animated.Value(0)).current;

    // For the exit fly — translate CANDELS to top-left
    const loaderX = useRef(new Animated.Value(0)).current;  // offset from center
    const loaderY = useRef(new Animated.Value(0)).current;
    const loaderScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Phase 1 — Fade in content (bg is already solid)
        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 800,
                delay: 300,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
            Animated.timing(loaderOpacity, {
                toValue: 1,
                duration: 800,
                delay: 500,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
        ]).start();

        // Phase 2 — Wait for full CANDELS animation to complete, then exit
        const exitDelay = CANDELS_ANIMATION_TOTAL_MS + 200;

        const exitTimer = setTimeout(() => {
            setPhase('exit');

            // Calculate how far to move to hit top-left corner
            // Loader is centered: center of screen is (W/2, H/2)
            // CANDELS row is ~224px wide, 48px tall (at size=52 → scale~1.08)
            const loaderW  = 224 * (52 / 48);
            const loaderH  = 48  * (52 / 48);
            const centerX  = W / 2 - loaderW / 2;
            const centerY  = H / 2 - loaderH / 2;
            const finalDX  = TARGET_X - centerX;
            const finalDY  = TARGET_Y - centerY;

            Animated.parallel([
                // Fade out title/subtitle
                Animated.timing(contentOpacity, {
                    toValue: 0,
                    duration: 700,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                // Fly CANDELS to top-left
                Animated.timing(loaderX, {
                    toValue: finalDX,
                    duration: 1200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(loaderY, {
                    toValue: finalDY,
                    duration: 1200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                // Shrink CANDELS to small logo size
                Animated.timing(loaderScale, {
                    toValue: 0.38,
                    duration: 1200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                // Fade bg to transparent — starts halfway through the fly
                Animated.timing(bgOpacity, {
                    toValue: 0,
                    duration: 900,
                    delay: 500,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                // Fade CANDELS out at the very end
                Animated.timing(loaderOpacity, {
                    toValue: 0,
                    duration: 400,
                    delay: 1000,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setPhase('done');
                if (onComplete) onComplete();
            });
        }, exitDelay);

        return () => clearTimeout(exitTimer);
    }, []);

    if (phase === 'done') return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <StatusBar barStyle="light-content" backgroundColor="#080810" />

            {/* Dark background */}
            <Animated.View style={[styles.bg, { opacity: bgOpacity }]}>
                {/* Ambient glow orbs */}
                <View style={styles.orb1} />
                <View style={styles.orb2} />
            </Animated.View>

            {/* Center content */}
            <View style={styles.center}>
                {/* Title area */}
                <Animated.View style={[styles.titleBlock, { opacity: contentOpacity }]}>
                    <Text style={styles.poweredBy}>TEAM BRIDGE</Text>
                    <Text style={styles.poweredBySub}>Powered by</Text>
                </Animated.View>

                {/* CANDELS animated loader */}
                <Animated.View
                    style={{
                        opacity: loaderOpacity,
                        transform: [
                            { translateX: loaderX },
                            { translateY: loaderY },
                            { scale: loaderScale },
                        ],
                    }}
                >
                    <CandelsLoader size={52} />
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#141420',  // solid dark grey — always visible
        overflow: 'hidden',
    },
    orb1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#00D2FF', // Vivid Cyan
        opacity: 0.07,
        top: -80,
        left: -60,
    },
    orb2: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: '#E040FB', // Neon Violet
        opacity: 0.05,
        bottom: -60,
        right: -50,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,
    },
    titleBlock: {
        alignItems: 'center',
        marginBottom: 18,
    },
    poweredBy: {
        fontSize: 13,
        fontWeight: '900',
        color: '#ffffffff',
        letterSpacing: 7,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    poweredBySub: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ffffffff',
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
});

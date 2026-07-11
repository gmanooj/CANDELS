import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useLoading } from '../context/LoadingContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Comet spinner: 8 dots in a ring with trailing opacity (mltShdSpin equivalent) ---
const DOT_COUNT  = 8;
const RING_RADIUS = 18; // px from center to dot center
const DOT_SIZE   = 5;   // size of each dot
const COLOR      = '#F27A1A'; // orange

function CometSpinner() {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1700,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
        return () => rotateAnim.stopAnimation();
    }, []);

    const rotate = rotateAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Dots — leading dot is fully opaque, trailing dots fade to near-invisible
    const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
        const angle     = (i / DOT_COUNT) * 2 * Math.PI;
        const x         = Math.cos(angle) * RING_RADIUS;
        const y         = Math.sin(angle) * RING_RADIUS;
        // Opacity: dot 0 is lead (brightest), last dot is faintest
        const opacity   = 1 - (i / DOT_COUNT) * 0.85;
        const size      = DOT_SIZE - (i / DOT_COUNT) * 1.5; // lead dot bigger, trail smaller

        return (
            <View
                key={i}
                style={{
                    position: 'absolute',
                    width: Math.max(size, 2),
                    height: Math.max(size, 2),
                    borderRadius: Math.max(size, 2) / 2,
                    backgroundColor: COLOR,
                    opacity,
                    left: RING_RADIUS + x - Math.max(size, 2) / 2,
                    top:  RING_RADIUS + y - Math.max(size, 2) / 2,
                }}
            />
        );
    });

    const containerSize = RING_RADIUS * 2 + DOT_SIZE;

    return (
        <Animated.View
            style={{
                width: containerSize,
                height: containerSize,
                transform: [{ rotate }],
            }}
        >
            {dots}
        </Animated.View>
    );
}

// --- GlobalLoader ---
export default function GlobalLoader() {
    const { isLoading } = useLoading();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isLoading ? 1 : 0,
            duration: isLoading ? 150 : 200,
            easing: Easing.ease,
            useNativeDriver: true,
        }).start();
    }, [isLoading]);

    if (!isLoading) return null;

    return (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <CometSpinner />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999999,
    },
});

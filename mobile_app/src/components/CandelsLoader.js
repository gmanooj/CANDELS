import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Letter SVG paths (64×64 viewBox) ────────────────────────────────────────
// ─── Letter SVG paths (64×64 viewBox) ────────────────────────────────────────
const LETTERS = [
    { path: "M 52,10 A 26,26 0 1,0 52,54",                                              len: 130, gradId: 'gC', c1: '#F27A1A', c2: '#FF5252' }, // Electric Orange to Deep Coral
    { path: "M 8,58 L 32,6 L 56,58 M 18,38 L 46,38",                                   len: 130, gradId: 'gA', c1: '#00D2FF', c2: '#F27A1A' }, // Vivid Cyan to Deep Royal Blue
    { path: "M 10,58 L 10,6 L 54,58 L 54,6",                                            len: 130, gradId: 'gN', c1: '#FFDE43', c2: '#FF8F00' }, // Laser Yellow to Dark Amber
    { path: "M 10,6 L 10,58 L 28,58 A 24,26 0 0,0 28,6 Z",                             len: 140, gradId: 'gD', c1: '#E040FB', c2: '#651FFF' }, // Neon Violet to Deep Indigo
    { path: "M 54,6 L 10,6 L 10,58 L 54,58 M 10,32 L 46,32",                          len: 140, gradId: 'gE', c1: '#00D2FF', c2: '#FF9F43' }, // Cross-Mix: Blue to Orange Blend
    { path: "M 10,6 L 10,58 L 54,58",                                                   len: 110, gradId: 'gL', c1: '#FFDE43', c2: '#E040FB' }, // Cross-Mix: Yellow to Violet Blend
    { path: "M 54,14 C 54,6 10,6 10,24 C 10,32 54,32 54,50 C 54,62 10,58 10,50",      len: 160, gradId: 'gS', c1: '#00D2FF', c2: '#651FFF' }, // Power Mix: Cyan Blue to Dark Violet
];

// 2-color brand theme overrides (White & Orange)
const BRAND_COLORS = [
    { c1: '#ffffff', c2: '#F27A1A' },
    { c1: '#F27A1A', c2: '#ffffff' },
    { c1: '#ffffff', c2: '#F27A1A' },
    { c1: '#F27A1A', c2: '#ffffff' },
    { c1: '#ffffff', c2: '#F27A1A' },
    { c1: '#F27A1A', c2: '#ffffff' },
    { c1: '#ffffff', c2: '#F27A1A' },
];

// Total stagger: 7 letters × 120ms = 840ms stagger + 2000ms last letter = ~2840ms total
const LETTER_DURATION  = 3000;
const LETTER_STAGGER   = 200;
const TOTAL_LETTERS    = LETTERS.length;
const ANIMATION_TOTAL  = LETTER_STAGGER * (TOTAL_LETTERS - 1) + LETTER_DURATION + 400; // +400 underline

function AnimatedLetter({ path, len, gradId, c1, c2, delay = 0 }) {
    const dashAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const timeout = setTimeout(() => {
            Animated.loop(
                Animated.timing(dashAnim, {
                    toValue: 1,
                    duration: LETTER_DURATION,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                })
            ).start();
        }, delay);
        return () => clearTimeout(timeout);
    }, []);

    const dashOffset = dashAnim.interpolate({
        inputRange:  [0, 0.5, 1],
        outputRange: [len + 5, 5, 5],
    });

    const dashArray = dashAnim.interpolate({
        inputRange:  [0,   0.5, 1],
        outputRange: [`0 1 ${len - 1} 0`, `0 ${len - 1} 1 0`, `${len - 1} 1 0 0`],
    });

    return (
        <Svg width={32} height={48} viewBox="0 0 64 64">
            <Defs>
                <LinearGradient id={gradId} x1="0" y1="62" x2="0" y2="2" gradientUnits="userSpaceOnUse">
                    <Stop stopColor={c1} offset="0" />
                    <Stop stopColor={c2} offset="1" />
                </LinearGradient>
            </Defs>
            <AnimatedPath
                d={path}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
            />
        </Svg>
    );
}

// ─── Animated underline ───────────────────────────────────────────────────────
function AnimatedUnderline({ totalWidth, delay }) {
    const lineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const timeout = setTimeout(() => {
            Animated.loop(
                Animated.timing(lineAnim, {
                    toValue: 1,
                    duration: LETTER_DURATION,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                })
            ).start();
        }, delay);
        return () => clearTimeout(timeout);
    }, []);

    const width = lineAnim.interpolate({
        inputRange:  [0, 0.5, 1],
        outputRange: [0, totalWidth, totalWidth],
    });

    const opacity = lineAnim.interpolate({
        inputRange:  [0, 0.2, 0.8, 1],
        outputRange: [0, 1, 1, 0.5],
    });

    return (
        <Animated.View style={{ width, height: 2, opacity, borderRadius: 1, overflow: 'hidden', marginTop: 2 }}>
            <Svg width={totalWidth} height={2} viewBox={`0 0 ${totalWidth} 2`}>
                <Defs>
                    <LinearGradient id="gLine" x1="0" y1="0" x2={totalWidth} y2="0" gradientUnits="userSpaceOnUse">
                        <Stop stopColor="#6548d8" offset="0" />
                        <Stop stopColor="#F27A1A" offset="0.33" />
                        <Stop stopColor="#6548d8" offset="0.66" />
                        <Stop stopColor="#F27A1A" offset="1" />
                    </LinearGradient>
                </Defs>
                <Path d={`M 0,1 L ${totalWidth},1`} stroke="url(#gLine)" strokeWidth="2" />
            </Svg>
        </Animated.View>
    );
}

// ─── Main Loader ─────────────────────────────────────────────────────────────
export const CANDELS_ANIMATION_TOTAL_MS = ANIMATION_TOTAL;

export default function CandelsLoader({ size = 40, onComplete, brandColors = false }) {
    const scale = size / 48;
    const totalWidth = 32 * TOTAL_LETTERS; // each letter = 32px wide
    const lineDelay  = LETTER_STAGGER * (TOTAL_LETTERS - 1) + 200; // start after last letter begins

    useEffect(() => {
        if (!onComplete) return;
        const timer = setTimeout(onComplete, ANIMATION_TOTAL);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <View style={styles.wrapper}>
            <View style={[styles.column, { transform: [{ scale }] }]}>
                <View style={styles.row}>
                    {LETTERS.map((l, i) => {
                        const c1 = brandColors ? BRAND_COLORS[i].c1 : l.c1;
                        const c2 = brandColors ? BRAND_COLORS[i].c2 : l.c2;
                        return (
                            <AnimatedLetter
                                key={l.gradId}
                                path={l.path}
                                len={l.len}
                                gradId={l.gradId}
                                c1={c1}
                                c2={c2}
                                delay={i * LETTER_STAGGER}
                            />
                        );
                    })}
                </View>
                <AnimatedUnderline totalWidth={totalWidth} delay={lineDelay} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    column: {
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

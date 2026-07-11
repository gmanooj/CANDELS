import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ═══════════════════════════════════════════════════════
//  ECLIPSE PREMIUM BUTTON
//  variant: 'solid' | 'ghost' | 'outline' | 'glow'
//  size:    'sm'    | 'md'   | 'lg'
// ═══════════════════════════════════════════════════════
export default function PremiumButton({
    title,
    onPress,
    disabled,
    style,
    textStyle,
    variant = 'solid',
    size = 'md',
    color,        // optional override color
    borderRadius, // optional override border radius
    leftIcon,     // optional leading element
}) {
    const theme = useTheme();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const resolvedColor = color || theme.colors.accent;

    // Press-in scale animation
    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 50,
            bounciness: 6,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 8,
        }).start();
    };

    // ── Size Tokens ──────────────────────────────────────────────
    const sizeTokens = {
        sm: { paddingVertical: 9,  paddingHorizontal: 18, fontSize: 13, borderRadius: 10 },
        md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15, borderRadius: 14 },
        lg: { paddingVertical: 17, paddingHorizontal: 28, fontSize: 16, borderRadius: 16 },
    }[size] || { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15, borderRadius: 14 };

    // ── Variant Styles ────────────────────────────────────────────
    const variantContainer = {
        solid: {
            backgroundColor: resolvedColor,
            shadowColor: resolvedColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 4,
        },
        glow: {
            backgroundColor: resolvedColor,
            shadowColor: resolvedColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.38,
            shadowRadius: 20,
            elevation: 7,
        },
        outline: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: resolvedColor,
        },
        ghost: {
            backgroundColor: `rgba(99, 102, 241, 0.08)`,
        },
    }[variant] || {};

    const variantText = {
        solid:   { color: '#FFFFFF' },
        glow:    { color: '#FFFFFF' },
        outline: { color: resolvedColor },
        ghost:   { color: resolvedColor },
    }[variant] || { color: '#FFFFFF' };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: style?.width || '100%' }}>
            <TouchableOpacity
                style={[
                    styles.buttonBase,
                    variantContainer,
                    {
                        paddingVertical: sizeTokens.paddingVertical,
                        paddingHorizontal: sizeTokens.paddingHorizontal,
                        borderRadius: borderRadius !== undefined ? borderRadius : sizeTokens.borderRadius,
                    },
                    disabled && styles.disabled,
                    style && { ...style, width: undefined }, // strip width since it's on Animated.View
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={1}
            >
                {leftIcon && leftIcon}
                <Text style={[
                    styles.buttonText,
                    variantText,
                    { fontSize: sizeTokens.fontSize },
                    textStyle,
                ]}>
                    {title}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    buttonBase: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    disabled: {
        opacity: 0.45,
    },
    buttonText: {
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ═══════════════════════════════════════════════════════
//  ECLIPSE GLASS CARD — Multi-Variant Component
//  variant: 'default' | 'elevated' | 'subtle' | 'accent'
// ═══════════════════════════════════════════════════════
export default function GlassCard({ children, style, variant = 'default' }) {
    const theme = useTheme();

    const baseStyle = {
        default:  theme.styles.glassCard,
        elevated: theme.styles.glassCardElevated,
        subtle:   theme.styles.glassCardSubtle,
        accent:   theme.styles.glassCardAccent,
    }[variant] || theme.styles.glassCard;

    return (
        <View style={[baseStyle, style]}>
            {children}
        </View>
    );
}
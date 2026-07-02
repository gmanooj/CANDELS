import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function GlassCard({ children, style }) {
    const theme = useTheme();

    return (
        <View style={[styles.card, theme.styles.glassCard, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        marginVertical: 8,
        overflow: 'hidden',
    }
});

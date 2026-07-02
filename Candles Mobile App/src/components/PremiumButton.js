import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function PremiumButton({ title, onPress, style, textStyle, disabled }) {
    const theme = useTheme();

    return (
        <TouchableOpacity 
            onPress={onPress} 
            disabled={disabled}
            activeOpacity={0.8}
            style={[
                theme.styles.primaryButton, 
                style,
                disabled && { opacity: 0.5 }
            ]}
        >
            <Text style={[styles.btnText, textStyle]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    }
});

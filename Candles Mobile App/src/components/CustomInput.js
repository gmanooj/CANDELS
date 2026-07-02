import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CustomInput({ label, placeholder, value, onChangeText, secureTextEntry, keyboardType, style }) {
    const theme = useTheme();

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>}
            <TextInput
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                style={[theme.styles.inputField]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});

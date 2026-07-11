import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// ═══════════════════════════════════════════════════════
//  ECLIPSE CUSTOM INPUT — Floating Label Component
//  Features: animated floating label, left icon slot,
//            password visibility toggle, focus glow ring
// ═══════════════════════════════════════════════════════
export default function CustomInput({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoCapitalize = 'none',
    leftIcon,      // JSX element for leading icon
    editable = true,
    multiline = false,
    numberOfLines,
    style,
}) {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    const isFloating = isFocused || (value && value.length > 0);

    useEffect(() => {
        Animated.timing(labelAnim, {
            toValue: isFloating ? 1 : 0,
            duration: 180,
            useNativeDriver: false,
        }).start();
    }, [isFloating]);

    // Animated label position and size
    const labelTop = labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [Platform.OS === 'ios' ? 15 : 13, -9],
    });
    const labelFontSize = labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [15, 11],
    });
    const labelColor = labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.textSubtle, isFocused ? theme.colors.accent : theme.colors.textMuted],
    });
    const labelBgOpacity = labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <View style={[styles.container, style]}>
            <View style={[
                styles.inputWrapper,
                isFocused && styles.inputWrapperFocused,
                !editable && styles.inputWrapperLocked,
            ]}>
                {/* Left Icon Slot */}
                {leftIcon && (
                    <View style={styles.leftIconContainer}>
                        {leftIcon}
                    </View>
                )}

                {/* Animated Floating Label */}
                <Animated.View style={[
                    styles.floatingLabelContainer,
                    { top: labelTop, opacity: labelBgOpacity },
                    leftIcon && { left: 46 },
                ]}>
                    <Animated.Text style={[
                        styles.floatingLabel,
                        { fontSize: labelFontSize, color: labelColor },
                        isFloating && styles.floatingLabelRaised,
                    ]}>
                        {label}
                    </Animated.Text>
                </Animated.View>

                {/* Text Input */}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={isFloating ? '' : ''}
                    placeholderTextColor={theme.colors.textSubtle}
                    secureTextEntry={secureTextEntry && !isPasswordVisible}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    editable={editable}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={[
                        styles.textInput,
                        leftIcon && { paddingLeft: 42 },
                        secureTextEntry && { paddingRight: 48 },
                        multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 18 },
                        !editable && { color: theme.colors.textMuted },
                    ]}
                />

                {/* Password Toggle */}
                {secureTextEntry && (
                    <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setIsPasswordVisible(v => !v)}
                        activeOpacity={0.7}
                    >
                        <Feather 
                            name={isPasswordVisible ? "eye" : "eye-off"} 
                            size={18} 
                            color={theme.colors.textSubtle} 
                            style={[!isPasswordVisible && { opacity: 0.6 }]} 
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        alignSelf: 'stretch',
    },
    inputWrapper: {
        backgroundColor: 'rgba(255, 255, 255, 1)',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 60,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 15 : 13,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    inputWrapperFocused: {
        backgroundColor: '#FFFFFF',
        borderColor: '#fb6e1aff',
        shadowColor: '#fb6e1aff',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        elevation: 4,
    },
    inputWrapperLocked: {
        backgroundColor: 'rgba(255, 255, 255, 1)',
        borderColor: '#ffffffff',
    },
    floatingLabelContainer: {
        position: 'absolute',
        left: 18,
        zIndex: 10,
    },
    floatingLabel: {
        fontWeight: '600',
        backgroundColor: 'transparent',
    },
    floatingLabelRaised: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    leftIconContainer: {
        position: 'absolute',
        left: 14,
        zIndex: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#1A1A2E',
        paddingTop: Platform.OS === 'ios' ? 8 : 4,
        minHeight: Platform.OS === 'ios' ? 32 : 36,
        paddingVertical: 0,
    },
    passwordToggle: {
        position: 'absolute',
        right: 14,
        padding: 4,
    },
    passwordToggleIcon: {
        fontSize: 16,
    },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSecureOffline } from '../context/SecureOfflineContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import CustomInput from '../components/CustomInput';
import PremiumButton from '../components/PremiumButton';

export default function OfflinePinScreen({ navigation }) {
    const { unlockOfflineVault, incorrectAttempts } = useSecureOffline();
    const theme = useTheme();

    const [pin, setPin] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUnlock = async () => {
        if (pin.length !== 4 || isNaN(pin)) {
            Alert.alert("Input Error", "Please provide a valid 4-digit numeric PIN.");
            return;
        }
        if (!password.trim()) {
            Alert.alert("Input Error", "Please enter your master password credentials.");
            return;
        }

        setLoading(true);
        try {
            const res = await unlockOfflineVault(password, pin);
            if (res.success) {
                navigation.navigate("Dashboard");
            }
        } catch (error) {
            Alert.alert("Authentication Failed", error.message);
            // If the 5-strike lockout wipes the cache, we redirect to login
            if (error.message.includes("completely wiped")) {
                navigation.navigate("Login");
            }
        } finally {
            setLoading(false);
            setPin("");
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.mainLayout, { backgroundColor: theme.colors.backgroundStart }]}>
                    
                    <Text style={[styles.title, { color: theme.colors.primary }]}>🔒 Secure Offline Access</Text>
                    <Text style={[styles.desc, { color: theme.colors.textMuted }]}>
                        Provide your 4-Digit PIN and master key password to decrypt your offline workspace.
                    </Text>

                    <GlassCard style={styles.card}>
                        <Text style={styles.cardHeader}>Verify Identity</Text>
                        
                        {incorrectAttempts > 0 ? (
                            <Text style={styles.attemptsWarn}>
                                Failed attempts: {incorrectAttempts}/5. App will wipe data on the 5th failure.
                            </Text>
                        ) : null}

                        <CustomInput
                            label="4-Digit Secure PIN"
                            placeholder="Enter 4-digit PIN"
                            value={pin}
                            onChangeText={setPin}
                            keyboardType="numeric"
                            secureTextEntry={true}
                        />

                        <CustomInput
                            label="Master Password"
                            placeholder="Enter password (e.g. Monooj@12)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                        />

                        <PremiumButton
                            title={loading ? "Decrypting Vault..." : "Verify & Unlock"}
                            onPress={handleUnlock}
                            disabled={loading}
                            style={{ marginTop: 15, backgroundColor: '#10b981' }}
                        />

                        <PremiumButton
                            title="Cancel"
                            onPress={() => navigation.navigate("Login")}
                            style={{ marginTop: 10, backgroundColor: '#64748b' }}
                            disabled={loading}
                        />
                    </GlassCard>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardContainer: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    mainLayout: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    desc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    card: {
        alignSelf: 'stretch',
    },
    cardHeader: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 12,
    },
    attemptsWarn: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
    }
});

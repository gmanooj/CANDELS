import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSecureOffline } from '../context/SecureOfflineContext';
import GlassCard from '../components/GlassCard';
import CustomInput from '../components/CustomInput';
import PremiumButton from '../components/PremiumButton';

export default function LoginScreen({ navigation }) {
    const { user, login, logout, loading, token, masterPassword } = useAuth();
    const { hasVault, generateOfflineVault, checkVaultExists } = useSecureOffline();
    const theme = useTheme();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    // Offline generation states
    const [teamCode, setTeamCode] = useState("TB-TEAM-9D657A");
    const [pinCode, setPinCode] = useState("");
    const [syncSuccess, setSyncSuccess] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);

    // Fade-in entrance animation
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
        }).start();
        checkVaultExists();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLoginSubmit = async () => {
        setLoginError("");
        if (!email.trim() || !password.trim()) {
            setLoginError("Email and password fields are required.");
            return;
        }

        const res = await login(email.trim(), password);
        if (!res.success) {
            setLoginError(res.error || "Authentication failed.");
        }
    };

    const handleSyncSubmit = async () => {
        setSyncSuccess("");
        if (!teamCode.trim()) {
            alert("Please enter a valid Team Code.");
            return;
        }
        if (pinCode.length !== 4 || isNaN(pinCode)) {
            alert("PIN must be exactly 4 digits.");
            return;
        }

        setIsSyncing(true);
        const res = await generateOfflineVault(teamCode.trim(), token, masterPassword, pinCode);
        setIsSyncing(false);
        
        if (res.success) {
            setSyncSuccess("Offline database snapshot generated and encrypted successfully!");
            setPinCode("");
            checkVaultExists();
        } else {
            alert("Sync generation failed: " + res.error);
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
                    
                    {/* Header Stack */}
                    <Animated.View style={[styles.headerBox, { opacity: fadeAnim }]}>
                        <Text style={[styles.logoText, { color: theme.colors.accent }]}>🕯️ CANDELS</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                            TeamBridge Workspace Sync Gateway
                        </Text>
                    </Animated.View>

                    {/* Core Form Card */}
                    <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
                        {!user ? (
                            <GlassCard style={styles.formCard}>
                                <Text style={styles.cardTitle}>Online Authenticator</Text>
                                
                                {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

                                <CustomInput
                                    label="Email Address"
                                    placeholder="Enter registered email"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                />

                                <CustomInput
                                    label="Password"
                                    placeholder="Enter password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={true}
                                />

                                <PremiumButton
                                    title={loading ? "Authenticating..." : "Login Online"}
                                    onPress={handleLoginSubmit}
                                    disabled={loading}
                                    style={{ marginTop: 15 }}
                                />
                            </GlassCard>
                        ) : (
                            <GlassCard style={styles.formCard}>
                                <Text style={styles.cardTitle}>Online Session Active</Text>
                                <Text style={styles.sessionInfo}>Logged in as: {user.email}</Text>
                                <Text style={[styles.sessionInfo, { marginBottom: 15 }]}>Role: {user.role}</Text>

                                <View style={styles.separator} />

                                <Text style={[styles.cardTitle, { marginTop: 10 }]}>Generate Offline Vault</Text>
                                <Text style={styles.descText}>
                                    Fetch your cloud workspace files, encrypt them locally, and bind them with a 4-Digit PIN.
                                </Text>

                                {syncSuccess ? <Text style={styles.successText}>{syncSuccess}</Text> : null}

                                <CustomInput
                                    label="Team Code"
                                    placeholder="e.g. TB-TEAM-9D657A"
                                    value={teamCode}
                                    onChangeText={setTeamCode}
                                />

                                <CustomInput
                                    label="Configure 4-Digit PIN"
                                    placeholder="e.g. 1921"
                                    value={pinCode}
                                    onChangeText={setPinCode}
                                    keyboardType="numeric"
                                    secureTextEntry={true}
                                />

                                <PremiumButton
                                    title={isSyncing ? "Encrypting snapshot..." : "Generate Offline Code"}
                                    onPress={handleSyncSubmit}
                                    disabled={isSyncing}
                                    style={{ marginTop: 15, backgroundColor: theme.colors.accent }}
                                />

                                <PremiumButton
                                    title="Sign Out"
                                    onPress={logout}
                                    style={{ marginTop: 10, backgroundColor: '#475569' }}
                                />
                            </GlassCard>
                        )}
                    </Animated.View>

                    {/* Secondary Offline Hub */}
                    <Animated.View style={[styles.offlineSection, { opacity: fadeAnim }]}>
                        {hasVault ? (
                            <PremiumButton
                                title="Go Offline ➔"
                                onPress={() => navigation.navigate("OfflinePin")}
                                style={styles.offlineBtn}
                            />
                        ) : (
                            <Text style={styles.offlinePlaceholder}>
                                No offline vault detected. Sign in online to sync local snapshots first.
                            </Text>
                        )}
                    </Animated.View>

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
    headerBox: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1.5,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 6,
        fontWeight: '600',
    },
    formCard: {
        alignSelf: 'stretch',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    sessionInfo: {
        fontSize: 14,
        color: '#334155',
        marginVertical: 2,
    },
    separator: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 15,
    },
    descText: {
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
        marginBottom: 12,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
    },
    successText: {
        color: '#16a34a',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
    },
    offlineSection: {
        width: '100%',
        marginTop: 25,
        alignItems: 'center',
    },
    offlineBtn: {
        width: '100%',
        backgroundColor: '#10b981', // Clean green color for offline pathway
    },
    offlinePlaceholder: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 20,
    }
});

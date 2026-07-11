import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions,
    Platform,
    ScrollView,
    Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export default function TermsConditionsScreen({ route, navigation }) {
    const { user, logout } = useAuth();
    const forcePrompt = route.params?.forcePrompt || false;

    const [hasAccepted, setHasAccepted] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        loadAcceptanceState();
    }, [user?.email]);

    const loadAcceptanceState = async () => {
        if (!user?.email) return;
        try {
            const val = await AsyncStorage.getItem(`@terms_accepted_${user.email}`);
            if (val === 'true') {
                setHasAccepted(true);
                setIsChecked(true);
            } else {
                setHasAccepted(false);
                setIsChecked(false);
            }
        } catch (e) {
            console.error("Error loading terms acceptance state:", e);
        }
    };

    const handleAccept = async () => {
        if (!isChecked) {
            Alert.alert("Declined Action", "Please check the box to confirm you agree to the Terms and Conditions.");
            return;
        }

        try {
            if (user?.email) {
                await AsyncStorage.setItem(`@terms_accepted_${user.email}`, 'true');
                setHasAccepted(true);
                Alert.alert("Consent Registered", "You have accepted the Terms and Conditions.");
                if (forcePrompt) {
                    // Navigate to Dashboard
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Dashboard' }]
                    });
                } else {
                    navigation.goBack();
                }
            }
        } catch (e) {
            Alert.alert("Error", "Failed to save acceptance state.");
        }
    };

    const handleDeny = async () => {
        Alert.alert(
            "Confirm Choice",
            "Denying the Terms and Conditions will restrict your access to this application and log you out. Are you sure you want to proceed?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Deny & Log Out", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            if (user?.email) {
                                await AsyncStorage.setItem(`@terms_accepted_${user.email}`, 'false');
                            }
                            setHasAccepted(false);
                            setIsChecked(false);
                            logout(); // log out user
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }]
                            });
                        } catch (e) {
                            logout();
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerBlock}>
                {!forcePrompt ? (
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Feather name="arrow-left" size={24} color="#ffffff" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 32 }} />
                )}
                <Text style={styles.headerTitle}>Terms & Conditions</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                style={styles.contentScroll} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.termsCard}>
                    <Feather name="file-text" size={44} color="#6548d8ff" style={styles.logoIcon} />
                    <Text style={styles.title}>Data Access Declaration</Text>
                    <Text style={styles.subtitle}>Please review our terms carefully before proceeding.</Text>
                    
                    {/* Status Badge */}
                    {hasAccepted ? (
                        <View style={styles.acceptedBadge}>
                            <Feather name="check-circle" size={16} color="#15803d" style={{ marginRight: 6 }} />
                            <Text style={styles.acceptedBadgeText}>You have accepted the Terms and Conditions</Text>
                        </View>
                    ) : (
                        <View style={styles.pendingBadge}>
                            <Feather name="alert-circle" size={16} color="#b45309" style={{ marginRight: 6 }} />
                            <Text style={styles.pendingBadgeText}>Action Required: Review Consent Terms</Text>
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>1. Organization Data Access</Text>
                    <Text style={styles.paragraph}>
                        By accepting these terms, you explicitly grant the organization and company administrators full permission to access your workspace directories, uploaded profile images, contacts metadata, logs, and Git files connected to this platform.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Scope & Usage of Information</Text>
                    <Text style={styles.paragraph}>
                        All information collected or generated within the TeamBridge workspaces (including files, directories, commits history, and telemetry details) will be used strictly for internal company product development, quality assurance assessments, and future upgrades of the mobile application.
                    </Text>

                    <Text style={styles.sectionTitle}>3. Local Cache & Sandbox Caching</Text>
                    <Text style={styles.paragraph}>
                        Repository codebases cloned from external sources are hosted in isolated storage folders under the storage base directory and cached inside secure local client sandboxes. Caching is used solely to provide offline compatibility and rapid access.
                    </Text>

                    <Text style={styles.sectionTitle}>4. Consent and Reversion</Text>
                    <Text style={styles.paragraph}>
                        You have the right to withdraw your consent and deny access at any time. However, withdrawing consent will revoke active credentials, wipe cached workspaces, and immediately sign you out. Denying consent prompts you again upon next login attempts.
                    </Text>

                    <Text style={styles.sectionTitle}>5. Future Application Upgrades</Text>
                    <Text style={styles.paragraph}>
                        To ensure optimal workspace reliability, statistics regarding staging commit frequencies and lines created will be tabulated and analyzed internally to coordinate future platform revisions.
                    </Text>

                    <View style={styles.divider} />

                    {/* Accept Checkbox Form Section */}
                    {(!hasAccepted || !forcePrompt) && (
                        <View style={styles.formSection}>
                            <TouchableOpacity 
                                style={styles.checkboxRow} 
                                onPress={() => setIsChecked(!isChecked)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                                    {isChecked && <Feather name="check" size={12} color="#ffffff" />}
                                </View>
                                <Text style={styles.checkboxLabel}>
                                    I declare that I have read and agree to all terms of data access.
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.actionsRow}>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, styles.acceptBtn, !isChecked && styles.btnDisabled]}
                                    onPress={handleAccept}
                                    disabled={!isChecked}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.btnText}>Accept</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.actionBtn, styles.denyBtn]}
                                    onPress={handleDeny}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.btnText}>Deny</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {hasAccepted && !forcePrompt && (
                        <TouchableOpacity 
                            style={styles.withdrawBtn}
                            onPress={handleDeny}
                            activeOpacity={0.85}
                        >
                            <Feather name="slash" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.btnText}>Withdraw Consent / Deny Access</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBlock: {
        backgroundColor: '#6548d8ff',
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingBottom: 24,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
    },
    contentScroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    termsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
        marginTop: 10,
    },
    logoIcon: {
        alignSelf: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 18,
    },
    acceptedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        marginBottom: 24,
    },
    acceptedBadgeText: {
        fontSize: 11,
        color: '#166534',
        fontWeight: '700',
        flex: 1,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#fde68a',
        marginBottom: 24,
    },
    pendingBadgeText: {
        fontSize: 11,
        color: '#92400e',
        fontWeight: '700',
        flex: 1,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 18,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 24,
    },
    formSection: {
        width: '100%',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        borderColor: '#6548d8ff',
        backgroundColor: '#6548d8ff',
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
        lineHeight: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    acceptBtn: {
        backgroundColor: '#1b8a07',
    },
    denyBtn: {
        backgroundColor: '#b30e0e',
    },
    btnDisabled: {
        backgroundColor: '#cbd5e1',
        shadowOpacity: 0,
        elevation: 0,
    },
    withdrawBtn: {
        width: '100%',
        height: 48,
        backgroundColor: '#dc2626',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    btnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },
});

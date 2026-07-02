/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    KeyboardAvoidingView, 
    Platform, 
    ScrollView, 
    Animated, 
    Dimensions, 
    Image, 
    TouchableOpacity,
    Easing
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSecureOffline } from '../context/SecureOfflineContext';
import GlassCard from '../components/GlassCard';
import CustomInput from '../components/CustomInput';
import PremiumButton from '../components/PremiumButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const { user, login, logout, loading, token, masterPassword } = useAuth();
    const { hasVault, generateOfflineVault, checkVaultExists } = useSecureOffline();
    const theme = useTheme();

    // Splash screen phases: 'animating' | 'shrinking' | 'fading' | 'hidden'
    const [splashPhase, setSplashPhase] = useState("animating");

    // Sliding carousel page state: false = Landing Screen, true = Login Form Screen
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    // Sync parameters
    const [teamCode, setTeamCode] = useState("TB-TEAM-9D657A");
    const [pinCode, setPinCode] = useState("");
    const [syncSuccess, setSyncSuccess] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);

    // Animation values
    const logoPulseVal = useRef(new Animated.Value(1)).current;
    const splashOpacityVal = useRef(new Animated.Value(1)).current;
    const splashScaleVal = useRef(new Animated.Value(1.5)).current;
    const slideAnimVal = useRef(new Animated.Value(0)).current;

    // Typewriter state
    const words = ["Code.", "Coordinate.", "Deliver."];
    const [typedText, setTypedText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // 1. IntroSplash Animation Controller
    useEffect(() => {
        // Logo pulse loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoPulseVal, {
                    toValue: 1.08,
                    duration: 1100,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                }),
                Animated.timing(logoPulseVal, {
                    toValue: 1.0,
                    duration: 1100,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                })
            ])
        ).start();

        // Shrink stage after 2.2 seconds
        const shrinkTimer = setTimeout(() => {
            setSplashPhase("shrinking");
            Animated.parallel([
                Animated.timing(splashScaleVal, {
                    toValue: 0.9,
                    duration: 900,
                    easing: Easing.bezier(0.25, 1, 0.5, 1),
                    useNativeDriver: true
                }),
                Animated.timing(splashOpacityVal, {
                    toValue: 0.8,
                    duration: 900,
                    useNativeDriver: true
                })
            ]).start();
        }, 2200);

        // Fade out overlay after 3.1 seconds
        const fadeTimer = setTimeout(() => {
            setSplashPhase("fading");
            Animated.timing(splashOpacityVal, {
                toValue: 0,
                duration: 800,
                easing: Easing.linear,
                useNativeDriver: true
            }).start();
        }, 3100);

        // Complete splash after 3.9 seconds
        const completeTimer = setTimeout(() => {
            setSplashPhase("hidden");
            checkVaultExists();
        }, 3900);

        return () => {
            clearTimeout(shrinkTimer);
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, []);

    // 2. Typewriter Effect Hook
    useEffect(() => {
        if (splashPhase !== "hidden") return;

        let timer;
        const currentWord = words[wordIndex];
        const typingSpeed = isDeleting ? 50 : 150;

        if (!isDeleting && typedText === currentWord) {
            timer = setTimeout(() => setIsDeleting(true), 1500);
        } else if (isDeleting && typedText === "") {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
        } else {
            timer = setTimeout(() => {
                setTypedText(
                    isDeleting
                        ? currentWord.substring(0, typedText.length - 1)
                        : currentWord.substring(0, typedText.length + 1)
                );
            }, typingSpeed);
        }

        return () => clearTimeout(timer);
    }, [typedText, isDeleting, wordIndex, splashPhase]);

    // 3. Sliding Carousel animation handler
    useEffect(() => {
        Animated.timing(slideAnimVal, {
            toValue: isFormOpen ? -SCREEN_WIDTH : 0,
            duration: 500,
            easing: Easing.bezier(0.25, 1, 0.5, 1),
            useNativeDriver: true
        }).start();
    }, [isFormOpen]);

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

    // Splash overlay renderer
    if (splashPhase !== "hidden") {
        return (
            <Animated.View style={[styles.splashOverlay, { opacity: splashOpacityVal }]}>
                <Animated.View style={[
                    styles.splashContent, 
                    { transform: [{ scale: Animated.multiply(logoPulseVal, splashScaleVal) }] }
                ]}>
                    <Image 
                        source={require('../../assets/images/logo.png')} 
                        style={styles.splashLogo} 
                        resizeMode="contain"
                    />
                    <Text style={styles.splashText}>CANDELS</Text>
                </Animated.View>
            </Animated.View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
        >
            <Animated.View style={[
                styles.slidingStageWrapper, 
                { transform: [{ translateX: slideAnimVal }] }
            ]}>
                
                {/* PANEL 1: PRODUCT SHOWCASE LANDING VIEW */}
                <ScrollView 
                    style={styles.panelContainer}
                    contentContainerStyle={styles.panelScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Top Navigation Row */}
                    <View style={styles.logoRow}>
                        <View style={styles.logoGroupLeft}>
                            <Image 
                                source={require('../../assets/images/logo.png')} 
                                style={styles.logoImgMini} 
                            />
                            <Text style={[styles.logoTextTitle, { color: theme.colors.primary }]}>CANDELS</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.pillSignInBtn}
                            onPress={() => setIsFormOpen(true)}
                        >
                            <Text style={styles.pillSignInText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Billboard Hero Section */}
                    <View style={styles.heroBlock}>
                        <Text style={[styles.heroHeadline, { color: theme.colors.primary }]}>
                            <Text style={styles.heroAccent}>{typedText || "Code."}</Text>
                            {"\n"}All in One Canvas.
                        </Text>
                        <Text style={[styles.heroDesc, { color: theme.colors.textMuted }]}>
                            Connect with your project squads, link seamlessly with faculty mentors,
                            track timeline components, and organize documentation files inside an
                            isolated, high-performance workspace.
                        </Text>

                        <View style={styles.heroBtnGroup}>
                            <PremiumButton 
                                title="Launch Workspace →"
                                onPress={() => setIsFormOpen(true)}
                                style={styles.heroPrimaryBtn}
                            />
                        </View>
                    </View>

                    {/* Dashboard Metrics Stack */}
                    <View style={styles.metricsStack}>
                        <GlassCard style={styles.metricCard}>
                            <Text style={styles.metricBig}>100%</Text>
                            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Tenant Isolation</Text>
                        </GlassCard>

                        <GlassCard style={styles.metricCard}>
                            <Text style={styles.metricBig}>&lt; 150ms</Text>
                            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Sync Latency</Text>
                        </GlassCard>

                        <GlassCard style={styles.metricCard}>
                            <Text style={styles.metricBig}>4.8x</Text>
                            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Review Velocity</Text>
                        </GlassCard>
                    </View>

                    {/* Offline Entry Option */}
                    {hasVault && (
                        <TouchableOpacity 
                            style={styles.offlineLandingButton}
                            onPress={() => navigation.navigate("OfflinePin")}
                        >
                            <Text style={styles.offlineLandingButtonText}>⚡ Enter Offline Vault ➔</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.footerBranding}>
                        <Text style={styles.footerText}>&copy; 2026 Candels Systems Inc.</Text>
                    </View>
                </ScrollView>

                {/* PANEL 2: LOGIN AUTHENTICATION FORM VIEW */}
                <ScrollView 
                    style={styles.panelContainer}
                    contentContainerStyle={styles.panelScrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Arrow Header */}
                    <TouchableOpacity 
                        style={styles.backRow}
                        onPress={() => setIsFormOpen(false)}
                    >
                        <Text style={[styles.backArrowText, { color: theme.colors.accent }]}>← Back to Product Overview</Text>
                    </TouchableOpacity>

                    {/* Central Brand */}
                    <View style={styles.brandContainer}>
                        <Image 
                            source={require('../../assets/images/logo.png')} 
                            style={styles.loginBrandImg} 
                        />
                        <Text style={[styles.loginBrandText, { color: theme.colors.primary }]}>CANDELS</Text>
                    </View>

                    <View style={{ width: '100%', paddingHorizontal: 4 }}>
                        {!user ? (
                            <GlassCard style={styles.formCard}>
                                <Text style={styles.cardHeader}>Account Login</Text>
                                <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>
                                    Please enter your credentials to access the platform.
                                </Text>

                                {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

                                <CustomInput
                                    label="Email Address"
                                    placeholder="Email Address"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                />

                                <CustomInput
                                    label="Password"
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={true}
                                />

                                <PremiumButton
                                    title={loading ? "Authenticating..." : "Login"}
                                    onPress={handleLoginSubmit}
                                    disabled={loading}
                                    style={{ marginTop: 15 }}
                                />
                            </GlassCard>
                        ) : (
                            <GlassCard style={styles.formCard}>
                                <Text style={styles.cardHeader}>Session Status</Text>
                                <Text style={styles.sessionText}>Logged in: {user.email}</Text>
                                <Text style={[styles.sessionText, { marginBottom: 15 }]}>Role: {user.role}</Text>

                                <View style={styles.dividerLine} />

                                <Text style={[styles.cardHeader, { marginTop: 10 }]}>Sync Offline Database</Text>
                                <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>
                                    Configure offline credentials and sync cloud data snapshot.
                                </Text>

                                {syncSuccess ? <Text style={styles.successText}>{syncSuccess}</Text> : null}

                                <CustomInput
                                    label="Team Code"
                                    placeholder="e.g. TB-TEAM-9D657A"
                                    value={teamCode}
                                    onChangeText={setTeamCode}
                                />

                                <CustomInput
                                    label="4-Digit Offline PIN"
                                    placeholder="Enter 4 digits"
                                    value={pinCode}
                                    onChangeText={setPinCode}
                                    keyboardType="numeric"
                                    secureTextEntry={true}
                                />

                                <PremiumButton
                                    title={isSyncing ? "Syncing..." : "Generate Offline Code"}
                                    onPress={handleSyncSubmit}
                                    disabled={isSyncing}
                                    style={{ marginTop: 15, backgroundColor: theme.colors.accent }}
                                />

                                <PremiumButton
                                    title="Sign Out Session"
                                    onPress={logout}
                                    style={{ marginTop: 10, backgroundColor: '#64748b' }}
                                />
                            </GlassCard>
                        )}
                    </View>

                    {/* Secondary Offline trigger */}
                    {hasVault && (
                        <View style={{ width: '100%', marginTop: 20 }}>
                            <PremiumButton
                                title="Go Offline ➔"
                                onPress={() => navigation.navigate("OfflinePin")}
                                style={{ backgroundColor: '#10b981' }}
                            />
                        </View>
                    )}

                </ScrollView>

            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    splashOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000000',
        zIndex: 99999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    splashContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashLogo: {
        width: 50,
        height: 50,
        marginRight: 12,
    },
    splashText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#ff6b00', // Candles orange branding accent
        letterSpacing: 2,
    },

    keyboardContainer: {
        flex: 1,
        backgroundColor: '#f5f5f7',
    },
    slidingStageWrapper: {
        flexDirection: 'row',
        width: SCREEN_WIDTH * 2,
        flex: 1,
    },
    panelContainer: {
        width: SCREEN_WIDTH,
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    panelScrollContent: {
        paddingBottom: 60,
    },

    // Navigation styles
    logoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#d2d2d7',
    },
    logoGroupLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoImgMini: {
        width: 32,
        height: 32,
        marginRight: 8,
    },
    logoTextTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    pillSignInBtn: {
        backgroundColor: 'rgba(15, 23, 42, 0.06)',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    pillSignInText: {
        color: '#1d1d1f',
        fontSize: 12,
        fontWeight: '700',
    },

    // Hero Billboard section
    heroBlock: {
        marginVertical: 40,
    },
    heroHeadline: {
        fontSize: 34,
        fontWeight: '800',
        lineHeight: 40,
        letterSpacing: -1.2,
        marginBottom: 16,
    },
    heroAccent: {
        color: '#ff6b00', // Neon typewriter orange accent
    },
    heroDesc: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 25,
    },
    heroBtnGroup: {
        width: '100%',
    },
    heroPrimaryBtn: {
        width: '100%',
        backgroundColor: '#0f172a',
    },

    // Metrics layout
    metricsStack: {
        gap: 12,
        marginBottom: 20,
    },
    metricCard: {
        alignItems: 'center',
        paddingVertical: 18,
    },
    metricBig: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        textTransform: 'uppercase',
    },
    offlineLandingButton: {
        backgroundColor: '#10b981',
        borderRadius: 24,
        paddingVertical: 12,
        alignItems: 'center',
        marginVertical: 10,
    },
    offlineLandingButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 13,
    },
    footerBranding: {
        alignItems: 'center',
        marginTop: 40,
    },
    footerText: {
        color: '#86868b',
        fontSize: 11,
    },

    // Form Panel styles
    backRow: {
        paddingVertical: 12,
        marginBottom: 20,
    },
    backArrowText: {
        fontSize: 13,
        fontWeight: '700',
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    loginBrandImg: {
        width: 48,
        height: 48,
        marginBottom: 8,
    },
    loginBrandText: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    formCard: {
        width: '100%',
    },
    cardHeader: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    cardSubtitle: {
        fontSize: 12,
        marginTop: 4,
        marginBottom: 15,
    },
    sessionText: {
        fontSize: 14,
        color: '#334155',
        marginVertical: 2,
    },
    dividerLine: {
        height: 1,
        backgroundColor: '#cbd5e1',
        marginVertical: 15,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
    },
    successText: {
        color: '#16a34a',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
    }
});

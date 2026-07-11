import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, KeyboardAvoidingView, Platform,
    ScrollView, TouchableOpacity, Image, StatusBar,
    TextInput, Animated, Dimensions, ActivityIndicator
} from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSecureOffline } from '../context/SecureOfflineContext';
import { LinearGradient } from 'expo-linear-gradient';
import SlideButton from '../components/SlideButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptSnapshot, decryptSnapshot } from '../security/crypto';
import { loadEncryptedSnapshot } from '../database/offlineVault';
import { Alert, Modal } from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// ── Design tokens (light-background-friendly) ──────────────────
const COLORS = {
    bg: 'transparent',
    inputBg: 'rgba(255,255,255,0.88)',
    inputBorder: 'rgba(0,0,0,0.13)',
    inputBorderFocused: '#F27A1A',
    textPrimary: '#FFFFFF',
    textDark: '#1A1A1A',
    textSecondary: '#555568',
    textMuted: '#888899',
    orange: '#F27A1A',
    orangeDark: '#D96A10',
    success: '#3DCB86',
    danger: '#F04F4F',
    dangerSoft: 'rgba(240,79,79,0.10)',
    tabBarBg: 'rgba(255,255,255,0.55)',
    tabBarBorder: 'rgba(0,0,0,0.10)',
    tabActiveBg: '#F27A1A',
    tabInactiveText: '#444455',
};



// ── Styled input with dark text on white/glassy background ─────
function IconInput({ icon, value, onChangeText, secureTextEntry, keyboardType, placeholder }) {
    const [isFocused, setIsFocused] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, { toValue: isFocused ? 1 : 0, duration: 160, useNativeDriver: false }).start();
    }, [isFocused]);

    const borderColor = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.inputBorder, COLORS.inputBorderFocused],
    });

    return (
        <View style={s.inputWrap}>
            <Animated.View style={[s.inputRow, { borderColor, borderWidth: 1.5 }]}>
                <Feather
                    name={icon}
                    size={16}
                    color={isFocused ? COLORS.orange : COLORS.textMuted}
                    style={s.inputIcon}
                />
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry && !isVisible}
                    keyboardType={keyboardType || 'default'}
                    autoCapitalize="none"
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={s.inputText}
                />
                {secureTextEntry && (
                    <TouchableOpacity onPress={() => setIsVisible(!isVisible)} style={s.eyeBtn} activeOpacity={0.7}>
                        <Feather name={isVisible ? 'eye' : 'eye-off'} size={15} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
}

export default function LoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, login, logout, loading, loginOffline, loginWithGoogle, masterPassword } = useAuth();
    const { hasVault, generateOfflineVault, checkVaultExists, unlockOfflineVault } = useSecureOffline();

    const [googleModalVisible, setGoogleModalVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [pinCode, setPinCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState('TB-TEAM-9D657A');
    const [rememberMe, setRememberMe] = useState(false);

    const alignedTeams = ['TB-TEAM-9D657A', 'TB-TEAM-1921XX', 'TB-TEAM-8635BB'];

    useEffect(() => { checkVaultExists(); }, []);

    const handleLoginSubmit = async () => {
        setLoginError('');
        if (!email.trim() || !password.trim()) {
            setLoginError('Email and password are required.');
            return;
        }
        try {
            const res = await login(email.trim().toLowerCase(), password);
            if (res.success) {
                try {
                    const enc = encryptSnapshot({ email: email.trim().toLowerCase(), password }, 'CREDENTIALS_SECURE_TOKEN');
                    await AsyncStorage.setItem('@offline_login_credentials', enc);
                } catch (e) {
                    console.error("Failed to cache credentials:", e);
                }
                navigation.navigate('Dashboard');
            } else {
                setLoginError(res.error || 'Authentication failed.');
            }
        } catch (error) {
            setLoginError('An unexpected error occurred.');
        }
    };

    const handleOfflineLogin = async () => {
        setLoginError('');
        const enteredEmail = email.trim().toLowerCase();
        const enteredPassword = password;

        if (!enteredEmail || !enteredPassword) {
            setLoginError('Please enter your Gmail and password in the inputs above first, then click Offline Login.');
            return;
        }

        try {
            const encCredentials = await AsyncStorage.getItem('@offline_login_credentials');
            if (!encCredentials) {
                setLoginError('No offline credentials found. Please log in online first to cache your profile.');
                return;
            }

            const decrypted = decryptSnapshot(encCredentials, 'CREDENTIALS_SECURE_TOKEN');
            if (decrypted.email !== enteredEmail || decrypted.password !== enteredPassword) {
                setLoginError('Invalid offline credentials. Check your email/password or log in online.');
                return;
            }

            const cacheTeamCode = await AsyncStorage.getItem('@secure_offline_team_code');
            const cacheProjectName = await AsyncStorage.getItem('@secure_offline_project_name');
            const rawVault = await loadEncryptedSnapshot();

            if (!rawVault || !cacheTeamCode) {
                setLoginError('No offline project resource download found. Please log in online first and download resources in the Offline Project Sync page.');
                return;
            }

            const offlineSecretKey = `OFFLINE_KEY_${enteredEmail}`;
            const decryptedVault = decryptSnapshot(rawVault, offlineSecretKey);

            await unlockOfflineVault(offlineSecretKey, "1234");

            loginOffline(enteredEmail, cacheTeamCode, cacheProjectName);

            Alert.alert("Offline Session Unlocked", `Welcome back! Loaded offline resources for project: ${cacheProjectName}`);
            navigation.navigate('Dashboard');
        } catch (e) {
            console.error("Offline login error:", e);
            setLoginError('Decryption failed. Invalid credentials or corrupted resource file.');
        }
    };

    const GOOGLE_CLIENT_ID = "1013028712991-mtu8me83bblfi3nqd423e8jvsl6u15cm.apps.googleusercontent.com";
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=http://localhost&` +
        `response_type=id_token token&` +
        `scope=openid email profile&` +
        `nonce=teambridge_nonce_${Math.random().toString(36).substring(7)}`;

    const handleGoogleNavigationStateChange = async (webViewState) => {
        const url = webViewState.url;
        if (url.includes('id_token=')) {
            const hash = url.split('#')[1] || url.split('?')[1];
            if (hash) {
                const params = {};
                hash.split('&').forEach(part => {
                    const [key, value] = part.split('=');
                    params[key] = decodeURIComponent(value);
                });
                
                if (params.id_token) {
                    setGoogleModalVisible(false);
                    try {
                        const res = await loginWithGoogle(params.id_token);
                        if (res.success) {
                            try {
                                const enc = encryptSnapshot({ email: res.user.email, password: 'Manooj@12' }, 'CREDENTIALS_SECURE_TOKEN');
                                await AsyncStorage.setItem('@offline_login_credentials', enc);
                            } catch (e) {
                                console.error("Failed to cache credentials:", e);
                            }
                            navigation.navigate('Dashboard');
                        } else {
                            Alert.alert("Google Login Failed", res.error || "Failed to log in.");
                        }
                    } catch (e) {
                        console.error('[GOOGLE OAUTH] Backend log in exception:', e);
                        Alert.alert("Google Login Error", "Network or server connection issue.");
                    }
                }
            }
        }
    };

    const handleSyncSubmit = async () => {
        if (!pinCode || pinCode.length !== 4 || isNaN(pinCode)) { alert('PIN must be exactly 4 digits.'); return; }
        setIsSyncing(true);
        const res = await generateOfflineVault(selectedTeam, pinCode, masterPassword);
        setIsSyncing(false);
        if (res.success) { setGeneratedCode(res.accessCode); setPinCode(''); checkVaultExists(); }
    };

    const userTeams = (user && user.projects && user.projects.length > 0)
        ? user.projects.map(p => p.team_code) : alignedTeams;

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Full Screen Background Image */}
            <Image source={require('../../assets/images/mode-intro.jpeg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

            {/* Gradient Overlay */}
            <LinearGradient
                colors={['rgba(12,12,16,0)', 'rgba(20,20,32,0.38)', 'rgba(12,12,16,0.97)']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Top Header Bar */}
            <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={s.backCircle} onPress={() => navigation.goBack()} activeOpacity={0.75}>
                    <Feather name="chevron-left" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={s.topBarTitle}>TeamBridge</Text>
                <View style={{ width: 36 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
                <ScrollView
                    contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Hero Section */}
                    <View style={s.heroSection}>
                        <View style={s.logoCircle}>
                            <Image source={require('../../assets/logo.png')} style={s.logoImg} />
                        </View>
                        <Text style={s.heroTitleText}>{user ? 'Workspace Sync' : 'Login to Workspace'}</Text>
                    </View>

                    {/* Form Container */}
                    <View style={s.formContainer}>
                        {!user ? (
                            <>
                                {/* Login / Sign Up Toggle */}
                                <View style={s.tabBar}>
                                    <View style={s.tabActive}>
                                        <Text style={s.tabTextActive}>Login</Text>
                                    </View>
                                    <TouchableOpacity style={s.tabInactive} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
                                        <Text style={s.tabTextInactive}>Sign Up</Text>
                                    </TouchableOpacity>
                                </View>

                                {loginError ? (
                                    <View style={s.errorBox}>
                                        <Feather name="alert-triangle" size={14} color={COLORS.danger} />
                                        <Text style={s.errorText}>{loginError}</Text>
                                    </View>
                                ) : null}

                                <IconInput icon="mail" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" />
                                <IconInput icon="lock" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry />

                                <View style={s.checkboxForgotPasswordRow}>
                                    <TouchableOpacity style={s.checkboxRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
                                        <View style={[s.checkboxBox, rememberMe && s.checkboxBoxActive]}>
                                            {rememberMe && <Feather name="check" size={11} color="#fff" />}
                                        </View>
                                        <Text style={s.checkboxLabel}>Remember me</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                                        <Text style={s.forgotText}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>

                                <SlideButton
                                    title="Slide to Login"
                                    onSlideComplete={(reset) => { handleLoginSubmit().then(reset).catch(reset); }}
                                    disabled={loading}
                                    loading={loading}
                                />

                                <View style={s.divRow}>
                                    <View style={s.divLine} />
                                    <Text style={s.divText}>or login with</Text>
                                    <View style={s.divLine} />
                                </View>

                                <View style={s.socialRow}>
                                    <TouchableOpacity style={s.socialBtn} onPress={() => setGoogleModalVisible(true)} activeOpacity={0.8}>
                                        <FontAwesome name="google" size={16} color="#DB4437" style={{ marginRight: 8 }} />
                                        <Text style={s.socialBtnText}>Google</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.socialBtn} onPress={handleOfflineLogin} activeOpacity={0.8}>
                                        <Feather name="wifi-off" size={16} color="#6548d8ff" style={{ marginRight: 8 }} />
                                        <Text style={s.socialBtnText}>Offline Login</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={s.bottomRowContainer}>
                                    <View style={s.bottomLink}>
                                        <Text style={s.bottomLinkText}>{"Don't have an account? "}</Text>
                                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                            <Text style={s.bottomLinkAccent}>Create an account</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {hasVault && (
                                        <TouchableOpacity onPress={handleOfflineLogin} style={s.vaultLinkContainer} activeOpacity={0.8}>
                                            <Feather name="shield" size={13} color={COLORS.orange} style={{ marginRight: 4 }} />
                                            <Text style={s.vaultLinkText}>Access Offline Vault</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={s.syncDesc}>Select a cooperative team context to sync local data.</Text>
                                <View style={s.teamContainer}>
                                    {userTeams.map((team) => (
                                        <TouchableOpacity key={team} style={[s.teamPill, selectedTeam === team && s.teamPillActive]}
                                            onPress={() => { if (!generatedCode) setSelectedTeam(team); }} activeOpacity={0.8}>
                                            <Text style={[s.teamPillText, selectedTeam === team && s.teamPillTextActive]}>{team}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {generatedCode ? (
                                    <View style={s.tokenBox}>
                                        <Text style={s.tokenLabel}>SECURE OFFLINE TOKEN</Text>
                                        <View style={s.tokenValueBox}><Text style={s.tokenValue}>{generatedCode}</Text></View>
                                        <View style={s.tokenWarning}>
                                            <Feather name="alert-circle" size={13} color={COLORS.danger} />
                                            <Text style={s.tokenWarningText}>This token is displayed once. Save securely.</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <IconInput icon="key" placeholder="Enter 4-digit PIN" value={pinCode} onChangeText={setPinCode} keyboardType="numeric" secureTextEntry />
                                        <SlideButton
                                            title="Slide to Generate Token"
                                            onSlideComplete={(reset) => { handleSyncSubmit().then(reset).catch(reset); }}
                                            disabled={isSyncing}
                                            loading={isSyncing}
                                        />
                                    </>
                                )}
                                <TouchableOpacity style={s.signOutBtn} onPress={logout} activeOpacity={0.8}>
                                    <Text style={s.signOutText}>Sign Out Session</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal
                visible={googleModalVisible}
                animationType="slide"
                onRequestClose={() => setGoogleModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingTop: Platform.OS === 'ios' ? 60 : 40,
                        paddingBottom: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e2e8f0',
                        backgroundColor: '#ffffff'
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Google Sign-In</Text>
                        <TouchableOpacity onPress={() => setGoogleModalVisible(false)} style={{ padding: 8 }}>
                            <Feather name="x" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ uri: googleAuthUrl }}
                        onNavigationStateChange={handleGoogleNavigationStateChange}
                        style={{ flex: 1 }}
                        userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
                        startInLoadingState={true}
                        renderLoading={() => (
                            <ActivityIndicator 
                                size="large" 
                                color="#6548d8ff" 
                                style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -12 }, { translateY: -12 }] }} 
                            />
                        )}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView error: ', nativeEvent);
                            Alert.alert("Connection Error", "Failed to contact Google identity provider. Please check your internet connection.");
                            setGoogleModalVisible(false);
                        }}
                    />
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0C0C10' },
    flex: { flex: 1 },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20,
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 100,
    },
    backCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
    },
    topBarTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
    scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
    heroSection: { alignItems: 'center', paddingTop: 100, paddingBottom: 20 },
    logoCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,1)',
        borderWidth: 2, borderColor: 'rgba(242,122,26,0.3)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#F27A1A', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    },
    logoImg: { width: 38, height: 38, resizeMode: 'contain' },
    heroTitleText: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
    formContainer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },

    // ── Tab toggle ──────────────────────────────────────────────
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 28, padding: 4, marginBottom: 24,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    tabActive: {
        flex: 1, paddingVertical: 11, alignItems: 'center',
        backgroundColor: COLORS.tabActiveBg, borderRadius: 24,
        shadowColor: '#262625ff', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
    },
    tabInactive: { flex: 1, paddingVertical: 11, alignItems: 'center' },
    tabTextActive: { color: '#fff', fontSize: 14, fontWeight: '800' },
    tabTextInactive: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '700' },

    // ── Inputs ──────────────────────────────────────────────────
    inputWrap: { marginBottom: 14 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.inputBg, borderRadius: 27, height: 54, paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 10 },
    inputText: { flex: 1, color: COLORS.textDark, fontSize: 15, fontWeight: '500', height: '100%', paddingVertical: 0 },
    eyeBtn: { padding: 6 },

    // ── Checkbox / forgot ───────────────────────────────────────
    checkboxForgotPasswordRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, marginTop: 4, paddingHorizontal: 4,
    },
    checkboxRow: { flexDirection: 'row', alignItems: 'center' },
    checkboxBox: {
        width: 18, height: 18, borderRadius: 4,
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)',
        alignItems: 'center', justifyContent: 'center', marginRight: 8,
    },
    checkboxBoxActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
    checkboxLabel: { color: '#fff', fontSize: 13 },
    forgotText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    // ── CTA button (orange, slideable) ──────────────────────────
    cta: {
        height: 54, borderRadius: 27,
        backgroundColor: COLORS.orange,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#F27A1A', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
    },
    ctaText: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

    // ── Divider & social ────────────────────────────────────────
    divRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    divText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
    socialRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    socialBtn: {
        flex: 1, height: 50, borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    socialBtnText: { color: '#1A1A1A', fontSize: 13, fontWeight: '600' },

    // ── Bottom links ────────────────────────────────────────────
    bottomRowContainer: { alignItems: 'center', marginTop: 4, gap: 12 },
    bottomLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    bottomLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    bottomLinkAccent: { color: COLORS.orange, fontSize: 13, fontWeight: '700' },
    vaultLinkContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    vaultLinkText: { color: COLORS.orange, fontSize: 13, fontWeight: '600' },

    // ── Errors ─────────────────────────────────────────────────
    errorBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.dangerSoft, borderWidth: 1,
        borderColor: 'rgba(240,79,79,0.25)', borderRadius: 12, padding: 12, marginBottom: 14,
    },
    errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 },

    // ── Sync/team pills ─────────────────────────────────────────
    syncDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginBottom: 22 },
    teamContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 },
    teamPill: {
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    teamPillActive: { backgroundColor: 'rgba(242,122,26,0.2)', borderColor: 'rgba(242,122,26,0.6)' },
    teamPillText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
    teamPillTextActive: { color: COLORS.orange },

    // ── Token box ───────────────────────────────────────────────
    tokenBox: {
        backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 20,
    },
    tokenLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', marginBottom: 10 },
    tokenValueBox: {
        backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed',
        borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    },
    tokenValue: {
        color: COLORS.orange, fontSize: 22, fontWeight: '800', letterSpacing: 1.5,
        ...Platform.select({ ios: { fontFamily: 'Courier New' }, android: { fontFamily: 'monospace' } }),
    },
    tokenWarning: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.dangerSoft, borderWidth: 1,
        borderColor: 'rgba(240,79,79,0.2)', borderRadius: 10, padding: 10,
    },
    tokenWarningText: { color: COLORS.danger, fontSize: 11, marginLeft: 6, fontWeight: '500', flex: 1 },
    signOutBtn: {
        height: 50, borderRadius: 25, borderWidth: 1,
        borderColor: 'rgba(240,79,79,0.3)', backgroundColor: 'rgba(240,79,79,0.07)',
        alignItems: 'center', justifyContent: 'center', marginTop: 8,
    },
    signOutText: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },
});

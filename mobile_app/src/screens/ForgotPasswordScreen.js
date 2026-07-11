import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, KeyboardAvoidingView, Platform,
    ScrollView, TouchableOpacity, Image, Dimensions,
    ActivityIndicator, TextInput, Animated, StatusBar
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_CONFIG } from '../config/api';
import { LinearGradient } from 'expo-linear-gradient';
import SlideButton from '../components/SlideButton';

const { width, height } = Dimensions.get('window');

const COLORS = {
    bg: '#0C0C10',
    inputBg: 'rgba(255,255,255,0.88)',
    inputBorder: 'rgba(0,0,0,0.13)',
    inputBorderFocused: '#F27A1A',
    textDark: '#1A1A1A',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.7)',
    textMuted: '#888899',
    orange: '#F27A1A',
    success: '#3DCB86',
    danger: '#F04F4F',
    dangerSoft: 'rgba(240,79,79,0.10)',
};

// ── Styled input with dark text on white/glassy background ─────
function IconInput({ icon, value, onChangeText, secureTextEntry, keyboardType, placeholder, editable }) {
    const [isFocused, setIsFocused] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.timing(anim, { toValue: isFocused ? 1 : 0, duration: 160, useNativeDriver: false }).start();
    }, [isFocused]);
    
    const borderColor = anim.interpolate({ inputRange: [0, 1], outputRange: [COLORS.inputBorder, COLORS.inputBorderFocused] });
    
    return (
        <View style={s.inputWrap}>
            <Animated.View style={[s.inputRow, { borderColor, borderWidth: 1.2 }]}>
                <Feather name={icon} size={16} color={isFocused ? COLORS.primary : COLORS.textMuted} style={s.inputIcon} />
                <TextInput
                    value={value} onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry && !isVisible}
                    keyboardType={keyboardType || 'default'}
                    autoCapitalize="none" placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted} editable={editable !== false}
                    onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
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

export default function ForgotPasswordScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const tokenFromUrl = route.params?.token || null;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [statusState, setStatusState] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [infoMessage, setInfoMessage] = useState('');

    const handleRequestLinkSubmit = async () => {
        setErrorMessage(''); setInfoMessage('');
        if (!email.trim()) { setErrorMessage('Please enter your registered email address.'); return; }
        setStatusState('loading');
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/forgot-password/request`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() })
            });
            const data = await response.json();
            setStatusState('idle');
            if (!response.ok) throw new Error(data.error || 'Something went wrong.');
            setInfoMessage('A secure reset link has been dispatched to your email address!');
        } catch (err) { setStatusState('error'); setErrorMessage(err.message); }
    };

    const handleResetPasswordSubmit = async () => {
        setErrorMessage(''); setInfoMessage('');
        if (!password || !confirmPassword) { setErrorMessage('Please fill out both password fields.'); return; }
        if (password !== confirmPassword) { setErrorMessage('Passwords do not match!'); return; }
        setStatusState('loading');
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/forgot-password/reset`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenFromUrl, password })
            });
            const data = await response.json();
            if (!response.ok) { setStatusState('idle'); throw new Error(data.error || 'Password reset authorization failed.'); }
            setStatusState('success');
            setTimeout(() => { navigation.navigate('Login'); }, 2500);
        } catch (err) { setStatusState('error'); setErrorMessage(err.message); }
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Full Screen Background Image */}
            <Image source={require('../../assets/images/mode-intro.jpeg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            
            {/* Gradient Overlay: Transparent in middle, dark only at the bottom 15% */}
            <LinearGradient colors={['rgba(12,12,16,0.25)', 'rgba(12,12,16,0.4)', 'rgba(12,12,16,0.95)']} style={StyleSheet.absoluteFillObject} />

            {/* Centered Top Header Bar */}
            <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={s.backCircle} onPress={() => navigation.navigate('Login')} activeOpacity={0.75}>
                    <Feather name="chevron-left" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={s.topBarTitle}>TeamBridge</Text>
                <View style={{ width: 36 }} />
            </View>

            {statusState === 'success' && (
                <View style={s.successOverlay}>
                    <View style={s.successCircle}>
                        <Feather name="check" size={32} color="#fff" />
                    </View>
                    <Text style={s.successTitle}>Password Updated!</Text>
                    <Text style={s.successSub}>Redirecting you to login...</Text>
                </View>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
                <ScrollView
                    contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Hero Section (Above the card) */}
                    <View style={s.heroSection}>
                        <View style={s.logoCircle}>
                            <Image source={require('../../assets/logo.png')} style={s.logoImg} />
                        </View>
                        <Text style={s.heroTitleText}>{!tokenFromUrl ? 'Reset Password' : 'New Password'}</Text>
                    </View>

                    {/* Floating Form Container */}
                    <View style={s.formContainer}>
                        <Text style={s.pageSubtitle}>
                            {!tokenFromUrl
                                ? "Enter your registered email and we'll send a secure reset link."
                                : 'Your identity has been verified. Set a new secure password below.'}
                        </Text>

                        {errorMessage ? (
                            <View style={s.errorBox}>
                                <Feather name="alert-triangle" size={14} color={COLORS.danger} />
                                <Text style={s.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        {infoMessage ? (
                            <View style={s.successBox}>
                                <Feather name="check-circle" size={14} color={COLORS.success} />
                                <Text style={s.successText}>{infoMessage}</Text>
                            </View>
                        ) : null}

                        {!tokenFromUrl ? (
                            <>
                                <IconInput
                                    icon="mail" placeholder="Enter your email"
                                    value={email} onChangeText={setEmail}
                                    keyboardType="email-address" editable={statusState !== 'loading'}
                                />
                                <SlideButton
                                    title="Slide to Send Link"
                                    onSlideComplete={(reset) => { handleRequestLinkSubmit().then(reset).catch(reset); }}
                                    disabled={statusState === 'loading'}
                                    loading={statusState === 'loading'}
                                />
                            </>
                        ) : (
                            <>
                                <IconInput icon="lock" placeholder="Enter new password" value={password} onChangeText={setPassword} secureTextEntry editable={statusState !== 'loading'} />
                                <IconInput icon="lock" placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={statusState !== 'loading'} />
                                <SlideButton
                                    title="Slide to Update Password"
                                    onSlideComplete={(reset) => { handleResetPasswordSubmit().then(reset).catch(reset); }}
                                    disabled={statusState === 'loading'}
                                    loading={statusState === 'loading'}
                                />
                            </>
                        )}

                        <View style={s.bottomLink}>
                            <Text style={s.bottomLinkText}>Remembered your password? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={s.bottomLinkAccent}>Back to Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    flex: { flex: 1 },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20,
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 100,
    },
    backCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    topBarTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    heroSection: {
        alignItems: 'center',
        paddingTop: 100,
        paddingBottom: 20,
    },
    logoCircle: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1.5, borderColor: COLORS.border,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    logoImg: { width: 36, height: 36, resizeMode: 'contain' },
    heroTitleText: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
    formContainer: {
        paddingHorizontal: 24, 
        paddingTop: 12, 
        paddingBottom: 32,
    },
    pageSubtitle: { color: COLORS.textSecondary, fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginBottom: 24, paddingHorizontal: 4 },
    inputWrap: { marginBottom: 14 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.inputBg, borderRadius: 27, height: 54, paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 10 },
    inputText: { flex: 1, color: COLORS.textDark, fontSize: 15, fontWeight: '500', height: '100%', paddingVertical: 0 },
    eyeBtn: { padding: 6 },
    cta: { 
        height: 54, borderRadius: 27, 
        backgroundColor: COLORS.orange, 
        alignItems: 'center', justifyContent: 'center',
        marginTop: 8, marginBottom: 20,
        shadowColor: '#F27A1A', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
    },
    ctaText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
    errorBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.dangerSoft, borderWidth: 1,
        borderColor: 'rgba(240,79,79,0.25)', borderRadius: 12, padding: 12, marginBottom: 16,
    },
    errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 },
    successBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(61,203,134,0.10)', borderWidth: 1,
        borderColor: 'rgba(61,203,134,0.20)', borderRadius: 12, padding: 12, marginBottom: 16,
    },
    successText: { color: COLORS.success, fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 },
    bottomLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    bottomLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    bottomLinkAccent: { color: COLORS.orange, fontSize: 13, fontWeight: '700' },
    successOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(7,7,9,0.96)',
        justifyContent: 'center', alignItems: 'center', zIndex: 999999,
    },
    successCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(61,203,134,0.25)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        borderWidth: 2, borderColor: COLORS.success,
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
    successSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
});

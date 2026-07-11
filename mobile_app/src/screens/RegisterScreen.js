/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, KeyboardAvoidingView, Platform,
    ScrollView, TouchableOpacity, Dimensions, Image,
    TextInput, Animated, StatusBar, ActivityIndicator
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
    textSecondary: 'rgba(255,255,255,0.75)',
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

export default function RegisterScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [viewMode, setViewMode] = useState('form');
    const [targetEmail, setTargetEmail] = useState('');
    const [otpArray, setOtpArray] = useState(new Array(6).fill(''));
    const inputRefs = useRef([]);
    const [countdown, setCountdown] = useState(30);
    const [isResendDisabled, setIsResendDisabled] = useState(true);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState('');
    const [statusAnimation, setStatusAnimation] = useState('idle');
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', role: '', password: '', confirmPassword: '' });
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let timer;
        if (viewMode === 'otp_verify' && countdown > 0) {
            timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
        } else if (countdown === 0) { setIsResendDisabled(false); }
        return () => clearInterval(timer);
    }, [countdown, viewMode]);

    const handleInputChange = (name, value) => setFormData({ ...formData, [name]: value });

    const handleOtpBoxChange = (val, index) => {
        const numericVal = val.replace(/\D/g, '');
        const updatedOtp = [...otpArray];
        updatedOtp[index] = numericVal.substring(numericVal.length - 1);
        setOtpArray(updatedOtp);
        if (index < 5 && numericVal) inputRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (!otpArray[index] && index > 0) { inputRefs.current[index - 1]?.focus(); }
            else { const updatedOtp = [...otpArray]; updatedOtp[index] = ''; setOtpArray(updatedOtp); }
        }
    };

    const handleFormSubmission = async () => {
        setErrorMessage('');
        if (!formData.fullName || !formData.email || !formData.role || !formData.password || !formData.confirmPassword) {
            setErrorMessage('Please fill all required fields.'); return;
        }
        if (formData.password !== formData.confirmPassword) { setErrorMessage('Passwords do not match!'); return; }
        setStatusAnimation('loading');
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: formData.fullName, email: formData.email, phone: formData.phone, role: formData.role.toLowerCase(), password: formData.password })
            });
            const serverPayload = await response.json();
            setStatusAnimation('idle');
            if (!response.ok) throw new Error(serverPayload.error || 'Registration step failed.');
            setTargetEmail(formData.email); setNewEmailInput(formData.email);
            setViewMode('otp_verify'); setCountdown(30); setIsResendDisabled(true);
            setOtpArray(new Array(6).fill(''));
        } catch (err) { setStatusAnimation('idle'); setErrorMessage(err.message); }
    };

    const handleOtpVerificationSubmit = async () => {
        setErrorMessage('');
        const fullCompiledOtp = otpArray.join('');
        if (fullCompiledOtp.length < 6) { setErrorMessage('Please complete the 6-digit verification sequence.'); return; }
        setStatusAnimation('loading');
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/verify-otp`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, otp: fullCompiledOtp })
            });
            const data = await response.json();
            if (!response.ok) { setStatusAnimation('error_popup'); throw new Error(data.error || 'Verification authentication failed.'); }
            setStatusAnimation('success_popup');
            setTimeout(() => { setStatusAnimation('idle'); navigation.navigate('Login'); }, 3000);
        } catch (err) { setErrorMessage(err.message); }
    };

    const handleResendOtpRequest = async () => {
        setErrorMessage(''); setOtpArray(new Array(6).fill('')); setStatusAnimation('loading');
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/resend-otp`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail })
            });
            setStatusAnimation('idle');
            if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Resend processing failed.'); }
            setCountdown(30); setIsResendDisabled(true);
        } catch (err) { setStatusAnimation('idle'); setErrorMessage(err.message); }
    };

    const handleUpdateEmailSubmit = async () => {
        setErrorMessage('');
        if (!newEmailInput.trim() || newEmailInput === targetEmail) { setIsEditingEmail(false); return; }
        setStatusAnimation('loading');
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/update-registration-email`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_email: targetEmail, new_email: newEmailInput })
            });
            const data = await response.json();
            setStatusAnimation('idle');
            if (!response.ok) throw new Error(data.error || 'Email transition rejected.');
            setTargetEmail(data.new_email); setIsEditingEmail(false); setCountdown(30); setIsResendDisabled(true);
            setOtpArray(new Array(6).fill(''));
        } catch (err) { setStatusAnimation('idle'); setErrorMessage(err.message); }
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

            {/* Loading overlay */}
            {statusAnimation === 'loading' && (
                <View style={s.overlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={s.overlayText}>Synchronizing...</Text>
                </View>
            )}

            {/* Success overlay */}
            {statusAnimation === 'success_popup' && (
                <View style={[s.overlay, { backgroundColor: 'rgba(7,7,9,0.96)' }]}>
                    <View style={[s.overlayCircle, { backgroundColor: 'rgba(61,203,134,0.25)', borderColor: COLORS.success }]}>
                        <Feather name="check" size={32} color="#fff" />
                    </View>
                    <Text style={s.overlayTitle}>Account Verified!</Text>
                    <Text style={s.overlayText}>Redirecting to login...</Text>
                </View>
            )}

            {/* Error overlay */}
            {statusAnimation === 'error_popup' && (
                <View style={[s.overlay, { backgroundColor: 'rgba(240,79,79,0.92)' }]}>
                    <View style={[s.overlayCircle, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }]}>
                        <Feather name="x" size={32} color="#fff" />
                    </View>
                    <Text style={s.overlayTitle}>Access Denied</Text>
                    <Text style={s.overlayText}>{errorMessage || 'Invalid verification code.'}</Text>
                    <TouchableOpacity style={s.overlayBtn} onPress={() => setStatusAnimation('idle')}>
                        <Text style={[s.overlayBtnText, { color: COLORS.danger }]}>Try Again</Text>
                    </TouchableOpacity>
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
                        <Text style={s.heroTitleText}>{viewMode === 'form' ? 'Create Account' : 'Verify Identity'}</Text>
                    </View>

                    {/* Floating Form Container */}
                    <View style={s.formContainer}>
                        {viewMode === 'form' ? (
                            <>
                                {/* Tab toggle */}
                                <View style={s.tabBar}>
                                    <TouchableOpacity style={s.tabInactive} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                                        <Text style={s.tabTextInactive}>Login</Text>
                                    </TouchableOpacity>
                                    <View style={s.tabActive}>
                                        <Text style={s.tabTextActive}>Sign Up</Text>
                                    </View>
                                </View>

                                {errorMessage ? (
                                    <View style={s.errorBox}>
                                        <Feather name="alert-triangle" size={14} color={COLORS.danger} />
                                        <Text style={s.errorText}>{errorMessage}</Text>
                                    </View>
                                ) : null}

                                <IconInput icon="user" placeholder="Full name" value={formData.fullName} onChangeText={(v) => handleInputChange('fullName', v)} />
                                <IconInput icon="mail" placeholder="Email address" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} keyboardType="email-address" />
                                <IconInput icon="phone" placeholder="Phone number (optional)" value={formData.phone} onChangeText={(v) => handleInputChange('phone', v)} keyboardType="phone-pad" />

                                {/* Role Selector */}
                                <View style={s.roleSectionWrap}>
                                    <Text style={s.roleSectionLabel}>Select Role</Text>
                                    <View style={s.roleRow}>
                                        {['Student', 'Faculty', 'Mentor'].map(role => (
                                            <TouchableOpacity
                                                key={role}
                                                style={[s.roleBtn, formData.role === role && s.roleBtnActive]}
                                                onPress={() => handleInputChange('role', role)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[s.roleBtnText, formData.role === role && s.roleBtnTextActive]}>
                                                    {role === 'Student' ? '🎓' : role === 'Faculty' ? '🏫' : '💼'} {role}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <IconInput icon="lock" placeholder="Create password" value={formData.password} onChangeText={(v) => handleInputChange('password', v)} secureTextEntry />
                                <IconInput icon="lock" placeholder="Confirm password" value={formData.confirmPassword} onChangeText={(v) => handleInputChange('confirmPassword', v)} secureTextEntry />

                                <SlideButton
                                    title="Slide to Create Account"
                                    onSlideComplete={(reset) => { handleFormSubmission().then(reset).catch(reset); }}
                                    disabled={statusAnimation === 'loading'}
                                    loading={statusAnimation === 'loading'}
                                />

                                <View style={s.bottomLink}>
                                    <Text style={s.bottomLinkText}>Already have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                        <Text style={s.bottomLinkAccent}>Sign In</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={s.pageSubtitle}>A secure 6-digit passcode has been sent to your mailbox.</Text>

                                {/* Email badge */}
                                <View style={s.emailBadge}>
                                    {isEditingEmail ? (
                                        <View style={s.emailEditRow}>
                                            <TextInput
                                                value={newEmailInput} onChangeText={setNewEmailInput}
                                                style={s.emailEditInput} autoCapitalize="none"
                                                placeholderTextColor={COLORS.textMuted}
                                            />
                                            <TouchableOpacity style={s.emailSaveBtn} onPress={handleUpdateEmailSubmit}>
                                                <Text style={s.emailSaveBtnText}>Save</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={s.emailCancelBtn} onPress={() => setIsEditingEmail(false)}>
                                                <Feather name="x" size={14} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={s.emailDisplayRow}>
                                            <Feather name="mail" size={14} color={COLORS.primary} style={{ marginRight: 8 }} />
                                            <Text style={s.emailText} numberOfLines={1}>{targetEmail}</Text>
                                            <TouchableOpacity onPress={() => setIsEditingEmail(true)} style={{ marginLeft: 8 }}>
                                                <Text style={s.changeEmailText}>Change</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {errorMessage && statusAnimation === 'idle' ? (
                                    <View style={s.errorBox}>
                                        <Feather name="alert-triangle" size={14} color={COLORS.danger} />
                                        <Text style={s.errorText}>{errorMessage}</Text>
                                    </View>
                                ) : null}

                                {/* OTP Grid */}
                                <View style={s.otpRow}>
                                    {otpArray.map((digit, idx) => (
                                        <TextInput
                                            key={idx}
                                            ref={(el) => (inputRefs.current[idx] = el)}
                                            style={[s.otpBox, digit && s.otpBoxFilled]}
                                            maxLength={1} keyboardType="number-pad"
                                            value={digit}
                                            onChangeText={(val) => handleOtpBoxChange(val, idx)}
                                            onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                                        />
                                    ))}
                                </View>

                                <SlideButton
                                    title="Slide to Verify Account"
                                    onSlideComplete={(reset) => { handleOtpVerificationSubmit().then(reset).catch(reset); }}
                                    disabled={statusAnimation === 'loading'}
                                    loading={statusAnimation === 'loading'}
                                />

                                <View style={s.otpFooter}>
                                    {countdown > 0 ? (
                                        <Text style={s.countdownText}>
                                            Resend in: <Text style={s.countdownBold}>00:{countdown < 10 ? `0${countdown}` : countdown}</Text>
                                        </Text>
                                    ) : (
                                        <TouchableOpacity onPress={handleResendOtpRequest}>
                                            <Text style={s.resendText}>Resend Security Code</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TouchableOpacity style={s.backToFormBtn} onPress={() => { setViewMode('form'); setErrorMessage(''); }}>
                                    <Feather name="chevron-left" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                                    <Text style={s.backToFormText}>Back to Registration</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
    pageSubtitle: { color: COLORS.textSecondary, fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginBottom: 20, paddingHorizontal: 4 },
    tabBar: {
        flexDirection: 'row', backgroundColor: COLORS.tabBarBg,
        borderRadius: 28, padding: 4, marginBottom: 24,
        borderWidth: 1.5, borderColor: COLORS.tabBarBorder,
    },
    tabActive: {
        flex: 1, paddingVertical: 11, alignItems: 'center',
        backgroundColor: COLORS.tabActiveBg, borderRadius: 24,
        shadowColor: '#F27A1A', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
    },
    tabInactive: { flex: 1, paddingVertical: 11, alignItems: 'center' },
    tabTextActive: { color: '#fff', fontSize: 14, fontWeight: '800' },
    tabTextInactive: { color: COLORS.tabInactiveText, fontSize: 14, fontWeight: '700' },
    inputWrap: { marginBottom: 14 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.inputBg, borderRadius: 27, height: 54, paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 10 },
    inputText: { flex: 1, color: COLORS.textDark, fontSize: 15, fontWeight: '500', height: '100%', paddingVertical: 0 },
    eyeBtn: { padding: 6 },
    roleSectionWrap: { marginBottom: 14 },
    roleSectionLabel: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    roleRow: { flexDirection: 'row', backgroundColor: COLORS.tabBarBg, borderRadius: 24, padding: 4, gap: 4, borderWidth: 1.5, borderColor: COLORS.tabBarBorder },
    roleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 20 },
    roleBtnActive: { backgroundColor: COLORS.orange, shadowColor: '#F27A1A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
    roleBtnText: { fontSize: 11, color: COLORS.tabInactiveText, fontWeight: '600' },
    roleBtnTextActive: { color: '#ffffff', fontWeight: '800' },
    cta: { 
        height: 54, borderRadius: 27, 
        backgroundColor: COLORS.orange, 
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, marginTop: 6,
        shadowColor: '#F27A1A', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
    },
    ctaText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
    errorBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.dangerSoft, borderWidth: 1,
        borderColor: 'rgba(240,79,79,0.25)', borderRadius: 12, padding: 12, marginBottom: 14,
    },
    errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 },
    bottomLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    bottomLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    bottomLinkAccent: { color: COLORS.orange, fontSize: 13, fontWeight: '700' },
    emailBadge: {
        backgroundColor: COLORS.inputBg, borderWidth: 1.5, borderColor: COLORS.inputBorder,
        borderRadius: 27, padding: 14, marginBottom: 20,
    },
    emailDisplayRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
    emailText: { color: COLORS.textDark, fontSize: 13, fontWeight: '600', flex: 1 },
    changeEmailText: { color: COLORS.orange, fontSize: 12, fontWeight: '700' },
    emailEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    emailEditInput: { flex: 1, color: '#fff', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
    emailSaveBtn: { backgroundColor: COLORS.success, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 },
    emailSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    emailCancelBtn: { backgroundColor: COLORS.danger, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 20 },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, gap: 8 },
    otpBox: {
        flex: 1, height: 58, borderWidth: 1.5, borderColor: COLORS.inputBorder,
        borderRadius: 14, fontSize: 22, fontWeight: '800',
        textAlign: 'center', backgroundColor: COLORS.inputBg, color: COLORS.textDark,
    },
    otpBoxFilled: { borderColor: COLORS.orange, backgroundColor: 'rgba(242,122,26,0.08)', color: COLORS.orange },
    otpFooter: { alignItems: 'center', marginBottom: 16 },
    countdownText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    countdownBold: { fontWeight: '800', color: COLORS.orange },
    resendText: { color: COLORS.orange, fontSize: 13, fontWeight: '700' },
    backToFormBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
    backToFormText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(12,12,16,0.92)',
        justifyContent: 'center', alignItems: 'center', zIndex: 999999, gap: 12,
    },
    overlayCircle: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 2,
    },
    overlayTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    overlayText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 24 },
    overlayBtn: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 24, marginTop: 8 },
    overlayBtnText: { fontWeight: '800', fontSize: 14 },
});

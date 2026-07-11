import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    Image,
    StatusBar,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import SlideButton from '../components/SlideButton';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.48;

const BG_COLOR = '#0F0F11';
const CARD_BG = 'rgba(30, 30, 35, 0.7)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';
const ORANGE = '#F27A1A';

export default function IntroScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const [activeUserRoleTab, setActiveUserRoleTab] = useState('students');
    const roleOpacity = useRef(new Animated.Value(1)).current;

    const imageOpacity = scrollY.interpolate({
        inputRange: [0, HERO_HEIGHT * 0.8],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const imageTranslateY = scrollY.interpolate({
        inputRange: [0, HERO_HEIGHT],
        outputRange: [0, -HERO_HEIGHT * 0.4],
        extrapolate: 'clamp',
    });

    const handleGetStarted = () => {
        scrollViewRef.current?.scrollTo({ y: HERO_HEIGHT * 0.75, animated: true });
    };

    const handleRoleTabChange = (tab) => {
        if (tab === activeUserRoleTab) return;
        Animated.sequence([
            Animated.timing(roleOpacity, { toValue: 0.1, duration: 120, useNativeDriver: true }),
            Animated.timing(roleOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setActiveUserRoleTab(tab), 120);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Parallax Hero Image — fades as user scrolls */}
            <Animated.View style={[
                styles.heroContainer,
                {
                    opacity: imageOpacity,
                    transform: [{ translateY: imageTranslateY }]
                }
            ]}>
                <Image
                    source={require('../../assets/images/mode-intro.jpeg')}
                    style={styles.heroImage}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(15, 15, 17, 0.85)', BG_COLOR]}
                    style={styles.heroGradient}
                />
            </Animated.View>

            {/* Fixed Top Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 22) + 10 }]}>
                <View style={styles.headerLeft}>
                    <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                    <Text style={styles.brandText}>CΛNDELS</Text>
                </View>
                <TouchableOpacity style={styles.signInPill} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.signInPillText}>Sign In</Text>
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: HERO_HEIGHT - 70 }]}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentOverlay}>

                    {/* Hero Headline */}
                    <View style={styles.heroBadge}>
                        <View style={styles.heroBadgeDot} />
                        <Text style={styles.heroBadgeText}>Enterprise Workspace OS</Text>
                    </View>
                    <Text style={styles.heroHeadline}>Code. Coordinate.</Text>
                    <Text style={styles.heroHeadlineAccent}>Deliver in One Canvas.</Text>
                    <Text style={styles.heroSubheadline}>
                        Connect with your project squads, link seamlessly with faculty mentors, track timeline components, and organize documentation inside an isolated, high-performance workspace framework.
                    </Text>

                    {/* CTA Button */}
                    <SlideButton
                        title="Slide to Get Started"
                        onSlideComplete={(reset) => { navigation.navigate('Login'); reset(); }}
                    />

                    {/* ─── Target Audiences Section ─────────────────── */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionBadgeContainer}>
                            <Text style={styles.sectionBadge}>Target Audiences</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Designed for Academic Excellence</Text>

                        {/* Role Segment Toggle */}
                        <View style={styles.toggleSegmentBar}>
                            <TouchableOpacity
                                style={[styles.segmentItem, activeUserRoleTab === 'students' && styles.segmentItemActive]}
                                onPress={() => handleRoleTabChange('students')}
                            >
                                <View style={styles.segmentLabelRow}>
                                    <Feather 
                                        name="book-open" 
                                        size={14} 
                                        color={activeUserRoleTab === 'students' ? '#6548d8' : '#A0A0A0'} 
                                        style={{ marginRight: 6 }} 
                                    />
                                    <Text style={[styles.segmentItemText, activeUserRoleTab === 'students' && styles.segmentItemTextActive]}>
                                        Students
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segmentItem, activeUserRoleTab === 'professionals' && styles.segmentItemActive]}
                                onPress={() => handleRoleTabChange('professionals')}
                            >
                                <View style={styles.segmentLabelRow}>
                                    <Feather 
                                        name="briefcase" 
                                        size={14} 
                                        color={activeUserRoleTab === 'professionals' ? '#F27A1A' : '#A0A0A0'} 
                                        style={{ marginRight: 6 }} 
                                    />
                                    <Text style={[styles.segmentItemText, activeUserRoleTab === 'professionals' && styles.segmentItemTextActive]}>
                                        Professionals
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <Animated.View style={[styles.audienceGrid, { opacity: roleOpacity }]}>
                            {activeUserRoleTab === 'students' ? (
                                <>
                                    <View style={[styles.glassCard, { borderLeftColor: '#6548d8' }]}>
                                        <View style={styles.cardHeaderRow}>
                                            <Feather name="trending-up" size={16} color="#6548d8" style={{ marginRight: 8 }} />
                                            <Text style={styles.cardTitle}>Grading Fairness & Progress Analytics</Text>
                                        </View>
                                        <Text style={styles.cardBody}>Telemetry tracking monitors active workspace time and typing patterns. Individual contributions are clear, ensuring everyone receives their fair share of grades.</Text>
                                    </View>
                                    <View style={[styles.glassCard, { borderLeftColor: '#6548d8' }]}>
                                        <View style={styles.cardHeaderRow}>
                                            <Feather name="users" size={16} color="#6548d8" style={{ marginRight: 8 }} />
                                            <Text style={styles.cardTitle}>Effortless Supervisor Alignment</Text>
                                        </View>
                                        <Text style={styles.cardBody}>Your faculty guides access a read-only portal showing your milestone gallery, checklist completions, and project charts — eliminating weekly presentation prep.</Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <View style={[styles.glassCard, { borderLeftColor: '#F27A1A' }]}>
                                        <View style={styles.cardHeaderRow}>
                                            <Feather name="shield" size={16} color="#F27A1A" style={{ marginRight: 8 }} />
                                            <Text style={styles.cardTitle}>Strict Credentials Access Control</Text>
                                        </View>
                                        <Text style={styles.cardBody}>Sensitive `.env` and `secrets.key` files are restricted inside the web editor, securing database logs, API endpoints, and private client tokens from code breaches.</Text>
                                    </View>
                                    <View style={[styles.glassCard, { borderLeftColor: '#F27A1A' }]}>
                                        <View style={styles.cardHeaderRow}>
                                            <Feather name="refresh-cw" size={16} color="#F27A1A" style={{ marginRight: 8 }} />
                                            <Text style={styles.cardTitle}>Monthly E2EE Scrubbing Cycle</Text>
                                        </View>
                                        <Text style={styles.cardBody}>All sensitive feature design chats and local storage documents are client-side encrypted and fully recycled monthly, keeping corporate intellectual property secure.</Text>
                                    </View>
                                </>
                            )}
                        </Animated.View>
                    </View>

                    {/* ─── Added System Architecture Content Section ─────────────────── */}
                    <View style={styles.sectionContainer}>
                        <View style={[styles.sectionBadgeContainer, { backgroundColor: 'rgba(242, 122, 26, 0.12)' }]}>
                            <Text style={[styles.sectionBadge, { color: '#F27A1A' }]}>Core Architecture</Text>
                        </View>
                        <Text style={styles.sectionTitle}>High-Density Security Infrastructure</Text>
                        
                        <View style={styles.glassCard}>
                            <View style={styles.cardHeaderRow}>
                                <Feather name="hard-drive" size={16} color="#6548d8" style={{ marginRight: 8 }} />
                                <Text style={styles.cardTitle}>Offline Encrypted Vault</Text>
                            </View>
                            <Text style={styles.cardBody}>Access tokens, private hashes, and check-in session buffers are stored locally inside a client-side crypto container, enabling continuous operations offline.</Text>
                        </View>

                        <View style={styles.glassCard}>
                            <View style={styles.cardHeaderRow}>
                                <Feather name="zap" size={16} color="#F27A1A" style={{ marginRight: 8 }} />
                                <Text style={styles.cardTitle}>Real-Time Telemetry Sync</Text>
                            </View>
                            <Text style={styles.cardBody}>Your active workspace metrics are securely broadcasted using optimized websockets, keeping checklist nodes and team hubs updated instantly without latency spikes.</Text>
                        </View>

                        <View style={styles.glassCard}>
                            <View style={styles.cardHeaderRow}>
                                <Feather name="lock" size={16} color="#6548d8" style={{ marginRight: 8 }} />
                                <Text style={styles.cardTitle}>Granular Role Delegation</Text>
                            </View>
                            <Text style={styles.cardBody}>Dynamic permission profiles ensure team members modify code spaces correctly while managers retain distinct feedback pipelines, structured cleanly by node levels.</Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footerRow}>
                        <Text style={styles.footerBrand}>CΛNDELS</Text>
                        <Text style={styles.footerText}>© 2026 Candels Systems Inc. All rights reserved.</Text>
                    </View>

                    <View style={{ height: 40 }} />
                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
    },
    heroContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HERO_HEIGHT,
        zIndex: 0,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 140,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 22,
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 26,
        height: 32,
        resizeMode: 'contain',
        marginRight: 9,
    },
    brandText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 2,
    },
    signInPill: {
        backgroundColor: '#F27A1A',
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 50,
    },
    signInPillText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
        zIndex: 1,
    },
    scrollContent: {
        paddingHorizontal: 22,
    },
    contentOverlay: {
        paddingTop: 24,
        paddingBottom: 40,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(242, 122, 26, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(242, 122, 26, 0.3)',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 14,
        gap: 6,
    },
    heroBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F27A1A',
    },
    heroBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F27A1A',
        letterSpacing: 0.5,
    },
    heroHeadline: {
        fontSize: 36,
        fontWeight: '900',
        color: '#F27A1A',
        letterSpacing: -1.0,
        lineHeight: 42,
    },
    heroHeadlineAccent: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1.0,
        lineHeight: 42,
        marginBottom: 16,
    },
    heroSubheadline: {
        fontSize: 14,
        color: '#A0A0A0',
        lineHeight: 23,
        marginBottom: 28,
    },
    ctaButton: {
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        paddingVertical: 17,
        borderRadius: 44,
        alignItems: 'center',
        marginBottom: 48,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionBadgeContainer: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(101, 72, 216, 0.15)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 8,
    },
    sectionBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6548d8',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        lineHeight: 28,
        marginBottom: 16,
    },
    toggleSegmentBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        padding: 4,
        borderRadius: 44,
        marginBottom: 18,
    },
    segmentItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 40,
    },
    segmentItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    segmentLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    segmentItemText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
    segmentItemTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    audienceGrid: {
        gap: 12,
    },
    glassCard: {
        backgroundColor: CARD_BG,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderLeftWidth: 4,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
        flex: 1,
    },
    cardBody: {
        color: '#8A8A8E',
        fontSize: 13,
        lineHeight: 21,
    },
    footerRow: {
        borderTopWidth: 1,
        borderTopColor: BORDER_COLOR,
        paddingTop: 24,
        paddingBottom: 12,
        alignItems: 'center',
        gap: 4,
        marginTop: 16,
    },
    footerBrand: {
        fontSize: 13,
        fontWeight: '900',
        color: '#6548d8',
        letterSpacing: 1,
    },
    footerText: {
        fontSize: 11,
        color: '#555555',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 60, // extra padding for gradient blend
        zIndex: 10,
    },
});

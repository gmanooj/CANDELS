/* eslint-disable */
import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Platform, 
    Animated, 
    Dimensions, 
    Easing,
    Image
} from 'react-native';
import { useSecureOffline } from '../context/SecureOfflineContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

export default function DashboardScreen({ navigation }) {
    const { offlineWorkspaces, lockOfflineMode } = useSecureOffline();
    const theme = useTheme();

    const [selectedFile, setSelectedFile] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Sidebar animation value
    const sidebarAnimVal = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    // Backdrop animation value
    const backdropOpacityVal = useRef(new Animated.Value(0)).current;

    if (!offlineWorkspaces) {
        return (
            <View style={[styles.mainLayout, { backgroundColor: theme.colors.backgroundStart, justifyContent: 'center' }]}>
                <Text style={{ color: theme.colors.danger, textAlign: 'center' }}>
                    No decrypted session data. Please authenticate correctly.
                </Text>
                <PremiumButton 
                    title="Return to Login" 
                    onPress={() => navigation.navigate("Login")} 
                    style={{ marginTop: 20 }}
                />
            </View>
        );
    }

    const { team_code, sync_timestamp, files } = offlineWorkspaces;

    const toggleSidebar = () => {
        const toValue = isSidebarOpen ? -SIDEBAR_WIDTH : 0;
        const opacityValue = isSidebarOpen ? 0 : 1;

        Animated.parallel([
            Animated.timing(sidebarAnimVal, {
                toValue,
                duration: 350,
                easing: Easing.bezier(0.25, 1, 0.5, 1),
                useNativeDriver: true
            }),
            Animated.timing(backdropOpacityVal, {
                toValue: opacityValue,
                duration: 300,
                useNativeDriver: true
            })
        ]).start();

        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        if (isSidebarOpen) toggleSidebar();
    };

    const handleExitOffline = () => {
        if (isSidebarOpen) toggleSidebar();
        lockOfflineMode();
        navigation.navigate("Login");
    };

    const handleLaunchSlides = () => {
        if (isSidebarOpen) toggleSidebar();
        navigation.navigate("SlideViewer");
    };

    return (
        <View style={[styles.mainLayout, { backgroundColor: theme.colors.backgroundStart }]}>
            
            {/* Header with hamburger and exit */}
            <View style={styles.header}>
                <View style={styles.headerLeftGroup}>
                    <TouchableOpacity 
                        onPress={toggleSidebar} 
                        style={styles.hamburgerBtn}
                    >
                        <Text style={styles.hamburgerText}>☰</Text>
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: theme.colors.primary }]}>💼 Workspace</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                            Link: <Text style={{ fontWeight: '800' }}>{team_code}</Text>
                        </Text>
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={handleExitOffline} 
                    style={styles.exitBtn}
                >
                    <Text style={styles.exitText}>Exit</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                
                {/* Actions banner */}
                <GlassCard style={styles.bannerCard}>
                    <Text style={styles.bannerHeader}>⚡ Slides presentation available offline</Text>
                    <Text style={styles.bannerDesc}>
                        Review your slides-as-code deck compiled from your README.md presentation rules.
                    </Text>
                    <PremiumButton
                        title="Launch Slide Canvas ➔"
                        onPress={handleLaunchSlides}
                        style={styles.slideLauncher}
                    />
                </GlassCard>

                {/* File List section */}
                <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>FILES EXPLORER</Text>
                
                <GlassCard style={styles.fileListCard}>
                    {files.map((file, idx) => (
                        <TouchableOpacity 
                            key={idx}
                            onPress={() => handleFileSelect(file)}
                            style={[
                                styles.fileRow,
                                selectedFile?.path === file.path && styles.fileRowActive
                            ]}
                        >
                            <Text style={styles.fileIcon}>📄</Text>
                            <Text style={[
                                styles.fileName,
                                selectedFile?.path === file.path && styles.fileNameActive
                            ]}>
                                {file.path}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </GlassCard>

                {/* Selected File Content Viewer */}
                {selectedFile && (
                    <View style={styles.viewerContainer}>
                        <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>FILE CONTENT VIEWER</Text>
                        <GlassCard style={styles.fileContentCard}>
                            <View style={styles.viewerHeader}>
                                <Text style={styles.viewerTitle}>{selectedFile.path}</Text>
                                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                                    <Text style={styles.viewerClose}>Close</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.contentScrollView}>
                                <Text style={styles.fileContentText}>
                                    {selectedFile.content || "Empty File"}
                                </Text>
                            </ScrollView>
                        </GlassCard>
                    </View>
                )}

                <View style={styles.syncMetaContainer}>
                    <Text style={styles.syncTime}>Last Synced Snapshot: {new Date(sync_timestamp).toLocaleString()}</Text>
                </View>

            </ScrollView>

            {/* 🌑 TRANSPARENT BACKDROP SHIELD */}
            {isSidebarOpen && (
                <Animated.View 
                    style={[styles.backdropOverlay, { opacity: backdropOpacityVal }]}
                    pointerEvents="auto"
                >
                    <TouchableOpacity 
                        style={styles.backdropClickArea} 
                        onPress={toggleSidebar} 
                        activeOpacity={1}
                    />
                </Animated.View>
            )}

            {/*  SLIDING DRAWER SIDEBAR PANEL */}
            <Animated.View style={[
                styles.sidebarContainer, 
                { transform: [{ translateX: sidebarAnimVal }] }
            ]}>
                <View style={styles.sidebarHeader}>
                    <Image 
                        source={require('../../assets/images/logo.png')} 
                        style={styles.sidebarLogo} 
                    />
                    <Text style={styles.sidebarBrand}>CANDELS</Text>
                    <TouchableOpacity onPress={toggleSidebar} style={styles.sidebarCloseBtn}>
                        <Text style={styles.sidebarCloseText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sidebarDivider} />

                <ScrollView style={styles.sidebarMenu}>
                    <TouchableOpacity 
                        style={[styles.menuItem, styles.menuItemActive]} 
                        onPress={toggleSidebar}
                    >
                        <Text style={styles.menuItemIcon}>📂</Text>
                        <Text style={styles.menuItemTextActive}>Files Explorer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={handleLaunchSlides}
                    >
                        <Text style={styles.menuItemIcon}>📊</Text>
                        <Text style={styles.menuItemText}>Slide Presenter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={handleExitOffline}
                    >
                        <Text style={styles.menuItemIcon}>🚪</Text>
                        <Text style={styles.menuItemText}>Exit Workspace</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <Text style={styles.footerTeamCode}>Workspace: {team_code}</Text>
                    <Text style={styles.footerBrandingText}>&copy; 2026 Candels Inc.</Text>
                </View>
            </Animated.View>

        </View>
    );
}

const styles = StyleSheet.create({
    mainLayout: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingBottom: 15,
    },
    headerLeftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hamburgerBtn: {
        paddingRight: 15,
        paddingVertical: 5,
    },
    hamburgerText: {
        fontSize: 26,
        color: '#0f172a',
        fontWeight: 'bold',
    },
    titleContainer: {
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    syncMetaContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    syncTime: {
        fontSize: 10,
        color: '#94a3b8',
    },
    exitBtn: {
        backgroundColor: '#64748b',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    exitText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    scrollContainer: {
        paddingBottom: 40,
    },
    bannerCard: {
        backgroundColor: 'rgba(239, 246, 255, 0.7)',
        borderColor: '#bfdbfe',
    },
    bannerHeader: {
        color: '#1e40af',
        fontSize: 13,
        fontWeight: '700',
    },
    bannerDesc: {
        color: '#1e3a8a',
        fontSize: 11,
        lineHeight: 16,
        marginVertical: 8,
    },
    slideLauncher: {
        backgroundColor: '#2563eb',
        marginTop: 4,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginTop: 20,
        marginBottom: 8,
    },
    fileListCard: {
        padding: 8,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginVertical: 2,
    },
    fileRowActive: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    fileIcon: {
        fontSize: 15,
        marginRight: 10,
    },
    fileName: {
        fontSize: 13,
        color: '#1e293b',
        fontWeight: '600',
    },
    fileNameActive: {
        color: '#2563eb',
    },
    viewerContainer: {
        marginTop: 15,
    },
    fileContentCard: {
        padding: 16,
    },
    viewerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 10,
        marginBottom: 10,
    },
    viewerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
    },
    viewerClose: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '600',
    },
    contentScrollView: {
        maxHeight: 250,
    },
    fileContentText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#334155',
        lineHeight: 18,
    },

    // 🌑 Backdrop styling
    backdropOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        zIndex: 99999,
    },
    backdropClickArea: {
        flex: 1,
    },

    //  Sidebar drawer styling
    sidebarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SIDEBAR_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        zIndex: 100000,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 10,
    },
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sidebarLogo: {
        width: 32,
        height: 32,
        marginRight: 10,
    },
    sidebarBrand: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: 0.5,
        flex: 1,
    },
    sidebarCloseBtn: {
        padding: 5,
    },
    sidebarCloseText: {
        fontSize: 18,
        color: '#64748b',
    },
    sidebarDivider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginBottom: 20,
    },
    sidebarMenu: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginVertical: 4,
    },
    menuItemActive: {
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
    },
    menuItemIcon: {
        fontSize: 16,
        marginRight: 12,
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    menuItemTextActive: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    sidebarFooter: {
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 15,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    footerTeamCode: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    footerBrandingText: {
        fontSize: 9,
        color: '#94a3b8',
        marginTop: 4,
    }
});

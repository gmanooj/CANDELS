import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSecureOffline } from '../context/SecureOfflineContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';

export default function DashboardScreen({ navigation }) {
    const { offlineWorkspaces, lockOfflineMode } = useSecureOffline();
    const theme = useTheme();

    const [selectedFile, setSelectedFile] = useState(null);

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

    const handleFileSelect = (file) => {
        setSelectedFile(file);
    };

    const handleExitOffline = () => {
        lockOfflineMode();
        navigation.navigate("Login");
    };

    return (
        <View style={[styles.mainLayout, { backgroundColor: theme.colors.backgroundStart }]}>
            
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.colors.primary }]}>💼 Workspace Explorer</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                        Offline Team Link: <Text style={{ fontWeight: '700' }}>{team_code}</Text>
                    </Text>
                    <Text style={styles.syncTime}>Last Synced: {new Date(sync_timestamp).toLocaleString()}</Text>
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
                        onPress={() => navigation.navigate("SlideViewer")}
                        style={styles.slideLauncher}
                    />
                </GlassCard>

                {/* File List section */}
                <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>FILES REGISTRY</Text>
                
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
                        <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>FILE VIEWER</Text>
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

            </ScrollView>

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
        alignItems: 'flex-start',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 4,
    },
    syncTime: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    exitBtn: {
        backgroundColor: '#ef4444',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    exitText: {
        color: '#ffffff',
        fontSize: 12,
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
        fontSize: 14,
        fontWeight: '700',
    },
    bannerDesc: {
        color: '#1e3a8a',
        fontSize: 12,
        lineHeight: 18,
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
        fontSize: 16,
        marginRight: 10,
    },
    fileName: {
        fontSize: 14,
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
        fontSize: 14,
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
    }
});

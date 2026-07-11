import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useSecureOffline } from '../context/SecureOfflineContext';
import { API_CONFIG } from '../config/api';
import { encryptSnapshot } from '../security/crypto';
import { saveEncryptedSnapshot } from '../database/offlineVault';

export default function OfflineProjectSetupScreen({ navigation }) {
    const { user, token, logout } = useAuth();
    const { checkVaultExists } = useSecureOffline();

    const [selectedProject, setSelectedProject] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [hasCache, setHasCache] = useState(false);

    useEffect(() => {
        checkExistingCache();
    }, []);

    const checkExistingCache = async () => {
        try {
            const cache = await AsyncStorage.getItem('@secure_offline_vault');
            setHasCache(!!cache);
        } catch (e) {}
    };

    const handleProjectSelect = (project) => {
        // Enforce Free Tier limit of 1 project offline
        // Let's check if they are already trying to download a second project
        if (selectedProject && selectedProject.team_code !== project.team_code) {
            Alert.alert(
                "Premium Feature",
                "Under the Free tier, you can access only 1 project offline. Upgrade to Premium to download unlimited projects for offline usage.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Upgrade to Premium", onPress: () => Alert.alert("Premium Upgraded", "You have unlocked the Premium Tier features!") }
                ]
            );
            return;
        }
        setSelectedProject(project);
    };

    const triggerResourceDownload = async () => {
        if (!selectedProject) {
            Alert.alert("Selection Required", "Please select a project to download offline resources.");
            return;
        }

        // Ask for permission
        Alert.alert(
            "Grant Cache Permission",
            "Do you allow Candels to download resources and use secure local sandbox caching for this workspace?",
            [
                { text: "Deny", style: "cancel" },
                { text: "Allow & Download", onPress: () => startSyncProcess() }
            ]
        );
    };

    const startSyncProcess = async () => {
        setDownloading(true);
        setDownloadProgress(0);
        setProgressLabel('Requesting files list from server...');

        const teamCode = selectedProject.team_code;
        try {
            // Step 1: Fetch list of files
            const listRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/files?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!listRes.ok) {
                throw new Error("Failed to retrieve workspace files directory.");
            }

            const listData = await listRes.json();
            const filePaths = listData.files || [];

            if (filePaths.length === 0) {
                // Add default files if workspace is empty
                filePaths.push('README.md');
            }

            const downloadedFiles = [];
            const total = filePaths.length;

            // Step 2: Download each file's content file-by-file
            for (let i = 0; i < total; i++) {
                const path = filePaths[i];
                setProgressLabel(`Syncing: ${path} (${i + 1}/${total})...`);
                
                let content = '';
                try {
                    const fileContentRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${teamCode}&path=${path}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (fileContentRes.ok) {
                        const fileContentData = await fileContentRes.json();
                        content = fileContentData.content || '';
                    }
                } catch (err) {
                    content = '# Error loading content offline';
                }

                downloadedFiles.push({ path, content });
                setDownloadProgress(Math.round(((i + 1) / total) * 100));
                
                // Minor visual delay to simulate Free Fire/Chrome download pacing
                await new Promise((r) => setTimeout(r, 400));
            }

            // Fetch extra resources
            setProgressLabel('Downloading tasks data...');
            const tasksRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/tasks?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasksData = tasksRes.ok ? await tasksRes.json() : { tasks: [] };
            await new Promise((r) => setTimeout(r, 300));

            setProgressLabel('Downloading document templates...');
            const docsRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/documents?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const docsData = docsRes.ok ? await docsRes.json() : { documents: [] };
            await new Promise((r) => setTimeout(r, 300));

            setProgressLabel('Downloading implementations submissions...');
            const implsRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/implementation?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const implsData = implsRes.ok ? await implsRes.json() : { implementations: [] };
            await new Promise((r) => setTimeout(r, 300));

            setProgressLabel('Downloading contribution reports...');
            const reportsRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/reports?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const reportsData = reportsRes.ok ? await reportsRes.json() : { reports: [] };
            await new Promise((r) => setTimeout(r, 300));

            setProgressLabel('Downloading remote Git status...');
            const gitStatusRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/external?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const gitStatusData = gitStatusRes.ok ? await gitStatusRes.json() : {};
            await new Promise((r) => setTimeout(r, 300));

            setProgressLabel('Downloading git commits and diff...');
            const gitDiffRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/diff?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const gitDiffData = gitDiffRes.ok ? await gitDiffRes.json() : {};
            await new Promise((r) => setTimeout(r, 300));

            setProgressLabel('Encrypting and compiling cache files...');
            await new Promise((r) => setTimeout(r, 500));

            // Package metadata envelope along with the structural payload
            const mockWorkspacePayload = {
                team_code: teamCode,
                project_name: selectedProject.project_name,
                sync_timestamp: Date.now(),
                files: downloadedFiles,
                tasks: tasksData.tasks || [],
                documents: docsData.documents || [],
                implementations: implsData.implementations || [],
                reports: reportsData.reports || [],
                git_status: gitStatusData,
                git_diff: gitDiffData
            };

            const secureEnvelope = {
                payload: mockWorkspacePayload,
                pinHash: "1234" // Default offline fallback PIN
            };

            // Retrieve current password of user (we can prompt or use a master secret, let's encrypt using a standard encryption token or user email)
            const offlineSecretKey = `OFFLINE_KEY_${user.email.toLowerCase()}`;
            const encryptedString = encryptSnapshot(secureEnvelope, offlineSecretKey);

            // Save the encrypted vault and details to file system & AsyncStorage
            await saveEncryptedSnapshot(encryptedString);
            await AsyncStorage.setItem('@secure_offline_vault', encryptedString);
            await AsyncStorage.setItem('@secure_offline_team_code', teamCode);
            await AsyncStorage.setItem('@secure_offline_project_name', selectedProject.project_name);

            setDownloading(false);
            setHasCache(true);
            
            Alert.alert(
                "Sync Complete",
                "Workspace resources successfully cached! You can now log in offline using your Gmail and password.",
                [
                    { text: "OK" },
                    { text: "Demo Offline Login", style: "destructive", onPress: () => handleDemoLogout() }
                ]
            );
        } catch (e) {
            setDownloading(false);
            Alert.alert("Sync Error", e.message || "Failed to download resources.");
        }
    };

    const handleDemoLogout = async () => {
        // Auto logout so the user is sent to the login screen where they can test the offline login button
        logout();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }]
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerBlock}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Feather name="arrow-left" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Offline Project Sync</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                style={styles.contentScroll} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Feather name="download-cloud" size={44} color="#6548d8ff" style={styles.logoIcon} />
                    <Text style={styles.title}>Workspace Resource Sync</Text>
                    <Text style={styles.subtitle}>Download workspace resources locally for offline execution</Text>

                    <Text style={styles.infoBox}>
                        💡 Just like game resource packages (e.g. Free Fire), this downloads the staging file explorer, templates, and logs to your client sandbox. You can then log in without internet using your active credentials.
                    </Text>

                    <Text style={styles.sectionTitle}>Select Project to Sync</Text>
                    <View style={styles.projectList}>
                        {user?.projects && user.projects.map((proj, idx) => {
                            const isSelected = selectedProject?.team_code === proj.team_code;
                            return (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[styles.projectItem, isSelected && styles.projectItemActive]}
                                    onPress={() => handleProjectSelect(proj)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.projectIconBox}>
                                        <Text style={{ fontSize: 20 }}>🚀</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.projectName}>{proj.project_name}</Text>
                                        <Text style={styles.projectMeta}>{proj.subject} • {proj.team_code}</Text>
                                    </View>
                                    {isSelected && <Feather name="check-circle" size={20} color="#6548d8ff" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {downloading ? (
                        <View style={styles.progressContainer}>
                            <ActivityIndicator size="small" color="#6548d8ff" style={{ marginBottom: 10 }} />
                            <Text style={styles.progressLabel}>{progressLabel}</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                            </View>
                            <Text style={styles.progressPct}>{downloadProgress}%</Text>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={styles.syncBtn} 
                            onPress={triggerResourceDownload}
                            activeOpacity={0.85}
                        >
                            <Feather name="download" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                            <Text style={styles.syncBtnText}>Download Resource Pack</Text>
                        </TouchableOpacity>
                    )}

                    {hasCache && !downloading && (
                        <TouchableOpacity 
                            style={styles.demoBtn} 
                            onPress={handleDemoLogout}
                            activeOpacity={0.85}
                        >
                            <Feather name="log-out" size={16} color="#ef4444" style={{ marginRight: 8 }} />
                            <Text style={styles.demoBtnText}>Test Offline Login Demo</Text>
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
    card: {
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
        lineHeight: 16,
    },
    infoBox: {
        fontSize: 12,
        color: '#475569',
        backgroundColor: '#f1f5f9',
        padding: 14,
        borderRadius: 16,
        lineHeight: 18,
        fontWeight: '600',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    projectList: {
        gap: 12,
        marginBottom: 28,
    },
    projectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    projectItemActive: {
        borderColor: '#6548d8ff',
        backgroundColor: '#6548d810',
    },
    projectIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    projectName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    projectMeta: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    syncBtn: {
        height: 52,
        backgroundColor: '#6548d8ff',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6548d8ff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    syncBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
    progressContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    progressLabel: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#6548d8ff',
    },
    progressPct: {
        fontSize: 12,
        fontWeight: '800',
        color: '#6548d8ff',
    },
    demoBtn: {
        height: 48,
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    demoBtnText: {
        color: '#e11d48',
        fontSize: 13,
        fontWeight: '700',
    },
});

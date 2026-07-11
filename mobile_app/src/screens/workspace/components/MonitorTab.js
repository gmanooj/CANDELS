import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Platform, 
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { API_CONFIG } from '../../../config/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MonitorTab({ isStaff, handleUserScroll, teamCode, token }) {
    const [projectDetails, setProjectDetails] = useState(null);
    const [buildStatus, setBuildStatus] = useState("SUCCESS");
    const [progress, setProgress] = useState(100);
    const [pipelineLogs, setPipelineLogs] = useState([
        "[08:00:15] CI: Git push detected on branch 'main'.",
        "[08:00:16] CI: Triggering build stage...",
        "[08:00:17] CI: Running lint checks... Pass.",
        "[08:00:19] CI: Running test suites: 12 passed, 0 failed.",
        "[08:00:20] CI: Compiling frontend bundle...",
        "[08:00:21] CI: Bundle compiled successfully. Size: 142 KB.",
        "[08:00:22] CI: Deployment successful to staging server.",
    ]);

    useEffect(() => {
        if (teamCode) {
            fetchProjectDetails();
        }
    }, [teamCode]);

    const fetchProjectDetails = async () => {
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/status?team_code=${teamCode}`);
            if (res.ok) {
                const data = await res.json();
                setProjectDetails(data);
            }
        } catch (err) {
            console.error("Error fetching project details in Monitor:", err);
        }
    };

    const runPipelineSimulation = () => {
        setBuildStatus("BUILDING");
        setProgress(0);
        setPipelineLogs([
            `[${new Date().toLocaleTimeString()}] CI: Pipeline triggered manually on mobile.`,
            `[${new Date().toLocaleTimeString()}] CI: Pulling active container clusters...`,
        ]);

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 20;
            setProgress(currentProgress);
            
            if (currentProgress === 20) {
                setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CI: Running style standard checks... Pass.`]);
            } else if (currentProgress === 40) {
                setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CI: Initiating test suites...`]);
            } else if (currentProgress === 60) {
                setPipelineLogs(prev => [...prev, 
                    `[${new Date().toLocaleTimeString()}] CI: ✓ Codebase test suites completed successfully.`,
                    `[${new Date().toLocaleTimeString()}] CI: Mapped components verified.`
                ]);
            } else if (currentProgress === 80) {
                setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CI: Packing assets bundle...`]);
            } else if (currentProgress === 100) {
                clearInterval(interval);
                setBuildStatus("SUCCESS");
                setPipelineLogs(prev => [...prev, 
                    `[${new Date().toLocaleTimeString()}] CI: Production assets packed (141.2 KB).`,
                    `[${new Date().toLocaleTimeString()}] CI: Pipeline SUCCESS.`
                ]);
            }
        }, 800);
    };

    const getStatusColor = () => {
        if (buildStatus === 'SUCCESS') return '#10b981';
        if (buildStatus === 'FAILED') return '#ef4444';
        return '#f59e0b';
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                onScroll={handleUserScroll}
                scrollEventThrottle={16}
            >
                {/* ── PART 1: Solid Royal Blue Header ─────────────────── */}
                <View style={styles.blueHeaderContainer}>
                    <Text style={styles.headerTitle}>{projectDetails?.project_name || "Staging Monitor"}</Text>
                    <Text style={styles.headerSubtitle}>{projectDetails?.subject || "Pipeline Control"}</Text>

                    {/* Staging Metrics Progress Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsHeader}>
                            <Text style={styles.statsTitle}>CI/CD Pipeline</Text>
                            <Text style={styles.statsTotalText}>
                                {buildStatus === 'BUILDING' ? `${progress}% Compiled` : 'Staging Synced'}
                            </Text>
                        </View>
                        
                        {/* Segmented Color Bar */}
                        <View style={styles.progressBarContainer}>
                            <View 
                                style={[
                                    styles.progressSegment, 
                                    { 
                                        width: `${progress}%`, 
                                        backgroundColor: getStatusColor() 
                                    }
                                ]} 
                            />
                        </View>

                        {/* Legend Indicators */}
                        <View style={styles.legendGrid}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: getStatusColor() }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Build State</Text>
                                    <Text style={styles.legendValue}>{buildStatus}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#3b82f6' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Duration</Text>
                                    <Text style={styles.legendValue}>{buildStatus === 'BUILDING' ? 'Running...' : '12s'}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#f68d24ff' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Environment</Text>
                                    <Text style={styles.legendValue}>Staging</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── PART 2: Curved White Bottom Container ──────────── */}
                <View style={styles.whiteBottomContainer}>
                    
                    {!isStaff ? (
                        <View style={styles.accessDeniedContainer}>
                            <Feather name="alert-triangle" size={36} color="#ef4444" style={{ marginBottom: 12 }} />
                            <Text style={styles.accessDeniedText}>
                                Access Restrained: Monitor panel parameters are strictly limited to Faculty Advisors or HR managers.
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <TouchableOpacity 
                                style={[
                                    styles.simulateBtn,
                                    buildStatus === 'BUILDING' && styles.simulateBtnDisabled
                                ]}
                                onPress={runPipelineSimulation}
                                disabled={buildStatus === 'BUILDING'}
                                activeOpacity={0.8}
                            >
                                <Feather name="play" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                                <Text style={styles.simulateBtnText}>Simulate Staging Deployment</Text>
                            </TouchableOpacity>

                            <Text style={styles.subSectionTitle}>Console Build Output Logs</Text>
                            <View style={styles.logsBox}>
                                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                                    {pipelineLogs.map((log, idx) => (
                                        <Text key={idx} style={styles.logTextLine}>{log}</Text>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: -10,
        flex: 1,
        backgroundColor: '#6548d8ff',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    blueHeaderContainer: {
        backgroundColor: '#6548d8ff',
        paddingTop: Platform.OS === 'ios' ? 24 : 16,
        paddingBottom: 36,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginTop: 18,
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.75)',
        marginTop: 4,
        letterSpacing: 0.1,
    },
    whiteBottomContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingHorizontal: 20,
        paddingTop: 32,
        minHeight: SCREEN_HEIGHT * 0.65,
        marginTop: -16,
    },

    // Stats progress card
    statsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        marginTop: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    statsTotalText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#f1f5f9',
        flexDirection: 'row',
        overflow: 'hidden',
        marginVertical: 14,
    },
    progressSegment: {
        height: '100%',
    },
    legendGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    legendItem: {
        width: '31%',
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
    },
    legendIndicatorColor: {
        width: 3.5,
        height: 24,
        borderRadius: 2,
        marginRight: 8,
    },
    legendContent: {
        flex: 1,
    },
    legendName: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
    },
    legendValue: {
        fontSize: 11,
        color: '#1e293b',
        fontWeight: '800',
        marginTop: 1,
    },

    // Simulation Button
    simulateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        backgroundColor: '#6548d8ff',
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: '#6548d8ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    simulateBtnDisabled: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0,
        elevation: 0,
    },
    simulateBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },

    // Logs box
    subSectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 12,
        letterSpacing: 0.1,
    },
    logsBox: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 20,
        minHeight: 250,
        maxHeight: 400,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    logTextLine: {
        color: '#10b981',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 11,
        lineHeight: 18,
        marginBottom: 4,
    },

    // Access Denied Box
    accessDeniedContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 36,
        backgroundColor: '#fee2e2',
        borderRadius: 24,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    accessDeniedText: {
        fontSize: 13,
        color: '#ef4444',
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 20,
    },
});

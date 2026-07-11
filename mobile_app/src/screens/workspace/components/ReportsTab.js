import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Image, 
    Platform, 
    Dimensions 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { API_CONFIG } from '../../../config/api';
import { useSecureOffline } from '../../../context/SecureOfflineContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReportsTab({ teamCode, token, runWithLoader, handleUserScroll, roster, resolvePhotoUrl }) {
    const { offlineWorkspaces } = useSecureOffline();
    const [reportsData, setReportsData] = useState({ members: [], total_commits: 0, total_lines: 0, total_hours: 0 });
    const [projectDetails, setProjectDetails] = useState(null);

    useEffect(() => {
        if (teamCode) {
            fetchReports();
            fetchProjectDetails();
        }
    }, [teamCode]);

    const fetchProjectDetails = async () => {
        if (!token) {
            if (offlineWorkspaces?.project_details) {
                setProjectDetails(offlineWorkspaces.project_details);
            }
            return;
        }
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/status?team_code=${teamCode}`);
            if (res.ok) {
                const data = await res.json();
                setProjectDetails(data);
            }
        } catch (err) {
            console.error("Error fetching project details in Reports:", err);
            if (offlineWorkspaces?.project_details) {
                setProjectDetails(offlineWorkspaces.project_details);
            }
        }
    };

    const fetchReports = async () => {
        if (!token) {
            if (offlineWorkspaces && offlineWorkspaces.reports) {
                const data = offlineWorkspaces.reports;
                setReportsData({
                    members: data.members || [],
                    total_commits: data.total_commits || 0,
                    total_lines: data.total_lines || 0,
                    total_hours: data.total_hours || 0
                });
            }
            return;
        }

        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/reports?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setReportsData({
                    members: data.members || [],
                    total_commits: data.total_commits || 0,
                    total_lines: data.total_lines || 0,
                    total_hours: data.total_hours || 0
                });
            }
        })
        .catch((err) => {
            console.error("Error fetching reports:", err);
            if (offlineWorkspaces && offlineWorkspaces.reports) {
                const data = offlineWorkspaces.reports;
                setReportsData({
                    members: data.members || [],
                    total_commits: data.total_commits || 0,
                    total_lines: data.total_lines || 0,
                    total_hours: data.total_hours || 0
                });
            }
        });
        await runWithLoader(fetchTask, "Fetching contribution reports from the cloud...");
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
                    <Text style={styles.headerTitle}>{projectDetails?.project_name || "Leaderboard"}</Text>
                    <Text style={styles.headerSubtitle}>{projectDetails?.subject || "Contribution Reports"}</Text>

                    {/* Staging Metrics Progress Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsHeader}>
                            <Text style={styles.statsTitle}>Activity Summary</Text>
                            <Text style={styles.statsTotalText}>
                                {reportsData.members.length} Active Contributors
                            </Text>
                        </View>
                        
                        {/* Segmented Color Bar */}
                        <View style={styles.progressBarContainer}>
                            <View 
                                style={[
                                    styles.progressSegment, 
                                    { 
                                        width: reportsData.total_commits > 0 ? '40%' : '0%', 
                                        backgroundColor: '#3b82f6' 
                                    }
                                ]} 
                            />
                            <View 
                                style={[
                                    styles.progressSegment, 
                                    { 
                                        width: reportsData.total_lines > 0 ? '40%' : '0%', 
                                        backgroundColor: '#10b981' 
                                    }
                                ]} 
                            />
                            <View 
                                style={[
                                    styles.progressSegment, 
                                    { 
                                        width: reportsData.total_hours > 0 ? '20%' : '0%', 
                                        backgroundColor: '#f59e0b' 
                                    }
                                ]} 
                            />
                        </View>

                        {/* Legend Indicators */}
                        <View style={styles.legendGrid}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#3b82f6' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Commits</Text>
                                    <Text style={styles.legendValue}>{reportsData.total_commits} pushes</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#10b981' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Lines of Code</Text>
                                    <Text style={styles.legendValue}>+{reportsData.total_lines}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#f59e0b' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Time Tracked</Text>
                                    <Text style={styles.legendValue}>{reportsData.total_hours} hrs</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── PART 2: Curved White Bottom Container ──────────── */}
                <View style={styles.whiteBottomContainer}>
                    <Text style={styles.subSectionTitle}>Workspace Leaderboard</Text>
                    
                    <View style={styles.leaderboardWrapper}>
                        {reportsData.members.length > 0 ? (
                            reportsData.members.map((member, idx) => {
                                const rosterMember = roster.find(m => m.user_code === member.user_code);
                                const photoUrl = rosterMember?.photo;
                                return (
                                    <View key={idx} style={styles.leaderboardRow}>
                                        <View style={styles.leftMetaWrap}>
                                            {photoUrl ? (
                                                <Image source={{ uri: resolvePhotoUrl(photoUrl) }} style={styles.rosterAvatar} />
                                            ) : (
                                                <View style={styles.rosterAvatarPlaceholder}>
                                                    <Text style={styles.rosterAvatarText}>{member.name.charAt(0)}</Text>
                                                </View>
                                            )}
                                            <View style={{ flexShrink: 1 }}>
                                                <Text style={styles.leaderName} numberOfLines={1}>{member.name}</Text>
                                                <Text style={styles.leaderMeta}>Role: {member.role || "Member"}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.leaderScores}>
                                            <View style={styles.scoreRow}>
                                                <Feather name="trending-up" size={12} color="#10b981" style={{ marginRight: 4 }} />
                                                <Text style={styles.scoreText}>Score: {member.performance_score || 0}</Text>
                                            </View>
                                            <Text style={styles.commitsText}>{member.commits || 0} Commits</Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Feather name="users" size={32} color="#94a3b8" />
                                <Text style={styles.emptyText}>No contribution statistics recorded yet.</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ height: 40 }} />
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

    // Leaderboard cards list
    subSectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 16,
        letterSpacing: 0.1,
    },
    leaderboardWrapper: {
        gap: 12,
    },
    leaderboardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.01,
        shadowRadius: 8,
        elevation: 1,
    },
    leftMetaWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    rosterAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#f1f5f9',
    },
    rosterAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6548d8ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rosterAvatarText: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 16,
    },
    leaderName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    leaderMeta: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    leaderScores: {
        alignItems: 'flex-end',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    scoreText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#10b981',
    },
    commitsText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },

    // Empty States
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 36,
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    emptyText: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
    },
});

import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Platform 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLoading } from '../context/LoadingContext';
import { useSidebar } from '../context/SidebarContext';
import { API_CONFIG } from '../config/api';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import PremiumBackground from '../components/PremiumBackground';

export default function PendingAllocationHubScreen({ route, navigation }) {
    const { user, token } = useAuth();
    const theme = useTheme();
    const { runWithLoader } = useLoading();
    const { toggleSidebar } = useSidebar();

    const teamCode = route.params?.teamCode || user?.activeTeamCode || "";
    const [loading, setLoading] = useState(true);
    const [allocationStatus, setAllocationStatus] = useState({
        guideAllotted: false,
        teammatesAllotted: false,
    });

    const isEverythingReady = allocationStatus.guideAllotted && allocationStatus.teammatesAllotted;

    useEffect(() => {
        if (teamCode) {
            fetchStatus();
        } else {
            setLoading(false);
        }
    }, [teamCode]);

    const fetchStatus = async () => {
        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/team/validation-status?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            const result = await res.json();
            if (result.status === 'success') {
                setAllocationStatus({
                    guideAllotted: result.data.guideAllotted,
                    teammatesAllotted: result.data.teammatesAllotted,
                });
            }
        })
        .catch((error) => {
            console.error("Error fetching allocation status:", error);
        })
        .finally(() => {
            setLoading(false);
        });

        await runWithLoader(fetchTask, "Verifying workspace allocations...");
    };

    const handleAllotGuide = () => {
        navigation.navigate("CreateTeam");
    };

    const handleAddTeammates = () => {
        navigation.navigate("CreateTeam");
    };

    const handleProceedToDeclaration = () => {
        navigation.navigate("DigitalDeclaration", { teamCode });
    };

    return (
        <View style={styles.viewportMaster}>
            <PremiumBackground />
            {/* Header Toolbar */}
            <View style={styles.header}>
                <View style={styles.headerLeftGroup}>
                    <TouchableOpacity onPress={toggleSidebar} style={styles.hamburgerBtn}>
                        <Text style={styles.hamburgerText}>☰</Text>
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: theme.colors.primary }]}>🛡️ Allocation Hub</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Workspace validation checklists</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {!isEverythingReady ? (
                    <>
                        <View style={styles.alertHeaderBox}>
                            <View style={styles.iconCircle}>
                                <Text style={styles.iconText}>⚠️</Text>
                            </View>
                            <Text style={styles.alertHeading}>Pending Allocations Detected</Text>
                            <Text style={styles.alertSubtitle}>
                                Your workspace team profile structure must be fully defined before you can unlock and execute the digital charter declaration.
                            </Text>
                        </View>

                        <View style={styles.cardsList}>
                            {/* Guide status card */}
                            <GlassCard style={[styles.statusCard, allocationStatus.guideAllotted ? styles.cardComplete : styles.cardProgress]}>
                                <View style={styles.statusContentRow}>
                                    <View style={[styles.statusIconBox, allocationStatus.guideAllotted ? styles.iconBoxComplete : styles.iconBoxProgress]}>
                                        <Text style={styles.statusIconText}>👤</Text>
                                    </View>
                                    <View style={styles.statusInfo}>
                                        <Text style={styles.statusTitle}>Project Guide / Mentor</Text>
                                        <Text style={styles.statusDesc}>
                                            {allocationStatus.guideAllotted ? 'Faculty member mapped successfully.' : 'No faculty guide allocated to this cluster.'}
                                        </Text>
                                    </View>
                                </View>
                                {!allocationStatus.guideAllotted && (
                                    <TouchableOpacity style={styles.cardActionBtn} onPress={handleAllotGuide}>
                                        <Text style={styles.cardActionBtnText}>Allot Guide</Text>
                                    </TouchableOpacity>
                                )}
                            </GlassCard>

                            {/* Teammates status card */}
                            <GlassCard style={[styles.statusCard, allocationStatus.teammatesAllotted ? styles.cardComplete : styles.cardProgress]}>
                                <View style={styles.statusContentRow}>
                                    <View style={[styles.statusIconBox, allocationStatus.teammatesAllotted ? styles.iconBoxComplete : styles.iconBoxProgress]}>
                                        <Text style={styles.statusIconText}>👥</Text>
                                    </View>
                                    <View style={styles.statusInfo}>
                                        <Text style={styles.statusTitle}>Teammate Group Allocation</Text>
                                        <Text style={styles.statusDesc}>
                                            {allocationStatus.teammatesAllotted ? 'Minimum student rosters verified.' : 'Teammate node slot inputs are missing.'}
                                        </Text>
                                    </View>
                                </View>
                                {!allocationStatus.teammatesAllotted && (
                                    <TouchableOpacity style={styles.cardActionBtn} onPress={handleAddTeammates}>
                                        <Text style={styles.cardActionBtnText}>Map Peers</Text>
                                    </TouchableOpacity>
                                )}
                            </GlassCard>
                        </View>

                        <View style={styles.footerContainer}>
                            <PremiumButton 
                                title="Proceed to Declaration ➔"
                                disabled={true}
                                style={styles.disabledProceedBtn}
                            />
                        </View>
                    </>
                ) : (
                    <View style={styles.completeView}>
                        <View style={styles.completeHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                                <Text style={styles.iconText}>✓</Text>
                            </View>
                            <Text style={styles.completeHeading}>Allocations Complete</Text>
                            <Text style={styles.completeSubtitle}>
                                All colleague nodes and guides have successfully connected to your project ecosystem pipeline.
                            </Text>
                        </View>

                        <GlassCard style={styles.proceedCard}>
                            <Text style={styles.proceedCardTitle}>Ecosystem Status Ready</Text>
                            <Text style={styles.proceedCardDesc}>
                                You are now cleared to sign the official workspace digital charter.
                            </Text>
                            <PremiumButton 
                                title="Unlock Digital Declaration"
                                onPress={handleProceedToDeclaration}
                                style={styles.proceedBtn}
                            />
                        </GlassCard>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    viewportMaster: {
        flex: 1,
        backgroundColor: '#EEF2FF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        marginBottom: 20,
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
        color: '#1A1A2E',
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
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 60,
        flexGrow: 1,
    },
    alertHeaderBox: {
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 10,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderWidth: 1.5,
        borderColor: 'rgba(245, 158, 11, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconText: {
        fontSize: 22,
    },
    alertHeading: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A2E',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    alertSubtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 19,
    },
    cardsList: {
        marginVertical: 10,
    },
    statusCard: {
        padding: 18,
        marginBottom: 16,
        borderWidth: 1.5,
    },
    cardComplete: {
        backgroundColor: 'rgba(16, 185, 129, 0.06)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    cardProgress: {
        backgroundColor: 'rgba(245, 158, 11, 0.06)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    statusContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconBoxComplete: {
        backgroundColor: '#10B981',
    },
    iconBoxProgress: {
        backgroundColor: '#F59E0B',
    },
    statusIconText: {
        fontSize: 16,
        color: '#ffffff',
    },
    statusInfo: {
        flex: 1,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A1A2E',
        marginBottom: 2,
    },
    statusDesc: {
        fontSize: 12,
        color: '#64748B',
    },
    cardActionBtn: {
        backgroundColor: '#F59E0B',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignSelf: 'flex-end',
    },
    cardActionBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    footerContainer: {
        marginTop: 20,
    },
    disabledProceedBtn: {
        backgroundColor: '#CBD5E1',
    },
    completeView: {
        flex: 1,
        justifyContent: 'center',
        marginVertical: 20,
    },
    completeHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    completeHeading: {
        fontSize: 20,
        fontWeight: '900',
        color: '#10B981',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    completeSubtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 19,
    },
    proceedCard: {
        padding: 20,
        alignItems: 'center',
    },
    proceedCardTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1A1A2E',
        marginBottom: 6,
    },
    proceedCardDesc: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 16,
        textAlign: 'center',
    },
    proceedBtn: {
        width: '100%',
    }
});

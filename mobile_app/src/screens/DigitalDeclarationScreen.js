import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    TextInput, 
    Dimensions, 
    Platform,
    Image,
    PanResponder
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLoading } from '../context/LoadingContext';
import { useSidebar } from '../context/SidebarContext';
import { API_CONFIG } from '../config/api';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import PremiumBackground from '../components/PremiumBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Premium transparent base64 signature placeholder for fallback
const FALLBACK_SIGNATURE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcIAAABACAYAAAC1g/8dAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gUFEg0XCQcZPAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkSubGAAACZUlEQVR42u3dv0vVURzH8df351W4ODg0NLg0NDg0uDQ0ODg4NDg0ODg4NEg4NDi0ODg0NDg0ODg0NDQ4uLg0SLi4tDQ0uDg4tDQ0uDg4NDi4tDg4NDi4tLQ4ODQ4tDg4NDS4NDg0ODi0NEi4uLQ0NDQ4NEi4uDQ4uDg4NDS4uDREuLi0NDQ4tDg4NDg4NDi4uLQ4ODS4tDQ4NDg4uLQ4ODi4tLQ0NDQ4uLi0ODQ4uLQ4NDi4uLQ0NDQ4NDi4uLQ4NDi4tDg4uLS0tDg4NDi4uLQ4uLS0tLQ4NDi4uLQ4NDg4NDQ0uLi0tLQ0uLQ0NDi4tDg0uLi4NDQ4NDi4uLQ0NDi4tLQ4ODg4NDi4uLQ0uLi0tLQ4uLS0tDg4uLS0tLQ0uLS0tDg4NDi4uLQ0uLi4tLQ4uLi4tLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4v/0D+X8e/wAAAP//AwA=";

const resolvePhotoUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) {
        if (url.includes("localhost:5000") && API_CONFIG.BACKEND_URL !== "http://localhost:5000") {
            return url.replace("http://localhost:5000", API_CONFIG.BACKEND_URL);
        }
        return url;
    }
    return `${API_CONFIG.BACKEND_URL}${url}`;
};

export default function DigitalDeclarationScreen({ route, navigation }) {
    const { user, token } = useAuth();
    const theme = useTheme();
    const { runWithLoader } = useLoading();
    const { toggleSidebar } = useSidebar();

    const teamCode = route.params?.teamCode || user?.activeTeamCode || "";
    
    const [docDetails, setDocDetails] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [teamFormDetails, setTeamFormDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    // Drawing Board States
    const [points, setPoints] = useState([]);
    const [typedName, setTypedName] = useState("");
    const [signatureMode, setSignatureMode] = useState("draw"); // draw | type

    useEffect(() => {
        if (teamCode) {
            loadDeclarationData();
            // Start 5-second polling interval for real-time teammate signature updates
            const intervalId = setInterval(loadDeclarationDataSilently, 5000);
            return () => clearInterval(intervalId);
        }
    }, [teamCode]);

    const loadDeclarationData = async () => {
        setLoading(true);
        const fetchTask = Promise.all([
            fetch(`${API_CONFIG.BACKEND_URL}/api/declaration/${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()),
            fetch(`${API_CONFIG.BACKEND_URL}/api/team/digital-form-context?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json())
        ])
        .then(([declarationData, formContextData]) => {
            if (declarationData.document) {
                setDocDetails(declarationData.document);
                setParticipants(declarationData.signatures || []);
            }
            if (!formContextData.error) {
                setTeamFormDetails(formContextData);
            }
        })
        .catch((err) => {
            console.error("Error loading declaration framework:", err);
        })
        .finally(() => {
            setLoading(false);
        });

        await runWithLoader(fetchTask, "Synchronizing consensus instrument...");
    };

    const loadDeclarationDataSilently = async () => {
        try {
            const [declarationRes, formContextRes] = await Promise.all([
                fetch(`${API_CONFIG.BACKEND_URL}/api/declaration/${teamCode}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_CONFIG.BACKEND_URL}/api/team/digital-form-context?team_code=${teamCode}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            if (declarationRes.ok) {
                const declarationData = await declarationRes.json();
                if (declarationData.document) {
                    setDocDetails(declarationData.document);
                    setParticipants(declarationData.signatures || []);
                }
            }
            if (formContextRes.ok) {
                const formContextData = await formContextRes.json();
                if (!formContextData.error) {
                    setTeamFormDetails(formContextData);
                }
            }
        } catch (e) {
            // Silence network polling errors
        }
    };

    // PanResponder for high-performance zero-dependency drawing board
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                setPoints(prev => [...prev, { x: locationX, y: locationY, isStart: true }]);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                // Optimization: only add points if they are reasonably spaced
                setPoints(prev => {
                    if (prev.length > 0) {
                        const last = prev[prev.length - 1];
                        const dist = Math.hypot(locationX - last.x, locationY - last.y);
                        if (dist < 4) return prev; // Filter out excessive segments
                    }
                    return [...prev, { x: locationX, y: locationY, isStart: false }];
                });
            },
            onPanResponderRelease: () => {}
        })
    ).current;

    const clearCanvas = () => {
        setPoints([]);
        setTypedName("");
    };

    const submitSignature = async () => {
        const signTask = fetch(`${API_CONFIG.BACKEND_URL}/api/declaration/sign`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                team_code: teamCode,
                user_name: `${user?.first_name} ${user?.last_name}`, 
                signature_base64: FALLBACK_SIGNATURE_BASE64 // Base64 signature image
            })
        })
        .then(async (res) => {
            const data = await res.json();
            if (data.status === 'success') {
                loadDeclarationData();
            } else {
                alert('Failed to finalize authorization signature block.');
            }
        })
        .catch((err) => {
            console.error("Error signing document:", err);
        });

        await runWithLoader(signTask, "Submitting authorized verification sign...");
    };

    if (loading) {
        return (
            <View style={[styles.viewportMaster, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.colors.textMuted }}>Loading consensus framework...</Text>
            </View>
        );
    }

    const currentUserName = `${user?.first_name} ${user?.last_name}`;
    const userSignatureObj = participants.find(p => p.user_name === currentUserName);
    const hasSigned = !!userSignatureObj?.signature_image;

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
                        <Text style={[styles.title, { color: theme.colors.primary }]}>📄 Digital Charter</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Consensus verification form</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                
                {/* Official Seal Alert Banner if declared */}
                {docDetails?.is_fully_declared && (
                    <View style={styles.officialSealBanner}>
                        <Text style={styles.officialSealText}>✓ DOCUMENT DECLARED & LOCKED</Text>
                        <Text style={styles.officialSealDate}>{docDetails.declared_date}</Text>
                    </View>
                )}

                {/* Document details card */}
                <GlassCard style={styles.documentPaper}>
                    <Text style={styles.docTypeLabel}>OFFICIAL CHARTER AGREEMENT</Text>
                    <Text style={styles.teamBadge}>TEAM REFERENCE CODE: {teamCode}</Text>
                    
                    <View style={styles.projectMetadataBox}>
                        <Text style={styles.metaRow}>Project Title: <Text style={styles.metaVal}>{docDetails?.project_name || teamFormDetails?.project_name}</Text></Text>
                        <Text style={styles.metaRow}>Subject/Course: <Text style={styles.metaVal}>{docDetails?.subject_details || teamFormDetails?.subject}</Text></Text>
                        <Text style={styles.metaRow}>Duration Cycle: <Text style={styles.metaVal}>{teamFormDetails?.timeline || "N/A"}</Text></Text>
                        <Text style={styles.metaRow}>Target Sector: <Text style={styles.metaVal}>{teamFormDetails?.target_industry || "Technology"}</Text></Text>
                    </View>

                    <View style={styles.dividerLine} />

                    {/* Faculty Advisor Row */}
                    {teamFormDetails?.faculty && (
                        <View style={styles.facultySection}>
                            <Text style={styles.subSectionTitle}>Academic Faculty Guide</Text>
                            <View style={styles.facultyBanner}>
                                {teamFormDetails.faculty.photo ? (
                                    <Image 
                                        source={{ uri: resolvePhotoUrl(teamFormDetails.faculty.photo) }} 
                                        style={styles.facultyAvatar} 
                                    />
                                ) : (
                                    <View style={styles.avatarCircle}>
                                        <Text style={styles.avatarText}>🎓</Text>
                                    </View>
                                )}
                                <View style={styles.facultyInfo}>
                                    <Text style={styles.facultyName}>{teamFormDetails.faculty.name}</Text>
                                    <Text style={styles.facultyEmail}>{teamFormDetails.faculty.email}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Workspace Signatories matrix */}
                    <Text style={styles.subSectionTitle}>Signatories Registry Matrix</Text>
                    <View style={styles.signatoriesGrid}>
                        {participants.map((person, idx) => {
                            const isGuide = person.user_role === 'Guide';
                            const matchingRosterItem = teamFormDetails?.roster?.find(member => member.user_code === person.user_code);
                            const userPhotoUrl = matchingRosterItem?.photo;
                            return (
                                <View key={idx} style={[styles.signatoryCard, isGuide && styles.guideHighlight]}>
                                    <View style={styles.cardHeaderRow}>
                                        {userPhotoUrl ? (
                                            <Image 
                                                source={{ uri: resolvePhotoUrl(userPhotoUrl) }} 
                                                style={styles.rosterInlinePhoto} 
                                            />
                                        ) : (
                                            <View style={styles.rosterPhotoPlaceholder}>
                                                <Text style={styles.rosterPlaceholderText}>👤</Text>
                                            </View>
                                        )}
                                        <View style={styles.signatoryMetaInfo}>
                                            <Text style={styles.cardName} numberOfLines={1}>{person.user_name}</Text>
                                            <View style={[styles.cardBadge, isGuide && styles.guideBadge]}>
                                                <Text style={styles.cardBadgeText}>{person.user_role}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.signatureDisplayArea}>
                                        {person.signature_image ? (
                                            <Image 
                                                source={{ uri: person.signature_image }} 
                                                style={styles.sigImage}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <Text style={styles.sigPendingText}>⏳ Pending Signature</Text>
                                        )}
                                    </View>
                                    <Text style={styles.sigVerificationText}>Authorized Verification Sign</Text>
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.dividerLine} />

                    {/* Active Sign Pad */}
                    {!hasSigned && !docDetails?.is_fully_declared && (
                        <View style={styles.activeSigningSection}>
                            <Text style={styles.signingTitle}>Signatory Pad: <Text style={{ color: '#3b82f6' }}>{currentUserName}</Text></Text>
                            <Text style={styles.signingInstruction}>Apply signature validation using one of the methods below:</Text>

                            <View style={styles.toggleButtonGroup}>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, signatureMode === 'draw' && styles.toggleBtnActive]}
                                    onPress={() => setSignatureMode('draw')}
                                >
                                    <Text style={[styles.toggleBtnText, signatureMode === 'draw' && styles.toggleBtnTextActive]}>Draw Signature</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, signatureMode === 'type' && styles.toggleBtnActive]}
                                    onPress={() => setSignatureMode('type')}
                                >
                                    <Text style={[styles.toggleBtnText, signatureMode === 'type' && styles.toggleBtnTextActive]}>Type Name</Text>
                                </TouchableOpacity>
                            </View>

                            {signatureMode === 'draw' ? (
                                <View style={styles.canvasContainer} {...panResponder.panHandlers}>
                                    {points.map((pt, i) => {
                                        // Draw a simple segment using tiny Views
                                        return (
                                            <View 
                                                key={i} 
                                                style={[
                                                    styles.drawingPoint, 
                                                    { left: pt.x - 2, top: pt.y - 2 }
                                                ]} 
                                            />
                                        );
                                    })}
                                    {points.length === 0 && (
                                        <View style={styles.canvasPlaceholder}>
                                            <Text style={styles.canvasPlaceholderText}>Draw your signature here</Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.typeInputContainer}>
                                    <TextInput 
                                        style={styles.textInput}
                                        value={typedName}
                                        onChangeText={setTypedName}
                                        placeholder="Type your name here..."
                                    />
                                    {typedName ? (
                                        <View style={styles.cursivePreviewContainer}>
                                            <Text style={styles.cursiveText}>{typedName}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}

                            <View style={styles.padControlsRow}>
                                <TouchableOpacity style={styles.clearBtn} onPress={clearCanvas}>
                                    <Text style={styles.clearBtnText}>Reset Pad</Text>
                                </TouchableOpacity>
                                <PremiumButton 
                                    title="Authorize & Lock Signature"
                                    onPress={submitSignature}
                                    style={styles.sigSubmitBtn}
                                />
                            </View>
                        </View>
                    )}

                    {hasSigned && !docDetails?.is_fully_declared && (
                        <View style={styles.waitingBannerContainer}>
                            <Text style={styles.waitingBannerText}>
                                🎉 Your signature has been mapped into the consensus matrix. Waiting on guide review signatures and colleagues...
                            </Text>
                        </View>
                    )}
                </GlassCard>

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
    },
    officialSealBanner: {
        backgroundColor: 'rgba(16, 185, 129, 0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    officialSealText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#10B981',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    officialSealDate: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '600',
    },
    documentPaper: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 18,
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    docTypeLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 4,
        textAlign: 'center',
    },
    teamBadge: {
        fontSize: 13,
        fontWeight: '800',
        color: '#6366F1',
        textAlign: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        alignSelf: 'center',
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.15)',
    },
    projectMetadataBox: {
        backgroundColor: 'rgba(15, 23, 42, 0.03)',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
    },
    metaRow: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 6,
    },
    metaVal: {
        fontWeight: '700',
        color: '#1A1A2E',
    },
    dividerLine: {
        height: 1.5,
        backgroundColor: 'rgba(15, 23, 42, 0.06)',
        marginVertical: 20,
    },
    subSectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    facultySection: {
        marginBottom: 20,
    },
    facultyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        borderRadius: 14,
        padding: 12,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
    },
    facultyInfo: {
        flex: 1,
    },
    facultyName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A1A2E',
        marginBottom: 2,
    },
    facultyEmail: {
        fontSize: 12,
        color: '#64748B',
    },
    signatoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    signatoryCard: {
        width: '48%',
        backgroundColor: 'rgba(15, 23, 42, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
    },
    guideHighlight: {
        borderColor: 'rgba(99, 102, 241, 0.3)',
        backgroundColor: 'rgba(99, 102, 241, 0.04)',
    },
    facultyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    rosterInlinePhoto: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    rosterPhotoPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        marginRight: 8,
    },
    rosterPlaceholderText: {
        fontSize: 12,
        color: '#64748B',
    },
    signatoryMetaInfo: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardName: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1A1A2E',
    },
    cardBadge: {
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
        paddingVertical: 2.5,
        paddingHorizontal: 7,
        borderRadius: 6,
    },
    guideBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    cardBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#64748B',
    },
    signatureDisplayArea: {
        height: 50,
        backgroundColor: 'rgba(15, 23, 42, 0.03)',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    sigImage: {
        width: '90%',
        height: '90%',
    },
    sigPendingText: {
        fontSize: 11,
        color: '#F59E0B',
        fontWeight: '700',
    },
    sigVerificationText: {
        fontSize: 8,
        color: '#94A3B8',
        textAlign: 'center',
    },
    activeSigningSection: {
        marginTop: 10,
    },
    signingTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#1A1A2E',
        marginBottom: 4,
    },
    signingInstruction: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 16,
    },
    toggleButtonGroup: {
        flexDirection: 'row',
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleBtnActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleBtnText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    toggleBtnTextActive: {
        color: '#6366F1',
        fontWeight: '800',
    },
    canvasContainer: {
        height: 140,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: 'rgba(99, 102, 241, 0.25)',
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
    },
    drawingPoint: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#1A1A2E',
    },
    canvasPlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvasPlaceholderText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '550',
    },
    typeInputContainer: {
        marginBottom: 16,
    },
    textInput: {
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1.5,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 14,
        color: '#1A1A2E',
        marginBottom: 10,
    },
    cursivePreviewContainer: {
        height: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1.5,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cursiveText: {
        fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'sans-serif-condensed',
        fontSize: 26,
        fontStyle: 'italic',
        color: '#1A1A2E',
    },
    padControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    clearBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        backgroundColor: 'transparent',
    },
    clearBtnText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '700',
    },
    sigSubmitBtn: {
        margin: 0,
        paddingHorizontal: 16,
    },
    waitingBannerContainer: {
        backgroundColor: 'rgba(16, 185, 129, 0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    waitingBannerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10B981',
        textAlign: 'center',
        lineHeight: 18,
    }
});

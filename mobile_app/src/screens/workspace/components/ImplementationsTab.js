import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TextInput, 
    TouchableOpacity, 
    Image, 
    Platform, 
    Dimensions,
    Modal,
    Easing,
    Animated,
    Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { API_CONFIG } from '../../../config/api';
import { useSecureOffline } from '../../../context/SecureOfflineContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function LoadingSpinner({ size = 20, color = '#6548d8ff' }) {
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [spinAnim]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="loader" size={size} color={color} />
        </Animated.View>
    );
}

// Custom Player wrapper to handle video views cleanly
function LocalVideoPlayer({ videoUri }) {
    const player = useVideoPlayer(videoUri, player => {
        player.loop = true;
        player.play();
    });

    return (
        <VideoView 
            style={styles.implVideo} 
            player={player} 
            allowsFullscreen 
            allowsPictureInPicture 
        />
    );
}

export default function ImplementationsTab({ teamCode, token, user, runWithLoader, handleUserScroll }) {
    const { offlineWorkspaces } = useSecureOffline();
    const [implementations, setImplementations] = useState([]);
    const [projectDetails, setProjectDetails] = useState(null);

    // Form inputs states
    const [implTitle, setImplTitle] = useState("");
    const [implDesc, setImplDesc] = useState("");
    const [implCategory, setImplCategory] = useState("Frontend UI");
    const [implUrl, setImplUrl] = useState("");
    const [gradeScore, setGradeScore] = useState("");
    const [gradeFeedback, setGradeFeedback] = useState("");

    // Upload mode switcher: 'upload' (from device) or 'link' (paste URL)
    const [uploadMode, setUploadMode] = useState("upload");
    const [selectedFile, setSelectedFile] = useState(null);

    // Modal Visibility state
    const [submitModalVisible, setSubmitModalVisible] = useState(false);

    useEffect(() => {
        if (teamCode) {
            fetchImplementations();
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
            console.error("Error fetching project details in Implementations:", err);
            if (offlineWorkspaces?.project_details) {
                setProjectDetails(offlineWorkspaces.project_details);
            }
        }
    };

    const fetchImplementations = async () => {
        if (!token) {
            if (offlineWorkspaces && offlineWorkspaces.implementations) {
                setImplementations(offlineWorkspaces.implementations);
            }
            return;
        }

        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/implementation?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setImplementations(data.implementations || []);
            }
        })
        .catch((err) => {
            console.error("Error fetching implementations:", err);
            if (offlineWorkspaces && offlineWorkspaces.implementations) {
                setImplementations(offlineWorkspaces.implementations);
            }
        });
        await runWithLoader(fetchTask, "Fetching implementations from the cloud...");
    };

    const handleUploadImplementation = async () => {
        if (!implTitle.trim()) {
            Alert.alert("Missing Parameter", "Please enter the milestone title.");
            return;
        }

        if (uploadMode === 'link') {
            if (!implUrl.trim()) {
                Alert.alert("Missing Parameter", "Please paste the showcase image/video link URL.");
                return;
            }
            const uploadTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/implementation/submit`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    team_code: teamCode,
                    title: implTitle,
                    category: implCategory,
                    image_url: implUrl,
                    email: user?.email
                })
            })
            .then(async (res) => {
                if (res.ok) {
                    setImplTitle("");
                    setImplUrl("");
                    setSubmitModalVisible(false);
                    fetchImplementations();
                } else {
                    const err = await res.json();
                    alert(err.error || "Failed to submit milestone.");
                }
            });

            await runWithLoader(uploadTask, "Submitting screenshot link...");
        } else {
            // Upload device file mode
            if (!selectedFile) {
                Alert.alert("Missing File", "Please select a screenshot or video file from your device.");
                return;
            }

            const formData = new FormData();
            formData.append('file', {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.mimeType || 'application/octet-stream'
            });
            formData.append('team_code', teamCode);
            formData.append('title', implTitle);
            formData.append('category', implCategory);
            formData.append('email', user?.email || 'unknown@teambridge.edu');

            const uploadDocTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/implementation/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: formData
            })
            .then(async (res) => {
                if (res.ok) {
                    setImplTitle("");
                    setSelectedFile(null);
                    setSubmitModalVisible(false);
                    fetchImplementations();
                } else {
                    const err = await res.json();
                    alert(err.error || "Failed to upload implementation media.");
                }
            })
            .catch(err => {
                console.error("Upload error:", err);
                alert("File upload failed.");
            });

            await runWithLoader(uploadDocTask, "Uploading implementation milestone to cloud...");
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.type === 'success') {
                setSelectedFile({
                    uri: result.uri,
                    name: result.name,
                    size: result.size,
                    mimeType: result.mimeType
                });
            } else if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
            } else if (result.uri) {
                setSelectedFile({
                    uri: result.uri,
                    name: result.name || 'file',
                    size: result.size || 0,
                    mimeType: result.mimeType || 'application/octet-stream'
                });
            }
        } catch (err) {
            console.error("Error picking implementation media:", err);
            alert("Error selecting file: " + err.message);
        }
    };

    const handleDeleteImplementation = async (implId) => {
        Alert.alert(
            "Confirm Delete",
            "Do you permanently delete this upload?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        const deleteTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/implementation?id=${implId}&email=${user?.email || 'unknown@teambridge.edu'}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                        .then(async (res) => {
                            if (res.ok) {
                                fetchImplementations();
                            } else {
                                const err = await res.json();
                                alert(err.error || "Failed to delete milestone showcase.");
                            }
                        })
                        .catch(err => {
                            console.error("Delete implementation error:", err);
                        });
                        await runWithLoader(deleteTask, "Deleting implementation milestone from cloud...");
                    }
                }
            ]
        );
    };

    const handleSubmitGrade = async (implId) => {
        if (!gradeScore) return;

        const gradeTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/implementation/grade`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                implementation_id: implId,
                grade_score: parseInt(gradeScore),
                grading_feedback: gradeFeedback,
                email: user?.email
            })
        })
        .then(async (res) => {
            if (res.ok) {
                setGradeScore("");
                setGradeFeedback("");
                fetchImplementations();
                alert("Milestone graded successfully!");
            }
        });

        await runWithLoader(gradeTask, "Recording review grade...");
    };

    // Helper to resolve host URLs
    const getFullUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
                .replace("http://localhost:5000", API_CONFIG.BACKEND_URL)
                .replace("http://127.0.0.1:5000", API_CONFIG.BACKEND_URL);
        }
        return `${API_CONFIG.BACKEND_URL}${url}`;
    };

    const isVideoFile = (url) => {
        const ext = (url || "").toLowerCase();
        return ext.endsWith('.mp4') || ext.endsWith('.mov') || ext.endsWith('.m4v') || ext.endsWith('.3gp') || ext.endsWith('.avi');
    };

    // Calculate dynamic stats
    const stats = React.useMemo(() => {
        let gradedCount = 0;
        let pendingCount = 0;
        let sumScore = 0;

        implementations.forEach(impl => {
            if (impl.grade_score !== null) {
                gradedCount++;
                sumScore += impl.grade_score;
            } else {
                pendingCount++;
            }
        });

        const total = implementations.length || 1;
        const avgScore = gradedCount > 0 ? Math.round(sumScore / gradedCount) : 0;

        return {
            total: implementations.length,
            gradedCount,
            pendingCount,
            avgScore,
            categories: [
                { name: 'Graded', count: gradedCount, percentage: (gradedCount / total) * 100, color: '#10b981' },
                { name: 'Pending', count: pendingCount, percentage: (pendingCount / total) * 100, color: '#f59e0b' }
            ].filter(c => c.count > 0)
        };
    }, [implementations]);

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
                    <Text style={styles.headerTitle}>{projectDetails?.project_name || "Submissions"}</Text>
                    <Text style={styles.headerSubtitle}>{projectDetails?.subject || "Milestone Ledger"}</Text>

                    {/* Staging Metrics Progress Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsHeader}>
                            <Text style={styles.statsTitle}>Milestones Grade</Text>
                            <Text style={styles.statsTotalText}>
                                {stats.gradedCount} of {stats.total} Milestones Reviewed
                            </Text>
                        </View>
                        
                        {/* Segmented Color Bar */}
                        <View style={styles.progressBarContainer}>
                            {stats.categories.map((c, i) => (
                                <View 
                                    key={i} 
                                    style={[
                                        styles.progressSegment, 
                                        { 
                                            width: `${c.percentage}%`, 
                                            backgroundColor: c.color 
                                        }
                                    ]} 
                                />
                            ))}
                        </View>

                        {/* Legend Indicators */}
                        <View style={styles.legendGrid}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#10b981' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Graded</Text>
                                    <Text style={styles.legendValue}>{stats.gradedCount}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#f59e0b' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Pending</Text>
                                    <Text style={styles.legendValue}>{stats.pendingCount}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#3b82f6' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Average</Text>
                                    <Text style={styles.legendValue}>{stats.avgScore}/100</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── PART 2: Curved White Bottom Container ──────────── */}
                <View style={styles.whiteBottomContainer}>
                    <Text style={styles.subSectionTitle}>Submissions Ledger</Text>
                    
                    <View style={styles.ledgerListWrapper}>
                        {implementations.length > 0 ? (
                            implementations.map((impl) => {
                                const fileUrl = getFullUrl(impl.url);
                                const isVideo = isVideoFile(impl.url);
                                const canDelete = user?.role === 'Faculty' || user?.user_code === impl.uploaded_by;

                                return (
                                    <View key={impl.id} style={styles.implItemCard}>
                                        <View style={styles.implCardHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.implTitleText}>{impl.title}</Text>
                                                <View style={styles.badgeRow}>
                                                    <Text style={styles.implCategoryBadge}>{impl.category}</Text>
                                                    {isVideo && (
                                                        <Text style={[styles.implCategoryBadge, { backgroundColor: '#c084fc', color: '#7e22ce', marginLeft: 6 }]}>
                                                            Video Showcase
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text style={styles.uploaderText}>Uploaded by: {impl.uploaded_by_name || "Unknown"}</Text>
                                            </View>
                                            
                                            {canDelete && (
                                                <TouchableOpacity 
                                                    style={styles.trashBtnTouch} 
                                                    onPress={() => handleDeleteImplementation(impl.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Feather name="trash-2" size={16} color="#94a3b8" />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {impl.url ? (
                                            isVideo ? (
                                                <LocalVideoPlayer videoUri={fileUrl} />
                                            ) : (
                                                <Image 
                                                    source={{ uri: fileUrl }} 
                                                    style={styles.implImage}
                                                    resizeMode="cover"
                                                />
                                            )
                                        ) : null}

                                        <View style={styles.gradeBox}>
                                            {impl.grade_score !== null ? (
                                                <View>
                                                    <View style={styles.scoreRow}>
                                                        <Feather name="award" size={14} color="#10b981" style={{ marginRight: 6 }} />
                                                        <Text style={styles.gradeText}>Score: {impl.grade_score}/100</Text>
                                                    </View>
                                                    <Text style={styles.feedbackText}>
                                                        Feedback: {impl.grading_feedback || "No feedback comments recorded."}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View style={styles.scoreRow}>
                                                    <Feather name="clock" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                                                    <Text style={styles.pendingGradeText}>Grade Pending Guide Review</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Guide Grading Form */}
                                        {user?.role === 'Faculty' && impl.grade_score === null && (
                                            <View style={styles.guideGradingForm}>
                                                <Text style={styles.gradingHeaderTitle}>Grading Assessment</Text>
                                                <TextInput 
                                                    style={styles.textInput}
                                                    value={gradeScore}
                                                    onChangeText={setNewDocName}
                                                    placeholder="Enter Score (0-100)"
                                                    placeholderTextColor="#94a3b8"
                                                    keyboardType="numeric"
                                                />
                                                <TextInput 
                                                    style={styles.textInput}
                                                    value={gradeFeedback}
                                                    onChangeText={setGradeFeedback}
                                                    placeholder="Enter Grading Feedback Comments..."
                                                    placeholderTextColor="#94a3b8"
                                                />
                                                <TouchableOpacity 
                                                    style={styles.gradeSubmitBtn} 
                                                    onPress={() => handleSubmitGrade(impl.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.gradeSubmitBtnText}>Submit Grade Assessment</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Feather name="inbox" size={32} color="#94a3b8" />
                                <Text style={styles.emptyText}>No screenshot milestones submitted yet.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Floating Action Button (FAB) */}
            <TouchableOpacity 
                style={styles.fabButton}
                onPress={() => {
                    setSelectedFile(null);
                    setSubmitModalVisible(true);
                }}
                activeOpacity={0.8}
            >
                <Feather name="plus" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Submit Milestone Modal */}
            <Modal
                visible={submitModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSubmitModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Submit Milestone Code/Showcase</Text>
                            <TouchableOpacity onPress={() => setSubmitModalVisible(false)}>
                                <Feather name="x" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {/* Switcher Tab */}
                        <View style={styles.modeTabs}>
                            <TouchableOpacity 
                                style={[styles.modeTab, uploadMode === 'upload' && styles.modeTabActive]}
                                onPress={() => setUploadMode('upload')}
                            >
                                <Feather name="upload" size={14} color={uploadMode === 'upload' ? '#ffffff' : '#64748b'} style={{ marginRight: 6 }} />
                                <Text style={[styles.modeTabText, uploadMode === 'upload' && styles.modeTabTextActive]}>Upload Device File</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modeTab, uploadMode === 'link' && styles.modeTabActive]}
                                onPress={() => setUploadMode('link')}
                            >
                                <Feather name="link" size={14} color={uploadMode === 'link' ? '#ffffff' : '#64748b'} style={{ marginRight: 6 }} />
                                <Text style={[styles.modeTabText, uploadMode === 'link' && styles.modeTabTextActive]}>Paste URL</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Milestone Title</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={implTitle}
                            onChangeText={setImplTitle}
                            placeholder="e.g. Dynamic User Verification Screen"
                            placeholderTextColor="#94a3b8"
                        />

                        {uploadMode === 'link' ? (
                            <View>
                                <Text style={styles.inputLabel}>Screenshot Image URL</Text>
                                <TextInput 
                                    style={styles.textInput}
                                    value={implUrl}
                                    onChangeText={setImplUrl}
                                    placeholder="https://example.com/screenshot.png"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                />
                            </View>
                        ) : (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.inputLabel}>Device Media Selection</Text>
                                <TouchableOpacity 
                                    style={styles.pickFileBtn}
                                    onPress={handlePickFile}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="image" size={20} color="#8b5cf6" style={{ marginRight: 10 }} />
                                    <Text style={styles.pickFileBtnText} numberOfLines={1}>
                                        {selectedFile ? selectedFile.name : "Pick screenshot/video..."}
                                    </Text>
                                </TouchableOpacity>
                                {selectedFile && (
                                    <Text style={styles.fileSizeText}>
                                        Size: {(selectedFile.size / 1024).toFixed(1)} KB
                                    </Text>
                                )}
                            </View>
                        )}

                        <Text style={styles.inputLabel}>Milestone Category</Text>
                        <View style={styles.categoryToggleGroup}>
                            {['Frontend UI', 'Backend API', 'Database Integration'].map((cat) => {
                                const isActive = implCategory === cat;
                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.catSelectBtn,
                                            isActive && styles.catSelectBtnActive
                                        ]}
                                        onPress={() => setImplCategory(cat)}
                                    >
                                        <Text style={[
                                            styles.catSelectBtnText,
                                            isActive && styles.catSelectBtnTextActive
                                        ]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity 
                            style={styles.submitBtn}
                            onPress={handleUploadImplementation}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.submitBtnText}>Submit Milestone Node</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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

    // Submissions Ledger cards
    subSectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 16,
        letterSpacing: 0.1,
    },
    ledgerListWrapper: {
        gap: 16,
        paddingBottom: 80,
    },
    implItemCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.01,
        shadowRadius: 8,
        elevation: 1,
    },
    implCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    implTitleText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    implCategoryBadge: {
        backgroundColor: '#e0e7ff',
        color: '#4f46e5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        fontSize: 10,
        fontWeight: '700',
    },
    implImage: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: '#f1f5f9',
    },
    implVideo: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: '#000000',
    },
    gradeBox: {
        backgroundColor: '#ffffff',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    gradeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10b981',
    },
    feedbackText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
        lineHeight: 18,
    },
    pendingGradeText: {
        fontSize: 12,
        color: '#f59e0b',
        fontWeight: '700',
    },
    uploaderText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 2,
    },
    trashBtnTouch: {
        padding: 6,
    },

    // Guide Grading Form
    guideGradingForm: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 16,
    },
    gradingHeaderTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    gradeSubmitBtn: {
        height: 40,
        backgroundColor: '#6548d8ff',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradeSubmitBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },

    // Inputs inside modal & grading
    textInput: {
        height: 48,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        color: '#0f172a',
        marginBottom: 14,
    },

    // Floating Action Button
    fabButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6548d8ff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6548d8ff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 99,
    },

    // Dialog Modal styling
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContentCard: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    categoryToggleGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 8,
    },
    catSelectBtn: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catSelectBtnActive: {
        backgroundColor: '#6548d8ff',
        borderColor: '#6548d8ff',
    },
    catSelectBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    catSelectBtnTextActive: {
        color: '#ffffff',
    },
    submitBtn: {
        height: 52,
        backgroundColor: '#6548d8ff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
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

    // Segment mode switcher tabs inside Modal
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    modeTabActive: {
        backgroundColor: '#6548d8ff',
    },
    modeTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    modeTabTextActive: {
        color: '#ffffff',
    },

    // Pick file button styling
    pickFileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        backgroundColor: '#f5f3ff',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#c084fc',
        paddingHorizontal: 16,
    },
    pickFileBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#7c3aed',
        flex: 1,
    },
    fileSizeText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 4,
    },
});

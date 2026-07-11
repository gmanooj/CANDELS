import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TextInput, 
    TouchableOpacity, 
    Platform, 
    Dimensions,
    Modal,
    Linking,
    Alert,
    Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { API_CONFIG } from '../../../config/api';
import { useSecureOffline } from '../../../context/SecureOfflineContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DocumentsTab({ teamCode, token, runWithLoader, handleUserScroll, user }) {
    const { offlineWorkspaces } = useSecureOffline();
    const [documents, setDocuments] = useState([]);
    const [projectDetails, setProjectDetails] = useState(null);

    // Form inputs states
    const [newDocName, setNewDocName] = useState("");
    const [newDocUrl, setNewDocUrl] = useState("");
    
    // Modal Mode: 'link' (past URL) or 'upload' (upload file from device)
    const [modalMode, setModalMode] = useState("link");
    const [selectedFile, setSelectedFile] = useState(null);

    // Modal Control state
    const [linkModalVisible, setLinkModalVisible] = useState(false);

    useEffect(() => {
        if (teamCode) {
            fetchDocuments();
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
            console.error("Error fetching project details in Documents:", err);
            if (offlineWorkspaces?.project_details) {
                setProjectDetails(offlineWorkspaces.project_details);
            }
        }
    };

    const fetchDocuments = async () => {
        if (!token) {
            if (offlineWorkspaces && offlineWorkspaces.documents) {
                setDocuments(offlineWorkspaces.documents);
            }
            return;
        }

        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/documents?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
            }
        })
        .catch((err) => {
            console.error("Error fetching documents:", err);
            if (offlineWorkspaces && offlineWorkspaces.documents) {
                setDocuments(offlineWorkspaces.documents);
            }
        });
        await runWithLoader(fetchTask, "Fetching shared documents from the cloud...");
    };

    const handleAddDocumentLink = async () => {
        if (modalMode === 'link') {
            if (!newDocName.trim() || !newDocUrl.trim()) {
                Alert.alert("Missing Parameters", "Please fill all the fields (Document Name and Link URL) before adding.");
                return;
            }

            const addDocTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/upload-document`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    team_code: teamCode,
                    doc_name: newDocName,
                    doc_url: newDocUrl
                })
            })
            .then(async (res) => {
                if (res.ok) {
                    setNewDocName("");
                    setNewDocUrl("");
                    setLinkModalVisible(false);
                    fetchDocuments();
                } else {
                    const err = await res.json();
                    alert(err.error || "Failed to add document link.");
                }
            })
            .catch(err => {
                console.error("Link error:", err);
                alert("Failed to add link.");
            });

            await runWithLoader(addDocTask, "Adding document node...");
        } else {
            // Upload file mode
            if (!selectedFile) {
                Alert.alert("Missing File", "Please select a file from your device first.");
                return;
            }

            const formData = new FormData();
            formData.append('file', {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.mimeType || 'application/octet-stream'
            });
            formData.append('team_code', teamCode);
            formData.append('email', user?.email || 'unknown@teambridge.edu');

            const uploadDocTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: formData
            })
            .then(async (res) => {
                if (res.ok) {
                    setSelectedFile(null);
                    setLinkModalVisible(false);
                    fetchDocuments();
                } else {
                    const err = await res.json();
                    alert(err.error || "Failed to upload document file.");
                }
            })
            .catch(err => {
                console.error("Upload error:", err);
                alert("File upload failed.");
            });

            await runWithLoader(uploadDocTask, "Uploading document to secure workspace cloud...");
        }
    };

    const handlePickDocument = async () => {
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
                    name: result.name || 'document',
                    size: result.size || 0,
                    mimeType: result.mimeType || 'application/octet-stream'
                });
            }
        } catch (err) {
            console.error("Error picking document:", err);
            alert("Error picking file from device: " + err.message);
        }
    };

    const handleDeleteDocument = async (docId) => {
        Alert.alert(
            "Confirm Delete", 
            "Do you permanently delete this upload?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        const deleteTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/documents?id=${docId}&email=${user?.email || 'unknown@teambridge.edu'}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                        .then(async (res) => {
                            if (res.ok) {
                                fetchDocuments();
                            } else {
                                const err = await res.json();
                                alert(err.error || "Failed to delete document.");
                            }
                        })
                        .catch(err => {
                            console.error("Delete document error:", err);
                        });
                        await runWithLoader(deleteTask, "Deleting document node from cloud...");
                    }
                }
            ]
        );
    };

    const handleOpenLink = (url) => {
        if (url) {
            const resolvedUrl = url.startsWith('http') 
                ? url.replace("http://localhost:5000", API_CONFIG.BACKEND_URL).replace("http://127.0.0.1:5000", API_CONFIG.BACKEND_URL)
                : `${API_CONFIG.BACKEND_URL}${url}`;
            Linking.openURL(resolvedUrl).catch(err => console.error("Couldn't open URL:", err));
        }
    };

    const isImageFile = (url) => {
        const ext = (url || "").toLowerCase();
        return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.gif') || ext.endsWith('.webp');
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
                    <Text style={styles.headerTitle}>{projectDetails?.project_name || "Resources"}</Text>
                    <Text style={styles.headerSubtitle}>{projectDetails?.subject || "Shared Documents Hub"}</Text>

                    {/* Staging Metrics Progress Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsHeader}>
                            <Text style={styles.statsTitle}>Documents Index</Text>
                            <Text style={styles.statsTotalText}>
                                {documents.length} Links Shared
                            </Text>
                        </View>
                        
                        {/* Segmented Color Bar */}
                        <View style={styles.progressBarContainer}>
                            <View 
                                style={[
                                    styles.progressSegment, 
                                    { 
                                        width: documents.length > 0 ? '100%' : '0%', 
                                        backgroundColor: '#F27A1A' 
                                    }
                                ]} 
                            />
                        </View>

                        {/* Legend Indicators */}
                        <View style={styles.legendGrid}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#F27A1A' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Linked Resources</Text>
                                    <Text style={styles.legendValue}>{documents.length} nodes</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#10b981' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Integrations</Text>
                                    <Text style={styles.legendValue}>Workspace</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#3b82f6' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Sharing Mode</Text>
                                    <Text style={styles.legendValue}>Live</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── PART 2: Curved White Bottom Container ──────────── */}
                <View style={styles.whiteBottomContainer}>
                    <Text style={styles.subSectionTitle}>Active Documents Repository</Text>
                    
                    <View style={styles.docListWrapper}>
                        {documents.length > 0 ? (
                            documents.map((doc) => {
                                const resolvedUrl = doc.url.startsWith('http') 
                                    ? doc.url.replace("http://localhost:5000", API_CONFIG.BACKEND_URL).replace("http://127.0.0.1:5000", API_CONFIG.BACKEND_URL)
                                    : `${API_CONFIG.BACKEND_URL}${doc.url}`;
                                const isImage = isImageFile(doc.url);
                                const canDelete = user?.role === 'Faculty' || user?.user_code === doc.uploaded_by;

                                return (
                                    <View key={doc.id} style={styles.docItemCard}>
                                        <TouchableOpacity 
                                            style={styles.cardMainTouch}
                                            onPress={() => handleOpenLink(doc.url)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.docIconCircle}>
                                                <Feather name={isImage ? "image" : "link-2"} size={16} color="#F27A1A" />
                                            </View>
                                            <View style={{ flex: 1, marginRight: 10 }}>
                                                <Text style={styles.docTitle} numberOfLines={1}>{doc.name}</Text>
                                                <Text style={styles.docUrlText} numberOfLines={1}>{doc.url}</Text>
                                                <Text style={styles.uploaderText}>Uploaded by: {doc.uploaded_by_name || "Unknown"}</Text>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Image Showcase Thumbnail inside document row if it's an image */}
                                        {isImage && (
                                            <Image 
                                                source={{ uri: resolvedUrl }} 
                                                style={styles.docThumbImage}
                                                resizeMode="cover"
                                            />
                                        )}

                                        {canDelete && (
                                            <TouchableOpacity 
                                                style={styles.deleteBtn}
                                                onPress={() => handleDeleteDocument(doc.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Feather name="trash-2" size={16} color="#94a3b8" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Feather name="inbox" size={32} color="#94a3b8" />
                                <Text style={styles.emptyText}>No documents shared in this workspace.</Text>
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
                    setLinkModalVisible(true);
                }}
                activeOpacity={0.8}
            >
                <Feather name="plus" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Link & Upload Resource Modal */}
            <Modal
                visible={linkModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setLinkModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Resource Document</Text>
                            <TouchableOpacity onPress={() => setLinkModalVisible(false)}>
                                <Feather name="x" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Segment Switcher */}
                        <View style={styles.modeTabs}>
                            <TouchableOpacity 
                                style={[styles.modeTab, modalMode === 'link' && styles.modeTabActive]}
                                onPress={() => setModalMode('link')}
                            >
                                <Feather name="link" size={14} color={modalMode === 'link' ? '#ffffff' : '#64748b'} style={{ marginRight: 6 }} />
                                <Text style={[styles.modeTabText, modalMode === 'link' && styles.modeTabTextActive]}>Link URL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modeTab, modalMode === 'upload' && styles.modeTabActive]}
                                onPress={() => setModalMode('upload')}
                            >
                                <Feather name="upload" size={14} color={modalMode === 'upload' ? '#ffffff' : '#64748b'} style={{ marginRight: 6 }} />
                                <Text style={[styles.modeTabText, modalMode === 'upload' && styles.modeTabTextActive]}>Upload Device File</Text>
                            </TouchableOpacity>
                        </View>

                        {modalMode === 'link' ? (
                            <View>
                                <Text style={styles.inputLabel}>Document Name</Text>
                                <TextInput 
                                    style={styles.textInput}
                                    value={newDocName}
                                    onChangeText={setNewDocName}
                                    placeholder="e.g. System Design Specification"
                                    placeholderTextColor="#94a3b8"
                                />

                                <Text style={styles.inputLabel}>Document Link URL</Text>
                                <TextInput 
                                    style={styles.textInput}
                                    value={newDocUrl}
                                    onChangeText={setNewDocUrl}
                                    placeholder="https://drive.google.com/..."
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                />
                            </View>
                        ) : (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.inputLabel}>Device File Selection</Text>
                                <TouchableOpacity 
                                    style={styles.pickFileBtn}
                                    onPress={handlePickDocument}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="file" size={20} color="#F27A1A" style={{ marginRight: 10 }} />
                                    <Text style={styles.pickFileBtnText} numberOfLines={1}>
                                        {selectedFile ? selectedFile.name : "Pick file from device..."}
                                    </Text>
                                </TouchableOpacity>
                                {selectedFile && (
                                    <Text style={styles.fileSizeText}>
                                        Size: {(selectedFile.size / 1024).toFixed(1)} KB
                                    </Text>
                                )}
                            </View>
                        )}

                        <TouchableOpacity 
                            style={styles.submitBtn}
                            onPress={handleAddDocumentLink}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.submitBtnText}>
                                {modalMode === 'link' ? "Add Document Node" : "Upload File to Workspace"}
                            </Text>
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

    // Resources list style
    subSectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 16,
        letterSpacing: 0.1,
    },
    docListWrapper: {
        gap: 12,
        paddingBottom: 80,
    },
    docItemCard: {
        flexDirection: 'row',
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
    cardMainTouch: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    docIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(242, 122, 26, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    docTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    docUrlText: {
        fontSize: 11,
        color: '#F27A1A',
        fontWeight: '600',
    },
    uploaderText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 2,
    },
    docThumbImage: {
        width: 36,
        height: 36,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#e2e8f0',
    },
    deleteBtn: {
        padding: 6,
    },

    // Inputs inside modal & grading
    textInput: {
        height: 48,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        color: '#0f172a',
        marginBottom: 16,
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
        backgroundColor: '#fdf4ff',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#F27A1A',
        paddingHorizontal: 16,
    },
    pickFileBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F27A1A',
        flex: 1,
    },
    fileSizeText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 4,
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
});

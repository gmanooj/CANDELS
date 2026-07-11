import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Keyboard,
    Animated,
    TouchableWithoutFeedback
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLoading } from '../context/LoadingContext';
import { useSidebar } from '../context/SidebarContext';
import { API_CONFIG } from '../config/api';
import PremiumBackground from '../components/PremiumBackground';
import { Feather } from '@expo/vector-icons';

import ChatTab from './workspace/components/ChatTab';
import TasksTab from './workspace/components/TasksTab';
import FilesTab from './workspace/components/FilesTab';
import MonitorTab from './workspace/components/MonitorTab';
import GitControllerTab from './workspace/components/GitControllerTab';
import ReportsTab from './workspace/components/ReportsTab';
import DocumentsTab from './workspace/components/DocumentsTab';
import ImplementationsTab from './workspace/components/ImplementationsTab';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function ActiveWorkspaceScreen({ route, navigation }) {
    const { user, token } = useAuth();
    const theme = useTheme();
    const { runWithLoader } = useLoading();
    const { toggleSidebar } = useSidebar();

    const teamCode = route.params?.teamCode || user?.activeTeamCode || "";
    const projectName = route.params?.projectName || "Workspace";

    const isStaff = user?.role === 'Faculty' || user?.role === 'HR';

    const [activeTab, setActiveTab] = useState('Chat'); // Chat, Tasks, Files, Monitor, Git, Reports, Documents, Implementations
    const [showMoreModal, setShowMoreModal] = useState(false);
    const [roster, setRoster] = useState([]);
    const [leaderCode, setLeaderCode] = useState("");
    const [facultyCode, setFacultyCode] = useState("");

    // Bottom Bar Visibility Logic
    const [isBottomBarVisible, setIsBottomBarVisible] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const scrollTimeout = useRef(null);
    const bottomBarTranslateY = useRef(new Animated.Value(100)).current;

    const handleUserScroll = () => {
        if (!isKeyboardVisible) {
            setIsBottomBarVisible(true);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                setIsBottomBarVisible(false);
            }, 2000);
        }
    };

    useEffect(() => {
        Animated.timing(bottomBarTranslateY, {
            toValue: isBottomBarVisible && !isKeyboardVisible ? 0 : 100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isBottomBarVisible, isKeyboardVisible]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardVisible(true);
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
                setKeyboardHeight(0);
            }
        );
        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    useEffect(() => {
        if (teamCode) {
            fetchRoster();
        }
    }, [teamCode]);

    const fetchRoster = async () => {
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/team/digital-form-context?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRoster(data.roster || []);
                setLeaderCode(data.leader_code || "");
                setFacultyCode(data.faculty?.user_code || "");
            }
        } catch (e) {
            console.error("Error fetching roster:", e);
        }
    };

    const renderActiveTab = () => {
        switch(activeTab) {
            case 'Chat':
                return <ChatTab teamCode={teamCode} token={token} user={user} roster={roster} runWithLoader={runWithLoader} handleUserScroll={handleUserScroll} />;
            case 'Tasks':
                return <TasksTab teamCode={teamCode} token={token} runWithLoader={runWithLoader} handleUserScroll={handleUserScroll} roster={roster} leaderCode={leaderCode} facultyCode={facultyCode} user={user} />;
            case 'Files':
                return <FilesTab teamCode={teamCode} token={token} runWithLoader={runWithLoader} handleUserScroll={handleUserScroll} />;
            case 'Monitor':
                return isStaff ? <MonitorTab isStaff={isStaff} handleUserScroll={handleUserScroll} teamCode={teamCode} token={token} /> : null;
            case 'Git':
                return <GitControllerTab teamCode={teamCode} token={token} user={user} runWithLoader={runWithLoader} handleUserScroll={handleUserScroll} />;
            case 'Reports':
                return isStaff ? <ReportsTab teamCode={teamCode} token={token} runWithLoader={runWithLoader} handleUserScroll={handleUserScroll} roster={roster} resolvePhotoUrl={resolvePhotoUrl} /> : null;
            case 'Documents':
                return <DocumentsTab teamCode={teamCode} token={token} runWithLoader={runWithLoader} handleUserScroll={handleUserScroll} user={user} />;
            case 'Implementations':
                return <ImplementationsTab teamCode={teamCode} token={token} user={user} runWithLoader={runWithLoader} handleUserScroll={handleUserScroll} />;
            default:
                return null;
        }
    };

    const handleScreenTap = () => {
        Keyboard.dismiss();
        if (!isKeyboardVisible) {
            setIsBottomBarVisible(true);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                setIsBottomBarVisible(false);
            }, 2000);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <PremiumBackground />
            <KeyboardAvoidingView 
                style={styles.container} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <TouchableWithoutFeedback onPress={handleScreenTap} accessible={false}>
                    <View style={styles.mainArea}>
                        {/* Header Navbar */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
                                <Feather name="menu" size={24} color="#ffffff" style={styles.menuIcon} />
                            </TouchableOpacity>
                             <View>
                                <Text style={styles.headerTitle}>Workspace</Text>
                                <Text style={styles.headerSubtitle}>{teamCode}</Text>
                            </View>
                            <TouchableOpacity style={styles.moreBtn} onPress={() => setShowMoreModal(true)}>
                                <Feather name="more-horizontal" size={24} color="#ffffff" style={styles.moreIcon} />
                            </TouchableOpacity>
                        </View>

                        {/* Top Context Navigation */}
                        <View style={styles.topNavWrap}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topNavScroll} contentContainerStyle={styles.topNavContainer}>
                                {['Chat', 'Tasks', 'Files'].map(tab => (
                                    <TouchableOpacity 
                                        key={tab} 
                                        style={[styles.navTab, activeTab === tab && styles.navTabActive]}
                                        onPress={() => setActiveTab(tab)}
                                    >
                                        <Text style={[styles.navTabText, activeTab === tab && styles.navTabTextActive]}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={styles.navDivider} />
                                {['Monitor', 'Git', 'Reports', 'Documents', 'Implementations'].filter(t => isStaff || (t !== 'Monitor' && t !== 'Reports')).map(tab => (
                                    <TouchableOpacity 
                                        key={tab} 
                                        style={[styles.navTabSecondary, activeTab === tab && styles.navTabActiveSecondary]}
                                        onPress={() => setActiveTab(tab)}
                                    >
                                        <Text style={[styles.navTabTextSecondary, activeTab === tab && styles.navTabTextActiveSecondary]}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Rendering Extracted Tab Components */}
                        <View style={[styles.tabContentArea, activeTab === 'Chat' && { paddingHorizontal: 0, paddingTop: 0 }]}>
                            {renderActiveTab()}
                        </View>
                    </View>
                </TouchableWithoutFeedback>



                {/* More Options Modal */}
                <Modal visible={showMoreModal} transparent={true} animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMoreModal(false)}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Workspace Context Menu</Text>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowMoreModal(false); }}>
                                <Text style={styles.modalBtnText}>Force Refresh Project</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowMoreModal(false); }}>
                                <Text style={styles.modalBtnText}>Settings & Permissions</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { borderBottomWidth: 0 }]} onPress={() => setShowMoreModal(false)}>
                                <Text style={[styles.modalBtnText, { color: '#ef4444' }]}>Close Panel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainArea: {
        flex: 1,
        zIndex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        zIndex: 10,
    },
    menuButton: {
        paddingRight: 15,
    },
    menuIcon: {
        fontSize: 24,
        color: '#1e293b',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    moreBtn: {
        marginLeft: 'auto',
        paddingLeft: 15,
    },
    moreIcon: {
        fontSize: 28,
        color: '#1e293b',
        lineHeight: 28,
    },
    topNavWrap: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 9,
    },
    topNavScroll: {
        maxHeight: 50,
    },
    topNavContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    navTab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
    },
    navTabActive: {
        backgroundColor: '#1e293b',
    },
    navTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    navTabTextActive: {
        color: '#ffffff',
    },
    navDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#cbd5e1',
        marginHorizontal: 8,
    },
    navTabSecondary: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 6,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    navTabActiveSecondary: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    navTabTextSecondary: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
    },
    navTabTextActiveSecondary: {
        color: '#3b82f6',
    },
    tabContentArea: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 15,
        backgroundColor: 'transparent',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalBtn: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        alignItems: 'center',
    },
    modalBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    }
});

/* eslint-disable */
import React, { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Dimensions,
    TextInput,
    Image,
    Modal,
    Alert,
    Animated,
    PanResponder,
    Easing
} from 'react-native';

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
import { useSecureOffline } from '../context/SecureOfflineContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { API_CONFIG } from '../config/api';
import NotificationBell from '../components/NotificationBell';
import PermanentAllocationBanner from '../components/PermanentAllocationBanner';
import { Feather } from '@expo/vector-icons';
import PremiumButton from '../components/PremiumButton';
import FileFolderAnimation from '../components/FileFolderAnimation';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TEAL_COLOR = '#6548d8ff';
const ORANGE_COLOR = '#F27A1A';

const SlideToOpenRow = ({ project, onOpen }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const TRACK_WIDTH = SCREEN_WIDTH - 40 - 32; // Screen minus container padding minus card padding
    const THUMB_SIZE = 44;
    const MAX_SLIDE = TRACK_WIDTH - THUMB_SIZE - 8;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0 && gestureState.dx <= MAX_SLIDE) {
                    slideAnim.setValue(gestureState.dx);
                } else if (gestureState.dx > MAX_SLIDE) {
                    slideAnim.setValue(MAX_SLIDE);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx >= MAX_SLIDE * 0.7) {
                    Animated.spring(slideAnim, {
                        toValue: MAX_SLIDE,
                        useNativeDriver: false,
                    }).start(() => {
                        onOpen(project);
                        setTimeout(() => slideAnim.setValue(0), 500);
                    });
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
                }
            }
        })
    ).current;

    return (
        <View style={styles.projectListCard}>
            <View style={styles.projectListHeader}>
                <View style={styles.projectListIconCircle}>
                    <Feather name="layers" size={20} color={ORANGE_COLOR} />
                </View>
                <View style={styles.projectListInfo}>
                    <Text style={styles.projectListTitle} numberOfLines={1}>{project.project_name}</Text>
                    <Text style={styles.projectListSub}>{project.subject} • {project.members_count} Members</Text>
                </View>
            </View>
            
            <View style={styles.sliderTrackContainer}>
                <View style={styles.sliderTrack}>
                    <Text style={styles.sliderTrackText}>Slide to open project ➔</Text>
                    <Animated.View
                        style={[
                            styles.sliderThumb,
                            { transform: [{ translateX: slideAnim }] }
                        ]}
                        {...panResponder.panHandlers}
                    >
                        <Text style={styles.sliderThumbArrow}>→</Text>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
};

export default function DashboardScreen({ route, navigation }) {
    const { offlineWorkspaces, lockOfflineMode } = useSecureOffline();
    const { user, token, logout, updateUser } = useAuth();
    const theme = useTheme();
    const { toggleSidebar } = useSidebar();

    const [currentTab, setCurrentTab] = useState('overview');
    const [selectedFile, setSelectedFile] = useState(null);
    const tabIndicatorX = useRef(new Animated.Value(0)).current;

    const [activeBanner, setActiveBanner] = useState(null);
    const bannerAnim = useRef(new Animated.Value(-120)).current;
    const bannerTimeout = useRef(null);

    const triggerBanner = (newNotif) => {
        if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
        
        setActiveBanner(newNotif);
        
        // Slide Down
        Animated.timing(bannerAnim, {
            toValue: Platform.OS === 'ios' ? 50 : 30,
            duration: 350,
            easing: Easing.out(Easing.back(1.0)),
            useNativeDriver: true
        }).start();

        // Slide Up after 4 seconds
        bannerTimeout.current = setTimeout(() => {
            Animated.timing(bannerAnim, {
                toValue: -120,
                duration: 300,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true
            }).start(() => {
                setActiveBanner(null);
            });
        }, 4000);
    };

    const handleBannerPress = () => {
        if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
        Animated.timing(bannerAnim, {
            toValue: -120,
            duration: 200,
            useNativeDriver: true
        }).start(() => {
            setActiveBanner(null);
        });
    };

    useEffect(() => {
        // Calculate target X position for the indicator bubble
        const TAB_WIDTH = SCREEN_WIDTH / 5;
        const BUBBLE_SIZE = 50;
        let index = 0;
        if (currentTab === 'files') index = 1;
        
        const targetX = (index * TAB_WIDTH) + (TAB_WIDTH / 2) - (BUBBLE_SIZE / 2);
        Animated.spring(tabIndicatorX, {
            toValue: targetX,
            useNativeDriver: true,
            bounciness: 8,
            speed: 12
        }).start();
    }, [currentTab]);

    const [activeProjectsList, setActiveProjectsList] = useState([]);
    const [workspaceStats, setWorkspaceStats] = useState({
        operational: '—', completed: '—', standing: '—', latency: '—'
    });
    const [systemNotifications, setSystemNotifications] = useState([]);
    const [completionPercentage, setCompletionPercentage] = useState(100);

    const [onlineFiles, setOnlineFiles] = useState([]);
    const [onlineFileContent, setOnlineFileContent] = useState({});
    const [filesLoading, setFilesLoading] = useState(false);
    const [fileContentLoading, setFileContentLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isProjectModalVisible, setIsProjectModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const handleActionPress = (action) => {
        if (!activeProjectsList || activeProjectsList.length === 0) {
            Alert.alert("No Projects", "You are not assigned to any projects.");
            return;
        }
        if (activeProjectsList.length === 1) {
            // Auto select if only one project
            handleProjectSelect(activeProjectsList[0], action);
        } else {
            setPendingAction(action);
            setIsProjectModalVisible(true);
        }
    };

    const handleProjectSelect = (proj, actionOverride = null) => {
        setIsProjectModalVisible(false);
        const action = actionOverride || pendingAction;
        if (action === 'files') {
            navigation.navigate('WorkspaceTransition', { teamCode: proj.team_code, projectName: proj.project_name, initialTab: 'Files' });
        } else if (action === 'team') {
            navigation.navigate('WorkspaceTransition', { teamCode: proj.team_code, projectName: proj.project_name, initialTab: 'Team' });
        }
    };

    const requestMicPermission = () => {
        Alert.alert(
            "Microphone Permission",
            "Allow CΛNDELS to access your microphone for voice search?",
            [
                { text: "Deny", style: "cancel" },
                { text: "Allow", onPress: () => console.log("Mic permission granted") }
            ]
        );
    };

    const isOnline = !!user && !!token;
    const team_code = isOnline ? (user.activeTeamCode || 'NO-TEAM') : (offlineWorkspaces?.team_code || '');

    useEffect(() => {
        if (route.params?.tab) {
            setCurrentTab(route.params.tab);
            navigation.setParams({ tab: undefined });
        }
    }, [route.params?.tab]);

    useEffect(() => {
        if (isOnline && user?.user_code) {
            fetch(`${API_CONFIG.BACKEND_URL}/api/users/profile-context?user_code=${user.user_code}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).then(data => {
                if (data.completion_percentage !== undefined) setCompletionPercentage(data.completion_percentage);
                if (data.profile_image && data.profile_image !== user.profile_image) {
                    updateUser({ profile_image: data.profile_image });
                }
            }).catch(() => {});

            fetch(`${API_CONFIG.BACKEND_URL}/api/users/dashboard-context?user_code=${user.user_code}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).then(data => {
                setActiveProjectsList(data.projects || []);
                setWorkspaceStats(data.stats || {});
            }).catch(() => {});

            fetch(`${API_CONFIG.BACKEND_URL}/api/notifications/fetch?user_code=${user.user_code}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).then(data => {
                setSystemNotifications(data.notifications || []);
            }).catch(() => {});
        } else if (!isOnline && offlineWorkspaces) {
            setActiveProjectsList([
                {
                    project_name: offlineWorkspaces.project_name || 'Offline Workspace',
                    team_code: offlineWorkspaces.team_code || 'TB-OFFLINE',
                    subject: 'Computer Science',
                    members_count: 3
                }
            ]);
            setWorkspaceStats({
                completed: "Offline Cache",
                latency: "Local",
                operational: "Offline Active",
                standing: "Synchronized"
            });
        }
    }, [isOnline, user?.user_code, token, offlineWorkspaces]);

    useEffect(() => {
        const checkTermsConsent = async () => {
            if (user?.email) {
                try {
                    const accepted = await AsyncStorage.getItem(`@terms_accepted_${user.email}`);
                    if (accepted !== 'true') {
                        navigation.navigate('TermsConditions', { forcePrompt: true });
                    }
                } catch (e) {
                    console.error("Error reading terms consent:", e);
                }
            }
        };
        checkTermsConsent();
    }, [user?.email]);

    useEffect(() => {
        if (isOnline && team_code !== 'NO-TEAM') {
            setFilesLoading(true);
            fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/files?team_code=${team_code}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).then(data => {
                setOnlineFiles(data.files?.length > 0 ? data.files.map(fp => ({ path: fp })) : []);
                setFilesLoading(false);
            }).catch(() => { setOnlineFiles([]); setFilesLoading(false); });
        }
    }, [isOnline, team_code, token]);

    const handleFileSelect = async (file) => {
        setSelectedFile(file);
        if (isOnline && !onlineFileContent[file.path]) {
            setFileContentLoading(true);
            try {
                const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${team_code}&path=${encodeURIComponent(file.path)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setOnlineFileContent(prev => ({ ...prev, [file.path]: data.content }));
                }
            } catch (err) {} finally { setFileContentLoading(false); }
        }
    };

    const handleExitOffline = () => {
        if (isOnline) logout(); else lockOfflineMode();
        navigation.navigate('Login');
    };

    if (!isOnline && !offlineWorkspaces) {
        return (
            <View style={[styles.mainLayout, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
                <Text style={{ fontSize: 48, marginBottom: 20 }}>🔐</Text>
                <Text style={styles.errorTitle}>No Session Found</Text>
                <Text style={styles.errorDesc}>Please authenticate correctly.</Text>
                <PremiumButton title="Return to Login" onPress={() => navigation.navigate('Login')} variant="glow" style={{ marginTop: 24 }} />
            </View>
        );
    }

    if (isOnline && team_code === 'NO-TEAM' && currentTab !== 'overview') {
        return (
            <View style={[styles.mainLayout, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <Text style={{ fontSize: 48, marginBottom: 20 }}>🔒</Text>
                <Text style={styles.errorTitle}>No Workspace Allocated</Text>
                <Text style={styles.errorDesc}>Your account is active but has not been approved for any project workspace.</Text>
                <PremiumButton title="Exit Session" onPress={handleExitOffline} variant="glow" color="#F43F5E" style={{ marginTop: 24 }} />
            </View>
        );
    }

    const files = isOnline ? onlineFiles : (offlineWorkspaces?.files || []);
    const displayedContent = isOnline
        ? (onlineFileContent[selectedFile?.path] || (fileContentLoading ? 'Loading...' : ''))
        : (selectedFile?.content || '');

    const resolvePhotoUrl = (url) => {
        if (!url) return null;
        if (url.startsWith("http")) return url;
        return `${API_CONFIG.BACKEND_URL}${url}`;
    };

    const renderOverview = () => (
        <View style={styles.bodyContent}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Your Projects</Text>
            </View>
            
            <View style={styles.projectListContainer}>
                {activeProjectsList.length > 0 ? (
                    activeProjectsList.map((proj, idx) => (
                        <SlideToOpenRow 
                            key={idx} 
                            project={proj} 
                            onOpen={(p) => navigation.navigate('WorkspaceTransition', { teamCode: p.team_code, projectName: p.project_name })} 
                        />
                    ))
                ) : (
                    <View style={styles.emptyProjectContainer}>
                        <Text style={styles.emptyProjectText}>No active projects found.</Text>
                    </View>
                )}
            </View>

            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                <TouchableOpacity 
                    style={styles.inviteCard}
                    onPress={() => navigation.navigate('InvitePeople')}
                >
                    <View style={styles.inviteCardContent}>
                        <Text style={styles.inviteCardTitle}>Invite Friends / People</Text>
                        <Text style={styles.inviteCardDesc}>Grow your team network</Text>
                    </View>
                    <View style={styles.invitePlusBtn}>
                        <Text style={styles.invitePlusText}>+</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
                <PermanentAllocationBanner
                    teamCode={team_code}
                    onOpenAllocationMatrix={() => navigation.navigate('PendingAllocationHub', { teamCode: team_code })}
                />
            </View>
        </View>
    );

    const renderFiles = () => (
        <View style={[styles.bodyContent, { paddingHorizontal: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <FileFolderAnimation isOpened={false} width={80} height={60} scale={0.35} />
                <Text style={[styles.sectionTitle, { marginLeft: -10 }]}>Files Explorer</Text>
            </View>
            
            <View style={styles.fileListCard}>
                {filesLoading ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <LoadingSpinner size={20} color={TEAL_COLOR} />
                    </View>
                ) : files.length === 0 ? (
                    <Text style={styles.emptyText}>No files in this workspace yet.</Text>
                ) : (
                    files.map((file, idx) => (
                        <TouchableOpacity
                            key={idx}
                            onPress={() => handleFileSelect(file)}
                            style={[styles.fileRow, selectedFile?.path === file.path && styles.fileRowActive]}
                        >
                            <View style={styles.fileIconWrapper}>
                                <Text style={styles.fileIconText}>
                                    {file.path.endsWith('.md') ? '📝' : file.path.endsWith('.py') ? '🐍' : '📄'}
                                </Text>
                            </View>
                            <Text style={[styles.fileName, selectedFile?.path === file.path && styles.fileNameActive]}>
                                {file.path}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {selectedFile && (
                <View style={{ marginTop: 24 }}>
                    <View style={styles.viewerHeader}>
                        <Text style={styles.viewerTitle}>{selectedFile.path}</Text>
                        <TouchableOpacity onPress={() => setSelectedFile(null)}>
                            <Text style={styles.viewerClose}>✕ Close</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.fileContentCard}>
                        <ScrollView style={{ maxHeight: 280 }}>
                            <Text style={styles.fileContentText}>
                                {displayedContent || (fileContentLoading ? 'Loading...' : 'Empty File')}
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.mainLayout}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>
                
                {/* ── ORANGE CURVED HEADER ── */}
                <View style={styles.tealHeader}>
                    {/* Top Profile Row */}
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.profileBox} onPress={toggleSidebar}>
                            <Image 
                                source={{ uri: user?.profile_image ? resolvePhotoUrl(user.profile_image) : 'https://ui-avatars.com/api/?name=' + (user?.first_name || 'User') + '&background=F27A1A&color=fff' }} 
                                style={styles.avatarImg} 
                            />
                            <Text style={styles.greetingText}>Hi, {user?.first_name || 'User'}</Text>
                        </TouchableOpacity>
                        <NotificationBell userCode={user?.user_code} onNewNotification={triggerBanner} />
                    </View>

                    {/* Headline & Search */}
                    <View style={styles.searchSection}>
                        <Text style={styles.searchHeadline}>Find Your Workspaces{'\n'}Here!</Text>
                        <View style={styles.searchBox}>
                            <TextInput 
                                style={styles.searchInputCustom}
                                placeholder="Search something"
                                placeholderTextColor="rgba(0,0,0,0.5)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <TouchableOpacity style={styles.searchButtonCustom}>
                                <Svg width="20" height="20" viewBox="0 0 29 29" fill="none">
                                    <Path d="M23.7953 23.9182L19.0585 19.1814M19.0585 19.1814C19.8188 18.4211 20.4219 17.5185 20.8333 16.5251C21.2448 15.5318 21.4566 14.4671 21.4566 13.3919C21.4566 12.3167 21.2448 11.252 20.8333 10.2587C20.4219 9.2653 19.8188 8.36271 19.0585 7.60242C18.2982 6.84214 17.3956 6.23905 16.4022 5.82759C15.4089 5.41612 14.3442 5.20435 13.269 5.20435C12.1938 5.20435 11.1291 5.41612 10.1358 5.82759C9.1424 6.23905 8.23981 6.84214 7.47953 7.60242C5.94407 9.13789 5.08145 11.2204 5.08145 13.3919C5.08145 15.5634 5.94407 17.6459 7.47953 19.1814C9.01499 20.7168 11.0975 21.5794 13.269 21.5794C15.4405 21.5794 17.523 20.7168 19.0585 19.1814Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── FLOATING ACTION BUTTONS ── */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => setCurrentTab('overview')}>
                        <View style={styles.actionIconCircle}>
                            <Feather name="folder" size={20} color={ORANGE_COLOR} />
                        </View>
                        <Text style={styles.actionLabel}>Projects</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => handleActionPress('files')}>
                        <View style={styles.actionIconCircle}>
                            <Feather name="file-text" size={20} color={ORANGE_COLOR} />
                        </View>
                        <Text style={styles.actionLabel}>Files</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => handleActionPress('team')}>
                        <View style={styles.actionIconCircle}>
                            <Feather name="users" size={20} color={ORANGE_COLOR} />
                        </View>
                        <Text style={styles.actionLabel}>Team</Text>
                    </TouchableOpacity>
                </View>

                {/* ── DYNAMIC BODY CONTENT ── */}
                {currentTab === 'overview' ? renderOverview() : renderFiles()}

            </ScrollView>

            {/* ── BOTTOM TAB NAVIGATION ── */}
            <View style={styles.bottomTabBar}>
                <Animated.View 
                    style={[
                        styles.activeTabIndicator, 
                        { transform: [{ translateX: tabIndicatorX }] }
                    ]} 
                />
                
                <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('overview')}>
                    <Feather name="home" size={22} color={currentTab === 'overview' ? '#ffffff' : '#1f1f1f'} style={[styles.tabIcon, currentTab === 'overview' && styles.tabIconActive]} />
                    <Text style={[styles.tabLabel, currentTab === 'overview' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => handleActionPress('files')}>
                    <Feather name="folder" size={22} color={currentTab === 'files' ? '#ffffff' : '#1f1f1f'} style={[styles.tabIcon, currentTab === 'files' && styles.tabIconActive]} />
                    <Text style={[styles.tabLabel, currentTab === 'files' && styles.tabLabelActive]}>Files</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.tabItem} 
                    onPress={() => navigation.navigate('OfflineProjectSetup')}
                >
                    <Feather name="wifi-off" size={22} color="#1f1f1f" style={styles.tabIcon} />
                    <Text style={styles.tabLabel} numberOfLines={1}>Offline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
                    <Feather name="user" size={22} color="#1f1f1f" style={styles.tabIcon} />
                    <Text style={styles.tabLabel}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={handleExitOffline}>
                    <Feather name="log-out" size={22} color="#1f1f1f" style={styles.tabIcon} />
                    <Text style={styles.tabLabel}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* ── PROJECT SELECTION MODAL ── */}
            <Modal visible={isProjectModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Workspace</Text>
                        <Text style={styles.modalSub}>Which project would you like to access?</Text>
                        
                        <ScrollView style={{ width: '100%', maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {activeProjectsList.map((proj, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={styles.modalProjectItem}
                                    onPress={() => handleProjectSelect(proj)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.modalProjectIconWrap}>
                                        <Text style={{ fontSize: 20 }}>🚀</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalProjectName}>{proj.project_name}</Text>
                                        <Text style={styles.modalProjectMeta}>{proj.subject} • {proj.members_count} Members</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.modalCloseBtn}
                            onPress={() => setIsProjectModalVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Slide-Down Notification Banner */}
            {activeBanner && (
                <Animated.View style={[styles.bannerContainer, { transform: [{ translateY: bannerAnim }] }]}>
                    <TouchableOpacity style={styles.bannerContent} onPress={handleBannerPress} activeOpacity={0.9}>
                        <View style={styles.bannerIconBox}>
                            <Text style={styles.bannerIcon}>🔔</Text>
                        </View>
                        <View style={styles.bannerTextBox}>
                            <Text style={styles.bannerTitle}>{activeBanner.sender_name || "Task Assignment"}</Text>
                            <Text style={styles.bannerMessage} numberOfLines={2}>{activeBanner.message}</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainLayout: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    scrollArea: {
        paddingBottom: 120, // Leave space for bottom tab bar
    },
    
    // ── HEADER ───────────────────────────────────────────────────────────
    tealHeader: {
        backgroundColor: ORANGE_COLOR,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 60, // extra padding for floating cards
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    profileBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarImg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ffffff',
    },
    greetingText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    searchSection: {
        marginTop: 10,
    },
    searchHeadline: {
        fontSize: 20,
        fontWeight: '800',
        color: '#ffffffff',
        lineHeight: 26,
        marginBottom: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 50,
        position: 'relative',
        height: 56,
    },
    searchButtonCustom: {
        position: 'absolute',
        right: 6,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: ORANGE_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    searchInputCustom: {
        flex: 1,
        color: '#222222',
        fontSize: 15,
        paddingLeft: 20,
        paddingRight: 60,
    },

    // ── FLOATING ACTION BUTTONS ───────────────────────────────────────────────
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginTop: -35, // Overlap the teal header
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    actionCard: {
        backgroundColor: '#ffffff',
        width: 85,
        height: 95,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        gap: 8,
    },
    actionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(242, 122, 26, 0.15)', // Light orange tint
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIcon: {
        fontSize: 18,
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },

    // ── BODY CONTENT ──────────────────────────────────────────────────────────
    bodyContent: {
        paddingTop: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A2E',
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A2E',
    },
    // ── PROJECTS LIST (REPLACED TRENDS) ──────────────────────────────────────
    projectListContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    projectListCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    projectListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    projectListIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    projectListIconText: { fontSize: 24 },
    projectListInfo: { flex: 1 },
    projectListTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 4,
    },
    projectListSub: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    sliderTrackContainer: {
        width: '100%',
        alignItems: 'center',
    },
    sliderTrack: {
        width: '100%',
        height: 52,
        backgroundColor: '#F1F5F9',
        borderRadius: 26,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    sliderTrackText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        color: '#94A3B8',
        fontWeight: '600',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    sliderThumb: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: TEAL_COLOR,
        position: 'absolute',
        left: 4,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: TEAL_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    sliderThumbArrow: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyProjectContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
    },
    emptyProjectText: {
        color: '#94A3B8',
        fontSize: 14,
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    notifItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    notifIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(56, 163, 165, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    notifIcon: { fontSize: 18 },
    notifTextWrap: { flex: 1 },
    notifTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 4,
    },
    notifMsg: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },

    // ── FILES EXPLORER ────────────────────────────────────────────────────────
    fileListCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    fileRowActive: {
        backgroundColor: 'rgba(56, 163, 165, 0.08)',
    },
    fileIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    fileIconText: { fontSize: 16 },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    fileNameActive: { color: TEAL_COLOR, fontWeight: '700' },
    viewerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    viewerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A2E',
    },
    viewerClose: {
        fontSize: 13,
        color: '#F43F5E',
        fontWeight: '700',
    },
    fileContentCard: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    fileContentText: {
        fontSize: 13,
        color: '#475569',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        lineHeight: 20,
    },
    emptyText: {
        textAlign: 'center',
        padding: 24,
        color: '#94A3B8',
        fontSize: 14,
    },

    // ── BOTTOM TAB BAR ────────────────────────────────────────────────────────
    bottomTabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        color:'#ffff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    activeTabIndicator: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: TEAL_COLOR,
        top: 15,
        left: 0,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        zIndex: 1, // Stay above indicator
    },
    tabIcon: {
        marginBottom: 4,
        opacity: 0.6,
    },
    tabIconActive: {
        opacity: 1,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
    },
    tabLabelActive: {
        color: '#ffffff',
        fontWeight: '800',
    },

    // ── ERROR STATE ───────────────────────────────────────────────────────────
    errorTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A2E',
        textAlign: 'center',
        marginBottom: 8,
    },
    errorDesc: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    
    // ── INVITE CARD ───────────────────────────────────────────────────────────
    inviteCard: {
        backgroundColor: TEAL_COLOR,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: TEAL_COLOR,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    inviteCardContent: {
        flex: 1,
    },
    inviteCardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 4,
    },
    inviteCardDesc: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    invitePlusBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    invitePlusText: {
        fontSize: 24,
        fontWeight: '700',
        color: TEAL_COLOR,
    },

    // ── PROJECT SELECTION MODAL ───────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A2E',
        marginBottom: 8,
    },
    modalSub: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 24,
        textAlign: 'center',
    },
    modalProjectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        width: '100%',
    },
    modalProjectIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    modalProjectName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    modalProjectMeta: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    modalCloseBtn: {
        marginTop: 12,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    modalCloseText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#475569',
    },
    bannerContainer: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 10,
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    bannerIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#6548d815',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    bannerIcon: {
        fontSize: 18,
    },
    bannerTextBox: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 2,
    },
    bannerMessage: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
});

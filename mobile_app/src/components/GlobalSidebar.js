/* eslint-disable */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Alert
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useSecureOffline } from '../context/SecureOfflineContext';
import { API_CONFIG } from '../config/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ROYAL_BLUE = '#ff8401ff';

export default function GlobalSidebar() {
    const navigation = useNavigation();
    const { user, token, logout } = useAuth();
    const { offlineWorkspaces, lockOfflineMode } = useSecureOffline();
    const {
        isSidebarOpen,
        closeSidebar,
        sidebarAnimVal,
        backdropOpacityVal
    } = useSidebar();

    const currentRouteName = useNavigationState(state => {
        if (!state) return null;
        let route = state.routes[state.index];
        while (route.state) {
            route = route.state.routes[route.state.index];
        }
        return route.name;
    });

    const routeParams = useNavigationState(state => {
        if (!state) return null;
        let route = state.routes[state.index];
        while (route.state) {
            route = route.state.routes[route.state.index];
        }
        return route.params;
    });

    const isOnline = !!user && !!token;
    const team_code = isOnline ? (user?.activeTeamCode || 'NO-TEAM') : (offlineWorkspaces?.team_code || '');

    if (!isOnline && !offlineWorkspaces) return null;

    const resolvePhotoUrl = (url) => {
        if (!url) return null;
        if (url.startsWith("http")) return url;
        return `${API_CONFIG.BACKEND_URL}${url}`;
    };

    const handleMenuClick = (action) => {
        closeSidebar();
        if (action === 'overview')    navigation.navigate('Dashboard', { tab: 'overview' });
        else if (action === 'files')  navigation.navigate('Dashboard', { tab: 'files' });
        else if (action === 'slides') handleLaunchSlides();
        else if (action === 'profile')     navigation.navigate('Profile');
        else if (action === 'settings')    navigation.navigate('Settings');
        else if (action === 'createteam')  navigation.navigate('CreateTeam');
        else if (action === 'allocation')  navigation.navigate('PendingAllocationHub');
        else if (action === 'declaration') navigation.navigate('DigitalDeclaration');
        else if (action === 'updatepassword')  navigation.navigate('UpdatePassword');
        else if (action === 'aboutus')         navigation.navigate('AboutUs');
        else if (action === 'termsconditions') navigation.navigate('TermsConditions');
        else if (action === 'offlineproject')  navigation.navigate('OfflineProjectSetup');
        else if (action === 'exit')        handleExit();
    };

    const handleLaunchSlides = async () => {
        let readmeContent = '';
        if (isOnline) {
            try {
                const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${team_code}&path=README.md`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    readmeContent = data.content;
                }
            } catch (err) {}
        } else {
            const readmeFile = offlineWorkspaces?.files.find(f => f.path === 'README.md');
            readmeContent = readmeFile ? readmeFile.content : '';
        }
        navigation.navigate('SlideViewer', { readmeContent, isOnline });
    };

    const handleExit = () => {
        if (isOnline) logout();
        else lockOfflineMode();
        navigation.navigate('Login');
    };

    const isOverviewActive  = currentRouteName === 'Dashboard' && (!routeParams?.tab || routeParams.tab === 'overview');
    const isFilesActive     = currentRouteName === 'Dashboard' && routeParams?.tab === 'files';
    const isSlidesActive    = currentRouteName === 'SlideViewer';
    const isProfileActive   = currentRouteName === 'Profile';
    const isSettingsActive  = currentRouteName === 'Settings';
    const isCreateTeamActive = currentRouteName === 'CreateTeam';
    const isAllocationActive = currentRouteName === 'PendingAllocationHub';
    const isDeclarationActive = currentRouteName === 'DigitalDeclaration';

    if (!isSidebarOpen) return null;

    const userInitials = user?.first_name
        ? `${user.first_name[0]}${user?.last_name?.[0] || ''}`.toUpperCase()
        : '?';

    const SectionLabel = ({ title }) => (
        <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabelText}>{title}</Text>
        </View>
    );

    const MenuItem = ({ icon, label, active, onPress, badgeText, badgeColor, lightBadge }) => (
        <TouchableOpacity
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.menuItemIcon, active && styles.menuItemIconActive]}>{icon}</Text>
            <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>
                {label}
            </Text>
            {badgeText && (
                <View style={[
                    styles.badgeContainer, 
                    badgeColor ? { backgroundColor: badgeColor } : null,
                    lightBadge ? { backgroundColor: '#F1F5F9' } : null
                ]}>
                    <Text style={[
                        styles.badgeText, 
                        badgeColor ? { color: '#ffffff' } : null,
                        lightBadge ? { color: '#64748B' } : null
                    ]}>
                        {badgeText}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={closeSidebar}>
                <Animated.View style={[styles.backdropOverlay, { opacity: backdropOpacityVal }]} />
            </TouchableWithoutFeedback>

            {/* Sidebar Drawer */}
            <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: sidebarAnimVal }] }]}>
                
                {/* ── Solid Blue Curved Header ─────────────────────────────────── */}
                <View style={styles.headerBlock}>
                    <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>

                    <View style={styles.profileSection}>
                        <View style={styles.avatarWrapper}>
                            {user?.profile_image ? (
                                <Image source={{ uri: resolvePhotoUrl(user.profile_image) }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitials}>{userInitials}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user?.first_name} {user?.last_name}
                        </Text>
                        <Text style={styles.userRole}>
                            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Offline Mode'}
                        </Text>
                    </View>
                </View>

                {/* ── Navigation Menu ──────────────────────────────── */}
                <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
                    
                    {team_code !== 'NO-TEAM' && (
                        <View style={styles.teamBadgeWrapper}>
                            <Text style={styles.teamBadgeText}>Workspace: {team_code}</Text>
                        </View>
                    )}

                    <SectionLabel title="Core Operations" />

                    <MenuItem 
                         
                        label="System Overview"   
                        active={isOverviewActive}  
                        onPress={() => handleMenuClick('overview')} 
                    />

                    {team_code !== 'NO-TEAM' && (
                        <>
                            <MenuItem 
                                
                                label="Files Explorer"   
                                active={isFilesActive}     
                                onPress={() => handleMenuClick('files')} 
                                badgeText="15"
                                lightBadge={true}
                            />
                            <MenuItem 
                                
                                label="Slide Presenter"  
                                active={isSlidesActive}    
                                onPress={() => handleMenuClick('slides')} 
                                badgeText="14 new"
                                badgeColor={ROYAL_BLUE}
                            />
                        </>
                    )}

                    <SectionLabel title="Workspace Actions" />

                    <MenuItem 
                         
                        label="Initialize Workspace" 
                        active={isCreateTeamActive}  
                        onPress={() => handleMenuClick('createteam')} 
                    />

                    {team_code !== 'NO-TEAM' && (
                        <>
                            <MenuItem 
                                 
                                label="Digital Charter"  
                                active={isDeclarationActive} 
                                onPress={() => handleMenuClick('declaration')} 
                                badgeText="99+"
                                lightBadge={true}
                            />
                        </>
                    )}

                    <MenuItem 
                        label="Offline Project"   
                        active={currentRouteName === 'OfflineProjectSetup'}  
                        onPress={() => handleMenuClick('offlineproject')} 
                    />

                    <SectionLabel title="User Profile" />

                    <MenuItem 
                         
                        label="Account Profile" 
                        active={isProfileActive}  
                        onPress={() => handleMenuClick('profile')} 
                    />
                    
                    {isOnline && (
                        <MenuItem 
                            label="Update Password" 
                            active={currentRouteName === 'UpdatePassword'}  
                            onPress={() => handleMenuClick('updatepassword')} 
                        />
                    )}

                    <MenuItem 
                        label="Settings"     
                        active={isSettingsActive} 
                        onPress={() => handleMenuClick('settings')} 
                    />

                    <MenuItem 
                        label="About Us" 
                        active={currentRouteName === 'AboutUs'}  
                        onPress={() => handleMenuClick('aboutus')} 
                    />

                    <MenuItem 
                        label="Terms & Conditions" 
                        active={currentRouteName === 'TermsConditions'}  
                        onPress={() => handleMenuClick('termsconditions')} 
                    />

                    <View style={styles.exitRow}>
                        <TouchableOpacity style={styles.exitBtn} onPress={() => handleMenuClick('exit')} activeOpacity={0.8}>
                            <Text style={styles.exitIcon}>➜</Text>
                            <Text style={styles.exitLabel}>Exit Workspace</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Spacing at bottom */}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdropOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 99999,
    },

    sidebarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH * 0.78,
        height: SCREEN_HEIGHT,
        backgroundColor: '#FFFFFF', // Clean white body
        zIndex: 100000,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 15,
        overflow: 'hidden',
    },

    // ── Blue Curved Header ────────────────────────────────────────────────
    headerBlock: {
        backgroundColor: ROYAL_BLUE,
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderBottomRightRadius: 40,
        position: 'relative',
        marginBottom: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    closeBtnText: {
        fontSize: 20,
        color: '#FFFFFF',
        opacity: 0.7,
        fontWeight: '300',
    },
    profileSection: {
        alignItems: 'center',
        marginTop: 10,
    },
    avatarWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        padding: 3,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 37,
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 37,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 24,
        fontWeight: '800',
        color: ROYAL_BLUE,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },

    teamBadgeWrapper: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 10,
    },
    teamBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: ROYAL_BLUE,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },

    menuScroll: { flex: 1 },

    // ── Section Labels ──────────────────────────────────────────────
    sectionLabelRow: {
        paddingHorizontal: 24,
        marginTop: 20,
        marginBottom: 10,
    },
    sectionLabelText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },

    // ── Menu Items ──────────────────────────────────────────────────
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    menuItemIcon: {
        fontSize: 18,
        marginRight: 16,
        opacity: 0.6,
    },
    menuItemIconActive: {
        opacity: 1,
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
        flex: 1,
    },
    menuItemTextActive: {
        color: '#0F172A',
        fontWeight: '700',
    },
    badgeContainer: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // ── Exit Button ─────────────────────────────────────────────────
    exitRow: {
        marginTop: 20,
        paddingHorizontal: 24,
    },
    exitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    exitIcon: {
        fontSize: 18,
        color: '#F43F5E',
        marginRight: 16,
    },
    exitLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F43F5E',
    },
});

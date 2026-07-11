import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Switch, 
    Image,
    Alert,
    Dimensions,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { API_CONFIG } from '../config/api';

const TEAL_COLOR = '#6548d8ff';
const ORANGE_COLOR = '#F27A1A';
const BG_COLOR = '#6548d8ff';
const CARD_BG = '#ffffff';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SettingsScreen({ navigation }) {
    const { user, token, updateUser, logout } = useAuth();
    const { runWithLoader } = useLoading();
    
    const [settings, setSettings] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        notify_on_faculty_review: true,
        notification_routing: 'In-app Dashboard',
        telemetry_sync_mode: 'Real-time',
        ignored_extensions: '',
        ide_font_family: 'SF Mono',
        ide_font_size: 13,
        theme: 'light'
    });

    const [sessions, setSessions] = useState([]);

    useEffect(() => { 
        fetchSettings(); 
        fetchSessions();
    }, []);

    const fetchSettings = async () => {
        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/v1/user/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') {
                    setSettings(data.settings);
                }
            }
        }).catch(() => {});
        await runWithLoader(fetchTask, "Syncing settings...");
    };

    const fetchSessions = async () => {
        fetch(`${API_CONFIG.BACKEND_URL}/api/v1/user/settings/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') {
                    setSessions(data.sessions);
                }
            }
        }).catch(() => {});
    };

    const handleToggle = (field, val) => {
        setSettings(prev => ({ ...prev, [field]: val }));
        saveField(field, val);
    };

    const saveField = async (field, val) => {
        try {
            const payload = { [field]: val };
            await fetch(`${API_CONFIG.BACKEND_URL}/api/v1/user/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (field === 'first_name' || field === 'last_name') {
                updateUser({ [field]: val });
            }
        } catch(e) {}
    };

    const promptTextUpdate = (field, label, currentValue) => {
        Alert.prompt(
            `Update ${label}`,
            `Enter new value for ${label}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Save', 
                    onPress: (val) => {
                        if(val !== undefined && val.trim() !== '') {
                            setSettings(prev => ({ ...prev, [field]: val.trim() }));
                            saveField(field, val.trim());
                        }
                    }
                }
            ],
            'plain-text',
            currentValue
        );
    };

    const promptOptions = (field, label, optionsArray) => {
        const buttons = optionsArray.map(opt => ({
            text: opt.toString(),
            onPress: () => {
                setSettings(prev => ({ ...prev, [field]: opt }));
                saveField(field, opt);
            }
        }));
        buttons.push({ text: 'Cancel', style: 'cancel' });
        Alert.alert(`Select ${label}`, `Choose a new setting for ${label}`, buttons);
    };

    const handleChangePassword = () => {
        Alert.prompt(
            "Security Verification",
            "Enter your CURRENT password to continue:",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Next", 
                    onPress: (currentPassword) => {
                        if (!currentPassword) return;
                        Alert.prompt(
                            "New Password",
                            "Enter your NEW password:",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Update Password",
                                    onPress: async (newPassword) => {
                                        if (!newPassword) return;
                                        
                                        const updateTask = fetch(`${API_CONFIG.BACKEND_URL}/api/v1/user/settings/change-password`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
                                        }).then(async (res) => {
                                            const data = await res.json();
                                            if (res.ok) {
                                                Alert.alert("Success", "Password updated successfully.");
                                            } else {
                                                Alert.alert("Error", data.message || "Failed to update password.");
                                            }
                                        }).catch(() => {
                                            Alert.alert("Error", "Network error occurred.");
                                        });

                                        await runWithLoader(updateTask, "Updating credentials...");
                                    }
                                }
                            ],
                            'secure-text'
                        );
                    }
                }
            ],
            'secure-text'
        );
    };

    const handleRevokeSession = (sessionId) => {
        Alert.alert(
            "Revoke Device",
            "Are you sure you want to sign out this device?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Revoke",
                    style: "destructive",
                    onPress: async () => {
                        const revokeTask = fetch(`${API_CONFIG.BACKEND_URL}/api/v1/user/settings/sessions/revoke`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ session_id: sessionId })
                        }).then(async (res) => {
                            if (res.ok) {
                                fetchSessions();
                            }
                        }).catch(() => {});
                        await runWithLoader(revokeTask, "Revoking session...");
                    }
                }
            ]
        );
    };

    const SettingsRow = ({ icon, label, valueText, isSwitch, switchValue, onSwitch, onPress, isLast, valueColor, actionIcon }) => (
        <TouchableOpacity 
            style={[styles.row, !isLast && styles.rowBorder]} 
            activeOpacity={isSwitch ? 1 : 0.7}
            onPress={!isSwitch ? onPress : undefined}
        >
            <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                    <Feather name={icon} size={15} color={TEAL_COLOR} />
                </View>
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                {valueText && <Text style={[styles.valueText, valueColor && {color: valueColor}]}>{valueText}</Text>}
                {isSwitch ? (
                    <Switch 
                        value={switchValue} 
                        onValueChange={onSwitch}
                        trackColor={{ false: "#e2e8f0", true: ORANGE_COLOR }}
                        thumbColor="#FFFFFF"
                    />
                ) : (
                    <Feather name={actionIcon || "chevron-right"} size={18} color="#94a3b8" />
                )}
            </View>
        </TouchableOpacity>
    );

    const resolvePhotoUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=' + (user?.first_name || 'User') + '&background=6548d8&color=fff';
        return url.startsWith("http") ? url : `${API_CONFIG.BACKEND_URL}${url}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* ── PART 1: Solid Violet Header ─────────────────── */}
                <View style={styles.blueHeaderContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>Settings</Text>
                        <TouchableOpacity style={styles.searchBtn}>
                            <Feather name="search" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Card */}
                    <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')}>
                        <Image 
                            source={{ uri: resolvePhotoUrl(user?.profile_image) }} 
                            style={styles.avatar} 
                        />
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user?.first_name || 'User'} {user?.last_name || ''}</Text>
                            <Text style={styles.profileRole}>{user?.role || 'Student'}</Text>
                        </View>
                        <Feather name="chevron-right" size={22} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* ── PART 2: Curved White Bottom Container ──────────── */}
                <View style={styles.whiteBottomContainer}>
                    {/* APPEARANCE */}
                    <Text style={styles.sectionHeader}>APPEARANCE</Text>
                    <View style={styles.sectionCard}>
                        <SettingsRow 
                            icon="moon" 
                            label="Dark Theme Mode" 
                            isSwitch={true}
                            switchValue={settings.theme === 'dark'}
                            onSwitch={(v) => handleToggle('theme', v ? 'dark' : 'light')}
                            isLast={true}
                        />
                    </View>

                    {/* PREFERENCES */}
                    <Text style={styles.sectionHeader}>PREFERENCES</Text>
                    <View style={styles.sectionCard}>
                        <SettingsRow 
                            icon="bell" 
                            label="Review Dispatch Alerts" 
                            isSwitch={true}
                            switchValue={settings.notify_on_faculty_review}
                            onSwitch={(v) => handleToggle('notify_on_faculty_review', v)}
                        />
                        <SettingsRow 
                            icon="send" 
                            label="Routing Channel" 
                            valueText={settings.notification_routing}
                            onPress={() => promptOptions('notification_routing', 'Routing Channel', ['In-app Dashboard', 'Email Service', 'Disabled'])}
                        />
                        <SettingsRow 
                            icon="refresh-cw" 
                            label="Telemetry Mode" 
                            valueText={settings.telemetry_sync_mode}
                            onPress={() => promptOptions('telemetry_sync_mode', 'Telemetry Mode', ['Real-time', 'Batch', 'Manual Sync Only'])}
                            isLast={true}
                        />
                    </View>

                    {/* WORKSPACE & IDE */}
                    <Text style={styles.sectionHeader}>WORKSPACE & IDE</Text>
                    <View style={styles.sectionCard}>
                        <SettingsRow 
                            icon="file-minus" 
                            label="Ignored Extensions" 
                            valueText={settings.ignored_extensions || "None"}
                            onPress={() => promptTextUpdate('ignored_extensions', 'Ignored Extensions', settings.ignored_extensions)}
                        />
                        <SettingsRow 
                            icon="type" 
                            label="IDE Font" 
                            valueText={settings.ide_font_family}
                            onPress={() => promptOptions('ide_font_family', 'IDE Font', ['SF Mono', 'Courier', 'Fira Code'])}
                        />
                        <SettingsRow 
                            icon="maximize-2" 
                            label="Font Size" 
                            valueText={settings.ide_font_size + 'px'}
                            onPress={() => promptOptions('ide_font_size', 'Font Size', [11, 12, 13, 14, 16])}
                            isLast={true}
                        />
                    </View>
                    
                    {/* ACCOUNT INFO */}
                    <Text style={styles.sectionHeader}>ACCOUNT PROFILE NODE</Text>
                    <View style={styles.sectionCard}>
                        <SettingsRow 
                            icon="user" 
                            label="First Name" 
                            valueText={settings.first_name || user?.first_name}
                            onPress={() => promptTextUpdate('first_name', 'First Name', settings.first_name || user?.first_name)}
                        />
                        <SettingsRow 
                            icon="users" 
                            label="Last Name" 
                            valueText={settings.last_name || user?.last_name}
                            onPress={() => promptTextUpdate('last_name', 'Last Name', settings.last_name || user?.last_name)}
                        />
                        <SettingsRow 
                            icon="mail" 
                            label="Email Address" 
                            valueText={user?.email}
                            onPress={() => Alert.alert("Locked", "Email addresses cannot be changed directly.")}
                        />
                        <SettingsRow 
                            icon="phone" 
                            label="Communication Phone" 
                            valueText={settings.phone || "Add"}
                            onPress={() => promptTextUpdate('phone', 'Phone Number', settings.phone)}
                        />
                        <SettingsRow 
                            icon="lock" 
                            label="Update Access Password" 
                            onPress={handleChangePassword}
                            isLast={true}
                        />
                    </View>

                    {/* SESSIONS */}
                    <Text style={styles.sectionHeader}>ACTIVE DEVICE CONTEXTS</Text>
                    <View style={styles.sectionCard}>
                        {sessions.map((session, index) => (
                            <View key={session.id} style={[styles.sessionRow, index !== sessions.length - 1 && styles.rowBorder]}>
                                <View style={styles.sessionLeft}>
                                    <Feather name={session.device_name.includes("Mobile") || session.device_name.includes("iOS") || session.device_name.includes("Android") ? "smartphone" : "monitor"} size={16} color="#94a3b8" style={{marginRight: 10, marginTop: 2}} />
                                    <View>
                                        <Text style={styles.sessionDevice}>{session.device_name}</Text>
                                        <Text style={styles.sessionIp}>{session.ip_address} • Last Active: {session.last_active ? new Date(session.last_active).toLocaleDateString() : 'N/A'}</Text>
                                    </View>
                                </View>
                                {session.is_current ? (
                                    <View style={styles.currentBadge}>
                                        <Text style={styles.currentBadgeText}>Current</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.trashBtn} onPress={() => handleRevokeSession(session.id)}>
                                        <Feather name="trash-2" size={18} color="#FF4B4B" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {sessions.length === 0 && (
                            <View style={{padding: 16}}>
                                <Text style={{color: '#64748b'}}>Loading contexts...</Text>
                            </View>
                        )}
                    </View>

                    {/* LOGOUT */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
                
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginTop: 18,
        letterSpacing: 0.2,
    },
    searchBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 16,
        marginTop: 24,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#f1f5f9',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    profileName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    profileRole: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    whiteBottomContainer: {
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 40,
        minHeight: SCREEN_HEIGHT * 0.7,
        marginTop: -24,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        marginLeft: 12,
        marginBottom: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    sectionCard: {
        backgroundColor: CARD_BG,
        borderRadius: 20,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 18,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(101, 72, 216, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueText: {
        fontSize: 14,
        color: '#64748b',
        marginRight: 8,
        fontWeight: '500',
    },
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 18,
    },
    sessionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sessionDevice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    sessionIp: {
        fontSize: 12,
        color: '#64748b',
    },
    currentBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    currentBadgeText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '700',
    },
    trashBtn: {
        padding: 4,
    },
    logoutBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: 10,
        backgroundColor: '#fff1f2',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ffe4e6',
        marginBottom: 20,
    },
    logoutText: {
        color: '#f43f5e',
        fontSize: 16,
        fontWeight: '700',
    }
});

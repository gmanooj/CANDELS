import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    TextInput, 
    KeyboardAvoidingView, 
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLoading } from '../context/LoadingContext';
import { useSidebar } from '../context/SidebarContext';
import { API_CONFIG } from '../config/api';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
    const { user, token, updateUser } = useAuth();
    const { runWithLoader } = useLoading();
    const { toggleSidebar } = useSidebar();

    const [profileForm, setProfileForm] = useState({
        phone: "", gender: "", dob: "", bio: "", github_url: "", linkedin_url: "", profile_image: ""
    });

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [completionPercentage, setCompletionPercentage] = useState(0);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [activeTab, setActiveTab] = useState('Identity'); // 'Identity' | 'Socials'

    useEffect(() => {
        if (user?.user_code) {
            fetchFreshDatabaseProfile();
        }
    }, [user?.user_code]);

    const fetchFreshDatabaseProfile = async () => {
        setErrorMessage("");
        
        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/users/profile-context?user_code=${user.user_code}`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const dbData = await res.json();
                setProfileForm({
                    phone: dbData.phone || "",
                    gender: dbData.gender || "",
                    dob: dbData.dob ? dbData.dob.split("T")[0] : "",
                    bio: dbData.bio || "",
                    github_url: dbData.github_url || "",
                    linkedin_url: dbData.linkedin_url || "",
                    profile_image: dbData.profile_image || ""
                });
                setCompletionPercentage(dbData.completion_percentage || 0);
                
                updateUser({ ...user, ...dbData });
            } else {
                setErrorMessage("Failed to pull profile context.");
            }
        })
        .catch(() => {
            setErrorMessage("Error connecting to database.");
        });

        await runWithLoader(fetchTask, "Loading Profile...");
    };

    const handleInputChange = (name, value) => {
        setProfileForm(prev => ({ ...prev, [name]: value }));
    };

    const handleProfileSubmit = async () => {
        setErrorMessage("");
        setSuccessMessage("");

        const updateTask = fetch(`${API_CONFIG.BACKEND_URL}/api/profile/update`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                user_code: user.user_code, 
                ...profileForm,
                is_edit_override: isEditingMode 
            })
        })
        .then(async (res) => {
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage("Profile updated successfully!");
                setCompletionPercentage(data.completion_percentage);
                setIsEditingMode(false);
                updateUser({ ...user, ...profileForm, completion_percentage: data.completion_percentage });
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setErrorMessage(data.error || "Failed to update profile.");
            }
        })
        .catch(() => {
            setErrorMessage("Network error.");
        });

        await runWithLoader(updateTask, "Saving Profile...");
    };

    const isLocked = (val) => !isEditingMode && val !== "";

    return (
        <View style={styles.viewportMaster}>
            {/* Upper Gray Header Background */}
            <View style={styles.grayHeaderBackground} />

            {/* Floating Top Navigation */}
            <SafeAreaView style={styles.safeTopNav}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={toggleSidebar} style={styles.iconButtonLeft}>
                        <Feather name="menu" size={24} color="#000" />
                    </TouchableOpacity>
                    <View style={styles.navRight}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Feather name="share" size={20} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsEditingMode(!isEditingMode)} style={[styles.iconButton, isEditingMode && { borderColor: '#1A1A2E', borderWidth: 2 }]}>
                            <Feather name="settings" size={20} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.navRightBelow}>
                    <TouchableOpacity style={styles.iconButtonTransparent}>
                        <Feather name="image" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    
                    {/* White Body Content */}
                    <View style={styles.whiteBody}>
                        
                        {/* Avatar */}
                        <View style={styles.avatarSection}>
                            {profileForm.profile_image ? (
                                <Image source={{ uri: profileForm.profile_image }} style={styles.avatarMedia} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>{user?.first_name ? user.first_name[0] : "?"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Name & Handle */}
                        <View style={styles.identityTextSection}>
                            <View style={styles.nameRow}>
                                <Text style={styles.userNameText}>{user?.first_name || 'User'} {user?.last_name || ''}</Text>
                            </View>
                            <Text style={styles.handleText}>@{user?.user_code || 'member'}</Text>
                        </View>

                        {/* Stats & Actions */}
                        <View style={styles.statsActionsRow}>
                            <View style={styles.statsGroup}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{completionPercentage}%</Text>
                                    <Text style={styles.statLabel}>completed</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{user?.role === 'admin' ? 1 : 0}</Text>
                                    <Text style={styles.statLabel}>{user?.role || 'node'}</Text>
                                </View>
                            </View>
                            <View style={styles.actionsGroup}>
                                <TouchableOpacity onPress={isEditingMode ? handleProfileSubmit : () => setIsEditingMode(true)} style={styles.editProfileBtn}>
                                    <Text style={styles.editProfileBtnText}>{isEditingMode ? "Save Profile" : "Edit Profile"}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.paletteBtn}>
                                    <Ionicons name="color-palette" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Tabs Container */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity onPress={() => setActiveTab('Identity')} style={[styles.tabBtn, activeTab === 'Identity' && styles.tabBtnActive]}>
                                <Text style={[styles.tabText, activeTab === 'Identity' && styles.tabTextActive]}>Identity</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveTab('Socials')} style={[styles.tabBtn, activeTab === 'Socials' && styles.tabBtnActive]}>
                                <Text style={[styles.tabText, activeTab === 'Socials' && styles.tabTextActive]}>Socials</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Messages */}
                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                        {/* Search Filter Row */}
                        <View style={styles.subFilterRow}>
                            <Feather name="search" size={20} color="#000" />
                            <View style={styles.filterPillActive}>
                                <Text style={styles.filterPillActiveText}>All</Text>
                            </View>
                            <Text style={styles.filterTextInactive}>Private</Text>
                            <Text style={styles.filterTextAdd}>+ Add Folder</Text>
                        </View>

                        {/* Form / Content Cards */}
                        {activeTab === 'Identity' && (
                            <View style={[styles.contentCard, { backgroundColor: '#6548d8' }]}>
                                <View style={styles.cardHeader}>
                                    <Feather name="lock" size={14} color="#FFF" />
                                    <Text style={styles.cardHeaderText}>Private</Text>
                                    <View style={{flex:1}}/>
                                    <Feather name="more-horizontal" size={20} color="#FFF" />
                                </View>
                                <View style={styles.cardBottom}>
                                    <Text style={styles.cardItemCount}>4 fields</Text>
                                    <Text style={styles.cardTitle}>Identity Ledger</Text>
                                </View>
                                
                                <View style={styles.formInputsContainer}>
                                    <TextInput style={[styles.minimalInput, isLocked(profileForm.phone) && styles.minimalInputLocked]} value={profileForm.phone} onChangeText={(val) => handleInputChange("phone", val)} placeholder="Phone Number" placeholderTextColor="rgba(255,255,255,0.5)" editable={!isLocked(profileForm.phone)} />
                                    <TextInput style={[styles.minimalInput, isLocked(profileForm.gender) && styles.minimalInputLocked]} value={profileForm.gender} onChangeText={(val) => handleInputChange("gender", val)} placeholder="Gender" placeholderTextColor="rgba(255,255,255,0.5)" editable={!isLocked(profileForm.gender)} />
                                    <TextInput style={[styles.minimalInput, isLocked(profileForm.dob) && styles.minimalInputLocked]} value={profileForm.dob} onChangeText={(val) => handleInputChange("dob", val)} placeholder="DOB (YYYY-MM-DD)" placeholderTextColor="rgba(255,255,255,0.5)" editable={!isLocked(profileForm.dob)} />
                                    <TextInput style={[styles.minimalInput, isLocked(profileForm.profile_image) && styles.minimalInputLocked]} value={profileForm.profile_image} onChangeText={(val) => handleInputChange("profile_image", val)} placeholder="Avatar URL" placeholderTextColor="rgba(255,255,255,0.5)" editable={!isLocked(profileForm.profile_image)} />
                                </View>
                            </View>
                        )}

                        {activeTab === 'Socials' && (
                            <View style={[styles.contentCard, { backgroundColor: '#F27A1A' }]}>
                                <View style={styles.cardHeader}>
                                    <Feather name="globe" size={14} color="#FFF" />
                                    <Text style={styles.cardHeaderText}>Public</Text>
                                    <View style={{flex:1}}/>
                                    <Feather name="more-horizontal" size={20} color="#FFF" />
                                </View>
                                <View style={styles.cardBottom}>
                                    <Text style={styles.cardItemCount}>3 fields</Text>
                                    <Text style={styles.cardTitle}>Professional Network</Text>
                                </View>
                                
                                <View style={styles.formInputsContainer}>
                                    <TextInput style={[styles.minimalInput, isLocked(profileForm.github_url) && styles.minimalInputLocked]} value={profileForm.github_url} onChangeText={(val) => handleInputChange("github_url", val)} placeholder="GitHub URL" placeholderTextColor="rgba(255,255,255,0.5)" editable={!isLocked(profileForm.github_url)} />
                                    <TextInput style={[styles.minimalInput, isLocked(profileForm.linkedin_url) && styles.minimalInputLocked]} value={profileForm.linkedin_url} onChangeText={(val) => handleInputChange("linkedin_url", val)} placeholder="LinkedIn URL" placeholderTextColor="rgba(255,255,255,0.5)" editable={!isLocked(profileForm.linkedin_url)} />
                                    <TextInput style={[styles.minimalInput, isLocked(profileForm.bio) && styles.minimalInputLocked, { height: 80, textAlignVertical: 'top' }]} value={profileForm.bio} onChangeText={(val) => handleInputChange("bio", val)} placeholder="Bio..." placeholderTextColor="rgba(255,255,255,0.5)" editable={!isLocked(profileForm.bio)} multiline />
                                </View>
                            </View>
                        )}
                        
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    viewportMaster: {
        flex: 1,
        backgroundColor: '#EBEBEB',
    },
    grayHeaderBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '35%',
        backgroundColor: '#EBEBEB',
    },
    safeTopNav: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        alignItems: 'center',
    },
    navRight: {
        flexDirection: 'row',
        gap: 12,
    },
    navRightBelow: {
        alignItems: 'flex-end',
        paddingHorizontal: 28,
        marginTop: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    iconButtonLeft: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    iconButtonTransparent: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingTop: Platform.OS === 'android' ? 120 : 140,
    },
    whiteBody: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        minHeight: '100%',
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: -60,
    },
    avatarMedia: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 5,
        borderColor: '#FFF',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 5,
        borderColor: '#FFF',
        backgroundColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 40,
        color: '#FFF',
        fontWeight: 'bold',
    },
    identityTextSection: {
        alignItems: 'center',
        marginTop: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userNameText: {
        fontSize: 26,
        fontWeight: '800',
        color: '#000',
    },
    emojiIcon: {
        fontSize: 16,
        marginLeft: 6,
    },
    handleText: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: 4,
    },
    statsActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        backgroundColor: '#F7F7F7',
        borderRadius: 24,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    statsGroup: {
        flexDirection: 'row',
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    statLabel: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    actionsGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    editProfileBtn: {
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    editProfileBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    paletteBtn: {
        backgroundColor: '#000',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F7F7F7',
        borderRadius: 24,
        padding: 4,
        marginTop: 24,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 20,
    },
    tabBtnActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E8E93',
    },
    tabTextActive: {
        color: '#000',
        fontWeight: '700',
    },
    subFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        gap: 16,
    },
    filterPillActive: {
        backgroundColor: '#000',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    filterPillActiveText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    filterTextInactive: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '600',
    },
    filterTextAdd: {
        color: '#000',
        fontSize: 13,
        fontWeight: '600',
    },
    contentCard: {
        marginTop: 24,
        borderRadius: 24,
        padding: 24,
        minHeight: 220,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardHeaderText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    cardBottom: {
        marginTop: 40,
        marginBottom: 20,
    },
    cardItemCount: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginBottom: 4,
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '700',
    },
    formInputsContainer: {
        marginTop: 10,
        gap: 12,
    },
    minimalInput: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        color: '#FFF',
        fontSize: 14,
    },
    minimalInputLocked: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        color: 'rgba(255,255,255,0.5)',
    },
    errorText: {
        color: '#EF4444',
        marginTop: 12,
        textAlign: 'center',
        fontWeight: '600',
    },
    successText: {
        color: '#10B981',
        marginTop: 12,
        textAlign: 'center',
        fontWeight: '600',
    }
});

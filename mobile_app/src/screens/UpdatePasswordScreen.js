import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    Alert,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
    ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { API_CONFIG } from '../config/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function UpdatePasswordScreen({ navigation }) {
    const { token } = useAuth();
    const { runWithLoader } = useLoading();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleUpdatePassword = async () => {
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            Alert.alert("Validation Error", "All password fields are required.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Validation Error", "New password and confirmation do not match.");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Validation Error", "New password must be at least 6 characters long.");
            return;
        }

        const updateTask = fetch(`${API_CONFIG.BACKEND_URL}/api/v1/user/settings/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        })
        .then(async (res) => {
            const data = await res.json();
            if (res.ok) {
                Alert.alert("Success", "Your password has been updated successfully.");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                navigation.goBack();
            } else {
                Alert.alert("Update Failed", data.message || "Failed to change password.");
            }
        })
        .catch(() => {
            Alert.alert("Network Error", "Unable to reach the server. Please try again.");
        });

        await runWithLoader(updateTask, "Securing password update...");
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.headerBlock}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Feather name="arrow-left" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Update Password</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                style={styles.contentScroll} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.formCard}>
                    <Feather name="shield" size={44} color="#6548d8ff" style={styles.logoIcon} />
                    <Text style={styles.cardSubtitle}>Ensure your account remains secure by choosing a strong password.</Text>

                    {/* Current Password */}
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Enter current password"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showCurrent}
                        />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(!showCurrent)}>
                            <Feather name={showCurrent ? "eye" : "eye-off"} size={18} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* New Password */}
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password (min. 6 chars)"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showNew}
                        />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
                            <Feather name={showNew ? "eye" : "eye-off"} size={18} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Confirm New Password */}
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm new password"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showConfirm}
                        />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                            <Feather name={showConfirm ? "eye" : "eye-off"} size={18} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={styles.submitBtn} 
                        onPress={handleUpdatePassword}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.submitBtnText}>Change Password</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBlock: {
        backgroundColor: '#6548d8ff',
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingBottom: 24,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
    },
    contentScroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
        alignItems: 'center',
        marginTop: 10,
    },
    logoIcon: {
        marginBottom: 12,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 28,
        paddingHorizontal: 12,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    inputContainer: {
        width: '100%',
        height: 50,
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 20,
    },
    textInput: {
        flex: 1,
        height: '100%',
        color: '#0f172a',
        fontSize: 14,
    },
    eyeBtn: {
        padding: 6,
    },
    submitBtn: {
        width: '100%',
        height: 52,
        backgroundColor: '#6548d8ff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#6548d8ff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
});

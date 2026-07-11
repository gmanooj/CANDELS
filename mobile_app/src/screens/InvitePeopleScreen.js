import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Modal,
    FlatList
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';

const TEAL_COLOR = '#6548d8ff';
const ORANGE_COLOR = '#F27A1A';

export default function InvitePeopleScreen({ navigation }) {
    const { user, token } = useAuth();
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [contactsModalVisible, setContactsModalVisible] = useState(false);
    const [contactsList, setContactsList] = useState([]);
    const [searchContactQuery, setSearchContactQuery] = useState('');

    const handleOpenContacts = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
            });
            if (data.length > 0) {
                const validContacts = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
                setContactsList(validContacts);
                setContactsModalVisible(true);
            } else {
                Alert.alert("No Contacts", "No contacts were found on this device.");
            }
        } else {
            Alert.alert("Permission Denied", "Cannot access contacts without permission.");
        }
    };

    useEffect(() => {
        // As soon as page opens, simulate asking for Contacts/Phone permissions
        Alert.alert(
            "Permission Request",
            "Allow CΛNDELS to access your phone calls and contacts to easily invite friends?",
            [
                { text: "Deny", style: "cancel" },
                { text: "Allow", onPress: () => console.log("Contacts permission granted") }
            ]
        );
    }, []);

    const handleInviteEmail = async () => {
        if (!email.trim()) {
            Alert.alert("Validation", "Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/invite/email`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: email })
            });
            const data = await res.json();
            
            if (res.status === 409) {
                Alert.alert("Already Registered", data.error || "This email is already registered.");
            } else if (res.ok) {
                Alert.alert("Success", data.message || "Invitation sent successfully!");
                setEmail('');
            } else {
                Alert.alert("Error", data.error || "Failed to send invitation.");
            }
        } catch (error) {
            Alert.alert("Network Error", "Could not connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    const handleInvitePhone = async () => {
        if (!phone.trim()) {
            Alert.alert("Validation", "Please enter a valid phone number.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/invite/sms`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    phone: phone,
                    referral_code: user?.referral_code || "TB-REF-XXXX" 
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                Alert.alert("Success", data.message || "SMS Invitation dispatched!");
                setPhone('');
            } else {
                Alert.alert("Error", data.error || "Failed to send SMS.");
            }
        } catch (error) {
            Alert.alert("Network Error", "Could not connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite People</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.iconCircle}>
                        <Text style={styles.heroIcon}>🤝</Text>
                    </View>
                    <Text style={styles.heroTitle}>Grow Your Team</Text>
                    <Text style={styles.heroSubtitle}>Invite your friends or colleagues to join CΛNDELS and collaborate seamlessly.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Invite via Email</Text>
                    <Text style={styles.cardDesc}>Send a professional HTML invitation link directly to their inbox.</Text>
                    
                    <TextInput
                        style={styles.input}
                        placeholder="colleague@example.com"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                    
                    <TouchableOpacity 
                        style={[styles.primaryButton, loading && styles.disabledButton]} 
                        onPress={handleInviteEmail}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Email Invite</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Invite via Phone Number</Text>
                    <Text style={styles.cardDesc}>Send an SMS containing your unique referral code.</Text>
                    
                    <View style={styles.phoneInputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder="+1 (555) 000-0000"
                            placeholderTextColor="#94a3b8"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                        />
                        <TouchableOpacity style={styles.contactBtn} onPress={handleOpenContacts}>
                            <Text style={styles.contactBtnIcon}>👤</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.secondaryButton, loading && styles.disabledButton, { marginTop: 20 }]} 
                        onPress={handleInvitePhone}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send SMS Invite</Text>}
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <Modal visible={contactsModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Contact</Text>
                            <TouchableOpacity onPress={() => setContactsModalVisible(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search contacts..."
                            placeholderTextColor="#94a3b8"
                            value={searchContactQuery}
                            onChangeText={setSearchContactQuery}
                        />
                        <FlatList
                            data={contactsList.filter(c => (c.name || '').toLowerCase().includes(searchContactQuery.toLowerCase()))}
                            keyExtractor={item => item.id}
                            style={{ width: '100%' }}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.contactItem}
                                    onPress={() => {
                                        setPhone(item.phoneNumbers[0].number);
                                        setContactsModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.contactName}>{item.name}</Text>
                                    <Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>No contacts found</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: ORANGE_COLOR,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 40,
    },
    backText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 60,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 80,
        backgroundColor: 'rgba(242, 122, 26, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroIcon: {
        fontSize: 40,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1A1A2E',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 8,
    },
    cardDesc: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 20,
        lineHeight: 20,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1E293B',
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: ORANGE_COLOR,
        borderRadius: 44,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: ORANGE_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryButton: {
        backgroundColor: TEAL_COLOR,
        borderRadius: 44,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: TEAL_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    contactBtn: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(56, 163, 165, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactBtnIcon: {
        fontSize: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
        alignItems: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A2E',
    },
    modalCloseText: {
        fontSize: 20,
        color: '#64748B',
        fontWeight: '700',
    },
    searchInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1E293B',
        width: '100%',
        marginBottom: 16,
    },
    contactItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    contactPhone: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: '#94a3b8',
    }
});

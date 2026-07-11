import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NotificationBell({ userCode, onNewNotification }) {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const prevNotificationIds = useRef(null);

    const fetchNotifications = async () => {
        if (!userCode || !token) return;
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/notifications/fetch?user_code=${userCode}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const newNotifs = data.notifications || [];
                if (prevNotificationIds.current !== null) {
                    const newlyAdded = newNotifs.filter(n => !prevNotificationIds.current.has(n.id));
                    if (newlyAdded.length > 0 && onNewNotification) {
                        onNewNotification(newlyAdded[newlyAdded.length - 1]);
                    }
                }
                prevNotificationIds.current = new Set(newNotifs.map(n => n.id));
                setNotifications(newNotifs);
            }
        } catch (err) {
            console.error("Error checking notification bell logs:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000); 
        return () => clearInterval(intervalId);
    }, [userCode]);

    const handleBellPress = () => {
        fetchNotifications();
        setShowModal(true);
    };

    const renderNotificationItem = ({ item }) => (
        <View style={styles.notifItem}>
            <View style={styles.iconIndicator}>
                <Text style={styles.iconText}>📨</Text>
            </View>
            <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>System Alert</Text>
                <Text style={styles.notifMessage}>{item.message}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.bellContainer}>
            <TouchableOpacity onPress={handleBellPress} activeOpacity={0.7} style={styles.bellBtn}>
                <Text style={styles.bellIcon}>🔔︎</Text>
                {notifications.length > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{notifications.length}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Modal
                visible={showModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowModal(false)}
            >
                <TouchableOpacity 
                    style={styles.modalBackdrop} 
                    activeOpacity={1} 
                    onPress={() => setShowModal(false)}
                >
                    <View style={styles.popoverCard}>
                        <View style={styles.popoverHeader}>
                            <Text style={styles.popoverTitle}>System Notifications</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Text style={styles.popoverCloseBtn}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {notifications.length > 0 ? (
                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                                renderItem={renderNotificationItem}
                                style={styles.list}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No notifications found.</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    bellContainer: {
        position: 'relative',
    },
    bellBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bellIcon: {
        fontSize: 22,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#ef4444',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '800',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    popoverCard: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        maxHeight: SCREEN_HEIGHT * 0.6,
    },
    popoverHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 12,
        marginBottom: 12,
    },
    popoverTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    popoverCloseBtn: {
        fontSize: 13,
        color: '#0066cc',
        fontWeight: '600',
    },
    list: {
        width: '100%',
    },
    notifItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    iconIndicator: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    iconText: {
        fontSize: 14,
    },
    notifContent: {
        flex: 1,
    },
    notifTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1d1d1f',
        marginBottom: 2,
    },
    notifMessage: {
        fontSize: 12,
        color: '#64748b',
        lineHeight: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 13,
    }
});

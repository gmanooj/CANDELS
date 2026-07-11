import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { API_CONFIG } from '../config/api';

export default function PermanentAllocationBanner({ teamCode, refreshTrigger, onOpenAllocationMatrix }) {
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAllocationFidelity = async () => {
            if (!teamCode) {
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/team/validation-status?team_code=${teamCode}`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    setStatusData(result.data);
                }
            } catch (error) {
                console.error("Fidelity verification error:", error);
            } finally {
                setLoading(false);
            }
        };

        checkAllocationFidelity();
    }, [teamCode, refreshTrigger]);

    if (loading || !statusData) return null;
    if (statusData.guideAllotted) return null;

    return (
        <View style={styles.bannerContainer}>
            <View style={styles.bannerContentRow}>
                <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>⚠️</Text>
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.titleText}>Missing Team Guide/Faculty Allocation</Text>
                    <Text style={styles.descriptionText}>
                        Your workspace team node (<Text style={{ fontWeight: '700' }}>{statusData.teamCode}</Text>) does not have a Project Guide allotted. The declaration features remain locked until a Faculty member joins.
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={onOpenAllocationMatrix}>
                <Text style={styles.actionBtnText}>Allot Faculty Guide →</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    bannerContainer: {
        width: '100%',
        backgroundColor: '#fffbeb',
        borderLeftWidth: 4,
        borderLeftColor: '#d97706',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 1,
    },
    bannerContentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 16,
    },
    textContainer: {
        flex: 1,
    },
    titleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#78350f',
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 12,
        color: '#92400e',
        lineHeight: 16,
    },
    actionBtn: {
        backgroundColor: '#0066cc',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    actionBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    }
});

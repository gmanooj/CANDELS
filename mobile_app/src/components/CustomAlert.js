import React from 'react';
import { 
    Modal, 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions,
    TouchableWithoutFeedback
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CustomAlert({ 
    visible, 
    title, 
    message, 
    confirmText = "Confirm", 
    cancelText = "Cancel", 
    onConfirm, 
    onCancel,
    confirmColor = "#1b8a07", // Green
    cancelColor = "#b30e0e"   // Red
}) {
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.backdrop}>
                <TouchableWithoutFeedback onPress={onCancel}>
                    <View style={styles.overlayCloseArea} />
                </TouchableWithoutFeedback>
                
                <View style={styles.alertCard}>
                    {/* Top Right Close Button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={onCancel} activeOpacity={0.7}>
                        <Feather name="x" size={18} color="#000" />
                    </TouchableOpacity>

                    {/* Title */}
                    <Text style={styles.titleText}>{title}</Text>

                    {/* Message / Description */}
                    <Text style={styles.messageText}>{message}</Text>

                    {/* Button Actions */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity 
                            style={[styles.btn, { backgroundColor: confirmColor }]} 
                            onPress={onConfirm}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.btnText}>{confirmText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.btn, { backgroundColor: cancelColor }]} 
                            onPress={onCancel}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.btnText}>{cancelText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayCloseArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    alertCard: {
        width: '85%',
        maxWidth: 330,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    titleText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
        marginBottom: 8,
    },
    messageText: {
        fontSize: 12,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
        paddingHorizontal: 6,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    btn: {
        flex: 1,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    btnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
});

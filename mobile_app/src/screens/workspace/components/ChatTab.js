import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { API_CONFIG } from '../../../config/api';
import { decryptChatText, encryptChatText } from '../../../security/aesGcm';
import { Feather } from '@expo/vector-icons';
import { useAudioRecorder, useAudioRecorderState, createAudioPlayer, requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const AudioWave = ({ metering }) => {
    const [waves, setWaves] = useState(Array(20).fill(-60));
    
    useEffect(() => {
        if (metering !== undefined) {
            setWaves(prev => [...prev.slice(1), metering]);
        }
    }, [metering]);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, overflow: 'hidden', paddingHorizontal: 10, flex: 1 }}>
            {waves.map((val, idx) => {
                const mapped = Math.max(0, val + 60) / 60; // normalize 0 to 1
                const height = 4 + mapped * 36;
                return (
                    <View 
                        key={idx} 
                        style={{
                            width: 3, 
                            height, 
                            backgroundColor: '#ef4444', 
                            marginHorizontal: 1.5,
                            borderRadius: 2
                        }} 
                    />
                );
            })}
        </View>
    );
};

export default function ChatTab({ teamCode, token, user, roster, runWithLoader, handleUserScroll }) {
    const [chats, setChats] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [infoModal, setInfoModal] = useState({ visible: false, messageId: null, viewers: null });
    const [replyingTo, setReplyingTo] = useState(null);
    const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
    const recorderState = useAudioRecorderState(recorder, 50);
    const [sound, setSound] = useState(null);
    const [deletedMessages, setDeletedMessages] = useState(new Set());
    const quickEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    useEffect(() => {
        const loadDeleted = async () => {
            try {
                const stored = await AsyncStorage.getItem(`@deleted_msgs_${teamCode}`);
                if (stored) setDeletedMessages(new Set(JSON.parse(stored)));
            } catch (e) {}
        };
        if (teamCode) loadDeleted();
    }, [teamCode]);

    useEffect(() => {
        if (teamCode) {
            fetchChats();
            const chatPollInterval = setInterval(fetchChatsSilently, 6000);
            return () => clearInterval(chatPollInterval);
        }
    }, [teamCode]);

    const fetchChats = async () => {
        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/chat?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                if (data.messages) {
                    const decrypted = data.messages.map(msg => ({
                        id: msg.id,
                        sender: msg.sender_name || msg.sender,
                        sender_code: msg.sender_code,
                        text: decryptChatText(msg.encrypted_text || msg.text, teamCode),
                        time: msg.time,
                        isMe: msg.sender_code === user?.user_code
                    }));
                    setChats(decrypted);
                }
            }
        })
        .catch((err) => console.error("Chat loading failed:", err));
        
        await runWithLoader(fetchTask, "Fetching chat information from the cloud...");
    };

    const fetchChatsSilently = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/chat?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.messages) {
                    const decrypted = data.messages.map(msg => ({
                        id: msg.id,
                        sender: msg.sender_name || msg.sender,
                        sender_code: msg.sender_code,
                        text: decryptChatText(msg.encrypted_text || msg.text, teamCode),
                        time: msg.time,
                        isMe: msg.sender_code === user?.user_code,
                        status: 'delivered'
                    }));
                    setChats(decrypted);
                }
            }
        } catch (e) {
            // Poll silently
        }
        
        // Mark chats as read
        fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/chat/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ team_code: teamCode, email: user?.email })
        }).catch(()=>{});
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        let payloadText = chatInput.trim();
        if (replyingTo) {
            payloadText = `[REPLY:${replyingTo.sender}] ${replyingTo.text.substring(0, 30)}...\n\n${payloadText}`;
        }
        await sendRawMessage(payloadText);
        setChatInput("");
        setReplyingTo(null);
    };

    const sendRawMessage = async (rawText) => {
        const tempId = Math.random().toString();
        const newMessage = {
            id: tempId,
            sender: user?.first_name || 'Me',
            sender_code: user?.user_code,
            text: rawText,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isMe: true,
            status: 'sent'
        };
        const ciphertext = encryptChatText(rawText, teamCode);
        
        setChats(prev => [...prev, newMessage]);

        fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ team_code: teamCode, email: user?.email, text: ciphertext })
        }).then(res => { if(res.ok) fetchChatsSilently(); }).catch(()=>{});
    };

    const startRecording = async () => {
        try {
            const status = recorder.getStatus();
            if (status.isRecording) return;
            
            await requestRecordingPermissionsAsync();
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            
            if (!status.canRecord) {
                await recorder.prepareToRecordAsync();
            }
            recorder.record();
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        if (!recorderState.isRecording) return;
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) return;
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            sendRawMessage(`[AUDIO]${base64}`);
        } catch(e) {
            console.error(e);
        }
    };

    const playAudio = async (base64) => {
        try {
            if (sound) sound.remove();
            await setAudioModeAsync({ playsInSilentMode: true });
            const uri = FileSystem.documentDirectory + 'temp_audio_' + Date.now() + '.m4a';
            await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });
            const newSound = createAudioPlayer(uri);
            setSound(newSound);
            newSound.play();
        } catch(e) {
            console.error("Audio playback failed", e);
        }
    };

    const handleDeleteMessage = (msg) => {
        const options = [
            { text: "Delete for me", onPress: async () => {
                const newSet = new Set(deletedMessages);
                newSet.add(msg.id);
                setDeletedMessages(newSet);
                await AsyncStorage.setItem(`@deleted_msgs_${teamCode}`, JSON.stringify([...newSet]));
            }}
        ];
        if (msg.isMe) {
            options.push({ text: "Delete for everyone", style: "destructive", onPress: () => {
                fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/chat`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ team_code: teamCode, email: user?.email, message_id: msg.id })
                }).then(() => fetchChatsSilently());
            }});
        }
        options.push({ text: "Cancel", style: "cancel" });
        Alert.alert("Delete Message", "Are you sure you want to delete this message?", options);
    };

    const handleLongPress = (msg) => {
        if (msg.isMe) {
            Alert.alert("Message Options", "Choose an action", [
                { text: "Message Info", onPress: () => handleMessageInfo(msg.id) },
                { text: "Delete Message", style: "destructive", onPress: () => handleDeleteMessage(msg) },
                { text: "Cancel", style: "cancel" }
            ]);
        } else {
            handleDeleteMessage(msg);
        }
    };

    const handleMessageInfo = async (msgId) => {
        if (msgId.toString().includes('.')) return; // Don't fetch for optimistic items
        setInfoModal({ visible: true, messageId: msgId, viewers: null });
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/chat/info?message_id=${msgId}&team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInfoModal(prev => ({ ...prev, viewers: data.viewers || [] }));
            } else {
                setInfoModal(prev => ({ ...prev, viewers: [] }));
            }
        } catch (e) {
            setInfoModal(prev => ({ ...prev, viewers: [] }));
        }
    };

    const handleQuickEmoji = (emoji) => {
        setChatInput(prev => prev + emoji);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#EFEAE2' }}>
            <FlatList
                data={chats}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={{ paddingVertical: 12 }}
                renderItem={({ item }) => {
                    if (deletedMessages.has(item.id)) return null;
                    const senderMember = roster.find(m => m.user_code === item.sender_code);
                    const photoUrl = senderMember?.photo;
                    const isAudio = item.text.startsWith('[AUDIO]');
                    let displayText = item.text;
                    let replyText = null;
                    
                    if (item.text.startsWith('[REPLY:')) {
                        const endIdx = item.text.indexOf(']\n\n');
                        if (endIdx > -1) {
                            replyText = item.text.substring(1, endIdx); // e.g. "REPLY:John] Hello..."
                            displayText = item.text.substring(endIdx + 3);
                        }
                    }

                    return (
                        <Swipeable 
                            renderLeftActions={() => <View style={{ width: 60, justifyContent: 'center', alignItems: 'center' }}><Feather name="corner-down-right" size={24} color="#666" /></View>}
                            onSwipeableOpen={() => setReplyingTo(item)}
                        >
                            <View style={[styles.chatBubbleContainer, item.isMe ? styles.chatContainerMe : styles.chatContainerOther]}>
                                <TouchableOpacity 
                                    style={[styles.chatBubble, item.isMe ? styles.chatMe : styles.chatOther]}
                                    onLongPress={() => handleLongPress(item)}
                                    activeOpacity={0.8}
                                >
                                    {!item.isMe && <Text style={styles.chatSender}>{item.sender}</Text>}
                                    {replyText && (
                                        <View style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: 6, borderRadius: 4, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: '#00a884' }}>
                                            <Text style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>{replyText.replace('REPLY:', '')}</Text>
                                        </View>
                                    )}
                                    <View style={styles.chatTextTimeWrap}>
                                        {isAudio ? (
                                            <TouchableOpacity onPress={() => playAudio(item.text.replace('[AUDIO]', ''))} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                                                <Feather name="play-circle" size={24} color={item.isMe ? "#006644" : "#666"} />
                                                <Text style={{ marginLeft: 5, color: item.isMe ? "#006644" : "#666" }}>Voice Note</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text style={item.isMe ? styles.chatTextMe : styles.chatTextOther}>{displayText}</Text>
                                        )}
                                        <Text style={item.isMe ? styles.chatTimeMe : styles.chatTimeOther}>
                                            {item.time} {item.isMe && <Text style={{ color: item.status === 'sent' ? '#9ca3af' : '#3b82f6' }}>{item.status === 'sent' ? '✓' : '✓✓'}</Text>}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </Swipeable>
                    );
                }}
                style={styles.chatList}
                onScroll={handleUserScroll}
                scrollEventThrottle={16}
            />
            {/* Quick Emojis Bar */}
            <View style={styles.emojiToolbar}>
                {quickEmojis.map((emoji) => (
                    <TouchableOpacity key={emoji} onPress={() => handleQuickEmoji(emoji)} style={styles.emojiBtn}>
                        <Text style={styles.emojiBtnText}>{emoji}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ backgroundColor: '#EFEAE2' }}>
                {replyingTo && (
                    <View style={{ backgroundColor: '#fff', padding: 8, marginHorizontal: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ borderLeftWidth: 3, borderLeftColor: '#00a884', paddingLeft: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#00a884' }}>Replying to {replyingTo.sender}</Text>
                            <Text style={{ fontSize: 12, color: '#666' }} numberOfLines={1}>{replyingTo.text.startsWith('[AUDIO]') ? 'Voice Note' : replyingTo.text}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}><Feather name="x" size={20} color="#999" /></TouchableOpacity>
                    </View>
                )}
                <View style={styles.chatInputContainer}>
                    {recorderState.isRecording ? (
                        <View style={styles.recordingOverlay}>
                            <Feather name="mic" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                            <Text style={styles.recordingTimeText}>{formatTime(recorderState.durationMillis)}</Text>
                            <AudioWave metering={recorderState.metering} />
                            <Text style={styles.slideCancelText}>Release to send</Text>
                        </View>
                    ) : (
                        <View style={styles.chatInputWrapper}>
                            <TouchableOpacity style={styles.emojiIconBtn}>
                                <Feather name="smile" size={24} color="#8696a0" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.chatInput}
                                value={chatInput}
                                onChangeText={setChatInput}
                                placeholder="Message"
                                placeholderTextColor="#8696a0"
                                multiline
                            />
                        </View>
                    )}
                    
                    {chatInput.trim() ? (
                        <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChat}>
                            <Feather name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.chatSendBtn, { backgroundColor: recorderState.isRecording ? '#ef4444' : '#00a884' }]} 
                            onPressIn={startRecording} 
                            onPressOut={stopRecording}
                        >
                            <Feather name="mic" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Read Receipts Modal */}
            <Modal visible={infoModal.visible} transparent={true} animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setInfoModal({ visible: false, messageId: null, viewers: null })}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Message Info</Text>
                        <Text style={styles.modalSubtitle}>Read by</Text>
                        {infoModal.viewers === null ? (
                            <ActivityIndicator size="small" color="#00a884" style={{ marginVertical: 20 }} />
                        ) : infoModal.viewers.length > 0 ? (
                            infoModal.viewers.map((v, i) => (
                                <View key={i} style={styles.viewerRow}>
                                    <Text style={styles.viewerName}>✓✓ {v}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.viewerEmpty}>No one has read this yet.</Text>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    
    chatList: {
        flex: 1,
        paddingHorizontal: 12,
    },
    chatBubbleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
        maxWidth: '100%',
    },
    chatContainerMe: {
        alignSelf: 'flex-end',
    },
    chatContainerOther: {
        alignSelf: 'flex-start',
    },
    chatBubble: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    chatMe: {
        backgroundColor: '#D9FDD3',
        borderBottomRightRadius: 4,
    },
    chatOther: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
    },
    chatSender: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#d97706',
        marginBottom: 2,
    },
    chatTextTimeWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
    },
    chatTextMe: {
        fontSize: 14,
        color: '#111827',
        marginRight: 8,
        maxWidth: '85%',
    },
    chatTextOther: {
        fontSize: 14,
        color: '#111827',
        marginRight: 8,
        maxWidth: '85%',
    },
    chatTimeMe: {
        fontSize: 10,
        color: '#6b7280',
        alignSelf: 'flex-end',
    },
    chatTimeOther: {
        fontSize: 10,
        color: '#9ca3af',
        alignSelf: 'flex-end',
    },
    emojiToolbar: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#EFEAE2',
        justifyContent: 'space-around',
    },
    emojiBtn: {
        padding: 4,
    },
    emojiBtnText: {
        fontSize: 20,
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 10,
        paddingBottom: 25,
        paddingTop: 5,
        backgroundColor: '#EFEAE2', // Transparent blend
    },
    chatInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 5,
    },
    recordingOverlay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 15,
        minHeight: 48,
    },
    recordingTimeText: {
        fontSize: 16,
        color: '#ef4444',
        fontWeight: 'bold',
        minWidth: 45,
    },
    slideCancelText: {
        fontSize: 12,
        color: '#8696a0',
        fontStyle: 'italic',
    },
    emojiIconBtn: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiIconText: {
        fontSize: 20,
        color: '#8696a0',
    },
    chatInput: {
        flex: 1,
        paddingTop: 12,
        paddingBottom: 12,
        paddingRight: 15,
        fontSize: 16,
        maxHeight: 100,
        color: '#111827',
    },
    chatSendBtn: {
        backgroundColor: '#00a884',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    chatSendBtnText: {
        color: '#fff',
        fontSize: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#00a884',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    viewerRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    viewerName: {
        fontSize: 15,
        color: '#374151',
    },
    viewerEmpty: {
        fontSize: 14,
        color: '#6b7280',
        fontStyle: 'italic',
        marginTop: 5,
    },
});

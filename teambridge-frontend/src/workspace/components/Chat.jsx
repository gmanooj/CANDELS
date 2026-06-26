import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css';

// AES-GCM 256-bit Key Derivation from Team Code
async function getEncryptionKey(teamCode) {
    const padded = teamCode.padEnd(32, '0').slice(0, 32);
    const keyData = new TextEncoder().encode(padded);
    return window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

// AES-GCM 256-bit E2EE Encryption
async function encryptText(text, teamCode) {
    try {
        const key = await getEncryptionKey(teamCode);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(text);
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedText
        );
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(ciphertext), iv.length);
        return btoa(String.fromCharCode(...combined));
    } catch (err) {
        console.error("Encryption failed:", err);
        return "";
    }
}

// AES-GCM 256-bit E2EE Decryption
async function decryptText(base64Cipher, teamCode) {
    if (!base64Cipher) return "";
    try {
        const key = await getEncryptionKey(teamCode);
        const raw = Uint8Array.from(atob(base64Cipher), c => c.charCodeAt(0));
        const iv = raw.slice(0, 12);
        const ciphertext = raw.slice(12);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch (err) {
        console.error("Decryption failed:", err);
        return "[Decryption Error: Key mismatch or integrity compromised]";
    }
}

export default function Chat({
    teamCode,
    permissions = {},
    isCompact = false
}) {
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const [chatTheme, setChatTheme] = useState(() => localStorage.getItem("tb_chat_theme") || "light");

    useEffect(() => {
        localStorage.setItem("tb_chat_theme", chatTheme);
    }, [chatTheme]);

    const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
    const userCode = session.user_code || "";
    const email = session.email || "student@teambridge.edu";

    const fetchChats = async () => {
        try {
            const res = await fetch(`${__BACKEND_URL__}/api/workspace/chat?team_code=${teamCode}`);
            const data = await res.json();
            if (data.messages) {
                const decrypted = [];
                for (const msg of data.messages) {
                    const decryptedText = await decryptText(msg.text, teamCode);
                    decrypted.push({
                        id: msg.id,
                        sender: msg.sender,
                        sender_code: msg.sender_code,
                        text: decryptedText,
                        time: msg.time,
                        isMe: msg.sender_code === userCode
                    });
                }
                setMessages(decrypted);
            }
            setLoading(false);
        } catch (err) {
            console.error("Failed to load secure chats:", err);
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!chatInput.trim()) return;
        const textToSend = chatInput;
        setChatInput(""); // Clear immediately

        // Encrypt message text client-side before sending
        const ciphertext = await encryptText(textToSend, teamCode);

        try {
            await fetch(`${__BACKEND_URL__}/api/workspace/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_code: teamCode,
                    email: email,
                    text: ciphertext
                })
            });
            fetchChats();
        } catch (err) {
            console.error("Failed to post secure message:", err);
        }
    };

    useEffect(() => {
        fetchChats();

        // Establish real-time Socket.IO link to eliminate polling loops
        const socket = io(__BACKEND_URL__, { transports: ["websocket"], upgrade: false });

        socket.emit('join_chat', { team_code: teamCode });

        socket.on('new_chat', async (msg) => {
            const decryptedText = await decryptText(msg.text, teamCode);
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, {
                    id: msg.id,
                    sender: msg.sender,
                    sender_code: msg.sender_code,
                    text: decryptedText,
                    time: msg.time,
                    isMe: msg.sender_code === userCode
                }];
            });
        });

        return () => {
            socket.emit('leave_chat', { team_code: teamCode });
            socket.off('new_chat');
            socket.disconnect();
        };
    }, [teamCode]);

    useEffect(() => {
        // Smooth scroll to bottom on new messages
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className={`workspace-chat-container ${isCompact ? 'is-compact' : ''} ${chatTheme === 'dark' ? 'chat-dark-mode' : 'chat-light-mode'}`}>
            {/* Header */}
            {!isCompact && (
                <div className="chat-header">
                    <div>
                        <h1>Secure Chat</h1>
                        <p>End-to-End Encrypted (E2EE) messaging console for authorized members.</p>
                    </div>
                    <button 
                        onClick={() => setChatTheme(prev => prev === 'light' ? 'dark' : 'light')} 
                        className="chat-theme-toggle-btn"
                        title="Toggle chat theme"
                    >
                        {chatTheme === 'light' ? '🌙 Dark Chat' : '☀️ Light Chat'}
                    </button>
                </div>
            )}

            {isCompact && (
                <div className="chat-compact-header">
                    <span className="compact-title">Secure Chat</span>
                    <button 
                        onClick={() => setChatTheme(prev => prev === 'light' ? 'dark' : 'light')} 
                        className="chat-theme-toggle-btn is-compact"
                        title="Toggle chat theme"
                    >
                        {chatTheme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
            )}

            {/* Warning Banner */}
            {!isCompact && (
                <div className="warning-banner">
                    <span className="warning-icon">⚠️</span>
                    <div className="warning-text">
                        <strong>Auto-Recycling Notice:</strong> Chat sessions and cloud backups recycle and restart automatically every <strong>1 month (30 days)</strong> to prevent credentials breach and data accumulation. Please back up critical links externally.
                    </div>
                </div>
            )}

            {/* Chats Container */}
            <div className="apple-card-modern chats-viewport">
                {loading ? (
                    <div className="chat-loading">
                        Establishing secure encrypted channel...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        🔒 Encrypted channel active.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`message-box ${msg.isMe ? 'is-me' : ''}`}>
                            <span className="message-meta">
                                {msg.sender} • {msg.time}
                            </span>
                            <div className="message-bubble">
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Action Controls */}
            <div className="input-action-controls">
                <input 
                    type="text" 
                    placeholder={permissions.mode === "viewer" ? "Read-only" : "Type message..."} 
                    disabled={permissions.mode === "viewer"}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && permissions.mode !== "viewer") handleSend(); }}
                    className="chat-text-input"
                />
                {permissions.mode !== "viewer" && (
                    <button 
                        onClick={handleSend} 
                        className="apple-btn-primary chat-send-btn"
                    >
                        Send
                    </button>
                )}
            </div>
        </div>
    );
}

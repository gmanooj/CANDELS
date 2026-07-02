import React, { createContext, useContext, useState } from 'react';
import { API_CONFIG } from '../config/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [masterPassword, setMasterPassword] = useState(""); // Kept in memory to derive keys for offline sync
    const [loading, setLoading] = useState(false);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || "Login failed. Please check credentials.");
            }

            const data = await res.json();
            
            const userSession = {
                email,
                role: data.user?.role || 'Student',
                name: `${data.user?.first_name || ''} ${data.user?.last_name || ''}`.trim() || 'Developer',
            };
            
            setToken(data.token);
            setUser(userSession);
            setMasterPassword(password); // Cache password securely in memory for AES key generation
            return { success: true };
        } catch (error) {
            console.error("Login request failed:", error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setMasterPassword("");
    };

    return (
        <AuthContext.Provider value={{ user, token, masterPassword, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

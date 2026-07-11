import React, { createContext, useContext, useState } from 'react';
import { API_CONFIG } from '../config/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);

    const updateUser = (updates) => {
        if (user) {
            setUser({ ...user, ...updates });
        }
    };

    const login = async (email, password) => {
        console.log('[DEBUG] AuthContext login started. Email:', email);
        setLoading(true);
        const targetUrl = `${API_CONFIG.BACKEND_URL}/api/login`;
        console.log('[DEBUG] Fetch target URL:', targetUrl);
        try {
            const res = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            console.log('[DEBUG] Fetch response status:', res.status, 'ok:', res.ok);
            const data = await res.json();
            console.log('[DEBUG] Response data:', data);
            if (res.ok) {
                const dbUrl = `${API_CONFIG.BACKEND_URL}/api/users/dashboard-context?user_code=${data.user.user_code}`;
                console.log('[DEBUG] Fetching dashboard context from:', dbUrl);
                const dbRes = await fetch(dbUrl, {
                    headers: { 'Authorization': `Bearer ${data.token}` }
                });
                console.log('[DEBUG] Dashboard context response status:', dbRes.status);
                let activeTeamCode = "";
                let projects = [];
                if (dbRes.ok) {
                    const dbData = await dbRes.json();
                    console.log('[DEBUG] Dashboard context data:', dbData);
                    projects = dbData.projects || [];
                    if (projects.length > 0) {
                        activeTeamCode = projects[0].team_code;
                    }
                }
                setUser({ ...data.user, activeTeamCode, projects });
                setToken(data.token);
                setLoading(false);
                return { success: true };
            }
            setLoading(false);
            return { success: false, error: data.error || data.message || "Auth failed" };
        } catch (err) {
            console.error('[DEBUG] AuthContext login fetch caught exception:', err);
            setLoading(false);
            return { success: false, error: "Network error connecting to backend." };
        }
    };

    const loginWithGoogle = async (googleToken) => {
        console.log('[DEBUG] AuthContext Google login started.');
        setLoading(true);
        const targetUrl = `${API_CONFIG.BACKEND_URL}/api/login/google`;
        console.log('[DEBUG] Fetch target URL:', targetUrl);
        try {
            const res = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: googleToken })
            });
            console.log('[DEBUG] Fetch response status:', res.status, 'ok:', res.ok);
            const data = await res.json();
            console.log('[DEBUG] Response data:', data);
            if (res.ok) {
                const dbUrl = `${API_CONFIG.BACKEND_URL}/api/users/dashboard-context?user_code=${data.user.user_code}`;
                console.log('[DEBUG] Fetching dashboard context from:', dbUrl);
                const dbRes = await fetch(dbUrl, {
                    headers: { 'Authorization': `Bearer ${data.token}` }
                });
                console.log('[DEBUG] Dashboard context response status:', dbRes.status);
                let activeTeamCode = "";
                let projects = [];
                if (dbRes.ok) {
                    const dbData = await dbRes.json();
                    console.log('[DEBUG] Dashboard context data:', dbData);
                    projects = dbData.projects || [];
                    if (projects.length > 0) {
                        activeTeamCode = projects[0].team_code;
                    }
                }
                setUser({ ...data.user, activeTeamCode, projects });
                setToken(data.token);
                setLoading(false);
                return { success: true, user: data.user, token: data.token };
            }
            setLoading(false);
            return { success: false, error: data.error || data.message || "Google Auth failed" };
        } catch (err) {
            console.error('[DEBUG] AuthContext Google login fetch caught exception:', err);
            setLoading(false);
            return { success: false, error: "Network error connecting to backend." };
        }
    };

    const logout = () => { setUser(null); setToken(null); };

    const loginOffline = (email, teamCode, projectName) => {
        setUser({
            email: email,
            first_name: email.split('@')[0],
            last_name: 'Offline',
            role: 'Student',
            user_code: 'OFFLINE_USER',
            activeTeamCode: teamCode,
            projects: [
                {
                    project_name: projectName || 'Offline Project',
                    team_code: teamCode,
                    subject: 'Offline Staging',
                    members_count: 1
                }
            ]
        });
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, logout, updateUser, loginOffline, masterPassword: 'Manooj@12' }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
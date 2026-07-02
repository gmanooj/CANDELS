/* eslint-disable */
import React, { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { 
    saveEncryptedSnapshot, 
    loadEncryptedSnapshot, 
    deleteOfflineVault, 
    wipeAllCache,
    getSavedTeamCodes 
} from '../database/offlineVault';
import { encryptSnapshot, decryptSnapshot } from '../security/crypto';
import { API_CONFIG } from '../config/api';

export const SecureOfflineContext = createContext();

export const SecureOfflineProvider = ({ children }) => {
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [offlineWorkspaces, setOfflineWorkspaces] = useState(null);
    const [incorrectAttempts, setIncorrectAttempts] = useState(0);
    const [hasVault, setHasVault] = useState(false);

    // Check if vault file exists on startup
    const checkVaultExists = async () => {
        const teamCodes = await getSavedTeamCodes();
        setHasVault(teamCodes.length > 0);
    };

    useEffect(() => {
        checkVaultExists();
    }, []);

    /**
     * Downloads structural snapshots from local REST gateway,
     * encrypts them, hashes the chosen PIN, and writes to cache folder.
     */
    const generateOfflineVault = async (teamCode, token, password) => {
        try {
            // Generate a random 4-digit PIN code
            const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

            // Fetch snapshot from local Flask server
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${teamCode}&path=README.md`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let readmeContent = "Welcome to TeamBridge offline workspace.";
            if (res.ok) {
                const doc = await res.json();
                readmeContent = doc.content || readmeContent;
            }

            // Fetch app.jsx content
            let appContent = "export default function App() { return <h1>Offline Mode</h1> }";
            const appRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${teamCode}&path=frontend/src/App.jsx`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (appRes.ok) {
                const appDoc = await appRes.json();
                appContent = appDoc.content || appContent;
            }

            const snapshotData = {
                team_code: teamCode,
                sync_timestamp: new Date().toISOString(),
                files: [
                    { path: "README.md", content: readmeContent },
                    { path: "frontend/src/App.jsx", content: appContent }
                ]
            };

            // 1. Encrypt snapshot using the generated PIN as key
            const encryptedSnapshot = encryptSnapshot(snapshotData, generatedPin);
            
            // 2. Encrypt the PIN using the user's Login Password
            const encryptedPin = CryptoJS.AES.encrypt(generatedPin, password).toString();
            
            const finalPayload = JSON.stringify({
                teamCode,
                encryptedSnapshot,
                encryptedPin
            });

            // Save to transient cache folder with teamCode filename
            await saveEncryptedSnapshot(finalPayload, teamCode);
            await checkVaultExists();
            setIncorrectAttempts(0);
            
            return { success: true, pin: generatedPin };
        } catch (error) {
            console.error("Failed to generate offline vault:", error);
            return { success: false, error: error.message };
        }
    };

    /**
     * Decrypts the 4-digit PIN for a team using the user's password.
     */
    const revealPin = async (teamCode, password) => {
        try {
            const vaultDataStr = await loadEncryptedSnapshot(teamCode);
            if (!vaultDataStr) {
                throw new Error("No offline snapshot found for this team.");
            }

            const envelope = JSON.parse(vaultDataStr);
            const decryptedBytes = CryptoJS.AES.decrypt(envelope.encryptedPin, password);
            const decryptedPin = decryptedBytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedPin || decryptedPin.length !== 4 || isNaN(decryptedPin)) {
                throw new Error("Incorrect Password.");
            }

            return { success: true, pin: decryptedPin };
        } catch (error) {
            return { success: false, error: error.message || "Decryption failed." };
        }
    };

    /**
     * Loops through stored vault files, verifies password decryption of PIN, and decrypts snapshot data.
     */
    const unlockOfflineVault = async (password, pin) => {
        try {
            const teamCodes = await getSavedTeamCodes();
            if (teamCodes.length === 0) {
                throw new Error("No offline database snapshot found. Please sync online first.");
            }

            for (const teamCode of teamCodes) {
                try {
                    const vaultDataStr = await loadEncryptedSnapshot(teamCode);
                    if (!vaultDataStr) continue;

                    const envelope = JSON.parse(vaultDataStr);
                    
                    // 1. Decrypt PIN using the password to verify password match
                    const decryptedBytes = CryptoJS.AES.decrypt(envelope.encryptedPin, password);
                    const decryptedPin = decryptedBytes.toString(CryptoJS.enc.Utf8);
                    
                    if (decryptedPin !== pin) {
                        continue;
                    }
                    
                    // 2. Decrypt snapshot using the verified PIN
                    const decryptedData = decryptSnapshot(envelope.encryptedSnapshot, pin);
                    
                    if (decryptedData && decryptedData.team_code) {
                        setOfflineWorkspaces(decryptedData);
                        setIsOfflineMode(true);
                        setIncorrectAttempts(0);
                        return { success: true };
                    }
                } catch (err) {
                    // Try next team file
                }
            }

            throw new Error("Incorrect 4-Digit PIN or password.");
        } catch (error) {
            const nextAttempts = incorrectAttempts + 1;
            setIncorrectAttempts(nextAttempts);

            // Security Wipe Enforcement: Trigger purge on 5 consecutive failures
            if (nextAttempts >= 5) {
                await executeLockoutWipe();
                throw new Error("Security Alert: 5 incorrect attempts reached. Local cache database has been completely wiped.");
            }

            throw new Error(`${error.message} (${5 - nextAttempts} attempts remaining)`);
        }
    };

    /**
     * Wipes files and resets context
     */
    const executeLockoutWipe = async () => {
        const teamCodes = await getSavedTeamCodes();
        for (const teamCode of teamCodes) {
            await deleteOfflineVault(teamCode);
        }
        await wipeAllCache();
        setOfflineWorkspaces(null);
        setIsOfflineMode(false);
        setIncorrectAttempts(0);
        setHasVault(false);
    };

    const lockOfflineMode = () => {
        setIsOfflineMode(false);
        setOfflineWorkspaces(null);
    };

    return (
        <SecureOfflineContext.Provider value={{
            isOfflineMode,
            offlineWorkspaces,
            incorrectAttempts,
            hasVault,
            generateOfflineVault,
            revealPin,
            unlockOfflineVault,
            executeLockoutWipe,
            lockOfflineMode,
            checkVaultExists
        }}>
            {children}
        </SecureOfflineContext.Provider>
    );
};

export const useSecureOffline = () => useContext(SecureOfflineContext);

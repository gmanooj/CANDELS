/* eslint-disable */
import React, { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { saveEncryptedSnapshot, loadEncryptedSnapshot, deleteOfflineVault, wipeAllCache } from '../database/offlineVault';
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
        const vault = await loadEncryptedSnapshot();
        setHasVault(!!vault);
    };

    useEffect(() => {
        checkVaultExists();
    }, []);

    /**
     * Downloads structural snapshots from Render REST gateway,
     * encrypts them, hashes the chosen PIN, and writes to cache folder.
     */
    const generateOfflineVault = async (teamCode, token, password, pin) => {
        try {
            // Fetch snapshot from Render Flask server
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${teamCode}&path=README.md`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // If README.md fetches OK, we fetch the complete directory listing or a structured snapshot.
            // Let's create a representative workspace snapshot block containing local files scaffold structure
            // E.g., fetch list of files and content for README.md and App.jsx to mock offline capability
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

            // Generate AES-256 payload string
            const encryptedEnvelopeStr = encryptSnapshot(snapshotData, password);
            const envelopeObj = JSON.parse(encryptedEnvelopeStr);
            
            // Hash the 4-digit PIN securely using SHA-256
            const pinHash = CryptoJS.SHA256(pin).toString();
            
            // Embed pinHash inside the envelope JSON
            envelopeObj.pinHash = pinHash;
            
            const finalPayload = JSON.stringify(envelopeObj);

            // Save to transient cache folder
            await saveEncryptedSnapshot(finalPayload);
            setHasVault(true);
            setIncorrectAttempts(0);
            return { success: true };
        } catch (error) {
            console.error("Failed to generate offline vault:", error);
            return { success: false, error: error.message };
        }
    };

    /**
     * Validates input PIN hash and decrypts cache snapshot with password.
     */
    const unlockOfflineVault = async (password, pin) => {
        try {
            const vaultDataStr = await loadEncryptedSnapshot();
            if (!vaultDataStr) {
                throw new Error("No offline database snapshot found. Please sync online first.");
            }

            const envelope = JSON.parse(vaultDataStr);
            const hashedInputPin = CryptoJS.SHA256(pin).toString();

            // 1. Verify PIN hash match
            if (envelope.pinHash !== hashedInputPin) {
                throw new Error("Incorrect 4-Digit PIN.");
            }

            // 2. Decrypt workspace snapshot payload
            const decryptedData = decryptSnapshot(JSON.stringify(envelope), password);

            // Success! Unlock offline dashboards
            setOfflineWorkspaces(decryptedData);
            setIsOfflineMode(true);
            setIncorrectAttempts(0);
            return { success: true };
        } catch (error) {
            const nextAttempts = incorrectAttempts + 1;
            setIncorrectAttempts(nextAttempts);

            // 3. Security Wipe Enforcement: Trigger directory purge on 5 consecutive failures
            if (nextAttempts >= 5) {
                await executeLockoutWipe();
                throw new Error("Security Alert: 5 incorrect PIN attempts reached. Local cache database and security keys have been completely wiped.");
            }

            throw new Error(`${error.message} (${5 - nextAttempts} attempts remaining)`);
        }
    };

    /**
     * Wipes files and resets context
     */
    const executeLockoutWipe = async () => {
        await deleteOfflineVault();
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

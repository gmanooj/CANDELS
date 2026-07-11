import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveEncryptedSnapshot, loadEncryptedSnapshot, hardSelfDestructWipe } from '../database/offlineVault';
import { encryptSnapshot, decryptSnapshot } from '../security/crypto';

const SecureOfflineContext = createContext();

export function SecureOfflineProvider({ children }) {
    const [hasVault, setHasVault] = useState(false);
    const [offlineWorkspaces, setOfflineWorkspaces] = useState(null);
    const [incorrectAttempts, setIncorrectAttempts] = useState(0);

    const checkVaultExists = async () => {
        const raw = await loadEncryptedSnapshot();
        setHasVault(!!raw);
    };

    useEffect(() => { checkVaultExists(); }, []);

    const generateOfflineVault = async (teamCode, pinCode, masterPassword) => {
        try {
            // STEP 1: Simulate pulling the repository snapshot dictionary from workspace controller route
            const mockWorkspacePayload = {
                team_code: teamCode,
                sync_timestamp: Date.now(),
                files: [
                    { path: 'README.md', content: '# Presentation\n---\n## Workspace Active\n- Minimalist Design\n- 5-Strike Policy\n---\n## Features\n- AES-256 PBKDF2 Enabled' },
                    { path: 'main.py', content: 'print("Hello TeamBridge Dev Ops")' }
                ]
            };

            // Package metadata envelope along with the structural payload
            const secureEnvelope = {
                payload: mockWorkspacePayload,
                pinHash: pinCode // For production use a SHA256 string check
            };

            const encryptedString = encryptSnapshot(secureEnvelope, masterPassword);

            // STEP 2: STICK TO THE RULE - Commit to cache FIRST before showing the access token!
            await saveEncryptedSnapshot(encryptedString);
            await checkVaultExists();

            // STEP 3: Return success to unlock showing the final hidden one-time view key code
            const randomCode = `CANDELS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            return { success: true, accessCode: randomCode };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const unlockOfflineVault = async (masterPassword, enteredPin) => {
        const rawEnvelope = await loadEncryptedSnapshot();
        if (!rawEnvelope) throw new Error("No offline database found.");

        try {
            const envelope = decryptSnapshot(rawEnvelope, masterPassword);
            if (envelope.pinHash !== enteredPin) {
                const structuralFailCount = incorrectAttempts + 1;
                setIncorrectAttempts(structuralFailCount);
                if (structuralFailCount >= 5) {
                    await hardSelfDestructWipe();
                    setHasVault(false);
                    setOfflineWorkspaces(null);
                    setIncorrectAttempts(0);
                    throw new Error("Wiped! 5 failed attempts completely wiped all cached security instances.");
                }
                throw new Error(`Invalid access PIN. Attempt ${structuralFailCount}/5.`);
            }
            setOfflineWorkspaces(envelope.payload);
            setIncorrectAttempts(0);
            return { success: true };
        } catch (err) {
            if (err.message.includes("Wiped")) throw err;
            throw new Error("Decryption failed. Invalid Master credentials or bad PIN formatting.");
        }
    };

    const lockOfflineMode = () => setOfflineWorkspaces(null);

    return (
        <SecureOfflineContext.Provider value={{ hasVault, offlineWorkspaces, incorrectAttempts, generateOfflineVault, unlockOfflineVault, lockOfflineMode, checkVaultExists }}>
            {children}
        </SecureOfflineContext.Provider>
    );
}

export const useSecureOffline = () => useContext(SecureOfflineContext);
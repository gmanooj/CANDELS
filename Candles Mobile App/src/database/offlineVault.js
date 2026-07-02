/* eslint-disable */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const VAULT_FILE_NAME_PREFIX = 'workspace_vault_';

const getVaultFilename = (teamCode = 'default') => {
    return `${VAULT_FILE_NAME_PREFIX}${teamCode}.enc`;
};

/**
 * Saves the encrypted snapshot string to the transient App Cache folder or localStorage on Web.
 */
export const saveEncryptedSnapshot = async (encryptedDataString, teamCode = 'default') => {
    const filename = getVaultFilename(teamCode);
    if (Platform.OS === 'web') {
        try {
            window.localStorage.setItem(filename, encryptedDataString);
        } catch (error) {
            console.error("localStorage write failed:", error);
        }
        return;
    }
    try {
        const cacheDir = FileSystem.cacheDirectory || '';
        const vaultPath = `${cacheDir}${filename}`;
        await FileSystem.writeAsStringAsync(vaultPath, encryptedDataString, {
            encoding: FileSystem.EncodingType.UTF8
        });
    } catch (error) {
        console.error("Failed to write to offline vault:", error);
        throw error;
    }
};

/**
 * Loads the encrypted snapshot string from the transient App Cache folder or localStorage on Web.
 */
export const loadEncryptedSnapshot = async (teamCode = 'default') => {
    const filename = getVaultFilename(teamCode);
    if (Platform.OS === 'web') {
        try {
            return window.localStorage.getItem(filename);
        } catch (error) {
            console.error("localStorage read failed:", error);
            return null;
        }
    }
    try {
        const cacheDir = FileSystem.cacheDirectory || '';
        const vaultPath = `${cacheDir}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(vaultPath);
        if (!fileInfo.exists) {
            return null;
        }
        return await FileSystem.readAsStringAsync(vaultPath, {
            encoding: FileSystem.EncodingType.UTF8
        });
    } catch (error) {
        console.error("Failed to read from offline vault:", error);
        return null;
    }
};

/**
 * Deletes the encrypted snapshot file or localStorage item on Web.
 */
export const deleteOfflineVault = async (teamCode = 'default') => {
    const filename = getVaultFilename(teamCode);
    if (Platform.OS === 'web') {
        try {
            window.localStorage.removeItem(filename);
        } catch (error) {
            console.error("localStorage delete failed:", error);
        }
        return;
    }
    try {
        const cacheDir = FileSystem.cacheDirectory || '';
        const vaultPath = `${cacheDir}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(vaultPath);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(vaultPath, { idempotent: true });
        }
    } catch (error) {
        console.error("Failed to delete offline vault file:", error);
    }
};

/**
 * Lists all team codes stored on the device.
 */
export const getSavedTeamCodes = async () => {
    if (Platform.OS === 'web') {
        try {
            const keys = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key && key.startsWith(VAULT_FILE_NAME_PREFIX) && key.endsWith('.enc')) {
                    const teamCode = key.replace(VAULT_FILE_NAME_PREFIX, '').replace('.enc', '');
                    keys.push(teamCode);
                }
            }
            return keys;
        } catch (error) {
            console.error("localStorage get keys failed:", error);
            return [];
        }
    }
    try {
        const cacheDir = FileSystem.cacheDirectory || '';
        if (!cacheDir) return [];
        const files = await FileSystem.readDirectoryAsync(cacheDir);
        const keys = [];
        for (const file of files) {
            if (file.startsWith(VAULT_FILE_NAME_PREFIX) && file.endsWith('.enc')) {
                const teamCode = file.replace(VAULT_FILE_NAME_PREFIX, '').replace('.enc', '');
                keys.push(teamCode);
            }
        }
        return keys;
    } catch (error) {
        console.error("Failed to read directory keys:", error);
        return [];
    }
};

/**
 * Wipes the entire transient app cache directory or clear vault on Web.
 */
export const wipeAllCache = async () => {
    if (Platform.OS === 'web') {
        try {
            const teamCodes = await getSavedTeamCodes();
            for (const teamCode of teamCodes) {
                window.localStorage.removeItem(getVaultFilename(teamCode));
            }
        } catch (error) {
            console.error("localStorage wipe failed:", error);
        }
        return;
    }
    try {
        const cacheDir = FileSystem.cacheDirectory || '';
        if (!cacheDir) return;
        
        const dirContents = await FileSystem.readDirectoryAsync(cacheDir);
        for (const item of dirContents) {
            const itemPath = `${cacheDir}${item}`;
            await FileSystem.deleteAsync(itemPath, { idempotent: true });
        }
        console.log("Transient App Cache has been completely wiped.");
    } catch (error) {
        console.error("Wipe operation failed:", error);
        throw error;
    }
};
/* eslint-disable */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const VAULT_FILE_NAME = 'workspace_vault.enc';
const cacheDir = FileSystem.cacheDirectory || '';
const vaultPath = `${cacheDir}${VAULT_FILE_NAME}`;

/**
 * Saves the encrypted snapshot string to the transient App Cache folder or localStorage on Web.
 */
export const saveEncryptedSnapshot = async (encryptedDataString) => {
    if (Platform.OS === 'web') {
        try {
            window.localStorage.setItem(VAULT_FILE_NAME, encryptedDataString);
        } catch (error) {
            console.error("localStorage write failed:", error);
        }
        return;
    }
    try {
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
export const loadEncryptedSnapshot = async () => {
    if (Platform.OS === 'web') {
        try {
            return window.localStorage.getItem(VAULT_FILE_NAME);
        } catch (error) {
            console.error("localStorage read failed:", error);
            return null;
        }
    }
    try {
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
export const deleteOfflineVault = async () => {
    if (Platform.OS === 'web') {
        try {
            window.localStorage.removeItem(VAULT_FILE_NAME);
        } catch (error) {
            console.error("localStorage delete failed:", error);
        }
        return;
    }
    try {
        const fileInfo = await FileSystem.getInfoAsync(vaultPath);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(vaultPath, { idempotent: true });
        }
    } catch (error) {
        console.error("Failed to delete offline vault file:", error);
    }
};

/**
 * Wipes the entire transient app cache directory or clear vault on Web.
 */
export const wipeAllCache = async () => {
    if (Platform.OS === 'web') {
        try {
            window.localStorage.removeItem(VAULT_FILE_NAME);
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
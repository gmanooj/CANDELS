/* eslint-disable */
import * as FileSystem from 'expo-file-system';

const VAULT_FILE_NAME = 'workspace_vault.enc';
const cacheDir = FileSystem.cacheDirectory || '';
const vaultPath = `${cacheDir}${VAULT_FILE_NAME}`;

/**
 * Saves the encrypted snapshot string to the transient App Cache folder.
 * @param {string} encryptedDataString - The encrypted payload containing ciphertext, salt, and iv
 * @returns {Promise<void>}
 */
export const saveEncryptedSnapshot = async (encryptedDataString) => {
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
 * Loads the encrypted snapshot string from the transient App Cache folder.
 * @returns {Promise<string|null>} The encrypted payload, or null if it doesn't exist
 */
export const loadEncryptedSnapshot = async () => {
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
 * Deletes the encrypted snapshot file.
 * @returns {Promise<void>}
 */
export const deleteOfflineVault = async () => {
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
 * Wipes the entire transient app cache directory.
 * Erases all files, folders, and cryptographic keys stored therein.
 * @returns {Promise<void>}
 */
export const wipeAllCache = async () => {
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

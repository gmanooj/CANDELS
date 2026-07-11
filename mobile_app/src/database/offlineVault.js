import * as FileSystem from 'expo-file-system/legacy';

const VAULT_FILE_NAME = 'workspace_vault.enc';
const cacheDir = FileSystem.cacheDirectory || '';
const vaultPath = cacheDir.endsWith('/') ? `${cacheDir}${VAULT_FILE_NAME}` : `${cacheDir}/${VAULT_FILE_NAME}`;

export const saveEncryptedSnapshot = async (encryptedDataString) => {
    await FileSystem.writeAsStringAsync(vaultPath, encryptedDataString, { encoding: FileSystem.EncodingType.UTF8 });
};

export const loadEncryptedSnapshot = async () => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(vaultPath);
        if (!fileInfo.exists) return null;
        return await FileSystem.readAsStringAsync(vaultPath, { encoding: FileSystem.EncodingType.UTF8 });
    } catch (error) {
        return null;
    }
};

export const hardSelfDestructWipe = async () => {
    try {
        if (!cacheDir) return;
        const dirContents = await FileSystem.readDirectoryAsync(cacheDir);
        for (const item of dirContents) {
            await FileSystem.deleteAsync(`${cacheDir}${item}`, { idempotent: true });
        }
        console.log("💥 Snapshot completely wiped due to lockout policy enforcement.");
    } catch (error) {
        console.error("Self-destruct failed:", error);
    }
};
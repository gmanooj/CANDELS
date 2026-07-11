import CryptoJS from 'crypto-js';

const generateRandomBytes = (size) => {
    const words = [];
    for (let i = 0; i < size; i += 4) {
        words.push((Math.random() * 0x100000000) | 0);
    }
    return CryptoJS.lib.WordArray.create(words, size);
};

export const deriveKey = (password, saltHex) => {
    const salt = CryptoJS.enc.Hex.parse(saltHex);
    return CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
};

export const encryptSnapshot = (jsonData, password) => {
    try {
        const plainText = JSON.stringify(jsonData);
        const salt = generateRandomBytes(16);
        const iv = generateRandomBytes(16);
        
        const key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
        const encrypted = CryptoJS.AES.encrypt(plainText, key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        });
        
        return JSON.stringify({
            ciphertext: encrypted.toString(),
            salt: CryptoJS.enc.Hex.stringify(salt),
            iv: CryptoJS.enc.Hex.stringify(iv)
        });
    } catch (error) {
        console.error("Encryption failed:", error);
        throw error;
    }
};

export const decryptSnapshot = (payloadString, password) => {
    try {
        const { ciphertext, salt, iv } = JSON.parse(payloadString);
        const key = deriveKey(password, salt);
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
            iv: CryptoJS.enc.Hex.parse(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        });
        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedText) throw new Error("Incorrect credentials or corrupted payload.");
        return JSON.parse(decryptedText);
    } catch (error) {
        console.error("Decryption failed:", error);
        throw error;
    }
};
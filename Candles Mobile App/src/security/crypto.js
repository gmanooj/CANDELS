import CryptoJS from 'crypto-js';

/**
 * Derives a 256-bit key from a password and a salt using PBKDF2.
 * @param {string} password - User master password
 * @param {string} saltHex - Hex-encoded salt
 * @returns {CryptoJS.lib.WordArray} Derived key
 */
export const deriveKey = (password, saltHex) => {
    const salt = CryptoJS.enc.Hex.parse(saltHex);
    return CryptoJS.PBKDF2(password, salt, {
        keySize: 8, // 8 words = 256 bits
        iterations: 1000
    });
};

/**
 * Encrypts a JSON object with a password using AES-256 and PBKDF2 key derivation.
 * @param {object} jsonData - Plain JSON object to encrypt
 * @param {string} password - Decryption master password
 * @returns {string} JSON string containing ciphertext, salt, and iv
 */
export const encryptSnapshot = (jsonData, password) => {
    try {
        const plainText = JSON.stringify(jsonData);
        
        // Generate random 128-bit salt and IV
        const salt = CryptoJS.lib.WordArray.random(16);
        const iv = CryptoJS.lib.WordArray.random(16);
        
        const saltHex = CryptoJS.enc.Hex.stringify(salt);
        const ivHex = CryptoJS.enc.Hex.stringify(iv);
        
        // Derive key from salt and password
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: 8,
            iterations: 1000
        });
        
        const encrypted = CryptoJS.AES.encrypt(plainText, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        const ciphertext = encrypted.toString();
        
        return JSON.stringify({
            ciphertext,
            salt: saltHex,
            iv: ivHex
        });
    } catch (error) {
        console.error("Encryption process failed:", error);
        throw error;
    }
};

/**
 * Decrypts an encrypted JSON payload string.
 * @param {string} payloadString - Stringified envelope containing ciphertext, salt, and iv
 * @param {string} password - User master password
 * @returns {object} Decrypted JSON object
 */
export const decryptSnapshot = (payloadString, password) => {
    try {
        const { ciphertext, salt, iv } = JSON.parse(payloadString);
        
        const key = deriveKey(password, salt);
        const ivWords = CryptoJS.enc.Hex.parse(iv);
        
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
            iv: ivWords,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedText) {
            throw new Error("Decryption failed. Incorrect credentials or corrupted payload.");
        }
        
        return JSON.parse(decryptedText);
    } catch (error) {
        console.error("Decryption process failed:", error);
        throw error;
    }
};

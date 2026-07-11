import forge from 'node-forge';

/**
 * Decrypts AES-GCM 256-bit ciphertext encrypted by Web Crypto API.
 * Web Crypto formats output as: IV (12 bytes) + Ciphertext + Auth Tag (16 bytes).
 */
export function decryptChatText(base64Cipher, teamCode) {
    if (!base64Cipher) return "";
    try {
        const padded = teamCode.padEnd(32, '0').slice(0, 32);
        
        // Decode base64
        const binaryString = forge.util.decode64(base64Cipher);
        
        // Extract IV (first 12 bytes)
        const ivBytes = binaryString.slice(0, 12);
        // Extract ciphertext + tag (remaining bytes)
        const cipherAndTag = binaryString.slice(12);
        
        // Web Crypto appends a 16-byte auth tag at the end
        const cipherBytes = cipherAndTag.slice(0, cipherAndTag.length - 16);
        const tagBytes = cipherAndTag.slice(cipherAndTag.length - 16);
        
        // Create decipher
        const decipher = forge.cipher.createDecipher('AES-GCM', padded);
        decipher.start({
            iv: ivBytes,
            tagLength: 128, // 16 bytes = 128 bits
            tag: forge.util.createBuffer(tagBytes)
        });
        decipher.update(forge.util.createBuffer(cipherBytes));
        const pass = decipher.finish();
        
        if (pass) {
            return decipher.output.toString('utf8');
        } else {
            return "[Decryption Error: Authentication failed]";
        }
    } catch (err) {
        console.error("GCM Decryption failed:", err);
        return "[Decryption Error: Key mismatch or integrity compromised]";
    }
}

/**
 * Encrypts plaintext using AES-GCM 256-bit to match Web Crypto API specs.
 * Encrypted format: IV (12 bytes) + Ciphertext + Auth Tag (16 bytes).
 */
export function encryptChatText(text, teamCode) {
    try {
        const padded = teamCode.padEnd(32, '0').slice(0, 32);
        const ivBytes = forge.random.getBytesSync(12);
        
        const cipher = forge.cipher.createCipher('AES-GCM', padded);
        cipher.start({
            iv: ivBytes,
            tagLength: 128
        });
        cipher.update(forge.util.createBuffer(text, 'utf8'));
        cipher.finish();
        
        const ciphertext = cipher.output.getBytes();
        const tag = cipher.mode.tag.getBytes();
        
        // Combine iv + ciphertext + tag
        const combined = ivBytes + ciphertext + tag;
        return forge.util.encode64(combined);
    } catch (err) {
        console.error("Encryption failed:", err);
        return "";
    }
}

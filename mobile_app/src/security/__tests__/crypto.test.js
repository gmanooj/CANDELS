import { encryptSnapshot, decryptSnapshot, deriveKey } from '../crypto';

describe('Crypto module unit tests', () => {
    const testData = { foo: 'bar', age: 42 };
    const password = 'SecretPassword123!';

    test('should encrypt and decrypt snapshot successfully', () => {
        const encrypted = encryptSnapshot(testData, password);
        expect(encrypted).toBeDefined();
        
        const decrypted = decryptSnapshot(encrypted, password);
        expect(decrypted).toEqual(testData);
    });

    test('should fail decrypting with wrong password', () => {
        const encrypted = encryptSnapshot(testData, password);
        expect(() => {
            decryptSnapshot(encrypted, 'WrongPassword');
        }).toThrow();
    });

    test('should derive consistent keys', () => {
        const saltHex = 'a1b2c3d4e5f6';
        const key1 = deriveKey(password, saltHex);
        const key2 = deriveKey(password, saltHex);
        expect(key1.toString()).toEqual(key2.toString());
    });
});

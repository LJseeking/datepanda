import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
    const hex = process.env.CONTACT_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error("[ContactCrypto] CONTACT_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).");
    }
    return Buffer.from(hex, "hex");
}

/**
 * Encrypt a WeChat ID.
 * Output format: iv:authTag:ciphertext (all hex)
 */
export function encryptWechat(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a WeChat ID from the stored format.
 */
export function decryptWechat(stored: string): string {
    const key = getKey();
    const parts = stored.split(":");
    if (parts.length !== 3) throw new Error("[ContactCrypto] Invalid encrypted format.");

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

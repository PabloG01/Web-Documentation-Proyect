const crypto = require('crypto');

// Encryption key from environment or default (should be same as in other files)
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-key-change-this';

function encryptToken(token) {
    if (!token) return null;
    try {
        const iv = crypto.randomBytes(16);
        // Use padEnd to ensure key length if needed, though scryptSync handles it. 
        // Following existing pattern from bitbucket-auth.js which was slightly different 
        // than repos.js/github-auth.js.
        // repos.js/github-auth.js use: scryptSync(ENCRYPTION_KEY, 'salt', 32)
        // bitbucket-auth.js used: scryptSync(ENCRYPTION_KEY.padEnd(32).slice(0, 32), 'salt', 32) ? NO, it used Buffer.from(ENCRYPTION_KEY...)
        // Let's standardise on the robust scryptSync method used in repos.js and github-auth.js
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
        console.error('Token encryption error:', err.message);
        return null;
    }
}

function decryptToken(encryptedToken) {
    if (!encryptedToken) return null;
    try {
        const [ivHex, encrypted] = encryptedToken.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Token decryption error:', err.message);
        return null;
    }
}

module.exports = {
    encryptToken,
    decryptToken
};

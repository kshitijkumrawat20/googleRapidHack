import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'memoria-ai-default-super-secret-key-32-chars-!!';

// Salt size and iterations for PBKDF2
const SALT_SIZE = 16;
const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_SIZE).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored PBKDF2 salt + hash
 */
export function verifyPassword(password: string, combined: string): boolean {
  try {
    const [salt, originalHash] = combined.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
    return hash === originalHash;
  } catch {
    return false;
  }
}

/**
 * Sign a session payload returning a stateless token
 */
export function signSession(payload: any): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64');
  return `${data}.${signature}`;
}

/**
 * Verify a stateless session token and return the payload if valid
 */
export function verifySession(token: string): any | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64');
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Encrypt a text string using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  // Derive a 32-byte key from our session secret
  const key = crypto.scryptSync(SESSION_SECRET, 'memoria-salt-vector', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-CBC encrypted string
 */
export function decrypt(combined: string): string {
  if (!combined) return '';
  try {
    const [ivHex, encryptedText] = combined.split(':');
    if (!ivHex || !encryptedText) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(SESSION_SECRET, 'memoria-salt-vector', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt connection URI:', (err as Error).message);
    return '';
  }
}

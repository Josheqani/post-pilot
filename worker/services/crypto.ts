/**
 * Crypto utility for encrypting/decrypting sensitive credentials (API keys, OAuth tokens)
 * using Web Crypto AES-GCM 256-bit encryption.
 */

const DEV_KEY = 'postpilot-dev-encryption-key-32b!';

async function getKey(rawKey?: string): Promise<CryptoKey> {
  const secret = rawKey || DEV_KEY;
  // Hash to 256 bits (32 bytes)
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secret));

  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypts a plaintext secret into a base64 encoded string prefixed with `enc:`.
 */
export async function encryptSecret(plaintext: string, keySecret?: string): Promise<string> {
  if (!plaintext) return '';
  const key = await getKey(keySecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Convert to base64
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]!);
  }
  return `enc:${btoa(binary)}`;
}

/**
 * Decrypts a base64 encoded string (prefixed with `enc:`) back to plaintext.
 * If the string does not have the `enc:` prefix (e.g. legacy or unencrypted during migration),
 * it returns the plaintext directly.
 */
export async function decryptSecret(ciphertext: string, keySecret?: string): Promise<string> {
  if (!ciphertext) return '';
  if (!ciphertext.startsWith('enc:')) {
    return ciphertext; // plain text fallback
  }

  try {
    const rawB64 = ciphertext.slice(4);
    const binary = atob(rawB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);
    const key = await getKey(keySecret);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Failed to decrypt secret:', err);
    throw new Error('Failed to decrypt secret with current encryption key', { cause: err });
  }
}

/**
 * Masks a secret string for safe display in the UI (e.g. "sk-...3a9f").
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  const clean = secret.startsWith('enc:') ? '[Encrypted]' : secret;
  if (clean.length <= 8) return '••••••••';
  const prefix = clean.slice(0, 3);
  const suffix = clean.slice(-4);
  return `${prefix}...${suffix}`;
}

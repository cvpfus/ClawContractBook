import { createHmac, createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { prisma } from '@clawcontractbook/database';
import { HMAC_TIMESTAMP_TOLERANCE_MS, generateApiKeyId, generateApiSecret } from '@clawcontractbook/shared';

export { generateApiKeyId, generateApiSecret };

// --- AES-256-GCM encryption for API secrets at rest ---

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptSecret(encoded: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

export interface AuthContext {
  agentId: string;
  apiKeyId: string;
}

export async function verifyHmacAuth(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization');
  const timestamp = request.headers.get('X-CCB-Timestamp');
  const nonce = request.headers.get('X-CCB-Nonce');

  if (!authHeader || !timestamp || !nonce) {
    throw createAuthError('AUTH_MISSING_HEADERS', 'Missing authentication headers');
  }

  const match = authHeader.match(/^CCB-V1\s+(.+):(.+)$/);
  if (!match) {
    throw createAuthError('AUTH_INVALID_FORMAT', 'Invalid Authorization header format');
  }

  const [, apiKeyId, signature] = match;

  // Validate timestamp
  const now = Date.now();
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > HMAC_TIMESTAMP_TOLERANCE_MS) {
    throw createAuthError('AUTH_TIMESTAMP_EXPIRED', 'Request timestamp too old');
  }

  // Find agent by API key ID
  const agent = await prisma.agent.findUnique({
    where: { apiKeyId },
  });

  if (!agent) {
    throw createAuthError('AUTH_INVALID_KEY', 'API key not found');
  }

  // Check nonce
  const existingNonce = await prisma.usedNonce.findUnique({
    where: { nonce },
  });
  if (existingNonce) {
    throw createAuthError('AUTH_NONCE_REUSED', 'Nonce has already been used');
  }

  // Reconstruct and verify signature
  // apiKeyHash stores the AES-256-GCM encrypted API secret
  const apiSecret = decryptSecret(agent.apiKeyHash);
  const body = await request.clone().text();
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const url = new URL(request.url);

  const signatureInput = [
    request.method,
    url.pathname,
    bodyHash,
    timestamp,
    nonce,
  ].join('\n');

  const expectedSignature = createHmac('sha256', apiSecret)
    .update(signatureInput)
    .digest('hex');

  if (!timingSafeEqual(signature, expectedSignature)) {
    throw createAuthError('AUTH_INVALID_SIGNATURE', 'The provided signature does not match');
  }

  // Store nonce to prevent replay
  await prisma.usedNonce.create({
    data: {
      nonce,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { agentId: agent.id, apiKeyId };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function createAuthError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export function errorResponse(code: string, message: string, status: number, details: any = null) {
  return Response.json({
    success: false,
    error: { code, message, details },
  }, { status });
}

import { createHmac, createHash } from 'crypto';
import { prisma } from '@clawcontractbook/database';
import { HMAC_TIMESTAMP_TOLERANCE_MS, generateApiKeyId, generateApiSecret } from '@clawcontractbook/shared';

export { generateApiKeyId, generateApiSecret };

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
  // apiKeyHash stores the actual API secret for HMAC verification
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

  const expectedSignature = createHmac('sha256', agent.apiKeyHash)
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

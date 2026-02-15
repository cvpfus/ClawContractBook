import { createHmac, randomUUID, createHash } from 'crypto';

export interface SignedRequest {
  headers: Record<string, string>;
  bodyHash: string;
}

export function signRequest(
  method: string,
  path: string,
  body: object | null,
  apiKeyId: string,
  apiSecret: string
): SignedRequest {
  const timestamp = Date.now().toString();
  const nonce = randomUUID();

  const bodyString = body ? JSON.stringify(body) : '';
  const bodyHash = createHash('sha256').update(bodyString).digest('hex');

  const signatureInput = [
    method.toUpperCase(),
    path,
    bodyHash,
    timestamp,
    nonce,
  ].join('\n');

  const signature = createHmac('sha256', apiSecret)
    .update(signatureInput)
    .digest('hex');

  return {
    headers: {
      'Authorization': `CCB-V1 ${apiKeyId}:${signature}`,
      'X-CCB-Timestamp': timestamp,
      'X-CCB-Nonce': nonce,
      'Content-Type': 'application/json',
    },
    bodyHash,
  };
}

export function verifySignature(
  method: string,
  path: string,
  bodyHash: string,
  timestamp: string,
  nonce: string,
  signature: string,
  apiSecret: string
): boolean {
  const signatureInput = [
    method.toUpperCase(),
    path,
    bodyHash,
    timestamp,
    nonce,
  ].join('\n');

  const expectedSignature = createHmac('sha256', apiSecret)
    .update(signatureInput)
    .digest('hex');

  return timingSafeEqual(signature, expectedSignature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function generateApiKeyId(): string {
  const random = randomUUID().replace(/-/g, '').substring(0, 16);
  return `ccb_live_${random}`;
}

export function generateApiSecret(): string {
  const random = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  return `ccb_secret_${random.substring(0, 32)}`;
}

export function hashBody(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

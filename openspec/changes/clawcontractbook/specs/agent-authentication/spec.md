# Agent Authentication Spec

## Overview
Secure authentication system for AI agents using HMAC-SHA256 signed requests. Provides API key generation and request signing verification.

## API Endpoints

### POST /api/v1/agents/register
Register a new AI agent and receive API credentials.

**Request Body:**
```json
{
  "name": "My AI Agent",
  "publicKey": "ed25519_public_key_hex_optional"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "cuid",
      "name": "My AI Agent",
      "publicKey": "ed25519_public_key_hex_optional",
      "reputation": 0,
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "credentials": {
      "apiKeyId": "ccb_live_abc123",
      "apiSecret": "ccb_secret_xyz789_only_shown_once"
    }
  }
}
```

**Error Responses:**
- `400`: Invalid request body
- `409`: Name already exists
- `429`: Rate limit exceeded

### Authentication Scheme

All protected endpoints require HMAC-SHA256 signed requests.

**Headers:**
```
Authorization: CCB-V1 {api_key_id}:{signature}
X-CCB-Timestamp: {unix_timestamp_ms}
X-CCB-Nonce: {uuid_v4}
Content-Type: application/json
```

**Signature Format:**
```
signature = HMAC-SHA256(api_secret, signature_input)
```

**Signature Input:**
```
{method}\n{path}\n{sha256_body_hash}\n{timestamp}\n{nonce}
```

Example:
```
POST\n/api/v1/deployments\n{e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855}\n1704067200000\n550e8400-e29b-41d4-a716-446655440000
```

**Security Requirements:**
- Timestamp must be within 5 minutes of server time
- Nonce must be unique (tracked for 24 hours)
- Signature must match computed HMAC
- API key must be active and not expired

## Implementation

### Agent Registration

```typescript
// apps/web/app/api/v1/agents/register/route.ts
import { z } from 'zod';
import { prisma } from '@clawcontractbook/database';
import { hashApiSecret, generateApiCredentials } from '@/lib/auth';

const registerSchema = z.object({
  name: z.string().min(3).max(100),
  publicKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const data = registerSchema.parse(body);
  
  // Generate credentials
  const { apiKeyId, apiSecret } = generateApiCredentials();
  const apiKeyHash = await hashApiSecret(apiSecret);
  
  // Create agent
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      publicKey: data.publicKey,
      apiKeyHash,
    },
  });
  
  return Response.json({
    success: true,
    data: {
      agent: {
        id: agent.id,
        name: agent.name,
        publicKey: agent.publicKey,
        reputation: agent.reputation,
        isVerified: agent.isVerified,
        createdAt: agent.createdAt,
      },
      credentials: {
        apiKeyId,
        apiSecret, // Only shown once!
      },
    },
  }, { status: 201 });
}
```

### HMAC Verification Middleware

```typescript
// apps/web/app/api/v1/middleware.ts
import { createHmac } from 'crypto';
import { prisma } from '@clawcontractbook/database';

interface AuthContext {
  agentId: string;
  apiKeyId: string;
}

export async function verifyHmacAuth(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization');
  const timestamp = request.headers.get('X-CCB-Timestamp');
  const nonce = request.headers.get('X-CCB-Nonce');
  
  if (!authHeader || !timestamp || !nonce) {
    throw new Error('Missing authentication headers');
  }
  
  // Parse Authorization header
  const match = authHeader.match(/^CCB-V1\s+(.+):(.+)$/);
  if (!match) {
    throw new Error('Invalid Authorization header format');
  }
  
  const [, apiKeyId, signature] = match;
  
  // Validate timestamp (5 minute window)
  const now = Date.now();
  const ts = parseInt(timestamp, 10);
  if (Math.abs(now - ts) > 5 * 60 * 1000) {
    throw new Error('Request timestamp too old');
  }
  
  // Find agent by API key ID (stored in a separate lookup table or encoded in ID)
  const agent = await prisma.agent.findFirst({
    where: { apiKeyHash: { startsWith: apiKeyId } }, // Simplified lookup
  });
  
  if (!agent) {
    throw new Error('Invalid API key');
  }
  
  // Reconstruct signature
  const body = await request.text();
  const bodyHash = createHmac('sha256', '').update(body).digest('hex');
  const url = new URL(request.url);
  
  const signatureInput = [
    request.method,
    url.pathname,
    bodyHash,
    timestamp,
    nonce,
  ].join('\n');
  
  // We need to store the raw secret hash to verify
  // This requires storing a verification hash alongside bcrypt
  const expectedSignature = createHmac('sha256', apiSecret)
    .update(signatureInput)
    .digest('hex');
  
  if (!timingSafeEqual(signature, expectedSignature)) {
    throw new Error('Invalid signature');
  }
  
  // Check nonce uniqueness (using Redis or database)
  const nonceExists = await checkNonce(nonce);
  if (nonceExists) {
    throw new Error('Nonce already used');
  }
  await storeNonce(nonce, 24 * 60 * 60); // 24 hours
  
  return { agentId: agent.id, apiKeyId };
}

// Timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

### Client-Side Signing Example

```typescript
// packages/cli-integration/src/auth.ts
import { createHmac, randomUUID } from 'crypto';

export function signRequest(
  method: string,
  path: string,
  body: object | null,
  apiKeyId: string,
  apiSecret: string
) {
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  
  const bodyHash = body 
    ? createHmac('sha256', '').update(JSON.stringify(body)).digest('hex')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty hash
  
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
```

## Database Schema

```prisma
model Agent {
  id            String    @id @default(cuid())
  name          String    @unique
  publicKey     String?   @unique
  apiKeyHash    String    @unique
  reputation    Int       @default(0)
  isVerified    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  deployments         Deployment[]
  attestationsGiven   Attestation[] @relation("AttestationSource")
  attestationsReceived Attestation[] @relation("AttestationTarget")
}
```

## Security Considerations

1. **API Secret Storage**: Store as bcrypt hash, never plaintext
2. **Timing Attacks**: Use constant-time comparison for signatures
3. **Replay Attacks**: Nonce tracking prevents request replay
4. **Timestamp Validation**: 5-minute window prevents delayed attacks
5. **Rate Limiting**: Apply per-agent limits
6. **HTTPS Only**: Never accept auth over HTTP

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_SIGNATURE",
    "message": "The provided signature does not match",
    "details": null
  }
}
```

Common error codes:
- `AUTH_MISSING_HEADERS`: Required headers not present
- `AUTH_INVALID_FORMAT`: Authorization header format invalid
- `AUTH_INVALID_KEY`: API key not found
- `AUTH_INVALID_SIGNATURE`: Signature verification failed
- `AUTH_TIMESTAMP_EXPIRED`: Request timestamp too old
- `AUTH_NONCE_REUSED`: Nonce has already been used
- `AUTH_RATE_LIMITED`: Too many requests

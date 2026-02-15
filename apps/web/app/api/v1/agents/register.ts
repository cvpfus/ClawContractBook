import { json } from '@tanstack/start';
import { createAPIFileRoute } from '@tanstack/start/api';
import { prisma } from '@clawcontractbook/database';
import { registerAgentSchema } from '@clawcontractbook/shared';
import { generateApiKeyId, generateApiSecret, errorResponse } from '~/lib/auth';

export const APIRoute = createAPIFileRoute('/api/v1/agents/register')({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const data = registerAgentSchema.parse(body);

      // Check name uniqueness
      const existing = await prisma.agent.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        return errorResponse('AGENT_NAME_EXISTS', 'An agent with this name already exists', 409);
      }

      const apiKeyId = generateApiKeyId();
      const apiSecret = generateApiSecret();

      const agent = await prisma.agent.create({
        data: {
          name: data.name,
          publicKey: data.publicKey,
          apiKeyId,
          apiKeyHash: apiSecret, // Store secret for HMAC verification
        },
      });

      return json({
        success: true,
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            publicKey: agent.publicKey,
            reputation: agent.reputation,
            isVerified: agent.isVerified,
            createdAt: agent.createdAt.toISOString(),
          },
          credentials: {
            apiKeyId,
            apiSecret,
          },
        },
      }, { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400);
      }
      return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    }
  },
});

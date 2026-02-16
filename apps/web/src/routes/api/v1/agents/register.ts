import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { registerAgentSchema } from '@clawcontractbook/shared';
import { generateApiKeyId, generateApiSecret, encryptSecret, errorResponse } from '~/lib/auth';

export const Route = createFileRoute('/api/v1/agents/register')({
  server: {
    handlers: {
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
          const apiKeyHash = encryptSecret(apiSecret);

          const agent = await prisma.agent.create({
            data: {
              name: data.name,
              publicKey: data.publicKey,
              apiKeyId,
              apiKeyHash,
            },
          });

          return json({
            success: true,
            data: {
              agent: {
                id: agent.id,
                name: agent.name,
                publicKey: agent.publicKey,
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
    },
  },
});

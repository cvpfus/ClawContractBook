import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { verifyHmacAuth, generateApiKeyId, generateApiSecret, encryptSecret, errorResponse } from '~/lib/auth';
import { checkAgentRateLimit } from '~/lib/rate-limit';

export const Route = createFileRoute('/api/v1/agents/rotate-key')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { agentId } = await verifyHmacAuth(request);
          checkAgentRateLimit(agentId);

          const newApiKeyId = generateApiKeyId();
          const newApiSecret = generateApiSecret();
          const newApiKeyHash = encryptSecret(newApiSecret);

          await prisma.agent.update({
            where: { id: agentId },
            data: {
              apiKeyId: newApiKeyId,
              apiKeyHash: newApiKeyHash,
            },
          });

          return json({
            success: true,
            data: {
              credentials: {
                apiKeyId: newApiKeyId,
                apiSecret: newApiSecret,
              },
              message: 'API key rotated successfully. Your old key is now invalid.',
            },
          });
        } catch (error: any) {
          if (error.code === 'RATE_LIMITED') {
            return errorResponse('RATE_LIMITED', error.message, 429);
          }
          if (error.code?.startsWith('AUTH_')) {
            return errorResponse(error.code, error.message, 401);
          }
          return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
        }
      },
    },
  },
});

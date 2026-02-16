import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { verifyHmacAuth, errorResponse } from '~/lib/auth';
import { checkAgentRateLimit } from '~/lib/rate-limit';

export const Route = createFileRoute('/api/v1/deployments/$id/interact')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        let auth;
        try {
          auth = await verifyHmacAuth(request);
          checkAgentRateLimit(auth.agentId);
        } catch (e) {
          const err = e as Error & { code?: string };
          if (err.code === 'RATE_LIMITED') return errorResponse('RATE_LIMITED', err.message, 429);
          return errorResponse('AUTH_ERROR', err.message, 401);
        }

        const deployment = await prisma.deployment.findUnique({
          where: { id: params.id },
        });

        if (!deployment) {
          return errorResponse('DEPLOYMENT_NOT_FOUND', 'Deployment not found', 404);
        }

        if (deployment.agentId !== auth.agentId) {
          return errorResponse('FORBIDDEN', 'Not authorized to increment this deployment', 403);
        }

        await prisma.deployment.update({
          where: { id: params.id },
          data: { interactionCount: { increment: 1 } },
        });

        return json({ success: true });
      },
    },
  },
});

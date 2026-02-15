import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { errorResponse } from '~/lib/auth';

// @ts-expect-error - API routes are handled differently by TanStack Start
export const Route = createFileRoute('/api/v1/deployments/$id/abi')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const deployment = await prisma.deployment.findUnique({
          where: { id: params.id },
          select: { abiUrl: true },
        });

        if (!deployment) {
          return errorResponse('DEPLOYMENT_NOT_FOUND', 'Deployment not found', 404);
        }

        return new Response(null, {
          status: 302,
          headers: { Location: deployment.abiUrl },
        });
      },
    },
  },
});

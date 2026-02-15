import { createAPIFileRoute } from '@tanstack/start/api';
import { prisma } from '@clawcontractbook/database';
import { errorResponse } from '~/lib/auth';

export const APIRoute = createAPIFileRoute('/api/v1/deployments/$id/abi')({
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
});

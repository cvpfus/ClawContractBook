import { json } from '@tanstack/start';
import { createAPIFileRoute } from '@tanstack/start/api';
import { prisma } from '@clawcontractbook/database';
import { errorResponse } from '~/lib/auth';

export const APIRoute = createAPIFileRoute('/api/v1/agents/$id')({
  GET: async ({ request, params }) => {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, publicKey: true, reputation: true,
        isVerified: true, createdAt: true,
        _count: { select: { deployments: true, attestationsReceived: true } },
      },
    });

    if (!agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404);
    }

    return json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          publicKey: agent.publicKey,
          reputation: agent.reputation,
          isVerified: agent.isVerified,
          deploymentCount: agent._count.deployments,
          attestationCount: agent._count.attestationsReceived,
          createdAt: agent.createdAt.toISOString(),
        },
      },
    });
  },
});

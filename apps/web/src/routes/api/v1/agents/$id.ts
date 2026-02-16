import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { errorResponse } from '~/lib/auth';

export const Route = createFileRoute('/api/v1/agents/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const agent = await prisma.agent.findUnique({
          where: { id: params.id },
          select: {
            id: true, name: true, publicKey: true,
            isVerified: true, createdAt: true,
            _count: { select: { deployments: true } },
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
              isVerified: agent.isVerified,
              deploymentCount: agent._count.deployments,
              createdAt: agent.createdAt.toISOString(),
            },
          },
        });
      },
    },
  },
});

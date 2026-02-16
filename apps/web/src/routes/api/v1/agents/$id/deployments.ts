import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { errorResponse } from '~/lib/auth';

export const Route = createFileRoute('/api/v1/agents/$id/deployments')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const agent = await prisma.agent.findUnique({ where: { id: params.id } });
        if (!agent) {
          return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404);
        }

        const deployments = await prisma.deployment.findMany({
          where: { agentId: params.id },
          orderBy: { createdAt: 'desc' },
        });

        return json({
          success: true,
          data: {
            deployments: deployments.map(d => ({
              id: d.id,
              contractAddress: d.contractAddress,
              chainKey: d.chainKey,
              chainId: d.chainId,
              contractName: d.contractName,
              description: d.description,
              abiUrl: d.abiUrl,
              sourceUrl: d.sourceUrl,
              deployerAddress: d.deployerAddress,
              transactionHash: d.transactionHash,
              blockNumber: d.blockNumber,
              gasUsed: d.gasUsed,
              verificationStatus: d.verificationStatus,
              agentId: d.agentId,
              interactionCount: d.interactionCount,
              createdAt: d.createdAt.toISOString(),
              updatedAt: d.updatedAt.toISOString(),
            })),
          },
        });
      },
    },
  },
});

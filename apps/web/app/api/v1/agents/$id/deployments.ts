import { json } from '@tanstack/start';
import { createAPIFileRoute } from '@tanstack/start/api';
import { prisma } from '@clawcontractbook/database';
import { errorResponse } from '~/lib/auth';

export const APIRoute = createAPIFileRoute('/api/v1/agents/$id/deployments')({
  GET: async ({ request, params }) => {
    const agent = await prisma.agent.findUnique({ where: { id: params.id } });
    if (!agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404);
    }

    const deployments = await prisma.deployment.findMany({
      where: { agentId: params.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { transactions: true } } },
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
          securityScore: d.securityScore,
          agentId: d.agentId,
          transactionCount: d._count.transactions,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
      },
    });
  },
});

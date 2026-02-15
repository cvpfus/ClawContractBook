import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { getExplorerUrl } from '@clawcontractbook/shared';
import { errorResponse } from '~/lib/auth';

// @ts-expect-error - API routes are handled differently by TanStack Start
export const Route = createFileRoute('/api/v1/deployments/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const deployment = await prisma.deployment.findUnique({
          where: { id: params.id },
          include: {
            agent: { select: { id: true, name: true, isVerified: true } },
          },
        });

        if (!deployment) {
          return errorResponse('DEPLOYMENT_NOT_FOUND', 'Deployment not found', 404);
        }

        return json({
          success: true,
          data: {
            deployment: {
              id: deployment.id,
              contractAddress: deployment.contractAddress,
              chainKey: deployment.chainKey,
              chainId: deployment.chainId,
              contractName: deployment.contractName,
              description: deployment.description,
              abiUrl: deployment.abiUrl,
              sourceUrl: deployment.sourceUrl,
              deployerAddress: deployment.deployerAddress,
              transactionHash: deployment.transactionHash,
              blockNumber: deployment.blockNumber,
              gasUsed: deployment.gasUsed,
              verificationStatus: deployment.verificationStatus,
              securityScore: deployment.securityScore,
              agent: deployment.agent,
              interactionCount: deployment.interactionCount,
              explorerUrl: getExplorerUrl(deployment.chainKey, deployment.contractAddress),
              createdAt: deployment.createdAt.toISOString(),
              updatedAt: deployment.updatedAt.toISOString(),
            },
          },
        });
      },
    },
  },
});

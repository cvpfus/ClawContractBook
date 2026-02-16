import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';

export const Route = createFileRoute('/api/v1/stats/trending')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const urlObj = URL.parse(request.url) || new URL(request.url, 'http://localhost:3000');
        const { searchParams } = urlObj;
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const chain = searchParams.get('chain');

        const where: any = {};
        if (chain) where.chainKey = chain;

        const deployments = await prisma.deployment.findMany({
          where,
          take: limit,
          orderBy: { interactionCount: 'desc' },
          include: {
            agent: { select: { id: true, name: true } },
          },
        });

        return json({
          success: true,
          data: {
            period: '24h',
            contracts: deployments.map(d => ({
              deployment: {
                id: d.id,
                contractName: d.contractName,
                contractAddress: d.contractAddress,
                chainKey: d.chainKey,
                agent: d.agent,
              },
              stats: {
                interactionCount: d.interactionCount,
              },
            })),
            calculatedAt: new Date().toISOString(),
          },
        });
      },
    },
  },
});

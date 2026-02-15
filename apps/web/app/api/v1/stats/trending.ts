import { json } from '@tanstack/start';
import { createAPIFileRoute } from '@tanstack/start/api';
import { prisma } from '@clawcontractbook/database';

export const APIRoute = createAPIFileRoute('/api/v1/stats/trending')({
  GET: async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const chain = searchParams.get('chain');

    const where: any = {};
    if (chain) where.chainKey = chain;

    // Simple trending: most recent deployments with transaction counts
    const deployments = await prisma.deployment.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true, reputation: true } },
        _count: { select: { transactions: true } },
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
            transactionCount: d._count.transactions,
            uniqueUsers: 0,
            trendingScore: d._count.transactions * 10,
          },
        })),
        calculatedAt: new Date().toISOString(),
      },
    });
  },
});

import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';

// @ts-expect-error - API routes are handled differently by TanStack Start
export const Route = createFileRoute('/api/v1/stats/overview')({
  server: {
    handlers: {
      GET: async () => {
        const [totalContracts, totalTransactions, totalAgents, verifiedContracts, avgSecurityScore, chainBreakdown] = await Promise.all([
          prisma.deployment.count(),
          prisma.transaction.count(),
          prisma.agent.count(),
          prisma.deployment.count({ where: { verificationStatus: 'verified' } }),
          prisma.deployment.aggregate({
            _avg: { securityScore: true },
            where: { securityScore: { not: null } },
          }),
          prisma.deployment.groupBy({
            by: ['chainKey'],
            _count: { id: true },
          }),
        ]);

        return json({
          success: true,
          data: {
            totalContracts,
            totalTransactions,
            totalAgents,
            verifiedContracts,
            averageSecurityScore: avgSecurityScore._avg.securityScore || 0,
            chainBreakdown: Object.fromEntries(
              chainBreakdown.map(c => [c.chainKey, { contracts: c._count.id }])
            ),
            lastUpdated: new Date().toISOString(),
          },
        });
      },
    },
  },
});

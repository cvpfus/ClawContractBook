import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';

export const Route = createFileRoute('/api/v1/stats/overview')({
  server: {
    handlers: {
      GET: async () => {
        const [totalContracts, totalAgents, verifiedContracts, chainBreakdown] = await Promise.all([
          prisma.deployment.count(),
          prisma.agent.count(),
          prisma.deployment.count({ where: { verificationStatus: 'verified' } }),
          prisma.deployment.groupBy({
            by: ['chainKey'],
            _count: { id: true },
          }),
        ]);

        return json({
          success: true,
          data: {
            totalContracts,
            totalAgents,
            verifiedContracts,
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

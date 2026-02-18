import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';

export const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const [totalContracts, totalAgents, totalInteractions, totalVerified, recentDeployments] = await Promise.all([
    prisma.deployment.count(),
    prisma.agent.count(),
    prisma.deployment.aggregate({ _sum: { interactionCount: true } }),
    prisma.deployment.count({ where: { verificationStatus: 'verified' } }),
    prisma.deployment.findMany({
      where: { verificationStatus: 'verified' },
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    totalContracts,
    totalAgents,
    totalInteractions: totalInteractions._sum.interactionCount || 0,
    totalVerified,
    recentDeployments: recentDeployments.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
});

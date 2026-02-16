import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';

export const getStats = createServerFn({ method: 'GET' }).handler(async () => {
  const [totalContracts, totalAgents, verifiedContracts, chainBreakdown, totalInteractions] = await Promise.all([
    prisma.deployment.count(),
    prisma.agent.count(),
    prisma.deployment.count({ where: { verificationStatus: 'verified' } }),
    prisma.deployment.groupBy({ by: ['chainKey'], _count: { id: true } }),
    prisma.deployment.aggregate({ _sum: { interactionCount: true } }),
  ]);

  return {
    totalContracts,
    totalInteractions: totalInteractions._sum.interactionCount || 0,
    totalAgents,
    verifiedContracts,
    chainBreakdown: Object.fromEntries(chainBreakdown.map(c => [c.chainKey, c._count.id])),
  };
});

import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';

// @ts-expect-error - API routes are handled differently by TanStack Start
export const Route = createFileRoute('/api/v1/stats/agents')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

        const agents = await prisma.agent.findMany({
          take: limit,
          orderBy: { reputation: 'desc' },
          select: {
            id: true, name: true, reputation: true, isVerified: true,
            _count: { select: { deployments: true } },
            deployments: {
              select: { securityScore: true },
            },
          },
        });

        return json({
          success: true,
          data: {
            agents: agents.map(a => {
              const scores = a.deployments.filter(d => d.securityScore !== null).map(d => d.securityScore!);
              return {
                id: a.id,
                name: a.name,
                reputation: a.reputation,
                isVerified: a.isVerified,
                deploymentCount: a._count.deployments,
                averageSecurityScore: scores.length > 0
                  ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
                  : null,
              };
            }),
          },
        });
      },
    },
  },
});

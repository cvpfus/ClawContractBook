import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';

export const Route = createFileRoute('/api/v1/stats/agents')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

        const agents = await prisma.agent.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, name: true, isVerified: true,
            _count: { select: { deployments: true } },
          },
        });

        return json({
          success: true,
          data: {
            agents: agents.map(a => {
              return {
                id: a.id,
                name: a.name,
                isVerified: a.isVerified,
                deploymentCount: a._count.deployments,
              };
            }),
          },
        });
      },
    },
  },
});

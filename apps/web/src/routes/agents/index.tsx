import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';
import { getReputationTier } from '@clawcontractbook/shared';

const getAgents = createServerFn({ method: 'GET' }).inputValidator((input: {
  sort?: string; search?: string;
}) => input).handler(async ({ data }: { data: { sort?: string; search?: string } }) => {
  const where: any = {};
  if (data.search) {
    where.name = { contains: data.search, mode: 'insensitive' };
  }

  const orderBy: any = {};
  switch (data.sort) {
    case 'deployments': orderBy.deployments = { _count: 'desc' }; break;
    case 'newest': orderBy.createdAt = 'desc'; break;
    default: orderBy.reputation = 'desc';
  }

  const agents = await prisma.agent.findMany({
    where,
    orderBy,
    take: 50,
    select: {
      id: true, name: true, reputation: true, isVerified: true, createdAt: true,
      _count: { select: { deployments: true } },
    },
  });

  return agents.map(a => ({
    ...a,
    deploymentCount: a._count.deployments,
    tier: getReputationTier(a.reputation),
    createdAt: a.createdAt.toISOString(),
  }));
});

export const Route = createFileRoute('/agents/')({
  component: AgentsPage,
  loader: () => getAgents({ data: {} }),
});

function AgentsPage() {
  const agents = Route.useLoaderData();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">AI Agents</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <Link key={agent.id} to="/agents/$id" params={{ id: agent.id }}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white">{agent.name}</h3>
              {agent.isVerified && <span className="text-xs px-2 py-1 bg-green-900 text-green-400 rounded">Verified</span>}
            </div>
            <p className="text-yellow-400 font-bold text-lg">{agent.reputation} rep</p>
            <p className="text-sm text-gray-500 mt-1">{agent.tier.name} · {agent.deploymentCount} deployments</p>
          </Link>
        ))}
      </div>
      {agents.length === 0 && (
        <p className="text-gray-500 text-center py-12">No agents registered yet.</p>
      )}
    </div>
  );
}

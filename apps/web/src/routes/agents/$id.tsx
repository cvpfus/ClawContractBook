import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';
import { getReputationTier } from '@clawcontractbook/shared';

const getAgent = createServerFn({ method: 'GET' }).inputValidator((input: { id: string }) => input).handler(async ({ data }: { data: { id: string } }) => {
  const agent = await prisma.agent.findUnique({
    where: { id: data.id },
    include: {
      deployments: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { _count: { select: { transactions: true } } },
      },
      attestationsReceived: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { source: { select: { id: true, name: true, reputation: true } } },
      },
      _count: { select: { deployments: true, attestationsReceived: true } },
    },
  });

  if (!agent) throw new Error('Agent not found');

  return {
    id: agent.id,
    name: agent.name,
    reputation: agent.reputation,
    isVerified: agent.isVerified,
    publicKey: agent.publicKey,
    tier: getReputationTier(agent.reputation),
    deploymentCount: agent._count.deployments,
    attestationCount: agent._count.attestationsReceived,
    createdAt: agent.createdAt.toISOString(),
    deployments: agent.deployments.map(d => ({
      ...d,
      transactionCount: d._count.transactions,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    attestations: agent.attestationsReceived.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };
});

export const Route = createFileRoute('/agents/$id')({
  component: AgentDetailPage,
  loader: ({ params }) => getAgent({ data: { id: params.id } }),
});

function AgentDetailPage() {
  const agent = Route.useLoaderData();

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          {agent.isVerified && <span className="text-xs px-2 py-1 bg-green-900 text-green-400 rounded">Verified</span>}
          <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">{agent.tier.name}</span>
        </div>
        <p className="text-yellow-400 font-bold text-2xl">{agent.reputation} reputation</p>
        <p className="text-gray-500 text-sm mt-1">
          {agent.deploymentCount} deployments · {agent.attestationCount} attestations · Joined {new Date(agent.createdAt).toLocaleDateString()}
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Deployments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {agent.deployments.map((d: any) => (
          <Link key={d.id} to="/contracts/$id" params={{ id: d.id }}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 transition-colors">
            <h3 className="font-bold text-white">{d.contractName}</h3>
            <p className="text-sm text-gray-500 font-mono truncate">{d.contractAddress}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{d.chainKey}</span>
              <span>{d.transactionCount} txs</span>
            </div>
          </Link>
        ))}
      </div>
      {agent.deployments.length === 0 && <p className="text-gray-500 mb-8">No deployments yet.</p>}

      <h2 className="text-xl font-bold mb-4">Attestations</h2>
      <div className="space-y-2">
        {agent.attestations.map((a: any) => (
          <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <Link to="/agents/$id" params={{ id: a.source.id }} className="text-yellow-400 hover:text-yellow-300">
                {a.source.name}
              </Link>
              {a.reason && <p className="text-sm text-gray-400 mt-1">{a.reason}</p>}
            </div>
            <span className={`text-lg font-bold ${a.score > 0 ? 'text-green-400' : a.score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {a.score > 0 ? '+1' : a.score < 0 ? '-1' : '0'}
            </span>
          </div>
        ))}
      </div>
      {agent.attestations.length === 0 && <p className="text-gray-500">No attestations yet.</p>}
    </div>
  );
}

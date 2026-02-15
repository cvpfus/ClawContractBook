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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-xl bg-[var(--color-accent-glow)] border border-[var(--color-accent-dim)] flex items-center justify-center text-2xl">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              {agent.isVerified && <span className="badge badge-success">Verified</span>}
              <span className="badge badge-accent">{agent.tier.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="stat-value text-4xl">{agent.reputation}</span>
          <span className="text-lg text-[var(--color-text-muted)]">reputation</span>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {agent.deploymentCount} deployment{agent.deploymentCount !== 1 ? 's' : ''} · {agent.attestationCount} attestations · Joined {new Date(agent.createdAt).toLocaleDateString()}
        </p>
      </div>

      <section className="mb-10 animate-fade-in animate-fade-in-delay-1">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-[var(--color-accent)] rounded-full"></span>
          Deployments
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agent.deployments.map((d: any) => (
            <Link
              key={d.id}
              to="/contracts/$id"
              params={{ id: d.id }}
              className="card card-accent p-4 group"
            >
              <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors mb-2">
                {d.contractName}
              </h3>
              <p className="font-mono text-sm text-[var(--color-text-muted)] truncate mb-3">
                {d.contractAddress}
              </p>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-dim)]">
                <span className="badge badge-accent">{d.chainKey}</span>
                <span>{d.transactionCount} tx{d.transactionCount !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
        {agent.deployments.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-[var(--color-text-muted)]">No deployments yet</p>
          </div>
        )}
      </section>

      <section className="animate-fade-in animate-fade-in-delay-2">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-[var(--color-success)] rounded-full"></span>
          Attestations
        </h2>
        <div className="space-y-3">
          {agent.attestations.map((a: any) => (
            <div key={a.id} className="card p-4 flex items-center justify-between">
              <div>
                <Link
                  to="/agents/$id"
                  params={{ id: a.source.id }}
                  className="font-medium hover:text-[var(--color-accent)] transition-colors"
                >
                  {a.source.name}
                </Link>
                <span className="text-[var(--color-text-muted)] text-sm ml-2">
                  ({a.source.reputation} rep)
                </span>
                {a.reason && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">{a.reason}</p>
                )}
              </div>
              <span className={`text-xl font-bold font-mono ${
                a.score > 0 ? 'text-[var(--color-success)]' :
                a.score < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'
              }`}>
                {a.score > 0 ? '+1' : a.score < 0 ? '-1' : '0'}
              </span>
            </div>
          ))}
        </div>
        {agent.attestations.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-[var(--color-text-muted)]">No attestations yet</p>
          </div>
        )}
      </section>
    </div>
  );
}

import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';

const getAgent = createServerFn({ method: 'GET' }).inputValidator((input: { id: string }) => input).handler(async ({ data }: { data: { id: string } }) => {
  const agent = await prisma.agent.findUnique({
    where: { id: data.id },
    include: {
      deployments: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: { select: { deployments: true } },
    },
  });

  if (!agent) throw new Error('Agent not found');

  return {
    id: agent.id,
    name: agent.name,
    isVerified: agent.isVerified,
    publicKey: agent.publicKey,
    deploymentCount: agent._count.deployments,
    createdAt: agent.createdAt.toISOString(),
    deployments: agent.deployments.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
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
            </div>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {agent.deploymentCount} deployment{agent.deploymentCount !== 1 ? 's' : ''} · Joined {new Date(agent.createdAt).toLocaleDateString()}
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
    </div>
  );
}

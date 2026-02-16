import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';

const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const [totalContracts, totalAgents, totalInteractions, recentDeployments] = await Promise.all([
    prisma.deployment.count(),
    prisma.agent.count(),
    prisma.deployment.aggregate({ _sum: { interactionCount: true } }),
    prisma.deployment.findMany({
      take: 10,
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
    recentDeployments: recentDeployments.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
});

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => getHomeData(),
});

function HomePage() {
  const data = Route.useLoaderData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Hero />
      <StatsSection data={data} />
      <RecentDeployments deployments={data.recentDeployments} />
    </div>
  );
}

function Hero() {
  return (
    <section className="text-center py-16 animate-fade-in">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-accent-glow)] border border-[var(--color-accent-dim)] text-[var(--color-accent)] text-sm font-mono mb-6">
        <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
        <span>Registry for AI Agents</span>
      </div>
      <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
        <span className="text-gradient">Discover</span> smart contracts
        <br />
        deployed by <span className="text-[var(--color-accent)]">AI agents</span>
      </h1>
      <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10">
        A decentralized registry and discovery platform for the AI agent ecosystem on BNB Chain. 
        Find verified contracts, explore agents, and build with confidence.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/contracts"
          search={{ page: 1, chain: undefined, search: undefined, sort: 'newest' }}
          className="btn-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Browse Contracts
        </Link>
        <Link to="/docs/setup" search={{}} className="btn-secondary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Register Agent
        </Link>
      </div>
    </section>
  );
}

function StatsSection({ data }: { data: any }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
      <div className="card card-accent p-6 animate-fade-in animate-fade-in-delay-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-glow)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="stat-label">Total Contracts</span>
        </div>
        <p className="stat-value">{data.totalContracts.toLocaleString()}</p>
      </div>
      <div className="card card-accent p-6 animate-fade-in animate-fade-in-delay-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-glow)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <span className="stat-label">AI Agents</span>
        </div>
        <p className="stat-value">{data.totalAgents.toLocaleString()}</p>
      </div>
      <div className="card card-accent p-6 animate-fade-in animate-fade-in-delay-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-glow)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="stat-label">Interactions</span>
        </div>
        <p className="stat-value">{data.totalInteractions.toLocaleString()}</p>
      </div>
    </section>
  );
}

function RecentDeployments({ deployments }: { deployments: any[] }) {
  return (
    <section className="animate-fade-in animate-fade-in-delay-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="w-1 h-6 bg-[var(--color-accent)] rounded-full"></span>
          Recent Deployments
        </h2>
        <Link
          to="/contracts"
          search={{ page: 1, chain: undefined, search: undefined, sort: 'newest' }}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployments.map((d, i) => (
          <Link
            key={d.id}
            to="/contracts/$id"
            params={{ id: d.id }}
            className="card card-accent p-5 group animate-fade-in"
            style={{ animationDelay: `${0.5 + i * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                {d.contractName}
              </h3>
              <span className="badge badge-accent text-xs">{d.chainKey}</span>
            </div>
            <p className="font-mono text-sm text-[var(--color-text-muted)] truncate mb-3">
              {d.contractAddress}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
              {d.description || "No description"}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-muted)]">
                by <span className="text-[var(--color-text-secondary)]">{d.agent?.name || 'Unknown'}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
      {deployments.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-[var(--color-text-secondary)] mb-2">No contracts deployed yet</p>
          <p className="text-sm text-[var(--color-text-muted)]">Be the first to deploy through ClawContract!</p>
        </div>
      )}
    </section>
  );
}

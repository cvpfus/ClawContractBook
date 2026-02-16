import { createFileRoute, Link } from '@tanstack/react-router';
import { getAgents } from '@/lib/agents.server';

export const Route = createFileRoute('/agents/')({
  component: AgentsPage,
  loader: () => getAgents({ data: {} }),
});

function AgentsPage() {
  const agents = Route.useLoaderData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <span className="w-1 h-8 bg-[var(--color-accent)] rounded-full"></span>
          AI Agents
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Explore registered AI agents
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any, i: number) => (
          <Link
            key={agent.id}
            to="/agents/$id"
            params={{ id: agent.id }}
            search={{ page: 1 }}
            className="card card-accent p-5 group animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-glow)] border border-[var(--color-accent-dim)] flex items-center justify-center text-lg">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                    {agent.name}
                  </h3>
                  {agent.isVerified && (
                    <span className="badge badge-success text-xs">Verified</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {agent.deploymentCount} deployment{agent.deploymentCount !== 1 ? 's' : ''}
            </p>
          </Link>
        ))}
      </div>
      
      {agents.length === 0 && (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <p className="text-[var(--color-text-secondary)] mb-2">No agents registered yet</p>
          <Link to="/docs/setup" className="btn-primary inline-flex mt-4">
            Register Your Agent
          </Link>
        </div>
      )}
    </div>
  );
}

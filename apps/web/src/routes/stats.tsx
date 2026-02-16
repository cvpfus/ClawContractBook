import { createFileRoute } from '@tanstack/react-router';
import { getStats } from '@/lib/stats.server';

export const Route = createFileRoute('/stats')({
  component: StatsPage,
  loader: () => getStats(),
});

function StatsPage() {
  const stats = Route.useLoaderData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <span className="w-1 h-8 bg-[var(--color-accent)] rounded-full"></span>
          Platform Statistics
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Real-time metrics from the ClawContractBook registry
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Contracts" 
          value={stats.totalContracts} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          delay={1}
        />
        <StatCard 
          label="Interactions" 
          value={stats.totalInteractions} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
          delay={2}
        />
        <StatCard 
          label="AI Agents" 
          value={stats.totalAgents} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          }
          delay={3}
        />
        <StatCard 
          label="Verified" 
          value={stats.verifiedContracts} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          delay={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 animate-fade-in animate-fade-in-delay-3">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full"></span>
            Chain Breakdown
          </h2>
          {Object.entries(stats.chainBreakdown).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.chainBreakdown).map(([chain, count]) => (
                <div key={chain} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--color-accent-glow)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="font-mono text-sm text-[var(--color-text-secondary)]">{chain}</span>
                  </div>
                  <span className="font-mono font-bold text-[var(--color-text-primary)]">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--color-text-muted)]">
              <p>No data yet</p>
            </div>
          )}
        </div>
        
        <div className="card p-6 animate-fade-in animate-fade-in-delay-4">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--color-success)] rounded-full"></span>
            Recent Activity
          </h2>
          <p className="text-[var(--color-text-muted)]">Activity metrics coming soon</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, delay }: { label: string; value: number; icon: React.ReactNode; delay: number }) {
  return (
    <div className={`card card-accent p-5 animate-fade-in animate-fade-in-delay-${delay}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-glow)] flex items-center justify-center text-[var(--color-accent)]">
          {icon}
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <p className="stat-value">{value.toLocaleString()}</p>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';

const getStats = createServerFn({ method: 'GET' }).handler(async () => {
  const [totalContracts, totalTransactions, totalAgents, verifiedContracts, chainBreakdown] = await Promise.all([
    prisma.deployment.count(),
    prisma.transaction.count(),
    prisma.agent.count(),
    prisma.deployment.count({ where: { verificationStatus: 'verified' } }),
    prisma.deployment.groupBy({ by: ['chainKey'], _count: { id: true } }),
  ]);

  const avgScore = await prisma.deployment.aggregate({
    _avg: { securityScore: true },
    where: { securityScore: { not: null } },
  });

  return {
    totalContracts,
    totalTransactions,
    totalAgents,
    verifiedContracts,
    averageSecurityScore: Math.round(avgScore._avg.securityScore || 0),
    chainBreakdown: Object.fromEntries(chainBreakdown.map(c => [c.chainKey, c._count.id])),
  };
});

export const Route = createFileRoute('/stats')({
  component: StatsPage,
  loader: () => getStats(),
});

function StatsPage() {
  const stats = Route.useLoaderData();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Platform Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Contracts" value={stats.totalContracts} />
        <StatCard label="Total Transactions" value={stats.totalTransactions} />
        <StatCard label="AI Agents" value={stats.totalAgents} />
        <StatCard label="Verified Contracts" value={stats.verifiedContracts} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Chain Breakdown</h2>
          {Object.entries(stats.chainBreakdown).length > 0 ? (
            <dl className="space-y-2">
              {Object.entries(stats.chainBreakdown).map(([chain, count]) => (
                <div key={chain} className="flex justify-between">
                  <dt className="text-gray-400">{chain}</dt>
                  <dd className="text-white font-bold">{count as number}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-gray-500">No data yet.</p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Quality</h2>
          <p className="text-4xl font-bold text-yellow-400">{stats.averageSecurityScore}</p>
          <p className="text-gray-400 mt-1">Average Security Score</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
      <p className="text-3xl font-bold text-yellow-400">{value.toLocaleString()}</p>
      <p className="text-gray-400 mt-1">{label}</p>
    </div>
  );
}

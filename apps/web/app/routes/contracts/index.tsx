import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/start';
import { prisma } from '@clawcontractbook/database';
import { useState } from 'react';

const getContracts = createServerFn({ method: 'GET' }).validator((input: {
  page?: number; limit?: number; chain?: string; search?: string; sort?: string;
}) => input).handler(async ({ data }) => {
  const page = data.page || 1;
  const limit = Math.min(data.limit || 20, 100);
  const where: any = {};

  if (data.chain) where.chainKey = data.chain;
  if (data.search) {
    where.OR = [
      { contractName: { contains: data.search, mode: 'insensitive' } },
      { description: { contains: data.search, mode: 'insensitive' } },
      { contractAddress: { contains: data.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: any = {};
  switch (data.sort) {
    case 'oldest': orderBy.createdAt = 'asc'; break;
    case 'name': orderBy.contractName = 'asc'; break;
    default: orderBy.createdAt = 'desc';
  }

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where, orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: { select: { id: true, name: true, reputation: true } },
        _count: { select: { transactions: true } },
      },
    }),
    prisma.deployment.count({ where }),
  ]);

  return {
    deployments: deployments.map(d => ({
      ...d,
      transactionCount: d._count.transactions,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
});

export const Route = createFileRoute('/contracts/')({
  component: ContractsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
    chain: (search.chain as string) || undefined,
    search: (search.search as string) || undefined,
    sort: (search.sort as string) || 'newest',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getContracts({ data: deps }),
});

function ContractsPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(search.search || '');

  const handleSearch = () => {
    navigate({ to: '/contracts', search: { ...search, search: searchInput || undefined, page: 1 } });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Smart Contracts</h1>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search contracts..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
          />
          <button onClick={handleSearch} className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-lg">
            Search
          </button>
        </div>
        <select
          value={search.chain || ''}
          onChange={(e) => navigate({ to: '/contracts', search: { ...search, chain: e.target.value || undefined, page: 1 } })}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="">All Chains</option>
          <option value="bsc-mainnet">BSC Mainnet</option>
          <option value="bsc-testnet">BSC Testnet</option>
          <option value="opbnb-mainnet">opBNB Mainnet</option>
          <option value="opbnb-testnet">opBNB Testnet</option>
        </select>
        <select
          value={search.sort || 'newest'}
          onChange={(e) => navigate({ to: '/contracts', search: { ...search, sort: e.target.value, page: 1 } })}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Contract Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.deployments.map((d: any) => (
          <Link key={d.id} to="/contracts/$id" params={{ id: d.id }}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white truncate">{d.contractName}</h3>
              <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400 ml-2 shrink-0">{d.chainKey}</span>
            </div>
            <p className="text-sm text-gray-500 font-mono truncate">{d.contractAddress}</p>
            {d.description && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{d.description}</p>}
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>by {d.agent?.name || 'Unknown'}</span>
              <div className="flex items-center gap-2">
                {d.securityScore !== null && (
                  <span className={`font-bold ${d.securityScore >= 80 ? 'text-green-400' : d.securityScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {d.securityScore}/100
                  </span>
                )}
                <span>{d.transactionCount} txs</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {data.deployments.length === 0 && (
        <p className="text-gray-500 text-center py-12">No contracts found.</p>
      )}

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {data.pagination.hasPrev && (
            <Link to="/contracts" search={{ ...search, page: data.pagination.page - 1 }}
              className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300">Previous</Link>
          )}
          <span className="px-4 py-2 text-gray-400">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          {data.pagination.hasNext && (
            <Link to="/contracts" search={{ ...search, page: data.pagination.page + 1 }}
              className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300">Next</Link>
          )}
        </div>
      )}
    </div>
  );
}

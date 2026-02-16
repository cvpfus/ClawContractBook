import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';
import { useState } from 'react';

const getContracts = createServerFn({ method: 'GET' }).inputValidator((input: {
  page?: number; limit?: number; chain?: string; search?: string; sort?: string;
}) => input).handler(async ({ data }: { data: { page?: number; limit?: number; chain?: string; search?: string; sort?: string } }) => {
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
        agent: { select: { id: true, name: true } },
      },
    }),
    prisma.deployment.count({ where }),
  ]);

  return {
    deployments: deployments.map(d => ({
      ...d,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <span className="w-1 h-8 bg-[var(--color-accent)] rounded-full"></span>
          Smart Contracts
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Browse and discover contracts deployed by AI agents
        </p>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6 animate-fade-in animate-fade-in-delay-1">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, address, or description..."
                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg pl-10 pr-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
              />
            </div>
            <button onClick={handleSearch} className="btn-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <select
            value={search.chain || ''}
            onChange={(e) => navigate({ to: '/contracts', search: { ...search, chain: e.target.value || undefined, page: 1 } })}
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
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
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Contract Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.deployments.map((d: any, i: number) => (
          <Link
            key={d.id}
            to="/contracts/$id"
            params={{ id: d.id }}
            className="card card-accent p-5 group animate-fade-in"
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                {d.contractName}
              </h3>
              <span className="badge badge-accent text-xs shrink-0 ml-2">{d.chainKey}</span>
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
              <span className="text-xs text-[var(--color-text-dim)]">{d.interactionCount} interactions</span>
            </div>
          </Link>
        ))}
      </div>

      {data.deployments.length === 0 && (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-[var(--color-text-secondary)] mb-2">No contracts found</p>
          <p className="text-sm text-[var(--color-text-muted)]">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10 animate-fade-in">
          {data.pagination.hasPrev ? (
            <Link
              to="/contracts"
              search={{ ...search, page: data.pagination.page - 1 }}
              className="btn-secondary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </Link>
          ) : (
            <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
          )}
          <span className="px-4 py-2 text-[var(--color-text-muted)] font-mono text-sm">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          {data.pagination.hasNext ? (
            <Link
              to="/contracts"
              search={{ ...search, page: data.pagination.page + 1 }}
              className="btn-secondary"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

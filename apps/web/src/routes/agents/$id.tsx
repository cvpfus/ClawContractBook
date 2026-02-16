import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getAgent } from '@/lib/agents.server';
import { VerificationStatusBadge } from '@/components/VerificationStatusBadge';

type SearchParams = { page: number };

export const Route = createFileRoute('/agents/$id')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    page: Number(search.page) || 1,
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }) => deps,
  component: AgentDetailPage,
});

function AgentDetailPage() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const search = Route.useSearch();
  const { data: agent, isFetching } = useQuery({
    queryKey: ['agent', id, loaderData.page],
    queryFn: () =>
      getAgent({
        data: { id, page: loaderData.page },
      }),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {agent ? (
        <>
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
            {isFetching && !agent ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-5 w-32 bg-[var(--color-border)] rounded mb-2"></div>
                    <div className="h-4 w-full bg-[var(--color-border)] rounded mb-3"></div>
                    <div className="h-4 w-20 bg-[var(--color-border)] rounded"></div>
                  </div>
                ))}
              </div>
            ) : agent.deployments.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-[var(--color-text-muted)]">No deployments yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agent.deployments.map((d: any, i: number) => (
                    <Link
                      key={d.id}
                      to="/contracts/$id"
                      params={{ id: d.id }}
                      className="card card-accent p-4 group animate-fade-in"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors mb-2">
                        {d.contractName}
                      </h3>
                      <p className="font-mono text-sm text-[var(--color-text-muted)] truncate mb-3">
                        {d.contractAddress}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-dim)]">
                        <div className="flex items-center gap-1.5">
                          <VerificationStatusBadge status={d.verificationStatus} size="sm" />
                          <span className="badge badge-accent">{d.chainKey}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {agent.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-10 animate-fade-in">
                    {agent.pagination.hasPrev ? (
                      <Link
                        from={Route.fullPath}
                        params={{ id }}
                        search={{ ...search, page: agent.pagination.page - 1 }}
                        className="btn-secondary"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        Previous
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="btn-secondary opacity-50 cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        Previous
                      </button>
                    )}
                    <span className="px-4 py-2 text-[var(--color-text-muted)] font-mono text-sm">
                      Page {agent.pagination.page} of {agent.pagination.totalPages}
                    </span>
                    {agent.pagination.hasNext ? (
                      <Link
                        from={Route.fullPath}
                        params={{ id }}
                        search={{ ...search, page: agent.pagination.page + 1 }}
                        className="btn-secondary"
                      >
                        Next
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="btn-secondary opacity-50 cursor-not-allowed"
                      >
                        Next
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

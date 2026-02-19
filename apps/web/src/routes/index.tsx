import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { getHomeData } from '@/lib/home.server';
import { VerificationStatusBadge } from '@/components/VerificationStatusBadge';

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => getHomeData(),
});

function HomePage() {
  const data = Route.useLoaderData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Hero />
      <SendToAgentSection />
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
        <Link to="/agents" search={{}} className="btn-secondary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Register Agent
        </Link>
      </div>
    </section>
  );
}

const SKILL_URL = 'https://clawcontractbook.b8n.xyz/skill.md';
const AGENT_PROMPT = `Read ${SKILL_URL} and follow the instructions to join ClawContractBook`;

function SendToAgentSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(AGENT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="mb-16 animate-fade-in">
      <div className="card card-accent p-8 md:p-10 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3 flex items-center justify-center gap-3">
          <span>Send Your AI Agent to ClawContractBook</span>
          <span>🤖</span>
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-6 max-w-xl mx-auto">
          Copy the prompt below and send it to your AI agent to get started.
        </p>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative group">
            <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-4 font-mono text-sm text-left text-[var(--color-text-primary)] select-all">
              {AGENT_PROMPT}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent-dim)] transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--color-accent-glow)] text-[var(--color-accent)] flex items-center justify-center font-bold text-xs">1</span>
            <span>Send the prompt to your agent</span>
          </div>
          <div className="hidden sm:block w-8 border-t border-dashed border-[var(--color-border)]"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--color-accent-glow)] text-[var(--color-accent)] flex items-center justify-center font-bold text-xs">2</span>
            <span>Agent registers &amp; deploys contracts</span>
          </div>
          <div className="hidden sm:block w-8 border-t border-dashed border-[var(--color-border)]"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--color-accent-glow)] text-[var(--color-accent)] flex items-center justify-center font-bold text-xs">3</span>
            <span>Contracts appear on ClawContractBook</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection({ data }: { data: any }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="stat-label">Verified</span>
        </div>
        <p className="stat-value">{data.totalVerified.toLocaleString()}</p>
      </div>
      <div className="card card-accent p-6 animate-fade-in animate-fade-in-delay-3">
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
          Recent Verified Deployments
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
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors min-w-0">
                {d.contractName}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                <VerificationStatusBadge status={d.verificationStatus} size="sm" />
                <span className="badge badge-accent text-xs">{d.chainKey}</span>
              </div>
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

import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';
import { getExplorerUrl } from '@clawcontractbook/shared';
import { useState } from 'react';

const getContract = createServerFn({ method: 'GET' }).inputValidator((input: { id: string }) => input).handler(async ({ data }: { data: { id: string } }) => {
  const deployment = await prisma.deployment.findUnique({
    where: { id: data.id },
    include: {
      agent: { select: { id: true, name: true, isVerified: true } },
    },
  });

  if (!deployment) throw new Error('Contract not found');

  return {
    ...deployment,
    explorerUrl: getExplorerUrl(deployment.chainKey, deployment.contractAddress),
    createdAt: deployment.createdAt.toISOString(),
    updatedAt: deployment.updatedAt.toISOString(),
  };
});

export const Route = createFileRoute('/contracts/$id')({
  component: ContractDetailPage,
  loader: ({ params }) => getContract({ data: { id: params.id } }),
});

function ContractDetailPage() {
  const contract = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<'overview' | 'abi' | 'source'>('overview');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <ContractHeader contract={contract} />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'overview' && <OverviewTab contract={contract} />}
      {activeTab === 'abi' && <AbiTab contract={contract} />}
      {activeTab === 'source' && <SourceTab contract={contract} />}
    </div>
  );
}

function ContractHeader({ contract }: { contract: any }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    verified: { bg: 'badge-success', text: 'Verified' },
    pending: { bg: 'badge-warning', text: 'Pending' },
    failed: { bg: 'badge-error', text: 'Failed' },
  };

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-3xl font-bold">{contract.contractName}</h1>
        <span className="badge badge-accent">{contract.chainKey}</span>
        <span className={`badge ${statusColors[contract.verificationStatus]?.bg || 'badge-warning'}`}>
          {statusColors[contract.verificationStatus]?.text || contract.verificationStatus}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <code className="font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-3 py-1 rounded">
          {contract.contractAddress}
        </code>
        <a 
          href={contract.explorerUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[var(--color-accent)] hover:underline"
        >
          View on Explorer
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function Tabs({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: 'overview' | 'abi' | 'source') => void }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'abi', label: 'ABI' },
    { id: 'source', label: 'Source Code' },
  ] as const;

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-5 py-3 text-sm font-medium transition-all relative ${
            activeTab === tab.id 
              ? 'text-[var(--color-accent)]' 
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]" />
          )}
        </button>
      ))}
    </div>
  );
}

function OverviewTab({ contract }: { contract: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in animate-fade-in-delay-1">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Description
            </h3>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              {contract.description || "No description"}
            </p>
          </div>
        
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Deployment Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow label="Deployer" value={contract.deployerAddress} mono />
            <DetailRow label="Transaction Hash" value={contract.transactionHash} mono truncate />
            <DetailRow label="Block Number" value={contract.blockNumber} />
            <DetailRow label="Gas Used" value={contract.gasUsed?.toLocaleString()} />
            <DetailRow label="Deployed" value={new Date(contract.createdAt).toLocaleDateString()} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Link 
          to="/agents/$id" 
          params={{ id: contract.agentId }}
          className="card card-accent p-5 block group"
        >
          <h3 className="text-sm text-[var(--color-text-muted)] mb-2">Deployed by</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-glow)] border border-[var(--color-accent-dim)] flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <p className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                {contract.agent?.name}
              </p>
            </div>
          </div>
        </Link>

        <div className="card p-5">
          <h3 className="text-sm text-[var(--color-text-muted)] mb-2">Statistics</h3>
          <div className="flex items-baseline gap-2">
            <span className="stat-value text-3xl">{contract.interactionCount}</span>
            <span className="text-[var(--color-text-muted)]">interactions</span>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm text-[var(--color-text-muted)] mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <a 
              href={contract.abiUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ABI
            </a>
            <a 
              href={contract.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, truncate, valueColor }: { 
  label: string; 
  value: string | number | null | undefined; 
  mono?: boolean;
  truncate?: boolean;
  valueColor?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{label}</dt>
      <dd 
        className={`text-[var(--color-text-primary)] ${mono ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value ?? 'N/A'}
      </dd>
    </div>
  );
}

function AbiTab({ contract }: { contract: any }) {
  return (
    <div className="card p-6 animate-fade-in animate-fade-in-delay-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Contract ABI
        </h3>
        <a 
          href={contract.abiUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
      </div>
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-4">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">ABI stored at:</p>
        <code className="font-mono text-sm text-[var(--color-accent)] break-all">{contract.abiUrl}</code>
      </div>
    </div>
  );
}

function SourceTab({ contract }: { contract: any }) {
  return (
    <div className="card p-6 animate-fade-in animate-fade-in-delay-1">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Source Code
      </h3>
      {contract.sourceUrl ? (
        <a 
          href={contract.sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Source on Explorer
        </a>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[var(--color-text-muted)]">Source code not available</p>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">The contract source has not been verified</p>
        </div>
      )}
    </div>
  );
}

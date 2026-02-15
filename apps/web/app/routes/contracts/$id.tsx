import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/start';
import { prisma } from '@clawcontractbook/database';
import { getExplorerUrl } from '@clawcontractbook/shared';
import { useState } from 'react';

const getContract = createServerFn({ method: 'GET' }).validator((input: { id: string }) => input).handler(async ({ data }) => {
  const deployment = await prisma.deployment.findUnique({
    where: { id: data.id },
    include: {
      agent: { select: { id: true, name: true, reputation: true, isVerified: true } },
      _count: { select: { transactions: true } },
    },
  });

  if (!deployment) throw new Error('Contract not found');

  return {
    ...deployment,
    transactionCount: deployment._count.transactions,
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
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{contract.contractName}</h1>
          <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">{contract.chainKey}</span>
          <span className={`text-xs px-2 py-1 rounded ${
            contract.verificationStatus === 'verified' ? 'bg-green-900 text-green-400' :
            contract.verificationStatus === 'failed' ? 'bg-red-900 text-red-400' :
            'bg-yellow-900 text-yellow-400'
          }`}>{contract.verificationStatus}</span>
        </div>
        <p className="text-gray-400 font-mono text-sm">{contract.contractAddress}</p>
        <a href={contract.explorerUrl} target="_blank" rel="noopener noreferrer"
          className="text-yellow-400 hover:text-yellow-300 text-sm mt-1 inline-block">
          View on Explorer ↗
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6">
        {(['overview', 'abi', 'source'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {contract.description && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="font-bold mb-2">Description</h3>
                <p className="text-gray-400">{contract.description}</p>
              </div>
            )}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-bold mb-3">Deployment Details</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">Deployer</dt>
                <dd className="text-gray-300 font-mono truncate">{contract.deployerAddress}</dd>
                <dt className="text-gray-500">Transaction</dt>
                <dd className="text-gray-300 font-mono truncate">{contract.transactionHash}</dd>
                <dt className="text-gray-500">Block</dt>
                <dd className="text-gray-300">{contract.blockNumber}</dd>
                <dt className="text-gray-500">Gas Used</dt>
                <dd className="text-gray-300">{contract.gasUsed}</dd>
                <dt className="text-gray-500">Security Score</dt>
                <dd className={`font-bold ${
                  (contract.securityScore || 0) >= 80 ? 'text-green-400' :
                  (contract.securityScore || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>{contract.securityScore ?? 'N/A'}</dd>
              </dl>
            </div>
          </div>
          <div>
            <Link to="/agents/$id" params={{ id: contract.agentId }}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 block hover:border-yellow-500/50 transition-colors">
              <h3 className="font-bold mb-2">Deployed by</h3>
              <p className="text-yellow-400">{contract.agent?.name}</p>
              <p className="text-sm text-gray-500 mt-1">Reputation: {contract.agent?.reputation}</p>
            </Link>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mt-4">
              <h3 className="font-bold mb-2">Stats</h3>
              <p className="text-gray-400">{contract.transactionCount} transactions</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'abi' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">ABI</h3>
            <a href={contract.abiUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-yellow-400 hover:text-yellow-300">Download ABI ↗</a>
          </div>
          <p className="text-gray-500 text-sm">
            <a href={contract.abiUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
              {contract.abiUrl}
            </a>
          </p>
        </div>
      )}

      {activeTab === 'source' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          {contract.sourceUrl ? (
            <a href={contract.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-yellow-400 hover:underline">View Source Code ↗</a>
          ) : (
            <p className="text-gray-500">Source code not available.</p>
          )}
        </div>
      )}
    </div>
  );
}

import chalk from 'chalk';
import { CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT } from '../../config/clawcontractbook.js';
import { displayResult } from '../utils.js';

export async function verifiedCommand(options: {
  page?: number;
  limit?: number;
  chain?: string;
  search?: string;
  sort?: string;
  json?: boolean;
}): Promise<void> {
  const baseUrl = CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT;
  const params = new URLSearchParams();
  params.set('page', String(options.page || 1));
  params.set('limit', String(options.limit || 20));
  if (options.chain) params.set('chain', options.chain);
  if (options.search) params.set('search', options.search);
  if (options.sort) params.set('sort', options.sort);

  const url = `${baseUrl}/api/v1/deployments/verified?${params}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch verified deployments: ${res.status} ${res.statusText}`);
  }

  const body = await res.json() as {
    success: boolean;
    data: {
      deployments: Array<{
        id: string;
        contractAddress: string;
        chainKey: string;
        contractName: string;
        description: string | null;
        abiUrl: string | null;
        sourceUrl: string | null;
        interactionCount: number;
        verificationStatus: string;
        createdAt: string;
        agent: { id: string; name: string };
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  };

  if (!body.success) {
    throw new Error('API returned unsuccessful response');
  }

  const { deployments, pagination } = body.data;

  if (options.json) {
    console.log(JSON.stringify(body.data, null, 2));
    return;
  }

  console.log(chalk.bold('Verified Deployments\n'));

  if (deployments.length === 0) {
    console.log('No verified deployments found.');
    return;
  }

  displayResult('Total', pagination.total.toString());
  displayResult('Page', `${pagination.page} of ${pagination.totalPages}`);
  console.log();

  deployments.forEach((d, i) => {
    displayResult('Contract', d.contractName);
    displayResult('Address', d.contractAddress);
    displayResult('Chain', d.chainKey);
    displayResult('Agent', d.agent.name);
    displayResult('Interactions', d.interactionCount.toString());
    if (d.abiUrl) {
      displayResult('ABI URL', d.abiUrl);
    }
    if (d.sourceUrl) {
      displayResult('Source URL', d.sourceUrl);
    }
    if (d.description) {
      displayResult('Description', d.description);
    }

    if (i < deployments.length - 1) {
      console.log(chalk.gray('  ─'.repeat(20)));
    }
  });

  console.log();
  if (pagination.hasNext) {
    console.log(chalk.gray(`  Next page: clawcontract-cli verified --page ${pagination.page + 1}`));
  }
}

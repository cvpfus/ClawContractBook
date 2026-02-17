import chalk from 'chalk';
import { CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT } from '../../config/clawcontractbook.js';
import { displayResult } from '../utils.js';

export async function featuredCommand(options: {
  json?: boolean;
}): Promise<void> {
  const baseUrl = CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT;
  const url = `${baseUrl}/api/v1/deployments/featured`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch featured deployments: ${res.status} ${res.statusText}`);
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
    };
  };

  if (!body.success) {
    throw new Error('API returned unsuccessful response');
  }

  const deployments = body.data.deployments;

  if (options.json) {
    console.log(JSON.stringify(deployments, null, 2));
    return;
  }

  console.log(chalk.bold('Featured Verified Deployments\n'));

  if (deployments.length === 0) {
    console.log('No featured deployments found.');
    return;
  }

  displayResult('Total', deployments.length.toString());
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
}

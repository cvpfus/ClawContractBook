import { prisma } from '@clawcontractbook/database';

export async function recalculateReputation(agentId: string): Promise<number> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      deployments: {
        include: { _count: { select: { transactions: true } } },
      },
      attestationsReceived: {
        include: { source: { select: { reputation: true } } },
      },
    },
  });

  if (!agent) throw new Error('Agent not found');

  let score = 0;

  // Deployment count bonus (10 points each)
  score += agent.deployments.length * 10;

  // Security score quality bonus
  const deploymentsWithScore = agent.deployments.filter(d => d.securityScore !== null);
  if (deploymentsWithScore.length > 0) {
    const avgSecurityScore = deploymentsWithScore.reduce(
      (sum, d) => sum + (d.securityScore || 0), 0
    ) / deploymentsWithScore.length;
    score += avgSecurityScore * 20;
  }

  // Transaction volume bonus (0.01 per tx)
  const totalTransactions = agent.deployments.reduce(
    (sum, d) => sum + d._count.transactions, 0
  );
  score += totalTransactions * 0.01;

  // Peer attestation bonus
  for (const attestation of agent.attestationsReceived) {
    const sourceReputation = attestation.source.reputation;
    const weight = Math.log10(sourceReputation + 10);
    score += attestation.score * 50 * weight;
  }

  // Verification bonus
  if (agent.isVerified) {
    score += 100;
  }

  // Failed verification penalty
  const failedVerifications = agent.deployments.filter(
    d => d.verificationStatus === 'failed'
  ).length;
  score -= failedVerifications * 25;

  score = Math.max(0, Math.round(score));

  await prisma.agent.update({
    where: { id: agentId },
    data: { reputation: score },
  });

  return score;
}

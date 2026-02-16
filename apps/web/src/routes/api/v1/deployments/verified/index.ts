import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';

export const Route = createFileRoute('/api/v1/deployments/verified/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const urlObj = new URL(request.url, 'http://localhost:3000');
        const { searchParams } = urlObj;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const chain = searchParams.get('chain');
        const agent = searchParams.get('agent');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort') || 'newest';

        const where: any = {
          verificationStatus: 'verified',
        };
        if (chain) where.chainKey = chain;
        if (agent) where.agentId = agent;
        if (search) {
          where.OR = [
            { contractName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        const orderBy: any = {};
        switch (sort) {
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

        return json({
          success: true,
          data: {
            deployments: deployments.map(d => ({
              id: d.id,
              contractAddress: d.contractAddress,
              chainKey: d.chainKey,
              chainId: d.chainId,
              contractName: d.contractName,
              description: d.description,
              abiUrl: d.abiUrl,
              sourceUrl: d.sourceUrl,
              deployerAddress: d.deployerAddress,
              transactionHash: d.transactionHash,
              blockNumber: d.blockNumber,
              gasUsed: d.gasUsed,
              verificationStatus: d.verificationStatus,
              agent: d.agent,
              interactionCount: d.interactionCount,
              compilerVersion: d.compilerVersion,
              contractBytecodeHash: d.contractBytecodeHash,
              verifiedAt: d.verifiedAt?.toISOString() || null,
              verificationError: d.verificationError,
              createdAt: d.createdAt.toISOString(),
              updatedAt: d.updatedAt.toISOString(),
            })),
            pagination: {
              page, limit, total,
              totalPages: Math.ceil(total / limit),
              hasNext: page * limit < total,
              hasPrev: page > 1,
            },
          },
        });
      },
    },
  },
});

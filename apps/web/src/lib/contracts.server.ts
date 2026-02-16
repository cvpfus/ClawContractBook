import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';
import { getExplorerUrl } from '@clawcontractbook/shared';

export const getContracts = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: { page: number; chain?: string; search?: string; sort?: string }) =>
      input,
  )
  .handler(async ({ data }) => {
    const { page, chain, search, sort } = data;
    const limit = 20;

    const where: Record<string, unknown> = {};
    if (chain) where.chainKey = chain;
    if (search) {
      where.OR = [
        { contractName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, unknown> = {};
    switch (sort) {
      case 'oldest':
        orderBy.createdAt = 'asc';
        break;
      case 'name':
        orderBy.contractName = 'asc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agent: { select: { id: true, name: true } },
        },
      }),
      prisma.deployment.count({ where }),
    ]);

    return {
      deployments: deployments.map((d) => ({
        id: d.id,
        contractAddress: d.contractAddress,
        chainKey: d.chainKey,
        contractName: d.contractName,
        description: d.description,
        agent: d.agent,
        interactionCount: d.interactionCount,
        createdAt: d.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  });

export const getContract = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }: { data: { id: string } }) => {
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

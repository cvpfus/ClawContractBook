import { createServerFn } from '@tanstack/react-start';
import { prisma } from '@clawcontractbook/database';

export const getAgents = createServerFn({ method: 'GET' })
  .inputValidator((input: { sort?: string; search?: string }) => input)
  .handler(async ({ data }: { data: { sort?: string; search?: string } }) => {
    const where: Record<string, unknown> = {};
    if (data.search) {
      where.name = { contains: data.search, mode: 'insensitive' };
    }

    const orderBy: Record<string, unknown> = {};
    switch (data.sort) {
      case 'deployments':
        orderBy.deployments = { _count: 'desc' };
        break;
      case 'newest':
        orderBy.createdAt = 'desc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const agents = await prisma.agent.findMany({
      where,
      orderBy,
      take: 50,
      select: {
        id: true,
        name: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { deployments: true } },
      },
    });

    return agents.map(a => ({
      ...a,
      deploymentCount: a._count.deployments,
      createdAt: a.createdAt.toISOString(),
    }));
  });

export const getAgent = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }: { data: { id: string } }) => {
    const agent = await prisma.agent.findUnique({
      where: { id: data.id },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { deployments: true } },
      },
    });

    if (!agent) throw new Error('Agent not found');

    return {
      id: agent.id,
      name: agent.name,
      isVerified: agent.isVerified,
      publicKey: agent.publicKey,
      deploymentCount: agent._count.deployments,
      createdAt: agent.createdAt.toISOString(),
      deployments: agent.deployments.map(d => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    };
  });

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

const DEPLOYMENTS_PER_PAGE = 21;

export const getAgent = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string; page?: number }) => input)
  .handler(async ({ data }: { data: { id: string; page?: number } }) => {
    const page = data.page ?? 1;
    const agent = await prisma.agent.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        name: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { deployments: true } },
      },
    });

    if (!agent) throw new Error('Agent not found');

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        where: { agentId: data.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * DEPLOYMENTS_PER_PAGE,
        take: DEPLOYMENTS_PER_PAGE,
      }),
      prisma.deployment.count({ where: { agentId: data.id } }),
    ]);

    return {
      id: agent.id,
      name: agent.name,
      isVerified: agent.isVerified,
      deploymentCount: agent._count.deployments,
      createdAt: agent.createdAt.toISOString(),
      deployments: deployments.map(d => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit: DEPLOYMENTS_PER_PAGE,
        total,
        totalPages: Math.ceil(total / DEPLOYMENTS_PER_PAGE),
        hasNext: page * DEPLOYMENTS_PER_PAGE < total,
        hasPrev: page > 1,
      },
    };
  });

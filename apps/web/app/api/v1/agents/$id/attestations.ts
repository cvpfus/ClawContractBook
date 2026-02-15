import { json } from '@tanstack/start';
import { createAPIFileRoute } from '@tanstack/start/api';
import { prisma } from '@clawcontractbook/database';
import { errorResponse } from '~/lib/auth';

export const APIRoute = createAPIFileRoute('/api/v1/agents/$id/attestations')({
  GET: async ({ request, params }) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const agent = await prisma.agent.findUnique({ where: { id: params.id } });
    if (!agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404);
    }

    const where = type === 'received'
      ? { targetId: params.id }
      : { sourceId: params.id };

    const attestations = await prisma.attestation.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        source: { select: { id: true, name: true, reputation: true } },
        target: { select: { id: true, name: true } },
      },
    });

    const summary = await prisma.attestation.groupBy({
      by: ['score'],
      where: { targetId: params.id },
      _count: { score: true },
    });

    const summaryMap = {
      positive: summary.find(s => s.score === 1)?._count.score || 0,
      neutral: summary.find(s => s.score === 0)?._count.score || 0,
      negative: summary.find(s => s.score === -1)?._count.score || 0,
    };

    return json({
      success: true,
      data: {
        attestations: attestations.map(a => ({
          id: a.id,
          source: type === 'received' ? a.source : undefined,
          target: type === 'given' ? a.target : undefined,
          score: a.score,
          reason: a.reason,
          createdAt: a.createdAt.toISOString(),
        })),
        summary: {
          ...summaryMap,
          total: summaryMap.positive + summaryMap.neutral + summaryMap.negative,
        },
      },
    });
  },
});

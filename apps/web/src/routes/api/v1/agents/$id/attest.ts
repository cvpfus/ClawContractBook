import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { attestSchema } from '@clawcontractbook/shared';
import { verifyHmacAuth, errorResponse } from '~/lib/auth';
import { recalculateReputation } from '~/lib/reputation';

// @ts-expect-error - API routes are handled differently by TanStack Start
export const Route = createFileRoute('/api/v1/agents/$id/attest')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { agentId: sourceId } = await verifyHmacAuth(request);
          const targetId = params.id;

          if (sourceId === targetId) {
            return errorResponse('SELF_ATTESTATION', 'Cannot attest to yourself', 403);
          }

          const targetAgent = await prisma.agent.findUnique({
            where: { id: targetId },
          });
          if (!targetAgent) {
            return errorResponse('AGENT_NOT_FOUND', 'Target agent not found', 404);
          }

          const existing = await prisma.attestation.findUnique({
            where: { sourceId_targetId: { sourceId, targetId } },
          });
          if (existing) {
            return errorResponse('ATTESTATION_EXISTS', 'You have already attested to this agent', 409);
          }

          const body = await request.json();
          const data = attestSchema.parse(body);

          const attestation = await prisma.attestation.create({
            data: { sourceId, targetId, score: data.score, reason: data.reason },
          });

          await recalculateReputation(targetId);

          const updatedTarget = await prisma.agent.findUnique({
            where: { id: targetId },
            select: { id: true, name: true, reputation: true },
          });

          return json({
            success: true,
            data: {
              attestation: {
                id: attestation.id,
                sourceId: attestation.sourceId,
                targetId: attestation.targetId,
                score: attestation.score,
                reason: attestation.reason,
                createdAt: attestation.createdAt.toISOString(),
              },
              targetAgent: updatedTarget,
            },
          }, { status: 201 });
        } catch (error: any) {
          if (error.code?.startsWith('AUTH_')) {
            return errorResponse(error.code, error.message, 401);
          }
          if (error.name === 'ZodError') {
            return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400);
          }
          return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
        }
      },
    },
  },
});

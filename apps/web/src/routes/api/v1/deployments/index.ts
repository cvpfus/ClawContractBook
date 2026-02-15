import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';
import { createDeploymentSchema } from '@clawcontractbook/shared';
import { uploadAbi, uploadSource } from '@clawcontractbook/s3-client';
import { verifyHmacAuth, errorResponse } from '~/lib/auth';

// @ts-expect-error - API routes are handled differently by TanStack Start
export const Route = createFileRoute('/api/v1/deployments/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { agentId } = await verifyHmacAuth(request);
          const body = await request.json();
          const data = createDeploymentSchema.parse(body);

          // Check duplicate
          const existing = await prisma.deployment.findUnique({
            where: {
              contractAddress_chainKey: {
                contractAddress: data.contractAddress.toLowerCase(),
                chainKey: data.chainKey,
              },
            },
          });

          if (existing) {
            return errorResponse('DEPLOYMENT_EXISTS', 'Contract already published at this address on this chain', 409);
          }

          // Upload to S3
          const [abiUrl, sourceUrl] = await Promise.all([
            uploadAbi(data.chainKey, data.contractAddress, data.abi),
            data.sourceCode
              ? uploadSource(data.chainKey, data.contractAddress, data.sourceCode)
              : Promise.resolve(null),
          ]);

          const deployment = await prisma.deployment.create({
            data: {
              contractAddress: data.contractAddress.toLowerCase(),
              chainKey: data.chainKey,
              chainId: data.chainId,
              contractName: data.contractName,
              description: data.description,
              abiUrl,
              sourceUrl,
              deployerAddress: data.deployerAddress.toLowerCase(),
              transactionHash: data.transactionHash,
              blockNumber: data.blockNumber,
              gasUsed: data.gasUsed,
              securityScore: data.securityScore,
              agentId,
            },
            include: {
              agent: { select: { id: true, name: true } },
            },
          });

          return json({
            success: true,
            data: {
              deployment: {
                id: deployment.id,
                contractAddress: deployment.contractAddress,
                chainKey: deployment.chainKey,
                chainId: deployment.chainId,
                contractName: deployment.contractName,
                description: deployment.description,
                abiUrl: deployment.abiUrl,
                sourceUrl: deployment.sourceUrl,
                deployerAddress: deployment.deployerAddress,
                transactionHash: deployment.transactionHash,
                blockNumber: deployment.blockNumber,
                gasUsed: deployment.gasUsed,
                verificationStatus: deployment.verificationStatus,
                securityScore: deployment.securityScore,
                agent: deployment.agent,
                createdAt: deployment.createdAt.toISOString(),
                updatedAt: deployment.updatedAt.toISOString(),
                url: `${process.env.APP_URL || `http://localhost:3000`}/contracts/${deployment.id}`,
              },
            },
          }, { status: 201 });
        } catch (error: any) {
          console.error('[deployments] Error:', error);
          if (error.code?.startsWith('AUTH_')) {
            return errorResponse(error.code, error.message, 401);
          }
          if (error.name === 'ZodError') {
            return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400, error.errors);
          }
          return errorResponse('INTERNAL_ERROR', error.message || 'Internal server error', 500);
        }
      },

      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const chain = searchParams.get('chain');
        const agent = searchParams.get('agent');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort') || 'newest';
        const verified = searchParams.get('verified');

        const where: any = {};
        if (chain) where.chainKey = chain;
        if (agent) where.agentId = agent;
        if (verified) where.verificationStatus = verified;
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
              agent: { select: { id: true, name: true, reputation: true } },
              _count: { select: { transactions: true } },
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
              securityScore: d.securityScore,
              agent: d.agent,
              transactionCount: d._count.transactions,
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

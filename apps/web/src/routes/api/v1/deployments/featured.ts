import { json } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@clawcontractbook/database';

export const Route = createFileRoute('/api/v1/deployments/featured')({
  server: {
    handlers: {
      GET: async () => {
        const deployments = await prisma.$queryRaw<
          Array<{
            id: string;
            contractAddress: string;
            chainKey: string;
            contractName: string;
            description: string | null;
            abiUrl: string | null;
            sourceUrl: string | null;
            interactionCount: number;
            verificationStatus: string;
            createdAt: Date;
            agentId: string;
            agentName: string;
          }>
        >`
          SELECT d."id", d."contractAddress", d."chainKey", d."contractName",
                 d."description", d."abiUrl", d."sourceUrl", d."interactionCount", d."verificationStatus",
                 d."createdAt", a."id" AS "agentId", a."name" AS "agentName"
          FROM "Deployment" d
          JOIN "Agent" a ON d."agentId" = a."id"
          WHERE d."verificationStatus" = 'verified'
          ORDER BY RANDOM()
          LIMIT 10
        `;

        return json({
          success: true,
          data: {
            deployments: deployments.map(d => ({
              id: d.id,
              contractAddress: d.contractAddress,
              chainKey: d.chainKey,
              contractName: d.contractName,
              description: d.description,
              abiUrl: d.abiUrl,
              sourceUrl: d.sourceUrl,
              interactionCount: d.interactionCount,
              verificationStatus: d.verificationStatus,
              createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
              agent: { id: d.agentId, name: d.agentName },
            })),
          },
        });
      },
    },
  },
});

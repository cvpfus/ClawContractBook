/*
  Warnings:

  - You are about to drop the column `securityScore` on the `Deployment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deployment" DROP COLUMN "securityScore",
ADD COLUMN     "compilerVersion" TEXT,
ADD COLUMN     "contractBytecodeHash" TEXT,
ADD COLUMN     "verificationError" TEXT,
ADD COLUMN     "verificationRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Deployment_verifiedAt_idx" ON "Deployment"("verifiedAt");

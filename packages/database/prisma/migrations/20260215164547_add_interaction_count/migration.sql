/*
  Warnings:

  - You are about to drop the `DailyStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_deploymentId_fkey";

-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "interactionCount" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "DailyStats";

-- DropTable
DROP TABLE "Transaction";

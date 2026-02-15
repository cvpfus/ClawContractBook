/*
  Warnings:

  - You are about to drop the column `reputation` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the `Attestation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attestation" DROP CONSTRAINT "Attestation_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "Attestation" DROP CONSTRAINT "Attestation_targetId_fkey";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "reputation";

-- DropTable
DROP TABLE "Attestation";

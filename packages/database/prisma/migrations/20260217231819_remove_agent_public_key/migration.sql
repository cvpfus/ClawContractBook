/*
  Warnings:

  - You are about to drop the column `publicKey` on the `Agent` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Agent_publicKey_key";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "publicKey";

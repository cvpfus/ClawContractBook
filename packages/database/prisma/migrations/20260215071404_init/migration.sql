-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT,
    "apiKeyId" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "chainKey" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractName" TEXT NOT NULL,
    "description" TEXT,
    "abiUrl" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "deployerAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "gasUsed" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "securityScore" INTEGER,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "functionName" TEXT,
    "gasUsed" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalContracts" INTEGER NOT NULL,
    "totalTransactions" INTEGER NOT NULL,
    "newAgents" INTEGER NOT NULL,
    "activeAgents" INTEGER NOT NULL,
    "chainBreakdown" JSONB NOT NULL,
    "topContracts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedNonce" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_publicKey_key" ON "Agent"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_apiKeyId_key" ON "Agent"("apiKeyId");

-- CreateIndex
CREATE INDEX "Agent_apiKeyId_idx" ON "Agent"("apiKeyId");

-- CreateIndex
CREATE INDEX "Deployment_chainKey_idx" ON "Deployment"("chainKey");

-- CreateIndex
CREATE INDEX "Deployment_agentId_idx" ON "Deployment"("agentId");

-- CreateIndex
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- CreateIndex
CREATE INDEX "Deployment_verificationStatus_idx" ON "Deployment"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_contractAddress_chainKey_key" ON "Deployment"("contractAddress", "chainKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_deploymentId_idx" ON "Transaction"("deploymentId");

-- CreateIndex
CREATE INDEX "Transaction_timestamp_idx" ON "Transaction"("timestamp");

-- CreateIndex
CREATE INDEX "Transaction_fromAddress_idx" ON "Transaction"("fromAddress");

-- CreateIndex
CREATE INDEX "Attestation_targetId_idx" ON "Attestation"("targetId");

-- CreateIndex
CREATE INDEX "Attestation_sourceId_idx" ON "Attestation"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_sourceId_targetId_key" ON "Attestation"("sourceId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_date_key" ON "DailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "UsedNonce_nonce_key" ON "UsedNonce"("nonce");

-- CreateIndex
CREATE INDEX "UsedNonce_expiresAt_idx" ON "UsedNonce"("expiresAt");

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

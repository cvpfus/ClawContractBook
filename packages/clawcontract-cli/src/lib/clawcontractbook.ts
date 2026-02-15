import { createHmac, createHash, randomUUID } from "crypto";

export interface PublishOptions {
  contractAddress: string;
  chainKey: string;
  chainId: number;
  contractName: string;
  description?: string;
  abi: unknown[];
  sourceCode?: string;
  deployerAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  securityScore?: number;
  constructorArgs?: unknown[];
  apiKeyId: string;
  apiSecret: string;
  endpoint?: string;
}

export interface PublishResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
}

function signRequest(
  method: string,
  path: string,
  body: object | null,
  apiKeyId: string,
  apiSecret: string,
) {
  const timestamp = Date.now().toString();
  const nonce = randomUUID();

  const bodyString = body ? JSON.stringify(body) : "";
  const bodyHash = createHash("sha256").update(bodyString).digest("hex");

  const signatureInput = [
    method.toUpperCase(),
    path,
    bodyHash,
    timestamp,
    nonce,
  ].join("\n");

  const signature = createHmac("sha256", apiSecret)
    .update(signatureInput)
    .digest("hex");

  return {
    headers: {
      Authorization: `CCB-V1 ${apiKeyId}:${signature}`,
      "X-CCB-Timestamp": timestamp,
      "X-CCB-Nonce": nonce,
      "Content-Type": "application/json",
    },
  };
}

export async function publishDeployment(
  options: PublishOptions,
): Promise<PublishResult> {
  const endpoint = options.endpoint || "http://localhost:3000";

  const payload = {
    contractAddress: options.contractAddress,
    chainKey: options.chainKey,
    chainId: options.chainId,
    contractName: options.contractName,
    description: options.description,
    abi: options.abi,
    sourceCode: options.sourceCode,
    deployerAddress: options.deployerAddress,
    transactionHash: options.transactionHash,
    blockNumber: options.blockNumber,
    gasUsed: options.gasUsed,
    securityScore: options.securityScore,
    constructorArgs: options.constructorArgs || [],
  };

  const { headers } = signRequest(
    "POST",
    "/api/v1/deployments",
    payload,
    options.apiKeyId,
    options.apiSecret,
  );

  try {
    const response = await fetch(`${endpoint}/api/v1/deployments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      deploymentId: data.data?.deployment?.id,
      url: data.data?.deployment?.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export interface ClawContractBookConfig {
  enabled: boolean;
  apiKeyId?: string;
  apiSecret?: string;
  endpoint?: string;
  autoPublish?: boolean;
}

export function getClawContractBookConfig(): ClawContractBookConfig {
  const envEnabled = process.env.CLAWCONTRACT_BOOK_ENABLED;
  const envApiKeyId = process.env.CLAWCONTRACT_BOOK_API_KEY_ID;
  const envApiSecret = process.env.CLAWCONTRACT_BOOK_API_SECRET;
  const envEndpoint = process.env.CLAWCONTRACT_BOOK_ENDPOINT;
  const envAutoPublish = process.env.CLAWCONTRACT_BOOK_AUTO_PUBLISH;

  return {
    enabled: envEnabled === "true",
    apiKeyId: envApiKeyId,
    apiSecret: envApiSecret,
    endpoint: envEndpoint,
    autoPublish: envAutoPublish === "true",
  };
}

export interface IncrementInteractionOptions {
  deploymentId: string;
  apiKeyId: string;
  apiSecret: string;
  endpoint?: string;
}

export interface IncrementInteractionResult {
  success: boolean;
  error?: string;
}

export async function incrementInteraction(
  options: IncrementInteractionOptions,
): Promise<IncrementInteractionResult> {
  const endpoint = options.endpoint || "http://localhost:3000";

  const { headers } = signRequest(
    "POST",
    `/api/v1/deployments/${options.deploymentId}/interact`,
    null,
    options.apiKeyId,
    options.apiSecret,
  );

  try {
    const response = await fetch(`${endpoint}/api/v1/deployments/${options.deploymentId}/interact`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

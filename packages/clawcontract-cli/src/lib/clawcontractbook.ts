import { createHmac, createHash, randomUUID } from "crypto";
import { CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT } from "../config/index.js";

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
  const endpoint = options.endpoint || CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT;

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

export interface RegisterAgentOptions {
  name: string;
  endpoint?: string;
}

export interface RegisterAgentResult {
  success: boolean;
  agentId?: string;
  name?: string;
  apiKeyId?: string;
  apiSecret?: string;
  error?: string;
}

export async function registerAgent(
  options: RegisterAgentOptions,
): Promise<RegisterAgentResult> {
  const endpoint = options.endpoint || CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT;

  const body = { name: options.name };

  try {
    const response = await fetch(`${endpoint}/api/v1/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    const agent = data.data?.agent;
    const creds = data.data?.credentials;

    return {
      success: true,
      agentId: agent?.id,
      name: agent?.name,
      apiKeyId: creds?.apiKeyId,
      apiSecret: creds?.apiSecret,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
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

export interface GetAgentOptions {
  agentId: string;
  endpoint?: string;
}

export interface GetAgentResult {
  success: boolean;
  agent?: {
    id: string;
    name: string;
    isVerified: boolean;
    deploymentCount: number;
    createdAt: string;
  };
  error?: string;
}

export async function getAgent(
  options: GetAgentOptions,
): Promise<GetAgentResult> {
  const endpoint = options.endpoint || CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT;

  try {
    const response = await fetch(`${endpoint}/api/v1/agents/${options.agentId}`);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    const agent = data.data?.agent;
    return {
      success: true,
      agent: agent
        ? {
            id: agent.id,
            name: agent.name,
            isVerified: agent.isVerified ?? false,
            deploymentCount: agent.deploymentCount ?? 0,
            createdAt: agent.createdAt ?? "",
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function incrementInteraction(
  options: IncrementInteractionOptions,
): Promise<IncrementInteractionResult> {
  const endpoint = options.endpoint || CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT;

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

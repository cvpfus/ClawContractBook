import { createLLMClient } from "./llm.js";
import {
  extractContractName,
  sanitizeFileName,
  writeFileUnique,
  ensureOutputDir,
} from "./utils.js";

export { createLLMClient } from "./llm.js";
export type { LLMClient } from "./llm.js";
export { extractContractName, sanitizeFileName, writeFileUnique, ensureOutputDir } from "./utils.js";

export interface GenerateOptions {
  description?: string;
  outputDir: string;
  useAI: boolean;
  /** When provided, skip AI and write this source to file */
  source?: string;
}

export interface GenerateResult {
  filePath: string;
  contractName: string;
  source: string;
  aiGenerated: boolean;
}

export async function generateContract(
  options: GenerateOptions
): Promise<GenerateResult> {
  const { description, outputDir, useAI, source: suppliedSource } = options;

  if (suppliedSource !== undefined) {
    if (description !== undefined) {
      throw new Error('Use either description (for AI) or source (for your own contract), not both.');
    }
    await ensureOutputDir(outputDir);
    const contractName = extractContractName(suppliedSource);
    const fileName = sanitizeFileName(contractName);
    const filePath = await writeFileUnique(outputDir, fileName, suppliedSource);
    return {
      filePath,
      contractName,
      source: suppliedSource,
      aiGenerated: false,
    };
  }

  if (!description) {
    throw new Error('Provide either a description (for AI generation) or use --source / --stdin (for your own contract).');
  }

  const llm = createLLMClient();
  const aiAvailable = useAI && llm.isAvailable();

  if (aiAvailable) {
    const validation = await llm.validatePrompt(description);
    if (!validation.allowed) {
      throw new Error(
        `Request rejected: ${validation.reason || "Token / ERC-20 contract generation is not allowed."}`
      );
    }
  }

  let source: string;
  let aiGenerated = false;

  if (aiAvailable) {
    source = await llm.generateContract(description);
    aiGenerated = true;
  } else {
    throw new Error(
      "AI generation is unavailable. " +
        "Set the CLAWCONTRACT_OPENROUTER_API_KEY environment variable to enable contract generation."
    );
  }

  await ensureOutputDir(outputDir);

  const contractName = extractContractName(source);
  const fileName = sanitizeFileName(contractName);
  const filePath = await writeFileUnique(outputDir, fileName, source);

  return {
    filePath,
    contractName,
    source,
    aiGenerated,
  };
}

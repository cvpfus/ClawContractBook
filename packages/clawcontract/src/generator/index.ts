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
  description: string;
  outputDir: string;
  useAI: boolean;
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
  const { description, outputDir, useAI } = options;

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

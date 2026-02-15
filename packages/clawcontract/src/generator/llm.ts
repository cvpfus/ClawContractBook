export type LLMProvider = "openrouter";

export interface PromptValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface LLMClient {
  isAvailable(): boolean;
  provider(): LLMProvider | null;
  validatePrompt(description: string): Promise<PromptValidationResult>;
  customizeContract(template: string, description: string): Promise<string>;
  generateContract(description: string): Promise<string>;
  suggestFixes(code: string, issues: string[]): Promise<string>;
}

const SOLIDITY_SYSTEM_PROMPT = `You are a Solidity smart contract developer specializing in BNB Smart Chain and opBNB.
Follow these rules strictly:
- Use Solidity ^0.8.20
- Contracts must be fully self-contained with NO import statements
- Ensure compatibility with BSC and opBNB (EVM-compatible)
- Always include an SPDX license identifier comment at the top (e.g., // SPDX-License-Identifier: MIT)
- Return ONLY the Solidity source code, no markdown fences, no explanations`;

const OPENROUTER_MODEL = process.env.CLAWCONTRACT_OPENROUTER_MODEL || "anthropic/claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:solidity)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
}

const VALIDATION_SYSTEM_PROMPT = `You are a smart contract request validator. Your job is to determine whether a user's request is asking to generate a token or ERC-20 / BEP-20 contract.

Reject the request if the user is asking to:
- Create, generate, build, or deploy an ERC-20 or BEP-20 token
- Create a fungible token contract
- Create a token with name, symbol, supply, mint, or burn functionality
- Any variation of creating a cryptocurrency token

Allow the request if it is about other types of smart contracts (NFTs, DAOs, staking, vesting, voting, escrow, etc.) even if they mention tokens incidentally (e.g. "staking contract that accepts token X").

Respond with ONLY a JSON object (no markdown fences):
{"allowed": true} if the request is acceptable
{"allowed": false, "reason": "<brief reason>"} if the request is a token/ERC-20 generation request`;

async function openRouterChatWithSystem(apiKey: string, systemPrompt: string, userMessage: string, maxTokens: number = MAX_TOKENS): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/clawcontract",
      "X-Title": "ClawContract",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (data.error?.message) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No text response from OpenRouter");
  }

  return content.trim();
}

async function openRouterChat(apiKey: string, userMessage: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/clawcontract",
      "X-Title": "ClawContract",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: SOLIDITY_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (data.error?.message) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No text response from OpenRouter");
  }

  return stripMarkdownFences(content.trim());
}

function createOpenRouterClient(apiKey: string): LLMClient {
  return {
    isAvailable: () => true,
    provider: () => "openrouter",
    validatePrompt: async (description) => {
      const raw = await openRouterChatWithSystem(apiKey, VALIDATION_SYSTEM_PROMPT, description, 256);
      try {
        const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
        const result = JSON.parse(cleaned) as { allowed: boolean; reason?: string };
        return { allowed: result.allowed, reason: result.reason };
      } catch {
        return { allowed: true };
      }
    },
    customizeContract: (template, description) =>
      openRouterChat(apiKey, `I have the following Solidity contract template:\n\n${template}\n\nUser request: "${description}"\n\nCustomize this template based on the user's request. Fill in all placeholder values (anything in {{DOUBLE_BRACES}}) with appropriate values extracted from the description. Add any additional features the user requested. Keep the contract self-contained with no imports. Return ONLY the complete Solidity source code.`),
    generateContract: (description) =>
      openRouterChat(apiKey, `Generate a complete Solidity smart contract based on this description:\n\n"${description}"\n\nThe contract must be:\n- Fully self-contained (no imports)\n- Compatible with BSC/opBNB\n- Using Solidity ^0.8.20\n- Well-structured with appropriate access control\n- Including relevant events and error handling\n\nReturn ONLY the Solidity source code.`),
    suggestFixes: (code, issues) => {
      const issueList = issues.map((i, idx) => `${idx + 1}. ${i}`).join("\n");
      return openRouterChat(apiKey, `The following Solidity contract has security issues found by Slither:\n\nContract:\n${code}\n\nIssues:\n${issueList}\n\nFix all the listed issues and return the corrected Solidity source code. Keep the contract self-contained with no imports. Return ONLY the complete fixed Solidity source code.`);
    },
  };
}

const NULL_CLIENT: LLMClient = {
  isAvailable: () => false,
  provider: () => null,
  validatePrompt: async () => ({ allowed: true }),
  customizeContract: () => { throw new Error("No LLM API key configured. Set CLAWCONTRACT_OPENROUTER_API_KEY."); },
  generateContract: () => { throw new Error("No LLM API key configured. Set CLAWCONTRACT_OPENROUTER_API_KEY."); },
  suggestFixes: () => { throw new Error("No LLM API key configured. Set CLAWCONTRACT_OPENROUTER_API_KEY."); },
};

export function createLLMClient(): LLMClient {
  const openrouterKey = process.env.CLAWCONTRACT_OPENROUTER_API_KEY;

  if (openrouterKey) {
    return createOpenRouterClient(openrouterKey);
  }

  return NULL_CLIENT;
}

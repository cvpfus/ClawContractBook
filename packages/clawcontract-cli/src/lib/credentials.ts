import fs from "node:fs";
import path from "node:path";
import { CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT } from "../config/index.js";

const CREDENTIALS_FILENAME = ".clawcontractbook.json";
const DEFAULT_CREDENTIALS_DIR = "clawcontractbook";
const DEFAULT_CREDENTIALS_FILE = "credentials.json";

export interface ClawContractBookCredentials {
  apiKeyId: string;
  apiSecret: string;
  endpoint?: string;
  agentId?: string;
  name?: string;
}

/** Default path: <cwd>/clawcontractbook/credentials.json */
export function defaultCredentialsPath(): string {
  return path.resolve(process.cwd(), DEFAULT_CREDENTIALS_DIR, DEFAULT_CREDENTIALS_FILE);
}

function projectCredentialsPath(): string {
  return path.resolve(process.cwd(), CREDENTIALS_FILENAME);
}

/**
 * Load credentials from the conventional locations.
 * Checks: 1) .clawcontractbook.json in cwd, 2) clawcontractbook/credentials.json in cwd
 */
export function loadCredentials(): ClawContractBookCredentials | null {
  const projectPath = projectCredentialsPath();
  if (fs.existsSync(projectPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
      if (raw?.apiKeyId && raw?.apiSecret) {
        return raw as ClawContractBookCredentials;
      }
    } catch {
      // invalid file, try default
    }
  }

  const defaultPath = defaultCredentialsPath();
  if (fs.existsSync(defaultPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(defaultPath, "utf-8"));
      if (raw?.apiKeyId && raw?.apiSecret) {
        return raw as ClawContractBookCredentials;
      }
    } catch {
      // invalid
    }
  }

  return null;
}

/**
 * Save credentials to the given path. Creates parent directories if needed.
 */
export function saveCredentials(
  credentials: ClawContractBookCredentials,
  filePath: string,
): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const content = JSON.stringify(
    {
      apiKeyId: credentials.apiKeyId,
      apiSecret: credentials.apiSecret,
      endpoint: credentials.endpoint ?? CLAWCONTRACT_BOOK_DEFAULT_ENDPOINT,
      ...(credentials.agentId && { agentId: credentials.agentId }),
      ...(credentials.name && { name: credentials.name }),
    },
    null,
    2,
  );
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Resolve credentials: use flags if both provided, otherwise load from file.
 */
export function resolveCredentials(flags: {
  apiKeyId?: string;
  apiSecret?: string;
}): ClawContractBookCredentials | null {
  if (flags.apiKeyId && flags.apiSecret) {
    return {
      apiKeyId: flags.apiKeyId,
      apiSecret: flags.apiSecret,
    };
  }
  return loadCredentials();
}

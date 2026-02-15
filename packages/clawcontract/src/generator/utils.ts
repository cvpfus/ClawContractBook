import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export function extractContractName(source: string): string {
  const match = source.match(/contract\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:is\s|{)/);
  if (match) {
    return match[1];
  }
  return "GeneratedContract";
}

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, " ");
  const pascal = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  if (!pascal) {
    return "Contract.sol";
  }
  return pascal.endsWith(".sol") ? pascal : `${pascal}.sol`;
}

export async function writeFileUnique(
  dir: string,
  fileName: string,
  content: string,
): Promise<string> {
  const ext = path.extname(fileName);
  const base = fileName.slice(0, -ext.length);
  let candidate = path.resolve(dir, fileName);
  let counter = 0;
  const maxAttempts = 100;

  while (counter < maxAttempts) {
    try {
      await writeFile(candidate, content, { encoding: "utf-8", flag: "wx" });
      return candidate;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        counter++;
        candidate = path.resolve(dir, `${base}_${counter}${ext}`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Could not find unique filename for ${fileName} after ${maxAttempts} attempts`);
}

export async function ensureOutputDir(dir: string): Promise<void> {
  const resolved = path.resolve(dir);
  await mkdir(resolved, { recursive: true });
}

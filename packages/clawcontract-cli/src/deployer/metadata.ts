import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Public interface (unchanged for backwards compat)
// ---------------------------------------------------------------------------

export interface DeploymentRecord {
  contractAddress: string;
  abi: readonly Record<string, unknown>[];
  chainKey: string;
  contractName: string;
  sourceFile: string;
  deployer: string;
  transactionHash: string;
  blockNumber: number;
  deployedAt: string;
  deploymentId?: string;
}

// ---------------------------------------------------------------------------
// Internal types (on-disk formats)
// ---------------------------------------------------------------------------

interface StoredRecord {
  version: 2;
  contractAddress: string;
  abiHash: string;
  chainKey: string;
  contractName: string;
  sourceFile: string;
  deployer: string;
  transactionHash: string;
  blockNumber: number;
  deployedAt: string;
  deploymentId?: string;
}

interface DeploymentsIndex {
  version: 2;
  byAddress: Record<string, { chainKey: string; contractName: string }>;
  byChain: Record<
    string,
    Record<string, { latestAddress: string; addresses: string[] }>
  >;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const DEPLOYMENTS_DIR = '.deployments';
const LEGACY_FILE = '.deployments.json';
const LEGACY_BACKUP = '.deployments.v1.json.bak';

function deploymentsRoot(outputDir: string): string {
  return path.resolve(outputDir, DEPLOYMENTS_DIR);
}

function indexPath(outputDir: string): string {
  return path.join(deploymentsRoot(outputDir), 'index.json');
}

function abiFilePath(outputDir: string, hash: string): string {
  return path.join(deploymentsRoot(outputDir), 'abis', `${hash}.json`);
}

function recordFilePath(
  outputDir: string,
  chainKey: string,
  contractName: string,
  address: string,
): string {
  return path.join(
    deploymentsRoot(outputDir),
    'records',
    chainKey,
    contractName,
    `${address}.json`,
  );
}

// ---------------------------------------------------------------------------
// ABI hashing
// ---------------------------------------------------------------------------

function hashAbi(abi: readonly Record<string, unknown>[]): string {
  return crypto.createHash('sha256').update(JSON.stringify(abi)).digest('hex');
}

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

function emptyIndex(): DeploymentsIndex {
  return { version: 2, byAddress: {}, byChain: {} };
}

function readIndex(outputDir: string): DeploymentsIndex {
  const p = indexPath(outputDir);
  if (!fs.existsSync(p)) {
    return emptyIndex();
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as DeploymentsIndex;
}

function atomicWriteJson(filePath: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2);
  const tmpFile = path.join(
    os.tmpdir(),
    `deploy-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  fs.writeFileSync(tmpFile, content, 'utf-8');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    fs.renameSync(tmpFile, filePath);
  } catch {
    fs.copyFileSync(tmpFile, filePath);
    fs.unlinkSync(tmpFile);
  }
}

// ---------------------------------------------------------------------------
// Migration from v1 flat file
// ---------------------------------------------------------------------------

function migrateIfNeeded(outputDir: string): void {
  const legacyPath = path.resolve(outputDir, LEGACY_FILE);
  const root = deploymentsRoot(outputDir);

  if (!fs.existsSync(legacyPath) || fs.existsSync(root)) {
    return;
  }

  const raw = fs.readFileSync(legacyPath, 'utf-8');
  let records: DeploymentRecord[];
  try {
    records = JSON.parse(raw) as DeploymentRecord[];
  } catch {
    return; // corrupted legacy file – skip migration
  }

  // Bootstrap empty directory structure
  fs.mkdirSync(root, { recursive: true });

  const index = emptyIndex();

  for (const record of records) {
    const abiH = hashAbi(record.abi);

    // Write ABI file if not already present
    const abiPath = abiFilePath(outputDir, abiH);
    if (!fs.existsSync(abiPath)) {
      fs.mkdirSync(path.dirname(abiPath), { recursive: true });
      fs.writeFileSync(
        abiPath,
        JSON.stringify({ abi: record.abi }, null, 2),
        'utf-8',
      );
    }

    // Write record file
    const stored: StoredRecord = {
      version: 2,
      contractAddress: record.contractAddress,
      abiHash: abiH,
      chainKey: record.chainKey,
      contractName: record.contractName,
      sourceFile: record.sourceFile,
      deployer: record.deployer,
      transactionHash: record.transactionHash,
      blockNumber: record.blockNumber,
      deployedAt: record.deployedAt,
    };
    const recPath = recordFilePath(
      outputDir,
      record.chainKey,
      record.contractName,
      record.contractAddress,
    );
    fs.mkdirSync(path.dirname(recPath), { recursive: true });
    fs.writeFileSync(recPath, JSON.stringify(stored, null, 2), 'utf-8');

    // Update index
    const addrLower = record.contractAddress.toLowerCase();
    index.byAddress[addrLower] = {
      chainKey: record.chainKey,
      contractName: record.contractName,
    };

    if (!index.byChain[record.chainKey]) {
      index.byChain[record.chainKey] = {};
    }
    const chainBucket = index.byChain[record.chainKey];
    if (!chainBucket[record.contractName]) {
      chainBucket[record.contractName] = {
        latestAddress: record.contractAddress,
        addresses: [],
      };
    }
    const entry = chainBucket[record.contractName];
    if (!entry.addresses.includes(record.contractAddress)) {
      entry.addresses.push(record.contractAddress);
    }
    entry.latestAddress = record.contractAddress;
  }

  // Write index
  atomicWriteJson(indexPath(outputDir), index);

  // Rename legacy file to backup
  const backupPath = path.resolve(outputDir, LEGACY_BACKUP);
  try {
    fs.renameSync(legacyPath, backupPath);
  } catch {
    fs.copyFileSync(legacyPath, backupPath);
    fs.unlinkSync(legacyPath);
  }
}

// ---------------------------------------------------------------------------
// Reconstruct a full DeploymentRecord from stored record + ABI file
// ---------------------------------------------------------------------------

function hydrateRecord(
  stored: StoredRecord,
  outputDir: string,
): DeploymentRecord {
  const abiPath = abiFilePath(outputDir, stored.abiHash);
  const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf-8')) as {
    abi: Record<string, unknown>[];
  };

  return {
    contractAddress: stored.contractAddress,
    abi: abiData.abi,
    chainKey: stored.chainKey,
    contractName: stored.contractName,
    sourceFile: stored.sourceFile,
    deployer: stored.deployer,
    transactionHash: stored.transactionHash,
    blockNumber: stored.blockNumber,
    deployedAt: stored.deployedAt,
    deploymentId: stored.deploymentId,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function saveDeployment(
  record: DeploymentRecord,
  outputDir: string,
): void {
  migrateIfNeeded(outputDir);

  const root = deploymentsRoot(outputDir);
  fs.mkdirSync(root, { recursive: true });

  // 1. Write ABI file (deduplicated by content hash)
  const abiH = hashAbi(record.abi);
  const abiPath = abiFilePath(outputDir, abiH);
  if (!fs.existsSync(abiPath)) {
    fs.mkdirSync(path.dirname(abiPath), { recursive: true });
    fs.writeFileSync(
      abiPath,
      JSON.stringify({ abi: record.abi }, null, 2),
      'utf-8',
    );
  }

  // 2. Write record file (no ABI inline)
  const stored: StoredRecord = {
    version: 2,
    contractAddress: record.contractAddress,
    abiHash: abiH,
    chainKey: record.chainKey,
    contractName: record.contractName,
    sourceFile: record.sourceFile,
    deployer: record.deployer,
    transactionHash: record.transactionHash,
    blockNumber: record.blockNumber,
    deployedAt: record.deployedAt,
    deploymentId: record.deploymentId,
  };
  const recPath = recordFilePath(
    outputDir,
    record.chainKey,
    record.contractName,
    record.contractAddress,
  );
  fs.mkdirSync(path.dirname(recPath), { recursive: true });
  fs.writeFileSync(recPath, JSON.stringify(stored, null, 2), 'utf-8');

  // 3. Update index.json (atomic write)
  const index = readIndex(outputDir);

  const addrLower = record.contractAddress.toLowerCase();
  index.byAddress[addrLower] = {
    chainKey: record.chainKey,
    contractName: record.contractName,
  };

  if (!index.byChain[record.chainKey]) {
    index.byChain[record.chainKey] = {};
  }
  const chainBucket = index.byChain[record.chainKey];
  if (!chainBucket[record.contractName]) {
    chainBucket[record.contractName] = {
      latestAddress: record.contractAddress,
      addresses: [],
    };
  }
  const entry = chainBucket[record.contractName];
  if (!entry.addresses.includes(record.contractAddress)) {
    entry.addresses.push(record.contractAddress);
  }
  entry.latestAddress = record.contractAddress;

  atomicWriteJson(indexPath(outputDir), index);
}

export function loadDeployment(
  address: string,
  outputDir: string,
): DeploymentRecord | undefined {
  migrateIfNeeded(outputDir);

  const index = readIndex(outputDir);
  const needle = address.toLowerCase();
  const entry = index.byAddress[needle];
  if (!entry) {
    return undefined;
  }

  const recPath = recordFilePath(
    outputDir,
    entry.chainKey,
    entry.contractName,
    // We need the original-cased address stored in the record file name.
    // The index stores the chainKey+contractName; iterate addresses to find the
    // matching one (case-insensitive) so we get the correct filename.
    findOriginalAddress(index, entry.chainKey, entry.contractName, needle),
  );

  if (!fs.existsSync(recPath)) {
    return undefined;
  }

  const stored = JSON.parse(
    fs.readFileSync(recPath, 'utf-8'),
  ) as StoredRecord;
  return hydrateRecord(stored, outputDir);
}

export function loadAllDeployments(outputDir: string): DeploymentRecord[] {
  migrateIfNeeded(outputDir);

  const index = readIndex(outputDir);
  const results: DeploymentRecord[] = [];

  for (const [addrLower, entry] of Object.entries(index.byAddress)) {
    const originalAddr = findOriginalAddress(
      index,
      entry.chainKey,
      entry.contractName,
      addrLower,
    );
    const recPath = recordFilePath(
      outputDir,
      entry.chainKey,
      entry.contractName,
      originalAddr,
    );
    if (!fs.existsSync(recPath)) {
      continue;
    }
    const stored = JSON.parse(
      fs.readFileSync(recPath, 'utf-8'),
    ) as StoredRecord;
    results.push(hydrateRecord(stored, outputDir));
  }

  return results;
}

export function deleteDeployment(address: string, outputDir: string): boolean {
  migrateIfNeeded(outputDir);

  const index = readIndex(outputDir);
  const needle = address.toLowerCase();
  const entry = index.byAddress[needle];
  if (!entry) {
    return false;
  }

  const { chainKey, contractName } = entry;
  const originalAddr = findOriginalAddress(index, chainKey, contractName, needle);

  // 1. Read record to get abiHash, then delete record file
  const recPath = recordFilePath(outputDir, chainKey, contractName, originalAddr);
  const stored = JSON.parse(fs.readFileSync(recPath, 'utf-8')) as StoredRecord;
  const { abiHash } = stored;
  fs.unlinkSync(recPath);

  // 2. Remove from byAddress
  delete index.byAddress[needle];

  // 3. Update byChain
  const chainBucket = index.byChain[chainKey];
  if (chainBucket) {
    const contractEntry = chainBucket[contractName];
    if (contractEntry) {
      contractEntry.addresses = contractEntry.addresses.filter(
        (a) => a.toLowerCase() !== needle,
      );
      if (contractEntry.addresses.length === 0) {
        delete chainBucket[contractName];
      } else if (contractEntry.latestAddress.toLowerCase() === needle) {
        contractEntry.latestAddress =
          contractEntry.addresses[contractEntry.addresses.length - 1];
      }
    }
    if (Object.keys(chainBucket).length === 0) {
      delete index.byChain[chainKey];
    }
  }

  // 4. Garbage-collect ABI file if no remaining record references it
  let abiStillReferenced = false;
  for (const [remainingLower, remainingEntry] of Object.entries(index.byAddress)) {
    const remainingOriginal = findOriginalAddress(
      index,
      remainingEntry.chainKey,
      remainingEntry.contractName,
      remainingLower,
    );
    const remainingRecPath = recordFilePath(
      outputDir,
      remainingEntry.chainKey,
      remainingEntry.contractName,
      remainingOriginal,
    );
    if (fs.existsSync(remainingRecPath)) {
      const remainingStored = JSON.parse(
        fs.readFileSync(remainingRecPath, 'utf-8'),
      ) as StoredRecord;
      if (remainingStored.abiHash === abiHash) {
        abiStillReferenced = true;
        break;
      }
    }
  }
  if (!abiStillReferenced) {
    const abiPath = abiFilePath(outputDir, abiHash);
    if (fs.existsSync(abiPath)) {
      fs.unlinkSync(abiPath);
    }
  }

  // 5. Persist updated index
  atomicWriteJson(indexPath(outputDir), index);
  return true;
}

// ---------------------------------------------------------------------------
// Internal helper – resolve original-cased address from index
// ---------------------------------------------------------------------------

function findOriginalAddress(
  index: DeploymentsIndex,
  chainKey: string,
  contractName: string,
  lowerAddress: string,
): string {
  const chainBucket = index.byChain[chainKey];
  if (chainBucket) {
    const contractEntry = chainBucket[contractName];
    if (contractEntry) {
      for (const addr of contractEntry.addresses) {
        if (addr.toLowerCase() === lowerAddress) {
          return addr;
        }
      }
    }
  }
  // Fallback – use lowercased version (shouldn't happen in a consistent store)
  return lowerAddress;
}

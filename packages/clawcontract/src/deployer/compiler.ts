import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { getHardhatConfigContent } from './hardhat-config-template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CompileResult {
  abi: readonly Record<string, unknown>[];
  bytecode: string;
  contractName: string;
  standardJsonInput: unknown;
  solcLongVersion: string;
  fullyQualifiedName: string;
}

export async function compileContract(sourceFile: string): Promise<CompileResult> {
  const sourceCode = fs.readFileSync(sourceFile, 'utf-8');
  const contractName = extractContractName(sourceCode);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawcontract-'));

  try {
    const contractsDir = path.join(tmpDir, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, 'hardhat.config.ts'),
      getHardhatConfigContent(),
    );

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'temp-compile', type: 'commonjs' }),
    );

    fs.writeFileSync(
      path.join(tmpDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          skipLibCheck: true,
        },
      }),
    );

    const fileName = path.basename(sourceFile);
    fs.writeFileSync(path.join(contractsDir, fileName), sourceCode);

    // Hardhat requires a local installation (HH12). Symlink the package's
    // node_modules into the temp dir so hardhat sees itself as local.
    const pkgRoot = path.resolve(__dirname, '..', '..');
    const pkgNodeModules = path.join(pkgRoot, 'node_modules');
    const tmpNodeModules = path.join(tmpDir, 'node_modules');
    if (fs.existsSync(pkgNodeModules) && !fs.existsSync(tmpNodeModules)) {
      fs.symlinkSync(pkgNodeModules, tmpNodeModules, 'junction');
    }

    const hardhatBin = path.join(tmpDir, 'node_modules', '.bin', 'hardhat');
    const hardhatCmd = fs.existsSync(hardhatBin + '.cmd') ? `"${hardhatBin}.cmd"` : `"${hardhatBin}"`;

    execSync(`${hardhatCmd} compile`, {
      cwd: tmpDir,
      stdio: 'pipe',
      env: { ...process.env, HARDHAT_CONFIG: path.join(tmpDir, 'hardhat.config.ts') },
    });

    const artifactPath = findArtifact(tmpDir, contractName);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8')) as {
      abi: Record<string, unknown>[];
      bytecode: string;
    };

    const buildInfo = readBuildInfo(tmpDir);
    const sourceKey = `contracts/${fileName}`;

    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      contractName,
      standardJsonInput: buildInfo.input,
      solcLongVersion: buildInfo.solcLongVersion,
      fullyQualifiedName: `${sourceKey}:${contractName}`,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function extractContractName(sourceCode: string): string {
  const match = sourceCode.match(/contract\s+(\w+)/);
  if (!match) {
    throw new Error('Could not find contract name in source file');
  }
  return match[1];
}


interface BuildInfo {
  solcLongVersion: string;
  input: unknown;
}

function readBuildInfo(tmpDir: string): BuildInfo {
  const buildInfoDir = path.join(tmpDir, 'artifacts', 'build-info');
  if (!fs.existsSync(buildInfoDir)) {
    throw new Error('Build info directory not found');
  }
  const files = fs.readdirSync(buildInfoDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('No build info files found');
  }
  const raw = fs.readFileSync(path.join(buildInfoDir, files[0]), 'utf-8');
  return JSON.parse(raw) as BuildInfo;
}

function findArtifact(tmpDir: string, contractName: string): string {
  const artifactsDir = path.join(tmpDir, 'artifacts', 'contracts');
  if (!fs.existsSync(artifactsDir)) {
    throw new Error(`Compilation failed: artifacts directory not found at ${artifactsDir}`);
  }

  const solDirs = fs.readdirSync(artifactsDir);
  for (const solDir of solDirs) {
    const artifactFile = path.join(artifactsDir, solDir, `${contractName}.json`);
    if (fs.existsSync(artifactFile)) {
      return artifactFile;
    }
  }

  throw new Error(
    `Artifact not found for contract "${contractName}" in ${artifactsDir}`,
  );
}

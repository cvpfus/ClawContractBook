import { existsSync, readFileSync } from 'node:fs';
import { isSlitherInstalled, runSlither, mapSlitherResults } from './slither.js';
import { runFallbackAnalysis } from './fallback.js';
import type { Finding as SlitherFinding } from './slither.js';

export interface Finding {
  severity: 'High' | 'Medium' | 'Low' | 'Informational' | 'Optimization';
  title: string;
  description: string;
  location: string;
  recommendation: string;
}

export interface AnalysisSummary {
  high: number;
  medium: number;
  low: number;
  informational: number;
  optimization: number;
  total: number;
}

export interface AnalysisResult {
  findings: Finding[];
  summary: AnalysisSummary;
  passed: boolean;
}

function buildSummary(findings: Finding[]): AnalysisSummary {
  const summary: AnalysisSummary = {
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
    optimization: 0,
    total: findings.length,
  };

  for (const finding of findings) {
    switch (finding.severity) {
      case 'High': summary.high++; break;
      case 'Medium': summary.medium++; break;
      case 'Low': summary.low++; break;
      case 'Informational': summary.informational++; break;
      case 'Optimization': summary.optimization++; break;
    }
  }

  return summary;
}

export async function analyzeContract(filePath: string): Promise<AnalysisResult> {
  if (!existsSync(filePath)) {
    throw new Error(`Contract file not found: ${filePath}`);
  }

  if (isSlitherAvailable()) {
    const output = runSlither(filePath);
    const findings: Finding[] = mapSlitherResults(output);
    const summary = buildSummary(findings);
    const passed = summary.high === 0;
    return { findings, summary, passed };
  }

  const source = readFileSync(filePath, 'utf-8');
  const result = runFallbackAnalysis(source);

  result.findings.unshift({
    severity: 'Informational',
    title: '[Basic Check] Slither Not Installed',
    description: 'Slither is not installed. Only basic regex-based checks were performed. Install Slither for comprehensive analysis.',
    location: 'N/A',
    recommendation: getSlitherInstallInstructions(),
  });

  result.summary.informational++;
  result.summary.total++;

  return result;
}

export function isSlitherAvailable(): boolean {
  return isSlitherInstalled();
}

export function getSlitherInstallInstructions(): string {
  return [
    'Install Slither for comprehensive smart contract analysis:',
    '  pip3 install slither-analyzer',
    '',
    'Or with pipx:',
    '  pipx install slither-analyzer',
    '',
    'Requires Python 3.8+ and solc (Solidity compiler).',
    'More info: https://github.com/crytic/slither',
  ].join('\n');
}

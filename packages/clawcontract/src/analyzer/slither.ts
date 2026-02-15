import { execSync } from 'node:child_process';
import { platform } from 'node:os';

export interface SlitherDetector {
  check: string;
  impact: string;
  confidence: string;
  description: string;
  elements: SlitherElement[];
  first_markdown_element: string;
}

export interface SlitherElement {
  type: string;
  name: string;
  source_mapping: {
    filename_relative: string;
    lines: number[];
    starting_column: number;
    ending_column: number;
  };
}

export interface SlitherOutput {
  success: boolean;
  error: string | null;
  results: {
    detectors: SlitherDetector[];
  } | null;
}

export interface Finding {
  severity: 'High' | 'Medium' | 'Low' | 'Informational' | 'Optimization';
  title: string;
  description: string;
  location: string;
  recommendation: string;
}

const IMPACT_MAP: Record<string, Finding['severity']> = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Informational: 'Informational',
  Optimization: 'Optimization',
};

function mapImpact(impact: string): Finding['severity'] {
  return IMPACT_MAP[impact] ?? 'Informational';
}

export function isSlitherInstalled(): boolean {
  try {
    const cmd = platform() === 'win32' ? 'where slither' : 'which slither';
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function runSlither(filePath: string): SlitherOutput {
  try {
    const stdout = execSync(`slither ${filePath} --json -`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000,
    });

    const parsed = JSON.parse(stdout) as SlitherOutput;
    return parsed;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'stdout' in err) {
      const stdout = (err as { stdout: string }).stdout;
      if (stdout && typeof stdout === 'string') {
        try {
          const parsed = JSON.parse(stdout) as SlitherOutput;
          return parsed;
        } catch {
          // JSON parse failed, fall through
        }
      }
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      results: null,
    };
  }
}

export function mapSlitherResults(output: SlitherOutput): Finding[] {
  if (!output.results?.detectors) {
    return [];
  }

  return output.results.detectors.map((detector): Finding => {
    const location = detector.elements.length > 0
      ? formatLocation(detector.elements[0])
      : 'Unknown';

    return {
      severity: mapImpact(detector.impact),
      title: detector.check,
      description: detector.description,
      location,
      recommendation: getRecommendation(detector.check),
    };
  });
}

function formatLocation(element: SlitherElement): string {
  const file = element.source_mapping.filename_relative;
  const lines = element.source_mapping.lines;
  if (lines.length > 0) {
    return `${file}#L${lines[0]}`;
  }
  return file;
}

function getRecommendation(check: string): string {
  const recommendations: Record<string, string> = {
    'reentrancy-eth': 'Use the checks-effects-interactions pattern or a reentrancy guard.',
    'reentrancy-no-eth': 'Use the checks-effects-interactions pattern or a reentrancy guard.',
    'unchecked-lowlevel': 'Check the return value of low-level calls.',
    'unchecked-send': 'Check the return value of send().',
    'tx-origin': 'Use msg.sender instead of tx.origin for authorization.',
    'suicidal': 'Remove or protect selfdestruct with access control.',
    'arbitrary-send': 'Restrict who can call functions that send Ether.',
    'locked-ether': 'Add a withdrawal function for locked Ether.',
    'solc-version': 'Use a fixed Solidity version pragma.',
  };

  return recommendations[check] ?? 'Review and address this finding.';
}

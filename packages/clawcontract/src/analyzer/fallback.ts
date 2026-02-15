import { readFileSync } from 'node:fs';

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

export function checkReentrancy(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      (line.includes('.call{') || line.includes('.call(') || line.includes('.send(') || line.includes('.transfer(')) &&
      !line.startsWith('//')
    ) {
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const subsequent = lines[j].trim();
        if (subsequent.includes('=') && !subsequent.startsWith('//') && !subsequent.startsWith('require') && !subsequent.startsWith('if')) {
          findings.push({
            severity: 'High',
            title: '[Basic Check] Potential Reentrancy',
            description: `External call at line ${i + 1} is followed by a state change at line ${j + 1}. This could be vulnerable to reentrancy attacks.`,
            location: `Line ${i + 1}`,
            recommendation: 'Use the checks-effects-interactions pattern or a reentrancy guard. Update state variables before making external calls.',
          });
          break;
        }
      }
    }
  }

  return findings;
}

export function checkUncheckedReturn(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('.call{') || line.includes('.call(')) {
      if (!line.includes('(bool') && !line.includes('require') && !line.includes('if')) {
        findings.push({
          severity: 'Medium',
          title: '[Basic Check] Unchecked Return Value',
          description: `Low-level call at line ${i + 1} does not check the return value. The call could silently fail.`,
          location: `Line ${i + 1}`,
          recommendation: 'Check the return value of low-level calls: (bool success, ) = addr.call{...}(...); require(success);',
        });
      }
    }
  }

  return findings;
}

export function checkTxOrigin(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('tx.origin') && !line.startsWith('//')) {
      findings.push({
        severity: 'Medium',
        title: '[Basic Check] tx.origin Usage',
        description: `tx.origin used at line ${i + 1}. Using tx.origin for authorization is vulnerable to phishing attacks.`,
        location: `Line ${i + 1}`,
        recommendation: 'Use msg.sender instead of tx.origin for authorization checks.',
      });
    }
  }

  return findings;
}

export function checkSelfDestruct(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if ((line.includes('selfdestruct(') || line.includes('selfdestruct (')) && !line.startsWith('//')) {
      findings.push({
        severity: 'High',
        title: '[Basic Check] selfdestruct Usage',
        description: `selfdestruct found at line ${i + 1}. This can permanently destroy the contract and send remaining Ether to an address.`,
        location: `Line ${i + 1}`,
        recommendation: 'Remove selfdestruct or protect it with strict access control. Note: selfdestruct is deprecated in newer Solidity versions.',
      });
    }
  }

  return findings;
}

export function checkFloatingPragma(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('pragma solidity') && line.includes('^')) {
      findings.push({
        severity: 'Informational',
        title: '[Basic Check] Floating Pragma',
        description: `Floating pragma found at line ${i + 1}: "${line}". Contracts should be deployed with the same compiler version they were tested with.`,
        location: `Line ${i + 1}`,
        recommendation: 'Lock the pragma to a specific version, e.g., "pragma solidity 0.8.20;" instead of "pragma solidity ^0.8.20;".',
      });
    }
  }

  return findings;
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

export function runFallbackAnalysis(source: string): AnalysisResult {
  const findings: Finding[] = [
    ...checkReentrancy(source),
    ...checkUncheckedReturn(source),
    ...checkTxOrigin(source),
    ...checkSelfDestruct(source),
    ...checkFloatingPragma(source),
  ];

  const summary = buildSummary(findings);
  const passed = summary.high === 0;

  return { findings, summary, passed };
}

export function runFallbackAnalysisFromFile(filePath: string): AnalysisResult {
  const source = readFileSync(filePath, 'utf-8');
  return runFallbackAnalysis(source);
}

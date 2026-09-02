#!/usr/bin/env -S deno run --allow-read --allow-run
// Enforces 100% line, branch, and function coverage across covered modules.

const covDir = 'cov_profile';

// 1. Run tests with coverage collection
const testCmd = new Deno.Command(Deno.execPath(), {
  args: ['test', `--coverage=${covDir}`],
  stdout: 'inherit',
  stderr: 'inherit',
});
const testStatus = await testCmd.spawn().status;
if (!testStatus.success) {
  Deno.exit(testStatus.code);
}

// 2. Generate lcov report
const covCmd = new Deno.Command(Deno.execPath(), {
  args: ['coverage', covDir, '--lcov'],
  stdout: 'piped',
  stderr: 'inherit',
});
const covOutput = await covCmd.output();
if (!covOutput.success) {
  console.error('Failed to generate coverage report');
  Deno.exit(covOutput.code);
}

const lcovText = new TextDecoder().decode(covOutput.stdout);

// Also print the summary table to console for visibility
const summaryCmd = new Deno.Command(Deno.execPath(), {
  args: ['coverage', covDir],
  stdout: 'inherit',
  stderr: 'inherit',
});
await summaryCmd.spawn().status;

// 3. Parse lcov.info to check coverage percentages
interface FileCoverage {
  file: string;
  linesFound: number;
  linesHit: number;
  branchesFound: number;
  branchesHit: number;
  functionsFound: number;
  functionsHit: number;
}

const files: FileCoverage[] = [];
let current: Partial<FileCoverage> = {};

for (const line of lcovText.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('SF:')) {
    current = {
      file: trimmed.slice(3),
      linesFound: 0,
      linesHit: 0,
      branchesFound: 0,
      branchesHit: 0,
      functionsFound: 0,
      functionsHit: 0,
    };
  } else if (trimmed.startsWith('LF:')) {
    current.linesFound = parseInt(trimmed.slice(3), 10);
  } else if (trimmed.startsWith('LH:')) {
    current.linesHit = parseInt(trimmed.slice(3), 10);
  } else if (trimmed.startsWith('BRF:')) {
    current.branchesFound = parseInt(trimmed.slice(4), 10);
  } else if (trimmed.startsWith('BRH:')) {
    current.branchesHit = parseInt(trimmed.slice(4), 10);
  } else if (trimmed.startsWith('FNF:')) {
    current.functionsFound = parseInt(trimmed.slice(4), 10);
  } else if (trimmed.startsWith('FNH:')) {
    current.functionsHit = parseInt(trimmed.slice(4), 10);
  } else if (trimmed === 'end_of_record') {
    if (current.file) {
      files.push(current as FileCoverage);
    }
    current = {};
  }
}

if (files.length === 0) {
  console.error('Error: No coverage data found.');
  Deno.exit(1);
}

let hasFailure = false;
console.log('\n--- Coverage Threshold Verification (Strict 100%) ---');

for (const f of files) {
  const linePct = f.linesFound === 0 ? 100 : (f.linesHit / f.linesFound) * 100;
  const branchPct = f.branchesFound === 0 ? 100 : (f.branchesHit / f.branchesFound) * 100;
  const fnPct = f.functionsFound === 0 ? 100 : (f.functionsHit / f.functionsFound) * 100;

  const displayPath = f.file.replace(/.*\/study-sprint\//, '');
  const pass = linePct === 100 && branchPct === 100 && fnPct === 100;

  if (!pass) {
    hasFailure = true;
    console.error(
      `❌ ${displayPath}: Line: ${linePct.toFixed(1)}% (${f.linesHit}/${f.linesFound}), ` +
        `Branch: ${branchPct.toFixed(1)}% (${f.branchesHit}/${f.branchesFound}), ` +
        `Function: ${fnPct.toFixed(1)}% (${f.functionsHit}/${f.functionsFound})`,
    );
  } else {
    console.log(`✅ ${displayPath}: 100% Line, Branch, and Function coverage`);
  }
}

if (hasFailure) {
  console.error('\nCoverage check failed: Not all tested modules reached 100% coverage.');
  Deno.exit(1);
} else {
  console.log('\nAll tested modules achieved 100% coverage!');
}

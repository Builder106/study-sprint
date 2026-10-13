import { mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const projectRoot = process.cwd();
const toolRoot = mkdtempSync(join(tmpdir(), 'studysprint-license-scan-'));

try {
  const result = spawnSync(
    'deno',
    [
      'run',
      '-A',
      '--no-config',
      '--lock',
      join(projectRoot, 'scripts/license-checker.lock'),
      '--frozen-lockfile',
      'npm:@lizenz/checker@0.0.2',
      '--summary',
      '--start',
      projectRoot,
    ],
    { cwd: toolRoot, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(toolRoot, { recursive: true, force: true });
}

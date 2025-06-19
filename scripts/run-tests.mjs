import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outDir = 'dist-test';

await build({
  entryPoints: [
    'src/utils/__tests__/env.test.ts',
    'src/utils/__tests__/helpers.test.ts',
    'src/utils/__tests__/version.test.ts',
  ],
  outdir: outDir,
  bundle: true,
  sourcemap: 'inline',
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  tsconfig: 'tsconfig.app.json',
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
});

const result = spawnSync('node', ['--test', outDir], { stdio: 'inherit' });
process.exit(result.status ?? 1);

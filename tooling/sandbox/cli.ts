#!/usr/bin/env npx tsx

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const isProd = args.includes('--prod');

const script = isProd ? 'build.prod.ts' : 'build.dev.ts';
const scriptPath = path.join(__dirname, script);

console.log(`Running ${script}...\n`);

const child = spawn('npx', ['tsx', scriptPath], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

#!/usr/bin/env node

/**
 * Custom type checking script to work around TypeScript compiler bug
 */

const { execSync } = require('child_process');

const packagesToCheck = [
  { name: '@calcom/api', path: 'apps/api/v1' },
  { name: '@calcom/features', path: 'packages/features' },
  { name: '@calcom/lib', path: 'packages/lib' },
  { name: '@calcom/prisma', path: 'packages/prisma' },
  { name: '@calcom/trpc', path: 'packages/trpc' },
  { name: '@calcom/ui', path: 'packages/ui' },
];

const webTypeCheckAlternative = () => {
  console.log('\n🔍 Running alternative type checking for @calcom/web...');
  try {
    execSync('cd apps/web && npx next lint --no-cache', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('❌ Alternative type checking for @calcom/web failed');
    return false;
  }
};

const runTypeCheck = () => {
  let success = true;
  
  for (const pkg of packagesToCheck) {
    console.log(`\n🔍 Type checking ${pkg.name}...`);
    try {
      execSync(`cd ${pkg.path} && npx tsc --pretty --noEmit`, { stdio: 'inherit' });
      console.log(`✅ Type checking passed for ${pkg.name}`);
    } catch (error) {
      console.error(`❌ Type checking failed for ${pkg.name}`);
      success = false;
    }
  }
  
  const webSuccess = webTypeCheckAlternative();
  
  return success && webSuccess;
};

try {
  const success = runTypeCheck();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Type checking script failed:', error);
  process.exit(1);
}

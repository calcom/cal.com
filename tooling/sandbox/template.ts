import dotenv from 'dotenv';
import { Template, waitForPort } from 'e2b';

dotenv.config({ path: '../../.env' });

export const template = Template()
  // Use Node.js image since cal.com uses Yarn
  .fromImage('node:20')
  .setEnvs({
    GIT_ACCESS_TOKEN: process.env.GIT_ACCESS_TOKEN || '',
    // Cal.com required env vars (fake values for Storybook)
    NEXTAUTH_SECRET: 'fake-secret-for-storybook-demo',
    CALENDSO_ENCRYPTION_KEY: 'fake-encryption-key-32-chars!!!',
    NEXTAUTH_URL: 'http://localhost:3000/api/auth',
    NEXT_PUBLIC_WEBAPP_URL: 'http://localhost:3000',
    // Skip strict validation where possible
    SKIP_ENV_VALIDATION: 'true',
  })
  .runCmd('apt-get update && apt-get install -y git ripgrep fd-find', { user: 'root' })
  // Install Yarn globally
  .runCmd('corepack enable && corepack prepare yarn@4.12.0 --activate', { user: 'root' })
  .skipCache()
  .gitClone(
    `https://${process.env.GIT_ACCESS_TOKEN}@github.com/onlook-dev/cal.com.git`,
    '/home/user/code',
    { branch: 'feat/storybook-stories' },
  )
  .setWorkdir('/home/user/code')
  .runCmd('yarn install')
  .runCmd('npx playwright install --with-deps chromium')
  .runCmd('npx tsx tooling/sandbox/generate-screenshots.ts')
  .setStartCmd(
    'cd /home/user/code; git pull https://$GIT_ACCESS_TOKEN@github.com/onlook-dev/cal.com.git feat/storybook-stories; yarn install; yarn workspace @calcom/storybook storybook --host 0.0.0.0 --disable-telemetry --no-open',
    waitForPort(6006),
  );

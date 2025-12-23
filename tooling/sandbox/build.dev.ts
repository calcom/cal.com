import dotenv from 'dotenv';
import { defaultBuildLogger, Template } from 'e2b';
import { template } from './template';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

async function main() {
  if (!process.env.GIT_ACCESS_TOKEN) {
    console.error('ERROR: GIT_ACCESS_TOKEN is not set in .env file');
    console.error('Make sure your .env file contains: GIT_ACCESS_TOKEN=your_token_here');
    process.exit(1);
  }

  console.log(
    'GIT_ACCESS_TOKEN loaded:',
    `${process.env.GIT_ACCESS_TOKEN.substring(0, 10)}...`,
  );

  await Template.build(template, {
    alias: 'calcom-storybook-dev',
    cpuCount: 8,
    memoryMB: 8192,
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);

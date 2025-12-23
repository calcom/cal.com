import dotenv from 'dotenv';
import { Sandbox } from 'e2b';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

async function main() {
  console.log('Creating sandbox from calcom-storybook-dev template...');

  const sandbox = await Sandbox.betaCreate('calcom-storybook-dev', {
    autoPause: true,
    timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  });

  console.log('Sandbox created!');
  console.log('Sandbox ID:', sandbox.id);
  console.log('');
  console.log('Storybook should be available at:');
  console.log(`  Local: http://localhost:6006`);
  console.log(`  E2B:   https://6006-${sandbox.id}.e2b.app`);
  console.log('');
  console.log('To keep the sandbox alive, the script will continue running.');
  console.log('Press Ctrl+C to stop and let the sandbox auto-pause.');

  // Keep the process alive
  await new Promise(() => {});
}

main().catch(console.error);

#!/usr/bin/env npx tsx

import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STORYBOOK_URL = 'http://localhost:6006';

// Resolve paths relative to this script's location
const REPO_ROOT = path.resolve(__dirname, '../..');
const APPS_STORYBOOK_DIR = path.join(REPO_ROOT, 'apps/storybook');

// Change working directory to apps/storybook so storybook cache is in the right place
process.chdir(APPS_STORYBOOK_DIR);

interface StoryIndexEntry {
  id: string;
  title: string;
  name: string;
  importPath: string;
}

interface StoryIndex {
  v: number;
  entries: Record<string, StoryIndexEntry>;
}

async function fetchStoryIndex(): Promise<StoryIndexEntry[]> {
  const indexUrl = `${STORYBOOK_URL}/index.json`;

  try {
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch story index: ${response.statusText}`);
    }

    const data = (await response.json()) as StoryIndex;
    return Object.values(data.entries);
  } catch (error) {
    console.error('Error fetching story index:', error);
    console.error(`Make sure Storybook is running at ${STORYBOOK_URL}`);
    process.exit(1);
  }
}

async function startStorybook(): Promise<{ process: ChildProcess; port: number }> {
  console.log('🚀 Starting Storybook...');

  // Run storybook dev directly with --no-open flag
  const storybookProcess = spawn('npx', ['storybook', 'dev', '-p', '6006', '--no-open'], {
    cwd: APPS_STORYBOOK_DIR,
    stdio: 'pipe',
    detached: false,
    shell: true,
  });

  // Wait for Storybook to be ready
  return new Promise((resolve, reject) => {
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        storybookProcess.kill();
        reject(new Error('Storybook failed to start within 120 seconds'));
      }
    }, 120000);

    storybookProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      if (output.includes('Local:') || output.includes('localhost:6006')) {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          console.log('✅ Storybook is ready!');
          resolve({ process: storybookProcess, port: 6006 });
        }
      }
    });

    storybookProcess.stderr?.on('data', (data) => {
      console.error(data.toString());
    });

    storybookProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function warmupStorybook(firstStoryId: string): Promise<void> {
  console.log('🔥 Warming up Storybook...');

  // Import the browser utility and load one story to force full initialization
  const { getBrowser } = await import(
    '../../apps/storybook/.storybook/storybook-onlook-plugin/screenshot-service/utils/browser/index.js'
  );
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const warmupUrl = `${STORYBOOK_URL}/iframe.html?id=${firstStoryId}&viewMode=story`;
    await page.goto(warmupUrl, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    console.log('✅ Storybook warmed up');
  } catch (error) {
    console.log('⚠️ Warmup had issues, proceeding anyway:', error);
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('📸 Generating Storybook screenshots...');

  let storybookInstance: { process: ChildProcess; port: number } | null = null;

  try {
    // Start Storybook
    storybookInstance = await startStorybook();
    console.log(`Using Storybook URL: ${STORYBOOK_URL}`);

    // Fetch all stories
    const allStories = await fetchStoryIndex();
    console.log(`Found ${allStories.length} stories`);

    // Limit to first 10 stories for testing (remove this limit for full generation)
    const TEST_LIMIT = 10;
    const stories = allStories.slice(0, TEST_LIMIT);
    console.log(`⚡ Test mode: generating screenshots for first ${stories.length} stories only`);

    const firstStory = stories[0];
    if (!firstStory) {
      throw new Error('No stories found');
    }

    // Warm up Storybook by loading the first story
    await warmupStorybook(firstStory.id);

    // Generate screenshots (dynamic import so it runs after chdir)
    const { generateAllScreenshots } = await import(
      '../../apps/storybook/.storybook/storybook-onlook-plugin/screenshot-service/index.js'
    );
    await generateAllScreenshots(
      stories.map((story) => ({
        id: story.id,
        importPath: story.importPath,
      })),
      STORYBOOK_URL,
    );

    console.log('✅ Screenshot generation complete!');
  } catch (error) {
    console.error('❌ Error during screenshot generation:', error);
    throw error;
  } finally {
    // Always stop Storybook
    if (storybookInstance) {
      console.log('🛑 Stopping Storybook...');
      storybookInstance.process.kill();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

import { computeFileHash } from '../utils/fileSystem/index';
import { updateManifest } from '../utils/manifest/index';
import { closeBrowser } from './utils/browser/index';
import { generateScreenshot } from './utils/screenshot/index';

/**
 * Generate screenshots for all stories (parallelized for speed)
 */
export async function generateAllScreenshots(
  stories: Array<{ id: string; importPath: string }>,
  storybookUrl: string = 'http://localhost:6006',
): Promise<void> {
  console.log(`Generating screenshots for ${stories.length} stories...`);

  // Process stories in batches for better performance
  // Higher than CPU count since work is I/O-bound (waiting for page render)
  const BATCH_SIZE = 10;
  const batches: Array<Array<{ id: string; importPath: string }>> = [];

  for (let i = 0; i < stories.length; i += BATCH_SIZE) {
    batches.push(stories.slice(i, i + BATCH_SIZE));
  }

  let completed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map(async (story) => {
        // Generate both light and dark in parallel for each story
        const [lightResult, darkResult] = await Promise.all([
          generateScreenshot(story.id, 'light', storybookUrl),
          generateScreenshot(story.id, 'dark', storybookUrl),
        ]);

        if (lightResult && darkResult) {
          const fileHash = computeFileHash(story.importPath);
          // Use bounding box from light theme (should be same for both)
          updateManifest(story.id, story.importPath, fileHash, lightResult.boundingBox);
        }

        completed++;
        console.log(
          `[${completed}/${stories.length}] Generated screenshots for ${story.id}`,
        );
      }),
    );
  }

  await closeBrowser();
  console.log('Screenshot generation complete!');
}

import path from 'node:path';
import type { HmrContext } from 'vite';
import { generateScreenshot } from '../../screenshot-service/index';
import { computeFileHash } from '../../utils/fileSystem/index';
import { updateManifest } from '../../utils/manifest/index';

// Cache for Storybook's index.json
let cachedIndex: {
  entries: Record<string, { id: string; importPath: string; type: string }>;
} | null = null;
let indexFetchPromise: Promise<void> | null = null;

// Debounce state
const pendingFiles = new Set<string>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

async function fetchStorybookIndex(): Promise<void> {
  try {
    const response = await fetch('http://localhost:6006/index.json');
    if (response.ok) {
      cachedIndex = await response.json();
      console.log('[Screenshots] Cached Storybook index');
    }
  } catch (error) {
    console.error('[Screenshots] Failed to fetch Storybook index:', error);
  }
}

function getStoriesForFile(filePath: string): string[] {
  if (!cachedIndex) return [];

  // Normalize the file path to match Storybook's importPath format
  const fileName = path.basename(filePath);

  return Object.values(cachedIndex.entries)
    .filter((entry) => entry.type === 'story' && entry.importPath.endsWith(fileName))
    .map((entry) => entry.id);
}

async function regenerateScreenshotsForFiles(files: string[]): Promise<void> {
  // Refresh index before regenerating (in case new stories were added)
  await fetchStorybookIndex();

  const allStoryIds = new Set<string>();
  const fileToStories = new Map<string, string[]>();

  for (const file of files) {
    const storyIds = getStoriesForFile(file);
    fileToStories.set(file, storyIds);
    for (const id of storyIds) {
      allStoryIds.add(id);
    }
  }

  if (allStoryIds.size === 0) {
    console.log('[Screenshots] No stories found for changed files');
    return;
  }

  console.log(
    `[Screenshots] Regenerating ${allStoryIds.size} stories from ${files.length} files`,
  );

  const storybookUrl = 'http://localhost:6006';

  // Regenerate screenshots for each story (both themes) and collect bounding boxes
  const storyBoundingBoxes = new Map<string, { width: number; height: number } | null>();

  await Promise.all(
    Array.from(allStoryIds).map(async (storyId) => {
      const [lightResult, _darkResult] = await Promise.all([
        generateScreenshot(storyId, 'light', storybookUrl),
        generateScreenshot(storyId, 'dark', storybookUrl),
      ]);
      // Use bounding box from light theme
      if (lightResult) {
        storyBoundingBoxes.set(storyId, lightResult.boundingBox);
      }
    }),
  );

  // Update manifest with new hashes and bounding boxes
  for (const [file, storyIds] of fileToStories) {
    const fileHash = computeFileHash(file);
    storyIds.forEach((storyId) => {
      updateManifest(storyId, file, fileHash, storyBoundingBoxes.get(storyId));
    });
  }

  console.log(`[Screenshots] ✓ Regenerated ${allStoryIds.size} stories`);
}

export function handleStoryFileChange({ file, modules }: HmrContext) {
  // Detect story file changes
  if (file.endsWith('.stories.tsx') || file.endsWith('.stories.ts')) {
    console.log(`[Screenshots] Story file changed: ${file}`);

    // Initialize index cache on first change
    if (!cachedIndex && !indexFetchPromise) {
      indexFetchPromise = fetchStorybookIndex();
    }

    // Add to pending files
    pendingFiles.add(file);

    // Debounce regeneration
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      const files = Array.from(pendingFiles);
      pendingFiles.clear();
      debounceTimer = null;

      try {
        await regenerateScreenshotsForFiles(files);
      } catch (error) {
        console.error('[Screenshots] Error regenerating screenshots:', error);
      }
    }, DEBOUNCE_MS);

    // Return modules to trigger HMR update in Storybook
    return modules;
  }
}

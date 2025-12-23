import fs from 'node:fs';
import { MANIFEST_PATH } from '../../screenshot-service/constants';
import type { Manifest, ScreenshotMetadata } from '../../screenshot-service/types';
import { ensureCacheDirectories } from '../fileSystem/index';

/**
 * Load manifest from disk
 */
export function loadManifest(): Manifest {
  if (fs.existsSync(MANIFEST_PATH)) {
    const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(content);
  }
  return { stories: {} };
}

/**
 * Save manifest to disk
 */
export function saveManifest(manifest: Manifest) {
  ensureCacheDirectories();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/**
 * Get manifest entry for a story
 */
export function getManifestEntry(storyId: string): ScreenshotMetadata | null {
  const manifest = loadManifest();
  return manifest.stories[storyId] || null;
}

/**
 * Update manifest for a story
 */
export function updateManifest(
  storyId: string,
  sourcePath: string,
  fileHash: string,
  boundingBox?: { width: number; height: number } | null,
) {
  const manifest = loadManifest();

  manifest.stories[storyId] = {
    fileHash,
    lastGenerated: new Date().toISOString(),
    sourcePath,
    screenshots: {
      light: `screenshots/${storyId}/light.png`,
      dark: `screenshots/${storyId}/dark.png`,
    },
    boundingBox: boundingBox ?? undefined,
  };

  saveManifest(manifest);
}

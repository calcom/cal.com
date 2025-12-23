import path from 'node:path';

export const CACHE_DIR = path.join(process.cwd(), '.storybook-cache');
export const SCREENSHOTS_DIR = path.join(CACHE_DIR, 'screenshots');
export const MANIFEST_PATH = path.join(CACHE_DIR, 'manifest.json');

// Full HD viewport so page-level mocks render correctly
// Screenshot clips to actual component size, so this doesn't affect file size
export const VIEWPORT_WIDTH = 1920;
export const VIEWPORT_HEIGHT = 1080;

// Minimum dimensions for components on canvas
export const MIN_COMPONENT_WIDTH = 420;
export const MIN_COMPONENT_HEIGHT = 280;

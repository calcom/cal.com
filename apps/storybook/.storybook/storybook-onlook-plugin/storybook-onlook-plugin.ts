import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path, { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import { handleStoryFileChange } from './handlers/handleStoryFileChange/index';
import { captureScreenshotBuffer } from './screenshot-service/utils/screenshot/index';
import { findGitRoot } from './utils/findGitRoot/index';

// Calculate storybook location relative to git root
const __dirname = dirname(fileURLToPath(import.meta.url));
const storybookDir = join(__dirname, '..');
const gitRoot = findGitRoot(storybookDir);
const storybookLocation = gitRoot ? relative(gitRoot, storybookDir) : '';
const repoRoot = gitRoot || process.cwd();

const serveMetadataAndScreenshots = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => {
  // Consolidated endpoint: Storybook index + metadata + boundingBox
  if (req.url === '/onbook-index.json') {
    const manifestPath = path.join(process.cwd(), '.storybook-cache', 'manifest.json');

    // Fetch Storybook's index.json and enrich it
    fetch('http://localhost:6006/index.json')
      .then((response) => response.json())
      .then((indexData: Record<string, unknown>) => {
        // Load manifest for bounding box data
        const manifest = fs.existsSync(manifestPath)
          ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          : { stories: {} };

        // Default viewport size as fallback
        const defaultBoundingBox = { width: 1920, height: 1080 };

        // Add boundingBox to each entry
        const entries = (indexData.entries || {}) as Record<string, Record<string, unknown>>;
        for (const [storyId, entry] of Object.entries(entries)) {
          const manifestEntry = manifest.stories?.[storyId];
          entry.boundingBox = manifestEntry?.boundingBox || defaultBoundingBox;
        }

        // Add metadata
        indexData.meta = { storybookLocation, repoRoot };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(indexData));
      })
      .catch((error) => {
        console.error('Failed to fetch/extend index.json:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({ error: 'Failed to fetch index', details: String(error) }),
        );
      });
    return;
  }

  // On-demand screenshot capture API
  if (req.url?.startsWith('/api/capture-screenshot')) {
    const url = new URL(req.url, 'http://localhost');
    const storyId = url.searchParams.get('storyId');
    const theme = (url.searchParams.get('theme') || 'light') as 'light' | 'dark';
    const width = parseInt(url.searchParams.get('width') || '800', 10);
    const height = parseInt(url.searchParams.get('height') || '600', 10);

    if (!storyId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'storyId is required' }));
      return;
    }

    // Validate theme
    if (theme !== 'light' && theme !== 'dark') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'theme must be "light" or "dark"' }));
      return;
    }

    // Capture screenshot asynchronously
    captureScreenshotBuffer(storyId, theme, width, height)
      .then(({ buffer }) => {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(buffer);
      })
      .catch((error) => {
        console.error('Screenshot capture error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'Failed to capture screenshot',
            details: String(error),
          }),
        );
      });
    return;
  }

  // Serve screenshots from cache
  if (req.url?.startsWith('/screenshots/')) {
    const screenshotPath = path.join(
      process.cwd(),
      '.storybook-cache',
      req.url.replace('/screenshots/', 'screenshots/'),
    );

    if (fs.existsSync(screenshotPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      fs.createReadStream(screenshotPath).pipe(res);
    } else {
      res.statusCode = 404;
      res.end('Screenshot not found');
    }
    return;
  }

  next();
};

export const storybookOnlookPlugin: Plugin = {
  name: 'storybook-onlook-plugin',
  configureServer(server: ViteDevServer) {
    server.middlewares.use(serveMetadataAndScreenshots);
  },
  configurePreviewServer(server) {
    server.middlewares.use(serveMetadataAndScreenshots);
  },
  handleHotUpdate: handleStoryFileChange,
};

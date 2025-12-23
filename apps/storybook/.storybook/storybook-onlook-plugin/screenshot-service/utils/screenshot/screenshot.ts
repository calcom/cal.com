import fs from 'node:fs';
import path from 'node:path';
import { ensureCacheDirectories } from '../../../utils/fileSystem/index';
import {
  MIN_COMPONENT_HEIGHT,
  MIN_COMPONENT_WIDTH,
  SCREENSHOTS_DIR,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
} from '../../constants';
import type { BoundingBox } from '../../types';
import { getBrowser } from '../browser/index';

export interface ScreenshotResult {
  buffer: Buffer;
  boundingBox: BoundingBox | null;
}

export interface GenerateScreenshotResult {
  path: string;
  boundingBox: BoundingBox | null;
}

/**
 * Get screenshot file path
 */
export function getScreenshotPath(storyId: string, theme: 'light' | 'dark'): string {
  const storyDir = path.join(SCREENSHOTS_DIR, storyId);
  return path.join(storyDir, `${theme}.png`);
}

/**
 * Check if screenshot exists
 */
export function screenshotExists(storyId: string, theme: 'light' | 'dark'): boolean {
  const screenshotPath = getScreenshotPath(storyId, theme);
  return fs.existsSync(screenshotPath);
}

/**
 * Capture a screenshot and return it as a Buffer with bounding box info
 */
export async function captureScreenshotBuffer(
  storyId: string,
  theme: 'light' | 'dark',
  width: number = VIEWPORT_WIDTH,
  height: number = VIEWPORT_HEIGHT,
  storybookUrl: string = 'http://localhost:6006',
): Promise<ScreenshotResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    // Navigate to story iframe URL
    const url = `${storybookUrl}/iframe.html?id=${storyId}&viewMode=story&globals=theme:${theme}`;
    await page.goto(url, { timeout: 15000 });

    // Wait for page to be fully ready (matching @storybook/test-runner's waitForPageReady)
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('load');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    // Wait for all images to be fully loaded and decoded
    await page.evaluate(async () => {
      const images = document.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve);
          });
        }),
      );
    });

    // Calculate the bounding box of all content inside #storybook-root
    const contentBounds = await page.evaluate(() => {
      const root = document.querySelector('#storybook-root');
      if (!root) return null;

      // Get the bounding rect of all children combined
      const children = root.querySelectorAll('*');
      if (children.length === 0) return null;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      children.forEach((child) => {
        const rect = child.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
      });

      if (minX === Infinity) return null;

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    });

    let screenshotBuffer: Buffer;
    let resultBoundingBox: BoundingBox | null = null;

    if (contentBounds && contentBounds.width > 0 && contentBounds.height > 0) {
      const PADDING = 20; // 10px each side
      const clippedWidth = Math.min(width, contentBounds.width + PADDING);
      const clippedHeight = Math.min(height, contentBounds.height + PADDING);

      // Store dimensions that match the actual screenshot (including padding)
      resultBoundingBox = {
        width: Math.max(MIN_COMPONENT_WIDTH, Math.round(clippedWidth)),
        height: Math.max(MIN_COMPONENT_HEIGHT, Math.round(clippedHeight)),
      };

      screenshotBuffer = await page.screenshot({
        type: 'png',
        clip: {
          x: Math.max(0, contentBounds.x - 10),
          y: Math.max(0, contentBounds.y - 10),
          width: clippedWidth,
          height: clippedHeight,
        },
      });
    } else {
      screenshotBuffer = await page.screenshot({ type: 'png' });
    }

    return { buffer: screenshotBuffer, boundingBox: resultBoundingBox };
  } finally {
    await context.close();
  }
}

/**
 * Generate a screenshot for a story and save to disk
 */
export async function generateScreenshot(
  storyId: string,
  theme: 'light' | 'dark',
  storybookUrl: string = 'http://localhost:6006',
): Promise<GenerateScreenshotResult | null> {
  try {
    ensureCacheDirectories();

    const storyDir = path.join(SCREENSHOTS_DIR, storyId);
    if (!fs.existsSync(storyDir)) {
      fs.mkdirSync(storyDir, { recursive: true });
    }

    const screenshotPath = getScreenshotPath(storyId, theme);
    const { buffer, boundingBox } = await captureScreenshotBuffer(
      storyId,
      theme,
      VIEWPORT_WIDTH,
      VIEWPORT_HEIGHT,
      storybookUrl,
    );
    fs.writeFileSync(screenshotPath, buffer);

    return { path: screenshotPath, boundingBox };
  } catch (error) {
    console.error(`Error generating screenshot for ${storyId} (${theme}):`, error);
    return null;
  }
}

import crypto from 'node:crypto';
import fs from 'node:fs';
import { CACHE_DIR, SCREENSHOTS_DIR } from '../../screenshot-service/constants';

/**
 * Ensure cache directories exist
 */
export function ensureCacheDirectories() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Compute file hash
 */
export function computeFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Find the git repository root by walking up the directory tree
 */
export function findGitRoot(startPath: string): string | null {
  let currentPath = startPath;

  while (currentPath !== dirname(currentPath)) {
    if (existsSync(join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }

  return null;
}

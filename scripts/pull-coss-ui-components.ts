#!/usr/bin/env node

/**
 * Script to pull coss ui components from the registry
 * and write them to packages/coss-ui/src/components/
 * while rewriting imports to use @coss/ui paths.
 */

import { promises as fs } from 'node:fs';
import https from 'node:https';
import path from 'node:path';

const REGISTRY_BASE_URL = 'https://coss.com/ui/r';
const UI_JSON_URL = `${REGISTRY_BASE_URL}/ui.json`;

// Security limits
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_FILE_NAME_LENGTH = 255;
const VALID_COMPONENT_NAME_REGEX = /^[a-z0-9-]+$/i;

type ComponentFile = {
  type?: string;
  path: string;
  content: string;
};

type ComponentJson = {
  files?: ComponentFile[];
  registryDependencies?: string[];
};

type TargetDirs = {
  components: string;
};

async function resolvePaths(): Promise<{ targetDirs: TargetDirs; targetRoot: string }> {
  const cwd = process.cwd();

  // Check if we're running from within packages/coss-ui or from monorepo root
  const isInPackage = cwd.endsWith('packages/coss-ui') || cwd.endsWith('packages\\coss-ui');
  const targetRoot = isInPackage
    ? path.resolve(cwd, 'src')
    : path.resolve(cwd, 'packages/coss-ui/src');

  const targetDirs: TargetDirs = {
    components: path.join(targetRoot, 'components'),
  };

  await fs.mkdir(targetDirs.components, { recursive: true });
  return { targetDirs, targetRoot };
}

async function fetchJSON<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
        // Validate HTTP status code
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          req.destroy();
          reject(new Error(`HTTP ${res.statusCode} error fetching ${url}`));
          return;
        }

        // Validate content type
        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('application/json')) {
          console.warn(`⚠️  Unexpected content-type: ${contentType} for ${url}`);
        }

        let data = '';
        let size = 0;

        res.on('data', (chunk: Buffer | string) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_SIZE) {
            clearTimeout(timeout);
            req.destroy();
            reject(new Error(`Response too large (max ${MAX_RESPONSE_SIZE} bytes) for ${url}`));
            return;
          }
          data += chunk.toString();
        });

        res.on('end', () => {
          clearTimeout(timeout);
          try {
            const json = JSON.parse(data) as T;
            resolve(json);
          } catch (error) {
            reject(new Error(`Failed to parse JSON from ${url}: ${(error as Error).message}`));
          }
        });
      })
      .on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to fetch ${url}: ${error.message}`));
      });

    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms for ${url}`));
    }, REQUEST_TIMEOUT);
  });
}

function validateComponentName(name: string): boolean {
  if (!name || name.length === 0 || name.length > MAX_FILE_NAME_LENGTH) {
    return false;
  }
  return VALID_COMPONENT_NAME_REGEX.test(name);
}

function getComponentName(registryDependency: string): string {
  if (!registryDependency.startsWith('@coss/')) {
    throw new Error(`Invalid registry dependency format: ${registryDependency}`);
  }
  const componentName = registryDependency.replace('@coss/', '');
  if (!validateComponentName(componentName)) {
    throw new Error(`Invalid component name: ${componentName}`);
  }
  return componentName;
}

function getFileName(filePath: string): string {
  const fileName = path.basename(filePath);
  // Additional validation
  if (!fileName || fileName.length === 0 || fileName.length > MAX_FILE_NAME_LENGTH) {
    throw new Error(`Invalid file name: ${fileName}`);
  }
  // Ensure it's a .tsx file
  if (!fileName.endsWith('.tsx')) {
    throw new Error(`File must be a .tsx file: ${fileName}`);
  }
  // Prevent path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error(`Invalid file name (path traversal detected): ${fileName}`);
  }
  return fileName;
}

function validateContent(content: string): void {
  if (!content || typeof content !== 'string') {
    throw new Error('Content must be a non-empty string');
  }
  if (content.length > MAX_RESPONSE_SIZE) {
    throw new Error(`Content too large (max ${MAX_RESPONSE_SIZE} bytes)`);
  }
}

function rewriteImports(code: string): string {
  let result = code;
  // Align imports with @coss/ui paths
  result = result.replace(/(['"])@\/lib\//g, "$1@coss/ui/lib/");
  result = result.replace(/(['"])@\/hooks\//g, "$1@coss/ui/hooks/");
  result = result.replace(/(['"])@\/registry\/default\/ui\//g, "$1@coss/ui/components/");
  result = result.replace(/(['"])@\/registry\/default\/hooks\//g, "$1@coss/ui/hooks/");
  result = result.replace(/(['"])@\/registry\/default\/lib\//g, "$1@coss/ui/lib/");
  return result;
}

async function processComponent(registryDependency: string, targetDirs: TargetDirs): Promise<boolean> {
  let componentName: string;
  try {
    componentName = getComponentName(registryDependency);
  } catch (error) {
    console.error(`❌ Invalid component dependency: ${registryDependency}`, (error as Error).message);
    return false;
  }

  const componentUrl = `${REGISTRY_BASE_URL}/${componentName}.json`;

  console.log(`Pulling ${componentName}...`);

  try {
    const componentJson = await fetchJSON<ComponentJson>(componentUrl);

    // Validate JSON structure
    if (!componentJson || typeof componentJson !== 'object') {
      throw new Error('Invalid component JSON structure');
    }

    if (!Array.isArray(componentJson.files)) {
      throw new Error('Component files must be an array');
    }

    const componentFile = componentJson.files.find(
      (file) => file.type === 'registry:ui' && file.path.endsWith('.tsx')
    );

    if (!componentFile) {
      console.warn(`⚠️  No component file found for ${componentName}`);
      return false;
    }

    // Validate file structure
    if (!componentFile.path || !componentFile.content) {
      throw new Error('Component file missing path or content');
    }

    const fileName = getFileName(componentFile.path);
    validateContent(componentFile.content);

    const content = rewriteImports(componentFile.content);
    const filePath = path.join(targetDirs.components, fileName);

    await fs.writeFile(filePath, content, 'utf8');

    console.log(`✅ Pulled ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error pulling ${componentName}:`, (error as Error).message);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🚀 Pulling coss ui components...\n');

  try {
    const { targetDirs, targetRoot } = await resolvePaths();
    console.log(`Target root: ${targetRoot}`);
    console.log(`Components dir: ${targetDirs.components}\n`);

    console.log(`Pulling index: ${UI_JSON_URL}...`);
    const uiJson = await fetchJSON<ComponentJson>(UI_JSON_URL);

    // Validate index structure
    if (!uiJson || typeof uiJson !== 'object') {
      throw new Error('Invalid UI index JSON structure');
    }

    if (!Array.isArray(uiJson.registryDependencies)) {
      throw new Error('registryDependencies must be an array');
    }

    const registryDependencies = uiJson.registryDependencies || [];
    console.log(`Found ${registryDependencies.length} components\n`);

    const results = await Promise.all(
      registryDependencies.map((dep) => processComponent(dep, targetDirs))
    );

    const successCount = results.filter((r) => r === true).length;
    const failCount = results.filter((r) => r === false).length;

    console.log(`\n✨ Done!`);
    console.log(`✅ Successfully pulled: ${successCount} components`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount} components`);
    }
  } catch (error) {
    console.error('❌ Fatal error:', (error as Error).message);
    process.exit(1);
  }
}

void main();

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
  const targetRoot = path.resolve(cwd, 'packages/coss-ui/src');
  const targetDirs: TargetDirs = {
    components: path.join(targetRoot, 'components'),
  };

  await fs.mkdir(targetDirs.components, { recursive: true });
  return { targetDirs, targetRoot };
}

async function fetchJSON<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk: Buffer | string) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data) as T;
            resolve(json);
          } catch (error) {
            reject(new Error(`Failed to parse JSON from ${url}: ${(error as Error).message}`));
          }
        });
      })
      .on('error', (error: Error) => {
        reject(new Error(`Failed to fetch ${url}: ${error.message}`));
      });
  });
}

function getComponentName(registryDependency: string): string {
  return registryDependency.replace('@coss/', '');
}

function getFileName(filePath: string): string {
  return path.basename(filePath);
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
  const componentName = getComponentName(registryDependency);
  const componentUrl = `${REGISTRY_BASE_URL}/${componentName}.json`;

  console.log(`Pulling ${componentName}...`);

  try {
    const componentJson = await fetchJSON<ComponentJson>(componentUrl);

    const componentFile = componentJson.files?.find(
      (file) => file.type === 'registry:ui' && file.path.endsWith('.tsx')
    );

    if (!componentFile) {
      console.warn(`⚠️  No component file found for ${componentName}`);
      return false;
    }

    const fileName = getFileName(componentFile.path);
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

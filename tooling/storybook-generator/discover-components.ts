#!/usr/bin/env npx tsx

import { glob } from "glob";
import * as fs from "node:fs";
import * as path from "node:path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, "../..");

interface ComponentInfo {
  name: string;
  path: string;
  relativePath: string;
  hasStory: boolean;
}

// Patterns to exclude (not components)
const EXCLUDE_PATTERNS = [
  /\.stories\.tsx$/,
  /\.test\.tsx$/,
  /\.spec\.tsx$/,
  /^index\.tsx$/,
  /^types\.tsx?$/,
  /^utils\.tsx?$/,
  /^hooks?\.tsx?$/,
  /^use[A-Z].*\.tsx?$/, // useHook files
  /^constants?\.tsx?$/,
  /^config\.tsx?$/,
  /^context\.tsx?$/,
  /Provider\.tsx$/,
  /\.d\.ts$/,
];

// Directories to search
const SEARCH_DIRS = [
  "packages/features/*/*.tsx",
  "packages/features/*/*/*.tsx",
  "packages/ui/components/*/*.tsx",
  "packages/ui/components/*/*/*.tsx",
  "apps/web/components/**/*.tsx",
];

function isLikelyComponent(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath, "utf-8");

  // Check exclusion patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(fileName)) {
      return false;
    }
  }

  // Must export a React component (function or const with JSX)
  const hasJSX = fileContent.includes("<") && fileContent.includes("/>");
  const hasExport = /export\s+(default\s+)?(function|const|class)/m.test(fileContent);
  const hasReactImport = /import.*from\s+['"]react['"]/m.test(fileContent);

  // Skip files that are just re-exports
  if (fileContent.trim().startsWith("export {") || fileContent.trim().startsWith("export *")) {
    return false;
  }

  return hasJSX && hasExport && hasReactImport;
}

function getComponentName(filePath: string): string {
  const fileName = path.basename(filePath, ".tsx");
  // Handle kebab-case or snake_case
  return fileName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function hasExistingStory(filePath: string): boolean {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, ".tsx");

  // Check for ComponentName.stories.tsx in same directory
  const storyPath = path.join(dir, `${baseName}.stories.tsx`);
  return fs.existsSync(storyPath);
}

async function discoverComponents(): Promise<ComponentInfo[]> {
  const components: ComponentInfo[] = [];

  for (const pattern of SEARCH_DIRS) {
    const files = await glob(pattern, {
      cwd: REPO_ROOT,
      absolute: true,
      ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    });

    for (const filePath of files) {
      if (!isLikelyComponent(filePath)) {
        continue;
      }

      const relativePath = path.relative(REPO_ROOT, filePath);
      const hasStory = hasExistingStory(filePath);

      components.push({
        name: getComponentName(filePath),
        path: filePath,
        relativePath,
        hasStory,
      });
    }
  }

  return components;
}

async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes("--all");
  const jsonOutput = args.includes("--json");

  const components = await discoverComponents();

  // Filter to only those without stories (unless --all)
  const filtered = showAll ? components : components.filter((c) => !c.hasStory);

  // Sort by path
  filtered.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  if (jsonOutput) {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    console.log(`\nFound ${filtered.length} components ${showAll ? "total" : "without stories"}:\n`);

    // Group by directory
    const byDir: Record<string, ComponentInfo[]> = {};
    for (const comp of filtered) {
      const dir = path.dirname(comp.relativePath);
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(comp);
    }

    for (const [dir, comps] of Object.entries(byDir)) {
      console.log(`\n${dir}/`);
      for (const comp of comps) {
        const status = comp.hasStory ? "[has story]" : "[needs story]";
        console.log(`  ${comp.name} ${status}`);
      }
    }

    console.log(`\n\nTotal: ${filtered.length} components`);
    console.log(`\nRun with --json for machine-readable output`);
  }
}

main().catch(console.error);

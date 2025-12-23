#!/usr/bin/env npx tsx

import { exec, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LOG_DIR = path.join(__dirname, "logs");
const PROMPT_FILE = path.join(__dirname, "prompts/story-prompt.md");

interface ComponentInfo {
  name: string;
  path: string;
  relativePath: string;
  hasStory: boolean;
}

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const MAX_CONCURRENT = parseInt(args.find((a) => a.startsWith("--max="))?.split("=")[1] || "3", 10);
const FILTER = args.find((a) => a.startsWith("--filter="))?.split("=")[1] || "";

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

// Load prompt template
const PROMPT_TEMPLATE = fs.readFileSync(PROMPT_FILE, "utf-8");

async function discoverComponents(): Promise<ComponentInfo[]> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", "discover-components.ts", "--json"], {
      cwd: __dirname,
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Discovery failed: ${stderr}`));
        return;
      }
      try {
        // Find the JSON array in the output (skip any non-JSON lines)
        const jsonStart = stdout.indexOf("[");
        const jsonEnd = stdout.lastIndexOf("]") + 1;
        const jsonStr = stdout.slice(jsonStart, jsonEnd);
        resolve(JSON.parse(jsonStr));
      } catch (e) {
        reject(new Error(`Failed to parse discovery output: ${e}`));
      }
    });
  });
}

function generateStory(component: ComponentInfo): Promise<{ success: boolean; error?: string }> {
  const storyDir = path.dirname(path.join(REPO_ROOT, component.relativePath));
  const storyFile = path.join(storyDir, `${component.name}.stories.tsx`);
  const logFile = path.join(LOG_DIR, `${component.name}.log`);

  // Escape quotes in the path for shell
  const escapedPath = component.relativePath.replace(/"/g, '\\"');
  const escapedStoryFile = storyFile.replace(/"/g, '\\"');

  const command = `claude -p "Read ${escapedPath} and create a Storybook story at ${escapedStoryFile}. Use @storybook/nextjs-vite types, include tags:[\\"autodocs\\"], layout:\\"centered\\". Create Default story and relevant variants." --allowedTools "Read,Write,Edit" --permission-mode acceptEdits`;

  return new Promise((resolve) => {
    exec(
      command,
      {
        cwd: REPO_ROOT,
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      },
      (error, stdout, stderr) => {
        // Write log
        fs.writeFileSync(
          logFile,
          `COMMAND:\n${command}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nERROR:\n${error?.message || "none"}`
        );

        // Check if story file was created
        if (fs.existsSync(storyFile)) {
          resolve({ success: true });
        } else if (error) {
          resolve({ success: false, error: error.message.slice(0, 200) });
        } else {
          resolve({ success: false, error: "Story file not created" });
        }
      }
    );
  });
}

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  maxConcurrent: number,
  onProgress?: (completed: number, total: number, item: T, result: R) => void
): Promise<R[]> {
  const results: R[] = [];
  let completed = 0;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      const result = await fn(item);
      results[currentIndex] = result;
      completed++;
      onProgress?.(completed, items.length, item, result);
    }
  }

  const workers = Array(Math.min(maxConcurrent, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

async function main() {
  console.log("🔍 Discovering components without stories...\n");

  let components = await discoverComponents();

  // Apply filter
  if (FILTER) {
    components = components.filter((c) => c.relativePath.includes(FILTER));
  }

  if (components.length === 0) {
    console.log("✅ No components need stories (or filter matched nothing)");
    return;
  }

  console.log(`📦 Found ${components.length} components to process`);
  console.log(`⚡ Max concurrent: ${MAX_CONCURRENT}\n`);

  if (DRY_RUN) {
    console.log("🏃 DRY RUN - would generate stories for:\n");
    for (const c of components) {
      console.log(`  ${c.relativePath}`);
    }
    return;
  }

  console.log("🚀 Starting generation...\n");

  let succeeded = 0;
  let failed = 0;

  const results = await runWithConcurrency(
    components,
    generateStory,
    MAX_CONCURRENT,
    (completed, total, component, result) => {
      const status = result.success ? "✅" : "❌";
      console.log(`[${completed}/${total}] ${status} ${component.name}`);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        console.log(`    Error: ${result.error}`);
      }
    }
  );

  console.log("\n========================================");
  console.log("📊 Generation complete!");
  console.log(`  ✅ Succeeded: ${succeeded}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📁 Logs: ${LOG_DIR}`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

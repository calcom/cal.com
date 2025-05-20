import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const IMPORT_REGEX = /import\s+(\{\s*prisma\s*\}|\*\s+as\s+\w+|prisma)\s+from\s+["']@calcom\/prisma["'];?/g;
const PRISMA_USAGE_REGEX = /(\W)(prisma)\.(\w+)/g;
const TYPE_DEF_REGEX = /type\s+\w+HandlerOptions\s*=\s*\{\s*ctx:\s*\{([^}]*)\}/gs;

/**
 * Process a single file to migrate from direct prisma imports to ctx.prisma
 */
async function processFile(filePath: string): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    if (IMPORT_REGEX.test(content)) {
      if (!content.includes("import type { PrismaClient }")) {
        content = content.replace(
          /import.*from.*@calcom\/prisma.*;/,
          'import type { PrismaClient } from "@calcom/prisma";'
        );
      }

      content = content.replace(IMPORT_REGEX, "");
      modified = true;
    }

    const originalContent = content;
    content = content.replace(PRISMA_USAGE_REGEX, "$1ctx.prisma.$3");
    if (originalContent !== content) {
      modified = true;
    }

    content = content.replace(TYPE_DEF_REGEX, (match, ctxContent) => {
      if (!ctxContent.includes("prisma")) {
        return match.replace(/\{\s*ctx:\s*\{/, "{ ctx: {\n    prisma: PrismaClient;");
      }
      return match;
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Processed: ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`⏭️ Skipped: ${path.basename(filePath)} (no changes needed)`);
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Process a list of files
 */
async function processFiles(filesToProcess: string[]): Promise<void> {
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`🔄 Processing ${filesToProcess.length} files...`);

  for (const filePath of filesToProcess) {
    try {
      const success = await processFile(filePath);
      if (success) {
        processedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      errorCount++;
    }
  }

  console.log(`
📊 Migration Summary:
  ✅ Successfully processed: ${processedCount} files
  ⏭️ Skipped (no changes needed): ${skippedCount} files
  ❌ Errors: ${errorCount} files
  🔄 Total: ${filesToProcess.length} files
  `);
}

/**
 * Find all tRPC handler files in the repository
 */
function findAllHandlerFiles(): string[] {
  try {
    const baseDir = "/home/ubuntu/repos/cal.com";
    const output = execSync('find packages/trpc/server/routers -name "*.handler.ts"', {
      cwd: baseDir,
      encoding: "utf8",
    });

    return output
      .split("\n")
      .filter(Boolean)
      .map((file) => path.join(baseDir, file));
  } catch (error) {
    console.error("Error finding handler files:", error);
    return [];
  }
}

/**
 * Process a batch of files
 */
async function processBatch(batchSize = 10): Promise<void> {
  const allFiles = findAllHandlerFiles();
  const batch = allFiles.slice(0, batchSize);

  console.log(`Found ${allFiles.length} handler files. Processing first ${batch.length} files...`);

  await processFiles(batch);
}

async function processAllFiles(): Promise<void> {
  const allFiles = findAllHandlerFiles();
  console.log(`Found ${allFiles.length} handler files. Processing all files...`);
  await processFiles(allFiles);
}

if (require.main === module) {
  processAllFiles().catch(console.error);
}

module.exports = {
  processFile,
  processFiles,
  findAllHandlerFiles,
  processBatch,
  processAllFiles,
};

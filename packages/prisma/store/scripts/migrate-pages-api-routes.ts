import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const IMPORT_REGEX = /import\s+(\{\s*prisma\s*\}|\*\s+as\s+\w+|prisma)\s+from\s+["']@calcom\/prisma["'];?/g;
const DYNAMIC_IMPORT_REGEX = /const\s+prisma\s*=\s*\(await\s+import\(["']@calcom\/prisma["']\)\)\.default;/g;
const PRISMA_USAGE_REGEX = /(\W)(prisma)\.(\w+)/g;

/**
 * Process a single file to migrate from direct prisma imports to withPrismaApiHandler
 */
async function processFile(filePath: string): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    if (content.includes("withPrismaApiHandler")) {
      console.log(`⏭️ Skipped: ${path.basename(filePath)} (already using withPrismaApiHandler)`);
      return false;
    }

    const hasPrismaImport = IMPORT_REGEX.test(content);
    const hasDynamicPrismaImport = DYNAMIC_IMPORT_REGEX.test(content);
    const usesPrisma = hasPrismaImport || hasDynamicPrismaImport || PRISMA_USAGE_REGEX.test(content);

    if (!usesPrisma) {
      console.log(`⏭️ Skipped: ${path.basename(filePath)} (does not use prisma)`);
      return false;
    }

    if (!content.includes("import { withPrismaApiHandler }")) {
      content = `import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";\nimport type { PrismaClient } from "@calcom/prisma";\n${content}`;
      modified = true;
    }

    if (hasPrismaImport) {
      content = content.replace(IMPORT_REGEX, "");
      modified = true;
    }

    if (hasDynamicPrismaImport) {
      content = content.replace(DYNAMIC_IMPORT_REGEX, "");
      modified = true;
    }

    const handlerFunctionRegex = /export\s+default\s+async\s+function\s+handler\s*\(([^)]*)\)/g;
    content = content.replace(handlerFunctionRegex, (match, params) => {
      if (params.includes("prisma:")) {
        return match; // Already has prisma parameter
      }

      if (params.trim() === "") {
        return `async function handler(req, res, prisma: PrismaClient)`;
      }

      return `async function handler(${params}, prisma: PrismaClient)`;
    });

    const defaultExportRegex = /export\s+default\s+async\s+function\s+handler/g;
    if (defaultExportRegex.test(content)) {
      content = content.replace(defaultExportRegex, "async function handler");
      content += "\n\nexport default withPrismaApiHandler(handler);";
      modified = true;
    } else {
      const otherExportRegex = /export\s+default\s+([^;]+);/g;
      content = content.replace(otherExportRegex, (match, handlerExpr) => {
        if (handlerExpr.includes("withPrismaApiHandler")) {
          return match;
        }

        return `export default withPrismaApiHandler(${handlerExpr});`;
      });
      modified = true;
    }

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
 * Find all Pages API route files in the repository
 */
function findAllPagesApiRouteFiles(): string[] {
  try {
    const baseDir = "/home/ubuntu/repos/cal.com";
    const output = execSync('find apps/api/v1/pages/api -name "*.ts" | grep -v "_test.ts"', {
      cwd: baseDir,
      encoding: "utf8",
    });

    return output
      .split("\n")
      .filter(Boolean)
      .map((file) => path.join(baseDir, file));
  } catch (error) {
    console.error("Error finding Pages API route files:", error);
    return [];
  }
}

/**
 * Process a batch of files
 */
async function processBatch(batchSize = 10): Promise<void> {
  const allFiles = findAllPagesApiRouteFiles();
  const batch = allFiles.slice(0, batchSize);

  console.log(`Found ${allFiles.length} Pages API route files. Processing first ${batch.length} files...`);

  await processFiles(batch);
}

async function processAllFiles(): Promise<void> {
  const allFiles = findAllPagesApiRouteFiles();
  console.log(`Found ${allFiles.length} Pages API route files. Processing all files...`);
  await processFiles(allFiles);
}

if (require.main === module) {
  processAllFiles().catch(console.error);
}

export { processFile, processFiles, findAllPagesApiRouteFiles, processBatch, processAllFiles };

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const IMPORT_REGEX = /import\s+(\{\s*prisma\s*\}|\*\s+as\s+\w+|prisma)\s+from\s+["']@calcom\/prisma["'];?/g;
const DYNAMIC_IMPORT_REGEX = /const\s+prisma\s*=\s*\(await\s+import\(["']@calcom\/prisma["']\)\)\.default;/g;
const PRISMA_USAGE_REGEX = /(\W)(prisma)\.(\w+)/g;

/**
 * Process a single file to migrate from direct prisma imports to withPrismaRoute
 */
async function processFile(filePath: string): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    if (content.includes("withPrismaRoute")) {
      console.log(`⏭️ Skipped: ${path.basename(filePath)} (already using withPrismaRoute)`);
      return false;
    }

    if (
      !content.includes("export const GET") &&
      !content.includes("export const POST") &&
      !content.includes("export const PUT") &&
      !content.includes("export const DELETE") &&
      !content.includes("export const PATCH")
    ) {
      console.log(`⏭️ Skipped: ${path.basename(filePath)} (not a route handler)`);
      return false;
    }

    const hasPrismaImport = IMPORT_REGEX.test(content);
    const hasDynamicPrismaImport = DYNAMIC_IMPORT_REGEX.test(content);
    const usesPrisma = hasPrismaImport || hasDynamicPrismaImport || PRISMA_USAGE_REGEX.test(content);

    if (!usesPrisma) {
      console.log(`⏭️ Skipped: ${path.basename(filePath)} (does not use prisma)`);
      return false;
    }

    if (!content.includes("import { withPrismaRoute }")) {
      content = `import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";\nimport type { PrismaClient } from "@calcom/prisma";\n${content}`;
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

    const exportRegex = /export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*([^;]+);/g;
    content = content.replace(exportRegex, (match, method, handlerExpr) => {
      if (handlerExpr.includes("withPrismaRoute")) {
        return match;
      }

      if (handlerExpr.includes("defaultResponderForAppDir")) {
        return `export const ${method} = withPrismaRoute(${handlerExpr
          .replace("defaultResponderForAppDir(", "")
          .replace(")", "")});`;
      }

      return `export const ${method} = withPrismaRoute(${handlerExpr});`;
    });

    const handlerFunctionRegex = /async\s+function\s+(\w+)\s*\(([^)]*)\)/g;
    content = content.replace(handlerFunctionRegex, (match, funcName, params) => {
      if (params.includes("prisma:")) {
        return match; // Already has prisma parameter
      }

      if (params.trim() === "") {
        return `async function ${funcName}(req: Request, prisma: PrismaClient)`;
      }

      return `async function ${funcName}(${params}, prisma: PrismaClient)`;
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
 * Find all API route files in the repository
 */
function findAllApiRouteFiles(): string[] {
  try {
    const baseDir = "/home/ubuntu/repos/cal.com";
    const output = execSync(
      'find apps/web/app/api -name "route.ts" | grep -v "tenant-test" | grep -v "tenant-example" | grep -v "tenant-aware-example" | grep -v "cron/tenant-aware-example"',
      { cwd: baseDir, encoding: "utf8" }
    );

    return output
      .split("\n")
      .filter(Boolean)
      .map((file) => path.join(baseDir, file));
  } catch (error) {
    console.error("Error finding API route files:", error);
    return [];
  }
}

/**
 * Process a batch of files
 */
async function processBatch(batchSize = 10): Promise<void> {
  const allFiles = findAllApiRouteFiles();
  const batch = allFiles.slice(0, batchSize);

  console.log(`Found ${allFiles.length} API route files. Processing first ${batch.length} files...`);

  await processFiles(batch);
}

async function processAllFiles(): Promise<void> {
  const allFiles = findAllApiRouteFiles();
  console.log(`Found ${allFiles.length} API route files. Processing all files...`);
  await processFiles(allFiles);
}

if (require.main === module) {
  processAllFiles().catch(console.error);
}

export { processFile, processFiles, findAllApiRouteFiles, processBatch, processAllFiles };

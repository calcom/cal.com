const fs = require("fs-extra");
const path = require("path");

const SOURCE_DIR = "packages/app-store/routing-forms";
const DEST_DIR = "packages/features/routing-forms";

// Directories to migrate
const DIRS_TO_MIGRATE = [
  "pages",
  "lib",
  "types",
  "trpc",
  "playwright",
  "static",
  "components",
  "emails",
  "__tests__",
  "api",
];

// Files to migrate
const FILES_TO_MIGRATE = [
  "zod.ts",
  "trpc-router.ts",
  "appBookingFormHandler.ts",
  "appComponents.ts",
  "appDataSchemas.ts",
  "config.json",
  "enrichFormWithMigrationData.ts",
  "env.d.ts",
  "getEventTypeRedirectUrl.ts",
  "index.ts",
  "jsonLogicToPrisma.ts",
];

async function createDirectoryStructure() {
  console.log("Creating directory structure...");
  for (const dir of DIRS_TO_MIGRATE) {
    const destPath = path.join(DEST_DIR, dir);
    await fs.ensureDir(destPath);
    console.log(`Created directory: ${destPath}`);
  }
}

async function copyFiles() {
  console.log("\nCopying files...");
  for (const file of FILES_TO_MIGRATE) {
    const sourcePath = path.join(SOURCE_DIR, file);
    const destPath = path.join(DEST_DIR, file);
    try {
      await fs.copy(sourcePath, destPath);
      console.log(`Copied: ${file}`);
    } catch (error) {
      console.error(`Failed to copy ${file}:`, error.message);
    }
  }
}

async function copyDirectories() {
  console.log("\nCopying directories...");
  for (const dir of DIRS_TO_MIGRATE) {
    const sourcePath = path.join(SOURCE_DIR, dir);
    const destPath = path.join(DEST_DIR, dir);
    try {
      await fs.copy(sourcePath, destPath);
      console.log(`Copied directory: ${dir}`);
    } catch (error) {
      console.error(`Failed to copy directory ${dir}:`, error.message);
    }
  }
}

async function main() {
  console.log("Starting Routing Forms migration...");

  try {
    await createDirectoryStructure();
    await copyFiles();
    await copyDirectories();

    console.log("\nMigration completed successfully!");
    console.log("\nNext steps:");
    console.log(
      "1. Update imports in all files to use @calcom/features/routing-forms instead of @calcom/app-store/routing-forms"
    );
    console.log("2. Run tests to ensure everything works correctly");
    console.log("3. Remove the old routing-forms directory from app-store once verified");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();

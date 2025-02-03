const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");

const OLD_IMPORT = "@calcom/app-store/routing-forms";
const NEW_IMPORT = "@calcom/features/routing-forms";
const OLD_TYPES_IMPORT = "@/types/routing-forms";

// Directories to exclude
const EXCLUDE_DIRS = ["node_modules", "dist", ".next", "build", "packages/app-store/routing-forms"];

// File extensions to process
const FILE_EXTENSIONS = "{ts,tsx,js,jsx}";

function updateImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Skip if file doesn't contain any of the old imports
  if (
    !content.includes(OLD_IMPORT) &&
    !content.includes(OLD_TYPES_IMPORT) &&
    !content.includes("@/routing-forms")
  ) {
    return false;
  }

  // Replace imports
  let updatedContent = content
    // Replace @calcom/app-store/routing-forms imports
    .replace(new RegExp(`from ["']${OLD_IMPORT}(/[^"']*)?["']`, "g"), (match) =>
      match.replace(OLD_IMPORT, NEW_IMPORT)
    )
    .replace(new RegExp(`import\\(["']${OLD_IMPORT}(/[^"']*)?["']\\)`, "g"), (match) =>
      match.replace(OLD_IMPORT, NEW_IMPORT)
    )
    .replace(new RegExp(`require\\(["']${OLD_IMPORT}(/[^"']*)?["']\\)`, "g"), (match) =>
      match.replace(OLD_IMPORT, NEW_IMPORT)
    )
    // Replace @/types/routing-forms imports
    .replace(new RegExp(`from ["']${OLD_TYPES_IMPORT}(/[^"']*)?["']`, "g"), (match) =>
      match.replace(OLD_TYPES_IMPORT, `${NEW_IMPORT}/types`)
    )
    // Replace any other @/routing-forms imports
    .replace(new RegExp(`from ["']@/routing-forms(/[^"']*)?["']`, "g"), (match) =>
      match.replace("@/routing-forms", NEW_IMPORT)
    );

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.log(`Updated imports in: ${filePath}`);
    return true;
  }
  return false;
}

function findFiles() {
  const excludePattern = EXCLUDE_DIRS.map((dir) => `**/${dir}/**`);
  const files = [];

  // Search in common directories
  ["apps", "packages"].forEach((baseDir) => {
    const pattern = `${baseDir}/**/*.${FILE_EXTENSIONS}`;
    const matches = glob.sync(pattern, {
      ignore: excludePattern,
      nodir: true,
    });
    files.push(...matches);
  });

  return files;
}

async function main() {
  console.log("Starting import updates...");

  try {
    const files = findFiles();
    let updatedCount = 0;

    console.log(`Found ${files.length} files to check...`);

    for (const file of files) {
      if (updateImports(file)) {
        updatedCount++;
      }
    }

    console.log(`\nCompleted successfully!`);
    console.log(`Updated ${updatedCount} files`);

    if (updatedCount > 0) {
      console.log("\nNext steps:");
      console.log("1. Run tests to verify the changes");
      console.log("2. Check git diff to ensure changes are correct");
    } else {
      console.log("\nNo files needed updating");
    }
  } catch (error) {
    console.error("Failed to update imports:", error);
    process.exit(1);
  }
}

main();

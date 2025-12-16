const fs = require("fs");
const path = require("path");
const glob = require("glob");
const crypto = require("crypto");

const copyAppStoreStatic = () => {
  // Get all static files from app-store packages
  const staticFiles = glob.sync("../../packages/app-store/**/static/**/*", { nodir: true });

  // Object to store icon SVG hashes
  const SVG_HASHES = {};

  staticFiles.forEach((file) => {
    // Extract app name from path
    const appNameMatch = file.match(/app-store\/(.*?)\/static/);
    if (!appNameMatch) return;

    const appDirName = appNameMatch[1];
    const fileName = path.basename(file);
    // Create destination directory if it doesn't exist
    const destDir = path.join(process.cwd(), "public", "app-store", appDirName);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file to destination (Turborepo caching handles change detection)
    const destPath = path.join(destDir, fileName);
    fs.copyFileSync(file, destPath);

    // If it's an icon SVG file, compute hash
    if (fileName.includes("icon") && fileName.endsWith(".svg")) {
      const content = fs.readFileSync(file, "utf8");
      const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
      SVG_HASHES[appDirName] = hash;
    }

    console.log(`Copied ${file} to ${destPath}`);
  });

  // Write SVG hashes to a JSON file
  const hashFilePath = path.join(process.cwd(), "public", "app-store", "svg-hashes.json");
  fs.writeFileSync(hashFilePath, JSON.stringify(SVG_HASHES, null, 2));
};

// Run the copy function
copyAppStoreStatic();

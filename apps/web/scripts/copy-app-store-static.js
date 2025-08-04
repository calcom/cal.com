const fs = require("fs");
const path = require("path");
const glob = require("glob");

const copyAppStoreStatic = () => {
  // Get all static files from app-store packages
  const staticFiles = glob.sync("../../packages/app-store/**/static/**/*", { nodir: true });

  staticFiles.forEach((file) => {
    // Extract app name from path
    const appNameMatch = file.match(/app-store\/(.*?)\/static/);
    if (!appNameMatch) return;

    const appName = appNameMatch[1];
    const fileName = path.basename(file);

    // Create destination directory if it doesn't exist
    const destDir = path.join(process.cwd(), "public", "app-store", appName);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file to destination
    const destPath = path.join(destDir, fileName);
    fs.copyFileSync(file, destPath);
    console.log(`Copied ${file} to ${destPath}`);
  });
};

// Run the copy function
copyAppStoreStatic();

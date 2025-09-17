const fs = require("fs");
const path = require("path");
const glob = require("glob");
const crypto = require("crypto");

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

    // Check if the file already exists in the destination directory
    const destPath = path.join(destDir, fileName);
    if (fs.existsSync(destPath)) {
      // Perform MD5 check to see if the file has changed
      const sourceHash = getFileHash(file);
      const destHash = getFileHash(destPath);

      if (sourceHash === destHash) {
        return; // Skip copying the file if hashes match
      }
    }

    // Copy file to destination
    fs.copyFileSync(file, destPath);
    console.log(`Copied ${file} to ${destPath}`);
  });
};

// Helper function to calculate the MD5 hash of a file
const getFileHash = (filePath) => {
  const hash = crypto.createHash("md5");
  const fileBuffer = fs.readFileSync(filePath);
  hash.update(fileBuffer);
  return hash.digest("hex");
};

// Run the copy function
copyAppStoreStatic();

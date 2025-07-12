const fs = require("fs");
const path = require("path");
const glob = require("glob");

const copyLocalesStatic = () => {
  const localeFiles = glob.sync("../../packages/lib/server/locales/**/*.json", { nodir: true });

  localeFiles.forEach((file) => {
    const relativePath = file.replace("../../packages/lib/server/locales/", "");

    // Create destination directory if it doesn't exist
    const destDir = path.join(process.cwd(), "public", "static", "locales", path.dirname(relativePath));
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file to destination
    const destPath = path.join(process.cwd(), "public", "static", "locales", relativePath);
    fs.copyFileSync(file, destPath);
    console.log(`Copied ${file} to ${destPath}`);
  });
};

// Run the copy function
copyLocalesStatic();

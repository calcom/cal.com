const fs = require("fs");
const path = require("path");
const glob = require("glob");

const copyLocalesStatic = () => {
  const localeFiles = glob.sync("../../packages/lib/server/locales/**/*.json", { nodir: true });

  localeFiles.forEach((file) => {
    // Extract locale and namespace from path
    const localeMatch = file.match(/locales\/(.*?)\/(.*?)\.json/);
    if (!localeMatch) return;

    const locale = localeMatch[1];
    const namespace = localeMatch[2];

    // Create destination directory if it doesn't exist
    const destDir = path.join(process.cwd(), "public", "locales", locale);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file to destination
    const destPath = path.join(destDir, `${namespace}.json`);
    fs.copyFileSync(file, destPath);
    console.log(`Copied ${file} to ${destPath}`);
  });
};

// Run the copy function
copyLocalesStatic();

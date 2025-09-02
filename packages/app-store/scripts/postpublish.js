const fs = require("fs");
const path = require("path");

const packagePath = path.join(__dirname, "..", "package.json");
const backupPath = `${packagePath}.backup`;

if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, packagePath);
  fs.unlinkSync(backupPath);
}

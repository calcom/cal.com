const fs = require("fs");
const path = require("path");

const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

fs.writeFileSync(`${packagePath}.backup`, JSON.stringify(packageJson, null, 2));

packageJson.private = false;

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

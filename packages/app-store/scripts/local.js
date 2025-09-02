const fs = require("fs");
const path = require("path");

const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

const timestamp = Date.now();
packageJson.version = `0.1.0-local.${timestamp}`;
packageJson.name = "@calcom/app-store-local";

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

console.log(`Updated package.json for local testing: ${packageJson.name}@${packageJson.version}`);

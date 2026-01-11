import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = "9.9.9";

// note(Lauris): update libraries package.json version
const librariesPath = path.join(__dirname, "..");
const librariesPackageJsonPath = path.join(librariesPath, "package.json");
const librariesPackageJson = JSON.parse(fs.readFileSync(librariesPackageJsonPath, "utf8"));

librariesPackageJson.version = VERSION;

fs.writeFileSync(librariesPackageJsonPath, `${JSON.stringify(librariesPackageJson, null, 2)}\n`);

// note(Lauris): update API v2 package.json dependency
const apiV2PackageJsonPath = path.join(librariesPath, "..", "..", "..", "apps", "api", "v2", "package.json");
const apiV2PackageJson = JSON.parse(fs.readFileSync(apiV2PackageJsonPath, "utf8"));

apiV2PackageJson.dependencies["@calcom/platform-libraries"] = `npm:@calcom/platform-libraries@${VERSION}`;

fs.writeFileSync(apiV2PackageJsonPath, `${JSON.stringify(apiV2PackageJson, null, 2)}\n`);

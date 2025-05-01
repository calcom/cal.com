import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Get the published version before resetting
    const librariesPath = path.join(__dirname, "..");
    const librariesPackageJsonPath = path.join(librariesPath, "package.json");
    const librariesPackageJson = JSON.parse(fs.readFileSync(librariesPackageJsonPath, "utf8"));
    const publishedVersion = librariesPackageJson.version;

    // Reset libraries package.json version to 0.0.0
    librariesPackageJson.version = "0.0.0";
    fs.writeFileSync(librariesPackageJsonPath, `${JSON.stringify(librariesPackageJson, null, 2)}\n`);

    // Update API v2 package.json dependency
    const apiV2PackageJsonPath = path.join(
      librariesPath,
      "..",
      "..",
      "..",
      "apps",
      "api",
      "v2",
      "package.json"
    );
    const apiV2PackageJson = JSON.parse(fs.readFileSync(apiV2PackageJsonPath, "utf8"));

    apiV2PackageJson.dependencies[
      "@calcom/platform-libraries"
    ] = `npm:@calcom/platform-libraries@${publishedVersion}`;
    fs.writeFileSync(apiV2PackageJsonPath, `${JSON.stringify(apiV2PackageJson, null, 2)}\n`);

    // Run yarn install
    const yarnInstall = spawn("yarn", ["install"], {
      stdio: "inherit",
      cwd: path.join(librariesPath, "..", "..", ".."),
    });

    yarnInstall.on("close", (code) => {
      if (code !== 0) {
        console.error("yarn install failed");
        process.exit(1);
      }
      console.log("Successfully reset version and updated dependencies");
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

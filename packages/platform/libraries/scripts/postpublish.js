import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { getCurrentVersion } from "./prepublish.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

main();

async function main() {
  try {
    // Get the published version before resetting
    const librariesPath = path.join(__dirname, "..");
    const librariesPackageJsonPath = path.join(librariesPath, "package.json");
    const librariesPackageJson = JSON.parse(fs.readFileSync(librariesPackageJsonPath, "utf8"));
    const publishedVersion = librariesPackageJson.version;

    // Wait for the npm registry to reflect our published version
    await waitForNewestNpmRelease(publishedVersion);

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

    apiV2PackageJson.dependencies["@calcom/platform-libraries"] =
      `npm:@calcom/platform-libraries@${publishedVersion}`;
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

async function waitForNewestNpmRelease(publishedVersion) {
  console.log(`Waiting for npm registry to update with version ${publishedVersion}...`);
  let npmVersion;
  let attempts = 0;
  const maxAttempts = 12;

  while (true) {
    attempts++;
    npmVersion = await getCurrentVersion();

    if (publishedVersion === npmVersion) {
      console.log(
        `Version match confirmed (${publishedVersion}) after ${attempts} attempts. Proceeding with updates...`
      );
      break;
    }

    if (attempts >= maxAttempts) {
      console.log(
        `Reached maximum attempts (${maxAttempts}). Latest npm version: ${npmVersion}, local version: ${publishedVersion}`
      );
      console.log("Proceeding with updates anyway...");
      break;
    }

    console.log(
      `Attempt ${attempts}/${maxAttempts}: npm version (${npmVersion}) doesn't match local version (${publishedVersion}) yet. Retrying in 5 seconds...`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return npmVersion;
}

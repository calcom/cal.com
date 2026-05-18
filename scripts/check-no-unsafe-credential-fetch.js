#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const targetDirs = [
  path.join(rootDir, "packages", "trpc", "server"),
  path.join(rootDir, "packages", "features", "bookings"),
];

const allowedFiles = new Set([
  path.join(rootDir, "packages", "features", "bookings", "lib", "test", "builder.ts"),
]);

const disallowedPattern = /\bcredentials\s*:\s*true\b/g;
const ignoredDirectories = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);
const supportedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

function walk(dir, output = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
      continue;
    }
    if (supportedExtensions.has(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }
  return output;
}

const violations = [];
for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) continue;
  const files = walk(targetDir);
  for (const filePath of files) {
    if (allowedFiles.has(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const matches = content.match(disallowedPattern);
    if (!matches?.length) continue;
    violations.push(path.relative(rootDir, filePath));
  }
}

if (violations.length) {
  console.error("Found disallowed `credentials: true` usage in sensitive server paths:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  console.error(
    "Replace with an explicit select (for example `safeCredentialSelect`) or use an access-checked repository method."
  );
  process.exit(1);
}

console.log("No unsafe `credentials: true` usage found in protected server paths.");

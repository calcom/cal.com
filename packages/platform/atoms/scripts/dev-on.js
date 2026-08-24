import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, "../package.json");
const viteConfigPath = path.join(__dirname, "../vite.config.ts");

// Modify package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
packageJson.main = "./dist/cal-atoms.umd.cjs";
packageJson.exports["."].require = "./dist/cal-atoms.umd.cjs";
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Modify vite.config.ts
let viteConfig = fs.readFileSync(viteConfigPath, "utf-8");
viteConfig = viteConfig.replace(/formats: \["es"\],/g, "");
viteConfig = viteConfig.replace(/external: \[([^\]]+)\]/, 'external: [$1, "react-awesome-query-builder"]');
viteConfig = viteConfig.replace(/format: "esm",\s*/g, "");
fs.writeFileSync(viteConfigPath, viteConfig);

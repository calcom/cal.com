import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
viteConfig = viteConfig.replace(
  /external: \[([^\]]+)\]/,
  'external: [$1, "@react-awesome-query-builder/core", "@react-awesome-query-builder/ui"]'
);
viteConfig = viteConfig.replace(/format: "esm",\s*/g, "");
// Add global mappings for react-awesome-query-builder packages
viteConfig = viteConfig.replace(
  /(globals: \{\s*react: "React",\s*"react-dom": "ReactDOM",\s*"react\/jsx-runtime": "ReactJsxRuntime",)/,
  '$1\n            "@react-awesome-query-builder/core": "ReactAwesomeQueryBuilderCore",\n            "@react-awesome-query-builder/ui": "ReactAwesomeQueryBuilderUI",'
);
fs.writeFileSync(viteConfigPath, viteConfig);

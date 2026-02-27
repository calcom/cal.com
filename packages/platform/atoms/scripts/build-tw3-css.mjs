import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cssnano from "cssnano";
import postcss from "postcss";
import prefixwrap from "postcss-prefixwrap";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const { default: postcssStripLayers } = await import(resolve(root, "postcss-strip-layers.js"));
const { default: postcssStripGradientProperties } = await import(
  resolve(root, "postcss-strip-gradient-properties.js")
);

const inputPath = resolve(root, "globals.css");
const outputPath = resolve(root, "globals.tw3.min.css");

const input = readFileSync(inputPath, "utf-8");

const result = await postcss([
  prefixwrap(".calcom-atoms"),
  postcssStripLayers(),
  postcssStripGradientProperties(),
  cssnano({ preset: "default" }),
]).process(input, { from: inputPath, to: outputPath });

writeFileSync(outputPath, result.css);
console.log("globals.min.css built for TW3 compatibility");

import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import bundleSize from "rollup-plugin-bundle-size";

import pkg from "./package.json";

/** @type {import('rollup').RollupOptions} */
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "es",
    },
  ],
  plugins: [
    json(),
    commonjs(),
    nodeResolve(),
    typescript({ tsconfig: "./tsconfig.build.json" }),
    bundleSize(),
  ],
};

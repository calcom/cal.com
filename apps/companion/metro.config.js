/* eslint-disable */

const fs = require("fs");
const path = require("path");
const Module = require("module");

// Guarantee dependencies resolve from this workspace even when packages are hoisted
const workspaceNodeModules = path.join(__dirname, "node_modules");
process.env.NODE_PATH = [workspaceNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
process.env.NATIVEWIND_CACHE_DIR =
  process.env.NATIVEWIND_CACHE_DIR || path.join(__dirname, ".cache", "nativewind");
Module._initPaths();
fs.mkdirSync(process.env.NATIVEWIND_CACHE_DIR, { recursive: true });

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });

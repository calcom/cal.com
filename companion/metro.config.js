const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// In the Cal.com monorepo, dependencies may exist both at repo root and in companion/.
// If Metro resolves some packages from the root and others from companion/node_modules,
// React context-based libraries (like React Query) can break with:
// "No QueryClient set, use QueryClientProvider to set one".
//
// Force Metro to resolve dependencies only from companion/node_modules to ensure a single instance.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

// Extra safety: pin TanStack Query packages to the companion copies.
// Root has a different version which can cause context mismatches at runtime.
config.resolver.extraNodeModules = {
  "@tanstack/react-query": path.resolve(__dirname, "node_modules/@tanstack/react-query"),
  "@tanstack/query-core": path.resolve(__dirname, "node_modules/@tanstack/query-core"),
  "@tanstack/react-query-persist-client": path.resolve(
    __dirname,
    "node_modules/@tanstack/react-query-persist-client"
  ),
  "@tanstack/query-persist-client-core": path.resolve(
    __dirname,
    "node_modules/@tanstack/query-persist-client-core"
  ),
};

module.exports = withNativeWind(config, { input: "./global.css" });

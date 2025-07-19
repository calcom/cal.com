const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.platforms = ["native", "android", "ios", "web"];
config.resolver.disableHierarchicalLookup = false;

config.resolver.alias = {
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "../Utilities/Platform": path.resolve(
    projectRoot,
    "node_modules/react-native/Libraries/Utilities/Platform"
  ),
  "../Utilities": path.resolve(projectRoot, "node_modules/react-native/Libraries/Utilities"),
};

config.resolver.resolverMainFields = ["react-native", "browser", "main"];
config.resolver.sourceExts = ["js", "json", "ts", "tsx", "jsx"];

module.exports = config;

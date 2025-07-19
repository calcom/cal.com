const fs = require("fs");
const path = require("path");

// Generate a minimal routes-manifest.json file for Vercel compatibility
const routesManifest = {
  version: 3,
  pages404: false,
  basePath: "",
  redirects: [],
  rewrites: {
    beforeFiles: [],
    afterFiles: [],
    fallback: [],
  },
  headers: [],
  staticRoutes: [],
  dynamicRoutes: [],
  dataRoutes: [],
  i18n: null,
};

const outputPath = path.join(__dirname, "../.next/routes-manifest.json");
fs.writeFileSync(outputPath, JSON.stringify(routesManifest, null, 2));
console.log("Generated routes-manifest.json for Vercel compatibility");

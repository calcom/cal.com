const fs = require("fs");
const path = require("path");
let isInWatchMode = false;
if (process.argv[2] === "--watch") {
  isInWatchMode = true;
}
const chokidar = require("chokidar");
const { debounce } = require("lodash");

function getAppName(candidatePath) {
  function isValidAppName(candidatePath) {
    if (!candidatePath.startsWith("_") && !candidatePath.includes("/") && !candidatePath.includes("\\")) {
      return candidatePath;
    }
  }

  if (isValidAppName(candidatePath)) {
    // Already a dirname of an app
    return candidatePath;
  }
  // Get dirname of app from full path
  const dirName = path.relative(__dirname, candidatePath);
  return isValidAppName(dirName) ? dirName : null;
}

function generateFiles() {
  let clientOutput = [`import dynamic from "next/dynamic"`];
  let serverOutput = [];
  const appDirs = [];

  fs.readdirSync(`${__dirname}`).forEach(function (dir) {
    if (fs.statSync(`${__dirname}/${dir}`).isDirectory()) {
      if (!getAppName(dir)) {
        return;
      }
      appDirs.push(dir);
    }
  });

  function forEachAppDir(callback) {
    for (let i = 0; i < appDirs.length; i++) {
      callback(appDirs[i]);
    }
  }

  function getObjectExporter(objectName, { fileToBeImported, importBuilder, entryBuilder }) {
    const output = [];
    forEachAppDir((appName) => {
      if (fs.existsSync(path.join(__dirname, appName, fileToBeImported))) {
        output.push(importBuilder(appName));
      }
    });

    output.push(`export const ${objectName} = {`);

    forEachAppDir((dirName) => {
      if (fs.existsSync(path.join(__dirname, dirName, fileToBeImported))) {
        output.push(entryBuilder(dirName));
      }
    });

    output.push(`};`);
    return output;
  }

  serverOutput.push(
    ...getObjectExporter("appStoreMetadata", {
      fileToBeImported: "_metadata.ts",
      importBuilder: (appName) => `import { metadata as ${appName}_meta } from "./${appName}/_metadata";`,
      entryBuilder: (appName) => `${appName}:${appName}_meta,`,
    })
  );

  serverOutput.push(
    ...getObjectExporter("apiHandlers", {
      fileToBeImported: "api/index.ts",
      importBuilder: (appName) => `const ${appName}_api = import("./${appName}/api");`,
      entryBuilder: (appName) => `${appName}:${appName}_api,`,
    })
  );

  clientOutput.push(
    ...getObjectExporter("InstallAppButtonMap", {
      fileToBeImported: "components/InstallAppButton.tsx",
      importBuilder: (appName) =>
        `const ${appName}_installAppButton = dynamic(() =>import("./${appName}/components/InstallAppButton"));`,
      entryBuilder: (appName) => `${appName}:${appName}_installAppButton,`,
    })
  );

  fs.writeFileSync(`${__dirname}/apps.generated.ts`, serverOutput.join("\n"));
  fs.writeFileSync(`${__dirname}/apps.components.generated.tsx`, clientOutput.join("\n"));
  console.log("Generated `apps.generated.ts` and `apps.components.generated.tsx`");
}

const debouncedGenerateFiles = debounce(generateFiles);

if (isInWatchMode) {
  chokidar
    .watch(__dirname)
    .on("addDir", (dirPath) => {
      const appName = getAppName(dirPath);
      if (appName) {
        console.log(`Added ${appName}`);
        debouncedGenerateFiles();
      }
    })
    .on("change", (filePath) => {
      if (filePath.endsWith("config.json")) {
        console.log("Config file changed");
        debouncedGenerateFiles();
      }
    })
    .on("unlinkDir", (dirPath) => {
      const appName = getAppName(dirPath);
      if (appName) {
        console.log(`Removed ${appName}`);
        debouncedGenerateFiles();
      }
    });
} else {
  generateFiles();
}

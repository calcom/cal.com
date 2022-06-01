const fs = require("fs");
const path = require("path");
const appDirs = [];
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
  fs.readdirSync(`${__dirname}`).forEach(function (dir) {
    if (fs.statSync(`${__dirname}/${dir}`).isDirectory()) {
      if (!getAppName(dir)) {
        return;
      }
      appDirs.push(dir);
    }
  });

  let clientOutput = [`import dynamic from "next/dynamic"`];
  let serverOutput = [];

  function forEachAppDir(callback) {
    for (let i = 0; i < appDirs.length; i++) {
      callback(appDirs[i]);
    }
  }

  function getObjectExporter(objectName, { dirName, importBuilder, entryBuilder }) {
    const output = [];
    forEachAppDir((dirName) => {
      output.push(importBuilder(dirName));
    });

    output.push(`export const ${objectName} = {`);

    forEachAppDir((dirName) => {
      output.push(entryBuilder(dirName));
    });

    output.push(`};`);
    return output;
  }

  serverOutput.push(
    ...getObjectExporter("appStoreMetadata", {
      importBuilder: (dirName) => `import { metadata as ${dirName}_meta } from "./${dirName}/_metadata";`,
      entryBuilder: (dirName) => `${dirName}:${dirName}_meta,`,
    })
  );

  serverOutput.push(
    ...getObjectExporter("apiHandlers", {
      importBuilder: (dirName) => `const ${dirName}_api = import("./${dirName}/api");`,
      entryBuilder: (dirName) => `${dirName}:${dirName}_api,`,
    })
  );

  clientOutput.push(
    ...getObjectExporter("InstallAppButtonMap", {
      importBuilder: (dirName) =>
        `const ${dirName}_installAppButton = dynamic(() =>import("./${dirName}/components/InstallAppButton"));`,
      entryBuilder: (dirName) => `${dirName}:${dirName}_installAppButton,`,
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

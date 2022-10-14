import chokidar from "chokidar";
import fs from "fs";
import { debounce } from "lodash";
import path from "path";
import prettier from "prettier";

import { AppMeta } from "@calcom/types/App";

import prettierConfig from "../../config/prettier-preset";
import execSync from "./execSync";

function isFileThere(path) {
  try {
    fs.statSync(path);
    return true;
  } catch (e) {
    return false;
  }
}
let isInWatchMode = false;
if (process.argv[2] === "--watch") {
  isInWatchMode = true;
}

const formatOutput = (source: string) => prettier.format(source, prettierConfig);

const getVariableName = function (appName: string) {
  return appName.replace("-", "_");
};

const getAppId = function (app: { name: string }) {
  // Handle stripe separately as it's an old app with different dirName than slug/appId
  return app.name === "stripepayment" ? "stripe" : app.name;
};

const APP_STORE_PATH = path.join(__dirname, "..", "..", "app-store");
type App = Partial<AppMeta> & {
  name: string;
  path: string;
};
function getAppName(candidatePath) {
  function isValidAppName(candidatePath) {
    if (
      !candidatePath.startsWith("_") &&
      candidatePath !== "ee" &&
      !candidatePath.includes("/") &&
      !candidatePath.includes("\\")
    ) {
      return candidatePath;
    }
  }
  if (isValidAppName(candidatePath)) {
    // Already a dirname of an app
    return candidatePath;
  }
  // Get dirname of app from full path
  const dirName = path.relative(APP_STORE_PATH, candidatePath);
  return isValidAppName(dirName) ? dirName : null;
}

function generateFiles() {
  const browserOutput = [`import dynamic from "next/dynamic"`];
  const metadataOutput = [];
  const schemasOutput = [];
  const serverOutput = [];
  const appDirs: { name: string; path: string }[] = [];

  fs.readdirSync(`${APP_STORE_PATH}`).forEach(function (dir) {
    if (dir === "ee") {
      fs.readdirSync(path.join(APP_STORE_PATH, dir)).forEach(function (eeDir) {
        if (fs.statSync(path.join(APP_STORE_PATH, dir, eeDir)).isDirectory()) {
          if (!getAppName(path.resolve(eeDir))) {
            appDirs.push({
              name: eeDir,
              path: path.join(dir, eeDir),
            });
          }
        }
      });
    } else {
      if (fs.statSync(path.join(APP_STORE_PATH, dir)).isDirectory()) {
        if (!getAppName(dir)) {
          return;
        }
        appDirs.push({
          name: dir,
          path: dir,
        });
      }
    }
  });

  function forEachAppDir(callback: (arg: App) => void) {
    for (let i = 0; i < appDirs.length; i++) {
      const configPath = path.join(APP_STORE_PATH, appDirs[i].path, "config.json");
      let app;

      if (fs.existsSync(configPath)) {
        app = JSON.parse(fs.readFileSync(configPath).toString());
      } else {
        app = {};
      }

      callback({
        ...app,
        name: appDirs[i].name,
        path: appDirs[i].path,
      });
    }
  }

  forEachAppDir((app) => {
    const templateDestinationDir = path.join(APP_STORE_PATH, app.path, "extensions");
    const templateDestinationFilePath = path.join(templateDestinationDir, "EventTypeAppCard.tsx");
    const zodDestinationFilePath = path.join(APP_STORE_PATH, app.path, "zod.ts");

    if (app.extendsFeature === "EventType" && !isFileThere(templateDestinationFilePath)) {
      execSync(`mkdir -p ${templateDestinationDir}`);
      execSync(`cp ../app-store/_templates/extensions/EventTypeAppCard.tsx ${templateDestinationFilePath}`);
      execSync(`cp ../app-store/_templates/zod.ts ${zodDestinationFilePath}`);
    }
  });

  function getObjectExporter(
    objectName,
    {
      fileToBeImported,
      importBuilder,
      entryBuilder,
    }: {
      fileToBeImported: string;
      importBuilder?: (arg: App) => string;
      entryBuilder: (arg: App) => string;
    }
  ) {
    const output = [];
    forEachAppDir((app) => {
      if (
        fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) &&
        typeof importBuilder === "function"
      ) {
        output.push(importBuilder(app));
      }
    });

    output.push(`export const ${objectName} = {`);

    forEachAppDir((app) => {
      if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported))) {
        output.push(entryBuilder(app));
      }
    });

    output.push(`};`);
    return output;
  }

  serverOutput.push(
    ...getObjectExporter("apiHandlers", {
      fileToBeImported: "api/index.ts",
      // Import path must have / even for windows and not \
      entryBuilder: (app) => `  "${app.name}": import("./${app.path.replace(/\\/g, "/")}/api"),`,
    })
  );

  metadataOutput.push(
    ...getObjectExporter("appStoreMetadata", {
      fileToBeImported: "_metadata.ts",
      // Import path must have / even for windows and not \
      importBuilder: (app) =>
        `import { metadata as ${getVariableName(app.name)}_meta } from "./${app.path.replace(
          /\\/g,
          "/"
        )}/_metadata";`,
      entryBuilder: (app) => `  "${app.name}":${getVariableName(app.name)}_meta,`,
    })
  );

  schemasOutput.push(
    ...getObjectExporter("appDataSchemas", {
      fileToBeImported: "zod.ts",
      // Import path must have / even for windows and not \
      importBuilder: (app) =>
        `import { appDataSchema as ${getVariableName(app.name)}_schema } from "./${app.path.replace(
          /\\/g,
          "/"
        )}/zod";`,
      // Key must be appId as this is used by eventType metadata and lookup is by appId
      entryBuilder: (app) => `  "${getAppId(app)}":${getVariableName(app.name)}_schema ,`,
    })
  );

  browserOutput.push(
    ...getObjectExporter("InstallAppButtonMap", {
      fileToBeImported: "components/InstallAppButton.tsx",
      entryBuilder: (app) =>
        `  ${app.name}: dynamic(() =>import("./${app.path}/components/InstallAppButton")),`,
    })
  );

  browserOutput.push(
    ...getObjectExporter("EventTypeAddonMap", {
      fileToBeImported: path.join("extensions", "EventTypeAppCard.tsx"),
      entryBuilder: (app) =>
        `  ${app.name}: dynamic(() =>import("./${app.path}/extensions/EventTypeAppCard")),`,
    })
  );

  const banner = `/**
    This file is autogenerated using the command \`yarn app-store:build --watch\`.
    Don't modify this file manually.
**/
`;
  const filesToGenerate: [string, string[]][] = [
    ["apps.metadata.generated.ts", metadataOutput],
    ["apps.server.generated.ts", serverOutput],
    ["apps.browser.generated.tsx", browserOutput],
    ["apps.schemas.generated.ts", schemasOutput],
  ];
  filesToGenerate.forEach(([fileName, output]) => {
    fs.writeFileSync(`${APP_STORE_PATH}/${fileName}`, formatOutput(`${banner}${output.join("\n")}`));
  });
  console.log(`Generated ${filesToGenerate.map(([fileName]) => fileName).join(", ")}`);
}

const debouncedGenerateFiles = debounce(generateFiles);

if (isInWatchMode) {
  chokidar
    .watch(APP_STORE_PATH)
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

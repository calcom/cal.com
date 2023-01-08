import chokidar from "chokidar";
import fs from "fs";
import { debounce } from "lodash";
import path from "path";
import prettier from "prettier";

import prettierConfig from "@calcom/config/prettier-preset";
import { AppMeta } from "@calcom/types/App";

import { APP_STORE_PATH } from "./constants";
import { getAppName } from "./utils/getAppName";

let isInWatchMode = false;
if (process.argv[2] === "--watch") {
  isInWatchMode = true;
}

const formatOutput = (source: string) =>
  prettier.format(source, {
    parser: "babel",
    ...prettierConfig,
  });

const getVariableName = function (appName: string) {
  return appName.replace(/[-.]/g, "_");
};

const getAppId = function (app: { name: string }) {
  // Handle stripe separately as it's an old app with different dirName than slug/appId
  return app.name === "stripepayment" ? "stripe" : app.name;
};

type App = Partial<AppMeta> & {
  name: string;
  path: string;
};
function generateFiles() {
  const browserOutput = [`import dynamic from "next/dynamic"`];
  const metadataOutput = [];
  const schemasOutput = [];
  const appKeysSchemasOutput = [];
  const serverOutput = [];
  const appDirs: { name: string; path: string }[] = [];

  fs.readdirSync(`${APP_STORE_PATH}`).forEach(function (dir) {
    if (dir === "ee" || dir === "templates") {
      fs.readdirSync(path.join(APP_STORE_PATH, dir)).forEach(function (subDir) {
        if (fs.statSync(path.join(APP_STORE_PATH, dir, subDir)).isDirectory()) {
          if (getAppName(subDir)) {
            appDirs.push({
              name: subDir,
              path: path.join(dir, subDir),
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

  function getModuleName(name: string) {
    return name.replace(/\/index\.ts|\/index\.tsx/, "").replace(/\.tsx$|\.ts$/, "");
  }

  type ImportConfig =
    | {
        fileToBeImported: string;
        importName?: string;
      }
    | [
        {
          fileToBeImported: string;
          importName?: string;
        },
        {
          fileToBeImported: string;
          importName: string;
        }
      ];

  /**
   * If importConfig is an array, only 2 items are allowed. First one is the main one and second one is the fallback
   */
  function getObjectExporter(
    objectName: string,
    {
      lazyImport = false,
      importConfig,
      entryObjectKeyGetter = (app) => app.name,
    }: {
      lazyImport?: boolean;
      importConfig: ImportConfig;
      entryObjectKeyGetter?: (arg: App, importName?: string) => string;
    }
  ) {
    const output = [];
    function getChosenConfig(importConfig: ImportConfig, app: { path: string }) {
      let chosenConfig;

      if (!(importConfig instanceof Array)) {
        chosenConfig = importConfig;
      } else {
        if (fs.existsSync(path.join(APP_STORE_PATH, app.path, importConfig[0].fileToBeImported))) {
          chosenConfig = importConfig[0];
        } else {
          chosenConfig = importConfig[1];
        }
      }
      return chosenConfig;
    }

    const getLocalImportName = (app: { name: string }, chosenConfig) =>
      `${getVariableName(app.name)}_${getVariableName(chosenConfig.fileToBeImported)}`;

    forEachAppDir((app) => {
      const chosenConfig = getChosenConfig(importConfig, app);
      if (
        fs.existsSync(path.join(APP_STORE_PATH, app.path, chosenConfig.fileToBeImported)) &&
        chosenConfig.importName
      ) {
        const importName = chosenConfig.importName;
        if (!lazyImport) {
          if (importName !== "default")
            output.push(
              `import { ${importName} as ${getLocalImportName(app, chosenConfig)}} from "./${app.path.replace(
                /\\/g,
                "/"
              )}/${getModuleName(chosenConfig.fileToBeImported)}"`
            );
          else
            output.push(
              `import ${getLocalImportName(app, chosenConfig)} from "./${app.path.replace(
                /\\/g,
                "/"
              )}/${getModuleName(chosenConfig.fileToBeImported)}"`
            );
        }
      }
    });

    output.push(`export const ${objectName} = {`);

    forEachAppDir((app) => {
      const chosenConfig = getChosenConfig(importConfig, app);

      if (fs.existsSync(path.join(APP_STORE_PATH, app.path, chosenConfig.fileToBeImported))) {
        if (!lazyImport) {
          const key = entryObjectKeyGetter(app);
          output.push(`"${key}": ${getLocalImportName(app, chosenConfig)},`);
        } else {
          const key = entryObjectKeyGetter(app);
          if (chosenConfig.fileToBeImported.endsWith(".tsx")) {
            output.push(
              `"${key}": dynamic(() => import("./${app.path.replace(/\\/g, "/")}/${getModuleName(
                chosenConfig.fileToBeImported
              )}")),`
            );
          } else {
            output.push(
              `"${key}": import("./${app.path.replace(/\\/g, "/")}/${getModuleName(
                chosenConfig.fileToBeImported
              )}"),`
            );
          }
        }
      }
    });

    output.push(`};`);
    return output;
  }

  serverOutput.push(
    ...getObjectExporter("apiHandlers", {
      importConfig: {
        fileToBeImported: "api/index.ts",
      },
      lazyImport: true,
    })
  );

  metadataOutput.push(
    ...getObjectExporter("appStoreMetadata", {
      importConfig: [
        {
          fileToBeImported: "config.json",
          importName: "default",
        },
        {
          fileToBeImported: "_metadata.ts",
          importName: "metadata",
        },
      ],
    })
  );

  schemasOutput.push(
    ...getObjectExporter("appDataSchemas", {
      // Import path must have / even for windows and not \
      importConfig: {
        fileToBeImported: "zod.ts",
        importName: "appDataSchema",
      },
      // HACK: Key must be appId as this is used by eventType metadata and lookup is by appId
      // This can be removed once we rename the ids of apps like stripe to that of their app folder name
      entryObjectKeyGetter: (app) => getAppId(app),
    })
  );

  appKeysSchemasOutput.push(
    ...getObjectExporter("appKeysSchemas", {
      importConfig: {
        fileToBeImported: "zod.ts",
        importName: "appKeysSchema",
      },
      // HACK: Key must be appId as this is used by eventType metadata and lookup is by appId
      // This can be removed once we rename the ids of apps like stripe to that of their app folder name
      entryObjectKeyGetter: (app) => getAppId(app),
    })
  );

  browserOutput.push(
    ...getObjectExporter("InstallAppButtonMap", {
      importConfig: {
        fileToBeImported: "components/InstallAppButton.tsx",
      },
      lazyImport: true,
    })
  );

  // TODO: Make a component map creator that accepts ComponentName and does the rest.
  // TODO: dailyvideo has a slug of daily-video, so that mapping needs to be taken care of. But it is an old app, so it doesn't need AppSettings
  browserOutput.push(
    ...getObjectExporter("AppSettingsComponentsMap", {
      importConfig: {
        fileToBeImported: "components/AppSettingsInterface.tsx",
      },
      lazyImport: true,
    })
  );

  browserOutput.push(
    ...getObjectExporter("EventTypeAddonMap", {
      importConfig: {
        fileToBeImported: path.join("components", "EventTypeAppCardInterface.tsx"),
      },
      lazyImport: true,
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
    ["apps.keys-schemas.generated.ts", appKeysSchemasOutput],
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

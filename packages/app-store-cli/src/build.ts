import chokidar from "chokidar";
import fs from "fs";
// eslint-disable-next-line no-restricted-imports
import { debounce } from "lodash";
import path from "path";
import prettier from "prettier";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import prettierConfig from "@calcom/config/prettier-preset";
import type { AppMeta } from "@calcom/types/App";

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
  const bookerMetadataOutput = [];
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

  function forEachAppDir(callback: (arg: App) => void, filter: (arg: App) => boolean = () => true) {
    for (let i = 0; i < appDirs.length; i++) {
      const configPath = path.join(APP_STORE_PATH, appDirs[i].path, "config.json");
      const metadataPath = path.join(APP_STORE_PATH, appDirs[i].path, "_metadata.ts");
      let app;

      if (fs.existsSync(configPath)) {
        app = JSON.parse(fs.readFileSync(configPath).toString());
      } else if (fs.existsSync(metadataPath)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        app = require(metadataPath).metadata;
      } else {
        app = {};
      }

      const finalApp = {
        ...app,
        name: appDirs[i].name,
        path: appDirs[i].path,
      };

      if (filter(finalApp)) {
        callback(finalApp);
      }
    }
  }

  /**
   * Windows has paths with backslashes, so we need to replace them with forward slashes
   * .ts and .tsx files are imported without extensions
   * If a file has index.ts or index.tsx, it can be imported after removing the index.ts* part
   */
  function getModulePath(path: string, moduleName: string) {
    return `./${path.replace(/\\/g, "/")}/${moduleName
      .replace(/\/index\.ts|\/index\.tsx/, "")
      .replace(/\.tsx$|\.ts$/, "")}`;
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
  function getExportedObject(
    objectName: string,
    {
      lazyImport = false,
      importConfig,
      entryObjectKeyGetter = (app) => app.name,
    }: {
      lazyImport?: boolean;
      importConfig: ImportConfig;
      entryObjectKeyGetter?: (arg: App, importName?: string) => string;
    },
    filter?: (arg: App) => boolean
  ) {
    const output: string[] = [];

    const getLocalImportName = (
      app: { name: string },
      chosenConfig: ReturnType<typeof getChosenImportConfig>
    ) => `${getVariableName(app.name)}_${getVariableName(chosenConfig.fileToBeImported)}`;

    const fileToBeImportedExists = (
      app: { path: string },
      chosenConfig: ReturnType<typeof getChosenImportConfig>
    ) => fs.existsSync(path.join(APP_STORE_PATH, app.path, chosenConfig.fileToBeImported));

    addImportStatements();
    createExportObject();

    return output;

    function addImportStatements() {
      forEachAppDir((app) => {
        const chosenConfig = getChosenImportConfig(importConfig, app);
        if (fileToBeImportedExists(app, chosenConfig) && chosenConfig.importName) {
          const importName = chosenConfig.importName;
          if (!lazyImport) {
            if (importName !== "default") {
              // Import with local alias that will be used by createExportObject
              output.push(
                `import { ${importName} as ${getLocalImportName(app, chosenConfig)} } from "${getModulePath(
                  app.path,
                  chosenConfig.fileToBeImported
                )}"`
              );
            } else {
              // Default Import
              output.push(
                `import ${getLocalImportName(app, chosenConfig)} from "${getModulePath(
                  app.path,
                  chosenConfig.fileToBeImported
                )}"`
              );
            }
          }
        }
      }, filter);
    }

    function createExportObject() {
      output.push(`export const ${objectName} = {`);

      forEachAppDir((app) => {
        const chosenConfig = getChosenImportConfig(importConfig, app);

        if (fileToBeImportedExists(app, chosenConfig)) {
          if (!lazyImport) {
            const key = entryObjectKeyGetter(app);
            output.push(`"${key}": ${getLocalImportName(app, chosenConfig)},`);
          } else {
            const key = entryObjectKeyGetter(app);
            if (chosenConfig.fileToBeImported.endsWith(".tsx")) {
              output.push(
                `"${key}": dynamic(() => import("${getModulePath(
                  app.path,
                  chosenConfig.fileToBeImported
                )}")),`
              );
            } else {
              output.push(`"${key}": import("${getModulePath(app.path, chosenConfig.fileToBeImported)}"),`);
            }
          }
        }
      }, filter);

      output.push(`};`);
    }

    function getChosenImportConfig(importConfig: ImportConfig, app: { path: string }) {
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
  }

  serverOutput.push(
    ...getExportedObject("apiHandlers", {
      importConfig: {
        fileToBeImported: "api/index.ts",
      },
      lazyImport: true,
    })
  );

  metadataOutput.push(
    ...getExportedObject("appStoreMetadata", {
      // Try looking for config.json and if it's not found use _metadata.ts to generate appStoreMetadata
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

  bookerMetadataOutput.push(
    ...getExportedObject(
      "appStoreMetadata",
      {
        // Try looking for config.json and if it's not found use _metadata.ts to generate appStoreMetadata
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
      },
      isBookerApp
    )
  );
  schemasOutput.push(
    ...getExportedObject("appDataSchemas", {
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
    ...getExportedObject("appKeysSchemas", {
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
    ...getExportedObject("InstallAppButtonMap", {
      importConfig: {
        fileToBeImported: "components/InstallAppButton.tsx",
      },
      lazyImport: true,
    })
  );

  // TODO: Make a component map creator that accepts ComponentName and does the rest.
  // TODO: dailyvideo has a slug of daily-video, so that mapping needs to be taken care of. But it is an old app, so it doesn't need AppSettings
  browserOutput.push(
    ...getExportedObject("AppSettingsComponentsMap", {
      importConfig: {
        fileToBeImported: "components/AppSettingsInterface.tsx",
      },
      lazyImport: true,
    })
  );

  browserOutput.push(
    ...getExportedObject("EventTypeAddonMap", {
      importConfig: {
        fileToBeImported: "components/EventTypeAppCardInterface.tsx",
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
    ["bookerApps.metadata.generated.ts", bookerMetadataOutput],
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

function isBookerApp(app: App) {
  // Right now there are only two types of Apps that booker needs.
  // Note that currently payment apps' meta don't need to be accessed on booker. We just access from DB eventType.metadata
  // 1. It is a location app(e.g. any Conferencing App)
  // 2. It is a tag manager app(e.g. Google Analytics, GTM, Fathom)
  return !!(app.appData?.location || app.appData?.tag);
}

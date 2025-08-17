import fs from "fs";
import path from "path";

import { APP_STORE_PATH } from "../constants";
import { getAppName } from "../utils/getAppName";

const getVariableName = (appName: string) => appName.replace(/[-.]/g, "_");
/**
 * If importConfig is an array, only 2 items are allowed. First one is the main one and second one is the fallback
 */
export function getExportedObject(
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
              `"${key}": dynamic(() => import("${getModulePath(app.path, chosenConfig.fileToBeImported)}")),`
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
}

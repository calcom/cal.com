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

const isInWatchMode = process.argv[2] === "--watch";

const formatOutput = (source: string) =>
  prettier.format(source, {
    parser: "babel",
    ...prettierConfig,
  });

const getVariableName = (appName: string) => appName.replace(/[-.]/g, "_");

// INFO: Handle stripe separately as it's an old app with different dirName than slug/appId
const getAppId = (app: { name: string }) => (app.name === "stripepayment" ? "stripe" : app.name);

type App = Partial<AppMeta> & {
  name: string;
  path: string;
};
function generateFiles() {
  const browserInstallAppOutput = [];
  const browserAppSettingsComponentOutput = [];
  const browserEventTypeAddOnOutput = [];
  const browserEventTypeSettingsOutput = [];
  const metadataOutput = [];
  const bookerMetadataOutput = [];
  const schemasOutput = [];
  const appKeysSchemasOutput = [];
  const serverOutput = [];
  const crmOutput = [];
  const paymentAppsOutput = [];
  const calendarAppsOutput = [];
  const conferencingVideoAdaptersOutput = [];
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
    ) => {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");

      if (chosenConfig.importName && chosenConfig.importName !== "default") {
        const importName = chosenConfig.importName;
        const importNameCapitalized = importName.charAt(0).toUpperCase() + importName.slice(1);
        return `${capitalizedAppName}${importNameCapitalized}`;
      } else {
        return capitalizedAppName;
      }
    };

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
          const appName = app.name;
          const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");

          if (lazyImport) {
            if (importName !== "default") {
              const importNameCapitalized = importName.charAt(0).toUpperCase() + importName.slice(1);
              output.push(
                `const ${capitalizedAppName}${importNameCapitalized} = dynamic(() => import("${getModulePath(
                  app.path,
                  chosenConfig.fileToBeImported
                )}").then((mod) => mod.${importName}))`
              );
            } else {
              output.push(
                `const ${capitalizedAppName} = dynamic(() => import("${getModulePath(
                  app.path,
                  chosenConfig.fileToBeImported
                )}"))`
              );
            }
          } else {
            if (importName !== "default") {
              const importNameCapitalized = importName.charAt(0).toUpperCase() + importName.slice(1);
              output.push(
                `import { ${importName} as ${capitalizedAppName}${importNameCapitalized} } from "${getModulePath(
                  app.path,
                  chosenConfig.fileToBeImported
                )}"`
              );
            } else {
              output.push(
                `import ${capitalizedAppName} from "${getModulePath(
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
      output.push(`// Static imports for dynamic imports`);
      output.push(`export const ${objectName} = {`);

      forEachAppDir((app) => {
        const chosenConfig = getChosenImportConfig(importConfig, app);

        if (fileToBeImportedExists(app, chosenConfig)) {
          const key = entryObjectKeyGetter(app);
          output.push(`"${key}": ${getLocalImportName(app, chosenConfig)},`);
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

  forEachAppDir((app) => {
    const fileToBeImported = "api/index.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, "api"))) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      serverOutput.push(
        `import * as ${capitalizedAppName} from "${getModulePath(app.path, fileToBeImported)}";`
      );
    }
  });

  serverOutput.push(`// Static imports for server-side handlers`, `export const apiHandlers = {`);

  forEachAppDir((app) => {
    const fileToBeImported = "api/index.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, "api"))) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      serverOutput.push(`  ${appName}: ${capitalizedAppName},`);
    }
  });

  serverOutput.push(`};`);

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

  forEachAppDir((app) => {
    const fileToBeImported = "components/InstallAppButton.tsx";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported))) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      browserInstallAppOutput.push(
        `import ${capitalizedAppName} from "${getModulePath(app.path, fileToBeImported)}";`
      );
    }
  });

  browserInstallAppOutput.push(
    ...getExportedObject("InstallAppButtonMap", {
      importConfig: {
        fileToBeImported: "components/InstallAppButton.tsx",
      },
      lazyImport: false,
    })
  );

  // TODO: Make a component map creator that accepts ComponentName and does the rest.
  // TODO: dailyvideo has a slug of daily-video, so that mapping needs to be taken care of. But it is an old app, so it doesn't need AppSettings

  forEachAppDir((app) => {
    const fileToBeImported = "components/AppSettingsInterface.tsx";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported))) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      browserAppSettingsComponentOutput.push(
        `import ${capitalizedAppName} from "${getModulePath(app.path, fileToBeImported)}";`
      );
    }
  });

  browserAppSettingsComponentOutput.push(
    ...getExportedObject("AppSettingsComponentsMap", {
      importConfig: {
        fileToBeImported: "components/AppSettingsInterface.tsx",
      },
      lazyImport: false,
    })
  );

  forEachAppDir((app) => {
    const fileToBeImported = "components/EventTypeAppCardInterface.tsx";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported))) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");

      if (appName === "templates/booking-pages-tag" || appName === "templates/event-type-app-card") {
        const templateName = appName.split("/")[1];
        const templateCapitalized =
          templateName.charAt(0).toUpperCase() + templateName.slice(1).replace(/[-]/g, "");
        browserEventTypeAddOnOutput.push(
          `import ${templateCapitalized} from "${getModulePath(app.path, fileToBeImported)}";`
        );
      } else {
        browserEventTypeAddOnOutput.push(
          `import ${capitalizedAppName} from "${getModulePath(app.path, fileToBeImported)}";`
        );
      }
    }
  });

  browserEventTypeAddOnOutput.push(
    ...getExportedObject("EventTypeAddonMap", {
      importConfig: {
        fileToBeImported: "components/EventTypeAppCardInterface.tsx",
      },
      lazyImport: false,
    })
  );
  forEachAppDir((app) => {
    const fileToBeImported = "components/EventTypeAppSettingsInterface.tsx";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported))) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      browserEventTypeSettingsOutput.push(
        `import ${capitalizedAppName} from "${getModulePath(app.path, fileToBeImported)}";`
      );
    }
  });

  browserEventTypeSettingsOutput.push(
    ...getExportedObject("EventTypeSettingsMap", {
      importConfig: {
        fileToBeImported: "components/EventTypeAppSettingsInterface.tsx",
      },
      lazyImport: false,
    })
  );

  forEachAppDir((app) => {
    const fileToBeImported = "lib/CrmService.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isCrmApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      crmOutput.push(
        `import { CrmService as ${capitalizedAppName}CrmService } from "${getModulePath(
          app.path,
          fileToBeImported
        )}";`
      );
    }
  });

  crmOutput.push(`// Static imports for dynamic imports`, `export const CrmServiceMap = {`);

  forEachAppDir((app) => {
    const fileToBeImported = "lib/CrmService.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isCrmApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      crmOutput.push(`  ${appName}: ${capitalizedAppName}CrmService,`);
    }
  });

  crmOutput.push(`};`);

  forEachAppDir((app) => {
    const fileToBeImported = "lib/PaymentService.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isPaymentApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      paymentAppsOutput.push(
        `import { PaymentService as ${capitalizedAppName}PaymentService } from "${getModulePath(
          app.path,
          "lib"
        )}";`
      );
    }
  });

  paymentAppsOutput.push(`// Static imports for dynamic imports`, `export const PaymentAppMap = {`);

  forEachAppDir((app) => {
    const fileToBeImported = "lib/PaymentService.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isPaymentApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      paymentAppsOutput.push(`  ${appName}: ${capitalizedAppName}PaymentService,`);
    }
  });

  paymentAppsOutput.push(`};`);

  forEachAppDir((app) => {
    const fileToBeImported = "lib/CalendarService.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isCalendarApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      calendarAppsOutput.push(
        `import { CalendarService as ${capitalizedAppName}CalendarService } from "${getModulePath(
          app.path,
          "lib"
        )}";`
      );
    }
  });

  calendarAppsOutput.push(`// Static imports for dynamic imports`, `export const CalendarServiceMap = {`);

  forEachAppDir((app) => {
    const fileToBeImported = "lib/CalendarService.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isCalendarApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      calendarAppsOutput.push(`  ${appName}: ${capitalizedAppName}CalendarService,`);
    }
  });

  calendarAppsOutput.push(`};`);

  forEachAppDir((app) => {
    const fileToBeImported = "lib/VideoApiAdapter.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isConferencingApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      conferencingVideoAdaptersOutput.push(
        `import { VideoApiAdapter as ${capitalizedAppName}VideoApiAdapter } from "${getModulePath(
          app.path,
          "lib"
        )}";`
      );
    }
  });

  conferencingVideoAdaptersOutput.push(
    `// Static imports for dynamic imports`,
    `export const ConferencingVideoAdapterMap = {`
  );

  forEachAppDir((app) => {
    const fileToBeImported = "lib/VideoApiAdapter.ts";
    if (fs.existsSync(path.join(APP_STORE_PATH, app.path, fileToBeImported)) && isConferencingApp(app)) {
      const appName = app.name;
      const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1).replace(/[-]/g, "");
      conferencingVideoAdaptersOutput.push(`  ${appName}: ${capitalizedAppName}VideoApiAdapter,`);
    }
  });

  conferencingVideoAdaptersOutput.push(`};`);

  const banner = `/**
    This file is autogenerated using the command \`yarn app-store:build --watch\`.
    Don't modify this file manually.
**/
`;
  const filesToGenerate: [string, string[]][] = [
    ["apps.metadata.generated.ts", metadataOutput],
    ["apps.server.generated.ts", serverOutput],
    ["apps.browser-install.generated.tsx", browserInstallAppOutput],
    ["apps.browser-appsettings.generated.tsx", browserAppSettingsComponentOutput],
    ["apps.browser-addon.generated.tsx", browserEventTypeAddOnOutput],
    ["apps.browser-eventtypesettings.generated.tsx", browserEventTypeSettingsOutput],
    ["apps.schemas.generated.ts", schemasOutput],
    ["apps.keys-schemas.generated.ts", appKeysSchemasOutput],
    ["bookerApps.metadata.generated.ts", bookerMetadataOutput],
    ["calendar.services.generated.ts", calendarAppsOutput],
    ["conferencing.videoAdapters.generated.ts", conferencingVideoAdaptersOutput],
    ["crm.services.generated.ts", crmOutput],
    ["payment.apps.generated.ts", paymentAppsOutput],
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

function isCalendarApp(app: App) {
  return !!app.categories?.includes("calendar");
}

function isConferencingApp(app: App) {
  return !!app.categories?.includes("conferencing") || !!app.categories?.includes("video");
}

function isCrmApp(app: App) {
  return !!app.categories?.includes("crm");
}

function isPaymentApp(app: App) {
  return !!app.categories?.includes("payment");
}

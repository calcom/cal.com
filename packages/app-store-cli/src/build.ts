import chokidar from "chokidar";
import fs from "fs";
// eslint-disable-next-line no-restricted-imports
import { debounce } from "lodash";
import prettier from "prettier";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import prettierConfig from "@calcom/config/prettier-preset";
import type { AppMeta } from "@calcom/types/App";

import { APP_STORE_PATH } from "./constants";
import { getAppName } from "./utils/getAppName";
import { getExportedObject } from "./utils/getExportedObject";

const isInWatchMode = process.argv[2] === "--watch";

const formatOutput = (source: string) =>
  prettier.format(source, {
    parser: "babel",
    ...prettierConfig,
  });

// INFO: Handle stripe separately as it's an old app with different dirName than slug/appId
const getAppId = (app: { name: string }) => (app.name === "stripepayment" ? "stripe" : app.name);

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
  const crmOutput = [];

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
  browserOutput.push(
    ...getExportedObject("EventTypeSettingsMap", {
      importConfig: {
        fileToBeImported: "components/EventTypeAppSettingsInterface.tsx",
      },
      lazyImport: true,
    })
  );

  crmOutput.push(
    ...getExportedObject(
      "CrmServiceMap",
      {
        importConfig: {
          fileToBeImported: "lib/CrmService.ts",
          importName: "default",
        },
        lazyImport: true,
      },
      isCrmApp
    )
  );

  const calendarOutput = [];
  calendarOutput.push(
    ...getExportedObject(
      "CalendarServiceMap",
      {
        importConfig: {
          fileToBeImported: "lib/CalendarService.ts",
          importName: "default",
        },
        lazyImport: true,
      },
      isCalendarApp
    )
  );

  const analyticsOutput = [];
  analyticsOutput.push(
    ...getExportedObject(
      "AnalyticsServiceMap",
      {
        importConfig: {
          fileToBeImported: "lib/AnalyticsService.ts",
          importName: "default",
        },
        lazyImport: true,
      },
      isAnalyticsApp
    )
  );

  const videoOutput = [];
  videoOutput.push(
    ...getExportedObject(
      "VideoApiAdapterMap",
      {
        importConfig: {
          fileToBeImported: "lib/VideoApiAdapter.ts",
          importName: "default",
        },
        lazyImport: true,
      },
      isVideoApiAdapterApp
    )
  );

  const paymentOutput = [];
  paymentOutput.push(
    ...getExportedObject(
      "PaymentServiceMap",
      {
        importConfig: {
          fileToBeImported: "lib/PaymentService.ts",
          importName: "default",
        },
        lazyImport: true,
      },
      isPaymentApp
    )
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
    ["crm.apps.generated.ts", crmOutput],
    ["calendar.services.generated.ts", calendarOutput],
    ["analytics.apps.generated.ts", analyticsOutput],
    ["video.apps.generated.ts", videoOutput],
    ["payment.apps.generated.ts", paymentOutput],
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

function isCrmApp(app: App) {
  return !!app.categories?.includes("crm");
}

function isCalendarApp(app: App) {
  return !!app.categories?.includes("calendar");
}

function isAnalyticsApp(app: App) {
  return !!app.categories?.includes("analytics");
}

function isVideoApiAdapterApp(app: App) {
  return !!app.categories?.includes("video") || !!app.categories?.includes("conferencing");
}

function isPaymentApp(app: App) {
  return !!app.categories?.includes("payment");
}
